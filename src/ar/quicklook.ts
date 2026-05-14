import type { SceneArtwork } from '@/artworks';
import { buildArtworkUsdz } from '@/ar/usdz';

type Artwork = SceneArtwork;

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

export function clearUsdzCache(): void {
    cache.forEach((url) => URL.revokeObjectURL(url));
    cache.clear();
}

export function isIOS(): boolean {
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1);
}

export function supportsQuickLook(): boolean {
    const a = document.createElement('a');
    return isIOS() && !!a.relList && !!a.relList.supports && a.relList.supports('ar');
}

async function buildUsdz(artwork: Artwork, key: string): Promise<string> {
    const data = await buildArtworkUsdz(artwork);
    const blob = new Blob([data as BlobPart], { type: 'model/vnd.usdz+zip' });
    const url = URL.createObjectURL(blob);
    cache.set(key, url);
    return url;
}

export function prebuildUsdz(artwork: Artwork, key?: string): Promise<string> {
    const cacheKey = key ?? artwork.id;
    const existing = cache.get(cacheKey);
    if (existing) return Promise.resolve(existing);
    const pending = inflight.get(cacheKey);
    if (pending) return pending;
    const p = buildUsdz(artwork, cacheKey).finally(() => {
        inflight.delete(cacheKey);
    });
    inflight.set(cacheKey, p);
    return p;
}

function triggerQuickLookClick(url: string): void {
    const a = document.createElement('a');
    a.setAttribute('rel', 'ar');
    a.setAttribute('href', `${url}#allowsContentScaling=0`);
    const img = document.createElement('img');
    a.appendChild(img);
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        if (a.parentNode) a.parentNode.removeChild(a);
    }, 0);
}

export type LaunchResult = { ready: true } | { ready: false; promise: Promise<void> };

export function launchQuickLook(artwork: Artwork, key?: string): LaunchResult {
    const cacheKey = key ?? artwork.id;
    const cached = cache.get(cacheKey);
    if (cached) {
        triggerQuickLookClick(cached);
        return { ready: true };
    }
    const promise = prebuildUsdz(artwork, cacheKey).then((url) => {
        triggerQuickLookClick(url);
    });
    return { ready: false, promise };
}
