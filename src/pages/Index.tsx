import { useEffect, useMemo, useRef, useState } from 'react';
import { getDefaultArtwork, type Artwork } from '@/artworks';
import PseudoAR from '@/ar/PseudoAR';
import WebXRAR from '@/ar/WebXRAR';
import PickerSheet from '@/ar/PickerSheet';
import {
    composeFramedArtwork,
    COMPATIBLE_SIZES,
    DEFAULT_SIZE_FOR,
    FRAME_COLOURS,
    FRAME_SIZES,
    getFrameSize,
    srcHash,
    type FrameColour,
    type FrameSize,
} from '@/frame';
import { clearUsdzCache, launchQuickLook, prebuildUsdz, supportsQuickLook } from '@/ar/quicklook';

type Mode = 'detecting' | 'pseudo' | 'xr-available' | 'xr-active' | 'quicklook';

export default function Index() {
    const [mode, setMode] = useState<Mode>('detecting');
    const [selectedArtwork, setSelectedArtwork] = useState<Artwork>(getDefaultArtwork());
    const [selectedColour, setSelectedColour] = useState<FrameColour>('Oak');
    const [selectedSize, setSelectedSize] = useState<FrameSize>(DEFAULT_SIZE_FOR[getDefaultArtwork().aspect]);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [labelVisible, setLabelVisible] = useState(true);
    const [arLoading, setArLoading] = useState(false);
    const [composedSrc, setComposedSrc] = useState<string | null>(null);
    const cameraStopRef = useRef<(() => void) | null>(null);

    const sizeDef = useMemo(() => getFrameSize(selectedSize), [selectedSize]);

    const composedArtwork: Artwork & { widthMm: number; heightMm: number; frameColour: FrameColour } = useMemo(
        () => ({
            ...selectedArtwork,
            widthMm: sizeDef.widthMm,
            heightMm: sizeDef.heightMm,
            frameColour: selectedColour,
        }),
        [selectedArtwork, sizeDef, selectedColour],
    );

    useEffect(() => {
        let cancelled = false;
        composeFramedArtwork({ bareSrc: selectedArtwork.bareSrc, colour: selectedColour, size: sizeDef })
            .then((dataUrl) => {
                if (!cancelled) setComposedSrc(dataUrl);
            })
            .catch(() => {
                if (!cancelled) setComposedSrc(selectedArtwork.bareSrc);
            });
        return () => {
            cancelled = true;
        };
    }, [selectedArtwork.bareSrc, selectedColour, sizeDef]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (cancelled) return;
            if (supportsQuickLook()) {
                setMode('quicklook');
                return;
            }
            if (navigator.xr) {
                setMode('xr-available');
                return;
            }
            setMode('pseudo');
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        setLabelVisible(true);
        const t = setTimeout(() => setLabelVisible(false), 1800);
        return () => clearTimeout(t);
    }, [selectedArtwork.id, selectedColour, selectedSize]);

    useEffect(() => {
        if (!COMPATIBLE_SIZES[selectedArtwork.aspect].includes(selectedSize)) {
            setSelectedSize(DEFAULT_SIZE_FOR[selectedArtwork.aspect]);
        }
    }, [selectedArtwork.aspect, selectedSize]);

    useEffect(() => {
        if (mode !== 'quicklook') return;
        for (const c of FRAME_COLOURS) {
            for (const s of FRAME_SIZES) {
                composeFramedArtwork({ bareSrc: selectedArtwork.bareSrc, colour: c.id, size: s })
                    .then((src) => {
                        const artwork = {
                            id: selectedArtwork.id,
                            name: selectedArtwork.name,
                            src,
                            widthMm: s.widthMm,
                            heightMm: s.heightMm,
                            frameColour: c.id,
                        };
                        const key = `${selectedArtwork.id}|${c.id}|${s.id}|${srcHash(src)}`;
                        prebuildUsdz(artwork, key).catch(() => {});
                    })
                    .catch(() => {});
            }
        }
    }, [mode, selectedArtwork.id, selectedArtwork.bareSrc, selectedArtwork.name]);

    useEffect(() => {
        const onVis = () => {
            if (!document.hidden) setArLoading(false);
        };
        document.addEventListener('visibilitychange', onVis);
        window.addEventListener('pageshow', onVis);
        return () => {
            document.removeEventListener('visibilitychange', onVis);
            window.removeEventListener('pageshow', onVis);
        };
    }, []);

    const openPicker = () => setPickerOpen(true);
    const closePicker = () => setPickerOpen(false);

    const handleQuickLook = async () => {
        if (arLoading) return;
        cameraStopRef.current?.();
        setArLoading(true);
        try {
            const src = await composeFramedArtwork({
                bareSrc: selectedArtwork.bareSrc,
                colour: selectedColour,
                size: sizeDef,
            });
            const artwork = {
                id: selectedArtwork.id,
                name: selectedArtwork.name,
                src,
                widthMm: sizeDef.widthMm,
                heightMm: sizeDef.heightMm,
                frameColour: selectedColour,
            };
            const key = `${selectedArtwork.id}|${selectedColour}|${selectedSize}|${srcHash(src)}`;
            const result = launchQuickLook(artwork, key);
            if (!result.ready) await result.promise;
        } catch {
            /* ignore */
        } finally {
            setArLoading(false);
        }
    };

    const handleResetQuicklook = () => {
        clearUsdzCache();
        setArLoading(false);
        setPickerOpen(true);
    };

    const sceneArtwork = composedSrc ? { ...composedArtwork, src: composedSrc } : null;

    const picker = pickerOpen ? (
        <PickerSheet
            selectedArtworkId={selectedArtwork.id}
            selectedColour={selectedColour}
            selectedSize={selectedSize}
            onSelectArtwork={setSelectedArtwork}
            onSelectColour={setSelectedColour}
            onSelectSize={setSelectedSize}
            onClose={closePicker}
        />
    ) : null;

    return (
        <main className="fixed inset-0 overflow-hidden bg-black text-black select-none">
            {sceneArtwork && (mode === 'detecting' || mode === 'pseudo' || mode === 'xr-available' || mode === 'quicklook') && (
                <PseudoAR
                    selected={sceneArtwork}
                    onOpenPicker={openPicker}
                    onReset={mode === 'quicklook' ? handleResetQuicklook : undefined}
                    showReset={mode === 'quicklook'}
                    cameraStopRef={cameraStopRef}
                />
            )}

            {sceneArtwork && mode === 'xr-active' && (
                <WebXRAR
                    selected={sceneArtwork}
                    onOpenPicker={openPicker}
                    onExit={() => setMode('xr-available')}
                    onUnsupported={() => setMode('pseudo')}
                >
                    {picker}
                </WebXRAR>
            )}

            <header className="pointer-events-none absolute top-0 right-0 left-0 flex justify-center pt-[max(env(safe-area-inset-top),12px)]">
                <div
                    className="rounded-full bg-white/90 px-4 py-1.5 backdrop-blur-md"
                    style={{ fontFamily: 'Fraunces', fontSize: 16, fontWeight: 400 }}
                >
                    Letterfest AR Experience
                </div>
            </header>

            <div
                className={`pointer-events-none absolute right-0 bottom-24 left-0 flex justify-center transition-opacity duration-500 ${labelVisible ? 'opacity-100' : 'opacity-0'}`}
            >
                <div
                    className="rounded-full bg-white/90 px-3 py-1 backdrop-blur-md"
                    style={{ fontFamily: 'Inter', fontSize: 11 }}
                >
                    {selectedArtwork.name} · {selectedColour} · {sizeDef.label}
                </div>
            </div>

            {mode === 'xr-available' && (
                <button
                    onClick={() => setMode('xr-active')}
                    className="absolute bottom-[max(env(safe-area-inset-bottom),20px)] left-5 grid h-14 place-items-center rounded-full bg-black px-6 text-white shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45)] transition-transform active:scale-95"
                    style={{ fontFamily: 'Inter', fontSize: 12 }}
                >
                    Activate AR View
                </button>
            )}

            {mode === 'quicklook' && (
                <button
                    onClick={handleQuickLook}
                    disabled={arLoading || !composedSrc}
                    className="absolute bottom-[max(env(safe-area-inset-bottom),20px)] left-5 grid h-14 place-items-center rounded-full bg-black px-6 text-white shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45)] transition-transform active:scale-95 disabled:opacity-60"
                    style={{ fontFamily: 'Inter', fontSize: 12 }}
                >
                    {arLoading ? 'Preparing AR…' : 'Activate AR View'}
                </button>
            )}

            {mode !== 'xr-active' && picker}
        </main>
    );
}
