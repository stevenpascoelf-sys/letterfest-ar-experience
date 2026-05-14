import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDefaultArtwork } from '@/artworks';
import { composeFramedArtwork, getFrameSize } from '@/frame';

const ORDER_NUMBER = 'LF338098';

export default function ProofPage() {
    const navigate = useNavigate();
    const [proofSrc, setProofSrc] = useState<string | null>(null);
    const [addOnsOpen, setAddOnsOpen] = useState(true);
    const artwork = getDefaultArtwork();

    useEffect(() => {
        let cancelled = false;
        composeFramedArtwork({
            bareSrc: artwork.bareSrc,
            colour: 'Oak',
            size: getFrameSize('large-portrait'),
        })
            .then((src) => {
                if (!cancelled) setProofSrc(src);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [artwork.bareSrc]);

    return (
        <main className="min-h-screen bg-neutral-50" style={{ fontFamily: 'Inter' }}>
            <header className="relative flex h-14 items-center justify-center border-b border-black/5 bg-white">
                <div
                    className="absolute top-1/2 left-4 -translate-y-1/2 rounded-md bg-black/[0.04] px-2 py-1 text-black/60"
                    style={{ fontSize: 11 }}
                >
                    #{ORDER_NUMBER}
                </div>
                <div style={{ fontFamily: 'Fraunces', fontSize: 20, fontWeight: 500 }}>Letterfest</div>
            </header>

            <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-8 lg:flex-row lg:items-start">
                <div className="flex flex-1 flex-col items-center gap-6">
                    <div className="w-full max-w-md">
                        <div className="rounded-sm bg-neutral-200 p-4 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)]">
                            <div
                                className="relative aspect-[254/305] w-full overflow-hidden rounded-sm"
                                style={{
                                    background:
                                        "repeating-linear-gradient(0deg, #FCFAF6 0px, #FCFAF6 18px, #F4F0E7 18px, #F4F0E7 19px), repeating-linear-gradient(90deg, transparent 0px, transparent 18px, rgba(0,0,0,0.025) 18px, rgba(0,0,0,0.025) 19px)",
                                }}
                            >
                                {proofSrc ? (
                                    <img
                                        src={proofSrc}
                                        alt="Proof"
                                        className="absolute inset-0 h-full w-full object-contain"
                                        style={{
                                            boxShadow: '0 18px 40px -16px rgba(0,0,0,0.35)',
                                        }}
                                    />
                                ) : (
                                    <div className="absolute inset-6 animate-pulse rounded-sm bg-neutral-100" />
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/ar')}
                        disabled={!proofSrc}
                        className="rounded-full bg-black px-7 py-3.5 text-center text-white shadow-[0_10px_28px_-8px_rgba(0,0,0,0.4)] transition-transform active:scale-95 disabled:opacity-60"
                        style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 500 }}
                    >
                        Go to AR view
                    </button>
                </div>

                <aside className="flex w-full max-w-md flex-col gap-4 lg:w-96">
                    <div>
                        <h2
                            className="mb-3"
                            style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 600 }}
                        >
                            <em className="italic font-normal">Your</em> Proof
                        </h2>
                        <p className="text-black/70" style={{ fontSize: 13, lineHeight: 1.5 }}>
                            <strong className="font-medium text-black">Please check carefully</strong> — since this
                            is a bespoke order, corrections later may incur extra costs. Once approved, we'll prepare
                            your order for dispatch.
                        </p>
                    </div>

                    <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
                        <InfoIcon />
                        <div className="text-blue-900" style={{ fontSize: 12, lineHeight: 1.4 }}>
                            Requesting changes may extend the delivery timeline of your order.
                        </div>
                    </div>

                    <div className="border-t border-black/5 pt-4">
                        <div className="mb-2 text-black/70" style={{ fontSize: 12 }}>
                            Ready to approve?
                        </div>
                        <button
                            className="h-11 w-full rounded-lg bg-black text-white transition-transform active:scale-[0.99]"
                            style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 500 }}
                        >
                            Approve proof
                        </button>
                        <div className="mt-3 mb-2 text-black/70" style={{ fontSize: 12 }}>
                            Got changes?
                        </div>
                        <button
                            className="h-11 w-full rounded-lg border border-black/15 bg-white transition-transform active:scale-[0.99]"
                            style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 500 }}
                        >
                            Request amends
                        </button>
                    </div>

                    <div className="rounded-2xl border border-black/8 bg-white p-3">
                        <button
                            onClick={() => setAddOnsOpen((v) => !v)}
                            className="flex w-full items-center justify-between px-1 py-1"
                            style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 500 }}
                        >
                            <span>Buy add-ons</span>
                            <span className="grid h-6 w-6 place-items-center rounded-full border border-black/15 text-black/60">
                                {addOnsOpen ? '−' : '+'}
                            </span>
                        </button>

                        {addOnsOpen && (
                            <div className="mt-2 flex flex-col gap-2">
                                <AddOn
                                    icon={<RushIcon />}
                                    title="Get my order sooner"
                                    description="Upgrade to express shipping"
                                />
                                <AddOn
                                    icon={
                                        <ThumbWithBadge
                                            src={artwork.bareSrc}
                                            badge="JPEG"
                                        />
                                    }
                                    title="Digital Download"
                                    description="High-quality digital download"
                                />
                                <AddOn
                                    icon={<StackedThumbs src={artwork.bareSrc} />}
                                    title="Order a Copy"
                                    description="White framed"
                                />
                                <AddOn
                                    icon={<SingleThumb src={artwork.bareSrc} />}
                                    title="Update your Frame"
                                    description="Update your frame choice"
                                />
                            </div>
                        )}
                    </div>

                    <div
                        className="mt-2 flex items-center justify-between text-black/55"
                        style={{ fontSize: 12 }}
                    >
                        <div>
                            Something wrong?{' '}
                            <a
                                href="#"
                                onClick={(e) => e.preventDefault()}
                                className="underline underline-offset-2"
                            >
                                Contact customer service
                            </a>
                        </div>
                    </div>
                </aside>
            </div>
        </main>
    );
}

