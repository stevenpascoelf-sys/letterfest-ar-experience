import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { XREstimatedLight } from 'three/examples/jsm/webxr/XREstimatedLight.js';
import type { SceneArtwork } from '@/artworks';
import { endActiveSession, requestArSession } from '@/ar/xrSession';
import { frameSideHex } from '@/frame';

const FRAME_DEPTH_M = 0.02;

type Props = {
    selected: SceneArtwork;
    onOpenPicker: () => void;
    onExit: () => void;
    onUnsupported?: (reason: string) => void;
    children?: React.ReactNode;
};

type Status = 'loading' | 'scanning' | 'placing' | 'placed' | 'error';

export default function WebXRAR({ selected, onOpenPicker, onExit, onUnsupported, children }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const selectedRef = useRef<SceneArtwork>(selected);
    const [status, setStatus] = useState<Status>('loading');
    const [errorMsg, setErrorMsg] = useState<string>('');
    const artworkGroupRef = useRef<THREE.Group | null>(null);
    const textureCacheRef = useRef<Map<string, THREE.Texture>>(new Map());
    const sceneRef = useRef<THREE.Scene | null>(null);
    const resetRef = useRef<() => void>(() => {});

    useEffect(() => {
        selectedRef.current = selected;
        const group = artworkGroupRef.current;
        if (group) applyArtworkToGroup(group, selected, textureCacheRef.current);
    }, [selected]);

    useEffect(() => {
        const container = containerRef.current;
        const overlay = overlayRef.current;
        if (!container || !overlay) return;

        let cancelled = false;
        let session: XRSession | null = null;
        let renderer: THREE.WebGLRenderer | null = null;
        let cleanup = () => {};

        (async () => {
            try {
                const { session: sess } = await requestArSession(overlay);
                if (cancelled) {
                    try {
                        sess.end();
                    } catch {
                        /* ignored */
                    }
                    return;
                }
                session = sess;

                renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
                renderer.setPixelRatio(window.devicePixelRatio);
                renderer.setSize(window.innerWidth, window.innerHeight);
                renderer.xr.enabled = true;
                renderer.xr.setReferenceSpaceType('local');
                renderer.toneMapping = THREE.ACESFilmicToneMapping;
                renderer.toneMappingExposure = 1.0;
                renderer.outputColorSpace = THREE.SRGBColorSpace;
                container.appendChild(renderer.domElement);

                const scene = new THREE.Scene();
                sceneRef.current = scene;
                const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 50);

                const baseHemi = new THREE.HemisphereLight(0xffffff, 0x707070, 0.9);
                const baseDir = new THREE.DirectionalLight(0xffffff, 0.45);
                baseDir.position.set(0.4, 1, 0.6);
                scene.add(baseHemi);
                scene.add(baseDir);

                let xrLight: XREstimatedLight | null = null;
                let xrLightActive = false;
                let onEstimationStart: (() => void) | null = null;
                let onEstimationEnd: (() => void) | null = null;
                try {
                    xrLight = new XREstimatedLight(renderer);
                    onEstimationStart = () => {
                        if (!xrLight) return;
                        xrLightActive = true;
                        baseHemi.intensity = 0.65;
                        baseDir.intensity = 0.3;
                        scene.add(xrLight);
                        if (xrLight.environment) scene.environment = xrLight.environment;
                    };
                    onEstimationEnd = () => {
                        if (!xrLight) return;
                        xrLightActive = false;
                        baseHemi.intensity = 0.9;
                        baseDir.intensity = 0.45;
                        scene.remove(xrLight);
                        scene.environment = null;
                    };
                    xrLight.addEventListener('estimationstart', onEstimationStart);
                    xrLight.addEventListener('estimationend', onEstimationEnd);
                } catch {
                    xrLight = null;
                }

                await renderer.xr.setSession(session);

                const reticle = makeReticle();
                reticle.visible = false;
                scene.add(reticle);

                let refSpace: XRReferenceSpace;
                try {
                    refSpace = await session.requestReferenceSpace('local');
                } catch {
                    refSpace = await session.requestReferenceSpace('viewer');
                }
                let hitTestSource: XRHitTestSource | null = null;
                try {
                    const viewerSpace = await session.requestReferenceSpace('viewer');
                    if (typeof session.requestHitTestSource === 'function') {
                        hitTestSource = (await session.requestHitTestSource({ space: viewerSpace })) ?? null;
                    }
                } catch {
                    hitTestSource = null;
                }

                setStatus(hitTestSource ? 'scanning' : 'placing');

                let latestFrame: XRFrame | null = null;
                let lastHitTimeMs = 0;
                let hasEverPlaced = false;

                const targetPos = new THREE.Vector3();
                const targetQuat = new THREE.Quaternion();
                const targetScl = new THREE.Vector3();
                const curPos = new THREE.Vector3();
                const curQuat = new THREE.Quaternion();
                const curScl = new THREE.Vector3(1, 1, 1);
                const tmpMat = new THREE.Matrix4();

                resetRef.current = () => {
                    const group = artworkGroupRef.current;
                    if (group && sceneRef.current) {
                        sceneRef.current.remove(group);
                        disposeArtworkGroup(group);
                        artworkGroupRef.current = null;
                    }
                    hasEverPlaced = false;
                    setStatus(hitTestSource ? 'scanning' : 'placing');
                };

                const onSelect = () => {
                    const frame = latestFrame;
                    if (!frame) return;
                    if (!artworkGroupRef.current) {
                        const group = createArtworkGroup(selectedRef.current, textureCacheRef.current);
                        artworkGroupRef.current = group;
                        scene.add(group);
                    }
                    const group = artworkGroupRef.current!;
                    if (reticle.visible) {
                        orientPlaneToSurface(group, reticle.matrix);
                    } else {
                        const viewerPose = frame.getViewerPose(refSpace);
                        if (!viewerPose) return;
                        placeFacingCamera(group, viewerPose.transform.matrix, 2.4);
                    }
                    hasEverPlaced = true;
                    setStatus('placed');
                };
                session!.addEventListener('select', onSelect);

                const onEnd = () => {
                    setStatus('loading');
                    onExit();
                };
                session!.addEventListener('end', onEnd);

                renderer.setAnimationLoop((time, frame) => {
                    if (!frame) return;
                    latestFrame = frame;
                    if (!hitTestSource) {
                        reticle.visible = false;
                        renderer!.render(scene, camera);
                        return;
                    }
                    const hits = frame.getHitTestResults(hitTestSource);
                    if (hits.length > 0) {
                        const pose = hits[0].getPose(refSpace);
                        if (pose) {
                            tmpMat.fromArray(pose.transform.matrix);
                            tmpMat.decompose(targetPos, targetQuat, targetScl);
                            if (!reticle.visible) {
                                curPos.copy(targetPos);
                                curQuat.copy(targetQuat);
                            } else {
                                curPos.lerp(targetPos, 0.4);
                                curQuat.slerp(targetQuat, 0.4);
                            }
                            reticle.matrix.compose(curPos, curQuat, curScl);
                            reticle.matrixWorldNeedsUpdate = true;
                            reticle.visible = true;
                            lastHitTimeMs = time;
                            if (!hasEverPlaced) {
                                setStatus('placing');
                                if (!artworkGroupRef.current) {
                                    const previewGroup = createArtworkGroup(
                                        selectedRef.current,
                                        textureCacheRef.current,
                                    );
                                    artworkGroupRef.current = previewGroup;
                                    scene.add(previewGroup);
                                }
                                orientPlaneToSurface(artworkGroupRef.current, reticle.matrix);
                            }
                        }
                    } else if (time - lastHitTimeMs > 600) {
                        reticle.visible = false;
                        if (!hasEverPlaced) setStatus('scanning');
                    }
                    if (artworkGroupRef.current) {
                        const shadowMesh = artworkGroupRef.current.getObjectByName('shadow') as
                            | THREE.Mesh
                            | undefined;
                        if (shadowMesh) {
                            const dirIntensity = xrLight && xrLightActive
                                ? xrLight.directionalLight.intensity
                                : baseDir.intensity;
                            const ambIntensity = xrLight && xrLightActive
                                ? Math.min(1.5, (xrLight.lightProbe?.intensity ?? 1))
                                : baseHemi.intensity;
                            const target = Math.max(0.45, Math.min(0.95, 0.5 + dirIntensity * 0.4 + ambIntensity * 0.05));
                            const mat = shadowMesh.material as THREE.MeshBasicMaterial;
                            mat.opacity = mat.opacity * 0.85 + target * 0.15;
                        }
                    }
                    renderer!.render(scene, camera);
                });

                cleanup = () => {
                    session?.removeEventListener('select', onSelect);
                    session?.removeEventListener('end', onEnd);
                    if (xrLight && onEstimationStart) xrLight.removeEventListener('estimationstart', onEstimationStart);
                    if (xrLight && onEstimationEnd) xrLight.removeEventListener('estimationend', onEstimationEnd);
                    if (xrLight && xrLightActive) scene.remove(xrLight);
                    scene.environment = null;
                    renderer?.setAnimationLoop(null);
                    try {
                        session?.end();
                    } catch {
                        /* ignored */
                    }
                    renderer?.dispose();
                    if (renderer?.domElement.parentNode === container) {
                        container.removeChild(renderer.domElement);
                    }
                    textureCacheRef.current.forEach((t) => t.dispose());
                    textureCacheRef.current.clear();
                    artworkGroupRef.current = null;
                    sceneRef.current = null;
                };
            } catch (e) {
                if (cancelled) return;
                const msg = e instanceof Error ? e.message : 'Failed to start AR.';
                if (onUnsupported && /not supported|not available/i.test(msg)) {
                    onUnsupported(msg);
                    return;
                }
                setErrorMsg(msg);
                setStatus('error');
            }
        })();

        return () => {
            cancelled = true;
            cleanup();
            void endActiveSession();
        };
    }, [onExit]);

    const hint =
        status === 'scanning'
            ? 'Move your phone around to scan the room'
            : status === 'placing'
              ? 'Tap to place the artwork in front of you'
              : status === 'placed'
                ? 'Tap to reposition'
                : '';

    return (
        <>
            <div ref={containerRef} className="absolute inset-0" />
            <div ref={overlayRef} className="absolute inset-0">
                {(status === 'scanning' || status === 'placing' || status === 'placed') && (
                    <div className="pointer-events-none absolute right-0 bottom-32 left-0 flex justify-center">
                        <div
                            className="rounded-full bg-white/90 px-3 py-1 backdrop-blur-md"
                            style={{ fontFamily: 'Inter', fontSize: 11 }}
                        >
                            {hint}
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 px-8 text-center text-white">
                        <div style={{ fontFamily: 'Fraunces', fontSize: 16 }}>AR unavailable</div>
                        <div style={{ fontFamily: 'Inter', fontSize: 11 }} className="text-white/70">
                            {errorMsg}
                        </div>
                        <button
                            onClick={onExit}
                            className="mt-4 rounded-full bg-white px-4 py-1.5 text-black"
                            style={{ fontFamily: 'Inter', fontSize: 11 }}
                        >
                            Back
                        </button>
                    </div>
                )}

                {status !== 'error' && status !== 'loading' && (
                    <>
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                resetRef.current();
                            }}
                            className="absolute bottom-[max(env(safe-area-inset-bottom),20px)] left-5 grid h-14 place-items-center rounded-full bg-white px-5 text-black shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45)] transition-transform active:scale-95"
                            style={{ fontFamily: 'Inter', fontSize: 11 }}
                        >
                            Reset
                        </button>
                        <button
                            aria-label="Change frame size & colour"
                            onPointerDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenPicker();
                            }}
                            className="absolute right-5 bottom-[max(env(safe-area-inset-bottom),20px)] grid h-14 place-items-center rounded-full bg-white px-5 text-black shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45)] transition-transform active:scale-95"
                            style={{ fontFamily: 'Inter', fontSize: 11 }}
                        >
                            Change frame size & colour
                        </button>
                    </>
                )}
                {children}
            </div>
        </>
    );
}

