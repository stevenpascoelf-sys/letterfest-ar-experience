import { ARTWORKS, type Artwork } from '@/artworks';
import { COMPATIBLE_SIZES, FRAME_COLOURS, FRAME_SIZES, type FrameColour, type FrameSize } from '@/frame';

type Props = {
    selectedArtworkId: string;
    selectedColour: FrameColour;
    selectedSize: FrameSize;
    onSelectArtwork: (a: Artwork) => void;
    onSelectColour: (c: FrameColour) => void;
    onSelectSize: (s: FrameSize) => void;
    onClose: () => void;
};

export default function PickerSheet({
    selectedArtworkId,
    selectedColour,
    selectedSize,
    onSelectArtwork,
    onSelectColour,
    onSelectSize,
    onClose,
}: Props) {
    const selectedArtwork = ARTWORKS.find((a) => a.id === selectedArtworkId) ?? ARTWORKS[0];
    const allowedSizes = new Set(COMPATIBLE_SIZES[selectedArtwork.aspect]);
    return (
        <div
            className="absolute inset-0 z-20 flex flex-col justify-end bg-black/40"
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
        >
            <div
                className="max-h-[88vh] overflow-hidden rounded-t-3xl bg-white"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-5 pt-3">
                    <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15" />
                </div>

                <div className="px-5 pb-3">
                    <div className="mb-2 text-black/60" style={{ fontFamily: 'Inter', fontSize: 11 }}>
                        Frame colour
                    </div>
                    <div className="flex gap-2">
                        {FRAME_COLOURS.map((c) => {
                            const active = c.id === selectedColour;
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => onSelectColour(c.id)}
                                    className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2 ring-1 transition ${
                                        active ? 'ring-black' : 'ring-black/10'
                                    }`}
                                    style={{ fontFamily: 'Inter', fontSize: 11 }}
                                >
                                    <span
                                        className="h-4 w-4 rounded-full ring-1 ring-black/15"
                                        style={{ background: c.swatch }}
                                    />
                                    {c.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="px-5 pb-3">
                    <div className="mb-2 text-black/60" style={{ fontFamily: 'Inter', fontSize: 11 }}>
                        Frame size
                    </div>
                    <div className="flex gap-2">
                        {FRAME_SIZES.map((s) => {
                            const active = s.id === selectedSize;
                            const allowed = allowedSizes.has(s.id);
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => allowed && onSelectSize(s.id)}
                                    disabled={!allowed}
                                    className={`flex-1 rounded-full py-2 ring-1 transition ${
                                        active && allowed ? 'ring-black' : 'ring-black/10'
                                    } ${allowed ? '' : 'opacity-35'}`}
                                    style={{ fontFamily: 'Inter', fontSize: 11 }}
                                >
                                    {s.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="px-5 pb-3 text-black/60" style={{ fontFamily: 'Inter', fontSize: 11 }}>
                    Artwork
                </div>
                <div
                    className="grid grid-cols-3 gap-3 overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),20px)]"
                    style={{ maxHeight: '55vh' }}
                >
                    {ARTWORKS.map((a) => {
                        const isActive = a.id === selectedArtworkId;
                        return (
                            <button
                                key={a.id}
                                onClick={() => onSelectArtwork(a)}
                                className={`flex aspect-square items-center justify-center rounded-xl bg-neutral-50 p-2 ring-1 transition ${
                                    isActive ? 'ring-black' : 'ring-black/10'
                                }`}
                            >
                                <img
                                    src={a.bareSrc}
                                    alt=""
                                    draggable={false}
                                    className="max-h-full max-w-full object-contain"
                                />
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
