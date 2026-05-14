import { useEffect, useRef, useState } from 'react';
import type { SceneArtwork } from '@/artworks';

const MM_PER_PX = 1 / 1.6;
const mmToPx = (mm: number) => mm / MM_PER_PX;

type Pose = { x: number; y: number; scale: number };

type Props = {
    selected: SceneArtwork;
    onOpenPicker: () => void;
    onReset?: () => void;
    showReset?: boolean;
    cameraStopRef?: React.MutableRefObject<(() => void) | null>;
};

export default function PseudoAR({ selected, onOpenPicker, onReset, showReset, cameraStopRef }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [acquireEpoch, setAcquireEpoch] = useState(0);
    const [pose, setPose] = useState<Pose>({ x: 0.5, y: 0.5, scale: 1 });
    const [tiltOffset, setTiltOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const tiltBaseRef = useRef<{ alpha: number; beta: number } | null>(null);

    useEffect(() => {
        const handler = (e: DeviceOrientationEvent) => {
            if (e.alpha == null || e.beta == null) return;
            if (!tiltBaseRef.current) {
                tiltBaseRef.current = { alpha: e.alpha, beta: e.beta };
                return;
            }
            const base = tiltBaseRef.current;
            let dAlpha = e.alpha - base.alpha;
            if (dAlpha > 180) dAlpha -= 360;
            if (dAlpha < -180) dAlpha += 360;
            const dBeta = e.beta - base.beta;
            const sensX = 0.014;
            const sensY = 0.016;
            const maxOffset = 0.7;
            const ox = Math.max(-maxOffset, Math.min(maxOffset, -dAlpha * sensX));
            const oy = Math.max(-maxOffset, Math.min(maxOffset, dBeta * sensY));
            setTiltOffset({ x: ox, y: oy });
        };
        window.addEventListener('deviceorientation', handler);
        return () => {
            window.removeEventListener('deviceorientation', handler);
            tiltBaseRef.current = null;
        };
    }, []);

    useEffect(() => {
        const stop = () => {
            streamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
            if (videoRef.current) videoRef.current.srcObject = null;
            setCameraReady(false);
        };
        if (cameraStopRef) cameraStopRef.current = stop;
        return () => {
            if (cameraStopRef && cameraStopRef.current === stop) cameraStopRef.current = null;
        };
    }, [cameraStopRef]);

    useEffect(() => {
        let stream: MediaStream | null = null;
        let cancelled = false;
        (async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
                    audio: false,
                });
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play().catch(() => {});
                    setCameraReady(true);
                }
            } catch (e) {
                setCameraError(e instanceof Error ? e.message : 'Camera unavailable');
            }
        })();
        return () => {
            cancelled = true;
            stream?.getTracks().forEach((t) => t.stop());
            if (streamRef.current === stream) streamRef.current = null;
        };
    }, [acquireEpoch]);

    useEffect(() => {
        const onVis = () => {
            if (!document.hidden && !streamRef.current) {
                setAcquireEpoch((e) => e + 1);
            }
        };
        document.addEventListener('visibilitychange', onVis);
        window.addEventListener('pageshow', onVis);
        return () => {
            document.removeEventListener('visibilitychange', onVis);
            window.removeEventListener('pageshow', onVis);
        };
    }, []);

    useEffect(() => {
        setPose({ x: 0.5, y: 0.5, scale: 1 });
        tiltBaseRef.current = null;
        setTiltOffset({ x: 0, y: 0 });
    }, [selected.id]);

    const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
    const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null);
    const lastTapRef = useRef<number>(0);

    const onPointerDown = (e: React.PointerEvent) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        const now = Date.now();
        if (now - lastTapRef.current < 280) {
            setPose({ x: 0.5, y: 0.5, scale: 1 });
            lastTapRef.current = 0;
            return;
        }
        lastTapRef.current = now;
        dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pose.x, origY: pose.y };
    };

    const onPointerMove = (e: React.PointerEvent) => {
        const d = dragRef.current;
        if (!d) return;
        const dx = (e.clientX - d.startX) / window.innerWidth;
        const dy = (e.clientY - d.startY) / window.innerHeight;
        setPose((p) => ({ ...p, x: clamp(d.origX + dx, 0.05, 0.95), y: clamp(d.origY + dy, 0.05, 0.95) }));
    };

    const onPointerUp = () => {
        if (dragRef.current) {
            tiltBaseRef.current = null;
            setTiltOffset({ x: 0, y: 0 });
        }
        dragRef.current = null;
    };

    const onTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            pinchRef.current = { startDist: touchDist(e.touches[0], e.touches[1]), startScale: pose.scale };
            dragRef.current = null;
        }
    };
    const onTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && pinchRef.current) {
            const dist = touchDist(e.touches[0], e.touches[1]);
            const next = clamp((dist / pinchRef.current.startDist) * pinchRef.current.startScale, 0.25, 4);
            setPose((p) => ({ ...p, scale: next }));
        }
    };
    const onTouchEnd = (e: React.TouchEvent) => {
        if (e.touches.length < 2) pinchRef.current = null;
    };

    const widthPx = mmToPx(selected.widthMm) * pose.scale;

    return (
        <>
            <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-cover"
                autoPlay
                muted
                playsInline
            />

            {!cameraReady && !cameraError && (
                <div
                    className="absolute inset-0 flex items-center justify-center text-white/70"
                    style={{ fontFamily: 'Inter', fontSize: 11 }}
                >
                    Requesting camera…
                </div>
            )}

            {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center text-white">
                    <div style={{ fontFamily: 'Fraunces', fontSize: 16 }}>Camera unavailable</div>
                    <div style={{ fontFamily: 'Inter', fontSize: 11 }} className="text-white/70">
                        Open this page on a phone with camera access enabled over HTTPS.
                    </div>
                </div>
            )}

            <div
                className="absolute inset-0"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <img
                    src={selected.src}
                    alt=""
                    draggable={false}
                    className="pointer-events-none absolute"
                    style={{
                        left: `${(pose.x + tiltOffset.x) * 100}%`,
                        top: `${(pose.y + tiltOffset.y) * 100}%`,
                        width: widthPx,
                        height: 'auto',
                        transform: 'translate(-50%, -50%)',
                        boxShadow: '0 14px 36px -12px rgba(0,0,0,0.55), 0 4px 10px -4px rgba(0,0,0,0.4)',
                        willChange: 'transform, width, left, top',
                    }}
                />
            </div>

            {showReset && (
                <button
                    onClick={() => {
                        setPose({ x: 0.5, y: 0.5, scale: 1 });
                        onReset?.();
                    }}
                    className="absolute bottom-[max(env(safe-area-inset-bottom),88px)] left-5 grid h-10 place-items-center rounded-full bg-white/90 px-4 text-black shadow-[0_6px_18px_-6px_rgba(0,0,0,0.45)] backdrop-blur-md transition-transform active:scale-95"
                    style={{ fontFamily: 'Inter', fontSize: 11 }}
                >
                    Reset
                </button>
            )}

            <button
                aria-label="Change frame size & colour"
                onClick={onOpenPicker}
                className="absolute right-5 bottom-[max(env(safe-area-inset-bottom),20px)] grid h-14 place-items-center rounded-full bg-white px-5 text-black shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45)] transition-transform active:scale-95"
                style={{ fontFamily: 'Inter', fontSize: 11 }}
            >
                Change frame size & colour
            </button>
        </>
    );
}

function clamp(n: number, lo: number, hi: number) {
    return Math.min(hi, Math.max(lo, n));
}

function touchDist(a: React.Touch, b: React.Touch) {
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