function makeReticle() {
    const group = new THREE.Group();
    const outer = new THREE.RingGeometry(0.06, 0.075, 32).rotateX(-Math.PI / 2);
    const inner = new THREE.RingGeometry(0.005, 0.012, 16).rotateX(-Math.PI / 2);
    const matWhite = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
    const matDot = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
    const ringMesh = new THREE.Mesh(outer, matWhite);
    const dotMesh = new THREE.Mesh(inner, matDot);
    group.add(ringMesh);
    group.add(dotMesh);
    group.matrixAutoUpdate = false;
    return group;
}

function getOrLoadTexture(src: string, cache: Map<string, THREE.Texture>): THREE.Texture {
    const existing = cache.get(src);
    if (existing) return existing;
    const loader = new THREE.TextureLoader();
    const tex = loader.load(src);
    tex.colorSpace = THREE.SRGBColorSpace;
    cache.set(src, tex);
    return tex;
}

let _shadowTexture: THREE.CanvasTexture | null = null;

function getShadowTexture(): THREE.CanvasTexture {
    if (_shadowTexture) return _shadowTexture;
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);
    const pad = size * 0.30;
    const r = pad * 0.45;
    ctx.shadowBlur = pad * 2.0;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.moveTo(pad + r, pad);
    ctx.lineTo(size - pad - r, pad);
    ctx.quadraticCurveTo(size - pad, pad, size - pad, pad + r);
    ctx.lineTo(size - pad, size - pad - r);
    ctx.quadraticCurveTo(size - pad, size - pad, size - pad - r, size - pad);
    ctx.lineTo(pad + r, size - pad);
    ctx.quadraticCurveTo(pad, size - pad, pad, size - pad - r);
    ctx.lineTo(pad, pad + r);
    ctx.quadraticCurveTo(pad, pad, pad + r, pad);
    ctx.closePath();
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    _shadowTexture = tex;
    return tex;
}