function AddOn({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <button className="flex items-center gap-3 rounded-xl border border-black/8 bg-white px-3 py-2.5 text-left transition active:bg-black/[0.02]">
            <div className="h-12 w-12 flex-shrink-0">{icon}</div>
            <div className="min-w-0 flex-1">
                <div style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 500 }}>{title}</div>
                <div className="text-black/55" style={{ fontSize: 11 }}>
                    {description}
                </div>
            </div>
        </button>
    );
}

function InfoIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            className="mt-0.5 flex-shrink-0 text-blue-600"
        >
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="12" cy="8" r="1" fill="currentColor" />
            <path d="M12 11v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );
}

function RushIcon() {
    return (
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-100">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-emerald-700">
                <path
                    d="M4 12a8 8 0 0 1 14-5.3L20 4v6h-6l2.7-2.7A6 6 0 1 0 18 12"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </div>
    );
}

function ThumbWithBadge({ src, badge }: { src: string; badge: string }) {
    return (
        <div className="relative h-12 w-12 overflow-hidden rounded-md bg-neutral-100 ring-1 ring-black/8">
            <img src={src} alt="" className="h-full w-full object-cover" />
            <div
                className="absolute top-0.5 left-0.5 rounded-sm bg-white/90 px-1 text-black/70"
                style={{ fontSize: 8, fontWeight: 600 }}
            >
                {badge}
            </div>
        </div>
    );
}

function StackedThumbs({ src }: { src: string }) {
    return (
        <div className="relative h-12 w-12">
            <div className="absolute top-1 right-0 h-10 w-10 overflow-hidden rounded-md bg-neutral-100 ring-1 ring-black/8">
                <img src={src} alt="" className="h-full w-full object-cover opacity-60" />
            </div>
            <div className="absolute bottom-0 left-0 h-10 w-10 overflow-hidden rounded-md bg-neutral-100 ring-1 ring-black/8">
                <img src={src} alt="" className="h-full w-full object-cover" />
            </div>
        </div>
    );
}

function SingleThumb({ src }: { src: string }) {
    return (
        <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-md bg-neutral-100 p-1 ring-1 ring-black/8">
            <img src={src} alt="" className="max-h-full max-w-full object-contain" />
        </div>
    );
}