const SHADOW_PAD_RATIO = 0.22;
const SHADOW_DROP_RATIO = 0.14;
const SHADOW_DEPTH_M = 0.003;

function createArtworkGroup(artwork: SceneArtwork, cache: Map<string, THREE.Texture>): THREE.Group {
    const widthM = artwork.widthMm / 1000;
    const heightM = artwork.heightMm / 1000;
    const depthM = FRAME_DEPTH_M;

    const group = new THREE.Group();
    group.userData.artworkId = artwork.id;

    const shadowGeom = new THREE.PlaneGeometry(
        widthM * (1 + SHADOW_PAD_RATIO * 2),
        heightM * (1 + SHADOW_PAD_RATIO * 2),
    );
    const shadowMat = new THREE.MeshBasicMaterial({
        map: getShadowTexture(),
        transparent: true,
        depthWrite: false,
        opacity: 0.7,
    });
    const shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
    shadowMesh.name = 'shadow';
    shadowMesh.renderOrder = -1;
    shadowMesh.position.set(0, -heightM * SHADOW_DROP_RATIO, SHADOW_DEPTH_M);
    group.add(shadowMesh);

    const frontMat = new THREE.MeshStandardMaterial({
        map: getOrLoadTexture(artwork.src, cache),
        roughness: 0.65,
        metalness: 0,
        envMapIntensity: 0.55,
    });
    const sideMat = new THREE.MeshStandardMaterial({
        color: frameSideHex(artwork.frameColour),
        roughness: 0.7,
        metalness: 0,
    });
    const backMat = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.8,
        metalness: 0,
    });

    const geom = new THREE.BoxGeometry(widthM, heightM, depthM);
    const materials: THREE.Material[] = [sideMat, sideMat, sideMat, sideMat, frontMat, backMat];
    const artMesh = new THREE.Mesh(geom, materials);
    artMesh.name = 'artwork';
    artMesh.position.z = depthM / 2 + SHADOW_DEPTH_M + 0.0005;
    group.add(artMesh);

    return group;
}

function applyArtworkToGroup(group: THREE.Group, artwork: SceneArtwork, cache: Map<string, THREE.Texture>) {
    const widthM = artwork.widthMm / 1000;
    const heightM = artwork.heightMm / 1000;
    const depthM = FRAME_DEPTH_M;

    const artMesh = group.getObjectByName('artwork') as THREE.Mesh | undefined;
    if (artMesh) {
        artMesh.geometry.dispose();
        artMesh.geometry = new THREE.BoxGeometry(widthM, heightM, depthM);
        const mats = artMesh.material as THREE.Material[];
        const frontMat = mats[4] as THREE.MeshStandardMaterial;
        const sideMat = mats[0] as THREE.MeshStandardMaterial;
        frontMat.map = getOrLoadTexture(artwork.src, cache);
        frontMat.needsUpdate = true;
        sideMat.color.setHex(frameSideHex(artwork.frameColour));
        sideMat.needsUpdate = true;
    }

    const shadowMesh = group.getObjectByName('shadow') as THREE.Mesh | undefined;
    if (shadowMesh) {
        shadowMesh.geometry.dispose();
        shadowMesh.geometry = new THREE.PlaneGeometry(
            widthM * (1 + SHADOW_PAD_RATIO * 2),
            heightM * (1 + SHADOW_PAD_RATIO * 2),
        );
        shadowMesh.position.set(0, -heightM * SHADOW_DROP_RATIO, SHADOW_DEPTH_M);
    }

    const artMeshUpdate = group.getObjectByName('artwork') as THREE.Mesh | undefined;
    if (artMeshUpdate) artMeshUpdate.position.z = depthM / 2 + SHADOW_DEPTH_M + 0.0005;

    group.userData.artworkId = artwork.id;
}

function disposeArtworkGroup(group: THREE.Group) {
    group.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
            mesh.geometry?.dispose();
            const mat = mesh.material;
            if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
            else mat?.dispose();
        }
    });
}

const _pos = new THREE.Vector3();
const _rot = new THREE.Quaternion();
const _scl = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _planeUp = new THREE.Vector3();
const _right = new THREE.Vector3();
const _worldUp = new THREE.Vector3(0, 1, 0);
const _basis = new THREE.Matrix4();
const _camMat = new THREE.Matrix4();
const _camPos = new THREE.Vector3();
const _camFwd = new THREE.Vector3();

function orientPlaneToSurface(mesh: THREE.Object3D, hitMatrix: THREE.Matrix4) {
    hitMatrix.decompose(_pos, _rot, _scl);
    _normal.set(0, 1, 0).applyQuaternion(_rot).normalize();

    const isHorizontal = Math.abs(_normal.dot(_worldUp)) > 0.85;
    if (isHorizontal) {
        _planeUp.set(0, 0, -1).applyQuaternion(_rot).projectOnPlane(_normal);
        if (_planeUp.lengthSq() < 1e-4) _planeUp.set(1, 0, 0).projectOnPlane(_normal);
    } else {
        _planeUp.copy(_worldUp).projectOnPlane(_normal);
    }
    _planeUp.normalize();
    _right.crossVectors(_planeUp, _normal).normalize();
    _basis.makeBasis(_right, _planeUp, _normal);
    mesh.quaternion.setFromRotationMatrix(_basis);
    mesh.position.copy(_pos);
}

function placeFacingCamera(mesh: THREE.Object3D, cameraMatrix: Float32Array, distance: number) {
    _camMat.fromArray(cameraMatrix);
    _camPos.setFromMatrixPosition(_camMat);
    _camFwd.set(0, 0, -1).transformDirection(_camMat).normalize();

    _pos.copy(_camPos).addScaledVector(_camFwd, distance);

    _normal.copy(_camFwd).multiplyScalar(-1);
    _planeUp.copy(_worldUp).projectOnPlane(_normal);
    if (_planeUp.lengthSq() < 1e-4) _planeUp.set(0, 0, 1).projectOnPlane(_normal);
    _planeUp.normalize();
    _right.crossVectors(_planeUp, _normal).normalize();
    _basis.makeBasis(_right, _planeUp, _normal);
    mesh.quaternion.setFromRotationMatrix(_basis);
    mesh.position.copy(_pos);
}

