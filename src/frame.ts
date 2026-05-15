export type FrameColour = 'Oak' | 'Black' | 'White';
export type FrameSize = 'xl-square' | 'large-portrait' | 'small-square';

export type FrameSizeDef = {
    id: FrameSize;
    label: string;
    widthMm: number;
    heightMm: number;
};

export const FRAME_SIZES: FrameSizeDef[] = [
    { id: 'xl-square', label: 'XL', widthMm: 388, heightMm: 388 },
    { id: 'large-portrait', label: 'Large', widthMm: 254, heightMm: 305 },
    { id: 'small-square', label: 'Small', widthMm: 254, heightMm: 254 },
];

export type FrameColourDef = {
    id: FrameColour;
    label: string;
    swatch: string;
};

export const FRAME_COLOURS: FrameColourDef[] = [
    { id: 'Oak', label: 'Oak', swatch: '#B58755' },
    { id: 'Black', label: 'Black', swatch: '#161616' },
    { id: 'White', label: 'White', swatch: '#F2EFEA' },
];

export const FRAME_SIDE_RGB: Record<FrameColour, [number, number, number]> = {
    Oak: [0.71, 0.55, 0.34],
    Black: [0.09, 0.09, 0.09],
    White: [0.93, 0.91, 0.88],
};

export function frameSideHex(c: FrameColour): number {
    const [r, g, b] = FRAME_SIDE_RGB[c];
    return ((Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255)) >>> 0;
}

export function getFrameSize(id: FrameSize): FrameSizeDef {
    return FRAME_SIZES.find((s) => s.id === id) ?? FRAME_SIZES[1];
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(src: string): Promise<HTMLImageElement> {
    const cached = imageCache.get(src);
    if (cached) return cached;
    const p = new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = src;
    });
    imageCache.set(src, p);
    return p;
}

function drawOakFrame(ctx: CanvasRenderingContext2D, w: number, h: number, border: number) {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#E5C49A');
    grad.addColorStop(0.5, '#CFA773');
    grad.addColorStop(1, '#B8884F');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    const grainCount = 140;
    for (let i = 0; i < grainCount; i++) {
        const y = Math.random() * h;
        const alpha = 0.03 + Math.random() * 0.14;
        const choice = Math.random();
        let color: string;
        if (choice < 0.55) color = `rgba(95, 60, 32, ${alpha})`;
        else if (choice < 0.85) color = `rgba(125, 85, 50, ${alpha * 0.9})`;
        else color = `rgba(240, 210, 170, ${alpha * 1.2})`;
        ctx.fillStyle = color;
        const thickness = 0.6 + Math.random() * 2.8;
        ctx.fillRect(0, y, w, thickness);
    }
    const flecks = 18;
    for (let i = 0; i < flecks; i++) {
        const cx = Math.random() * w;
        const cy = Math.random() * h;
        const len = 18 + Math.random() * 60;
        const thick = 1 + Math.random() * 2;
        ctx.fillStyle = `rgba(80, 50, 25, ${0.08 + Math.random() * 0.08})`;
        ctx.fillRect(cx, cy, len, thick);
    }
    ctx.restore();

    ctx.save();
    const inner = ctx.createLinearGradient(0, 0, 0, h);
    inner.addColorStop(0, 'rgba(255, 235, 200, 0.15)');
    inner.addColorStop(1, 'rgba(60, 35, 15, 0.05)');
    ctx.fillStyle = inner;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(border, border, w - border * 2, h - border * 2);
    ctx.restore();
}

function drawBlackFrame(ctx: CanvasRenderingContext2D, w: number, h: number, border: number) {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#22201E');
    grad.addColorStop(0.5, '#141312');
    grad.addColorStop(1, '#1B1A18');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    const grainCount = 140;
    for (let i = 0; i < grainCount; i++) {
        const y = Math.random() * h;
        const alpha = 0.05 + Math.random() * 0.13;
        const choice = Math.random();
        let color: string;
        if (choice < 0.5) color = `rgba(0, 0, 0, ${alpha})`;
        else if (choice < 0.85) color = `rgba(55, 45, 35, ${alpha * 0.9})`;
        else color = `rgba(120, 95, 70, ${alpha * 0.7})`;
        ctx.fillStyle = color;
        const thickness = 0.6 + Math.random() * 2.5;
        ctx.fillRect(0, y, w, thickness);
    }
    const flecks = 16;
    for (let i = 0; i < flecks; i++) {
        const cx = Math.random() * w;
        const cy = Math.random() * h;
        const len = 18 + Math.random() * 50;
        const thick = 1 + Math.random() * 1.8;
        ctx.fillStyle = `rgba(70, 55, 40, ${0.06 + Math.random() * 0.08})`;
        ctx.fillRect(cx, cy, len, thick);
    }
    ctx.restore();

    ctx.save();
    const hi = ctx.createLinearGradient(0, 0, 0, border);
    hi.addColorStop(0, 'rgba(255,255,255,0.05)');
    hi.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hi;
    ctx.fillRect(0, 0, w, border);
    ctx.restore();

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(border, border, w - border * 2, h - border * 2);
}

function drawWhiteFrame(ctx: CanvasRenderingContext2D, w: number, h: number, border: number) {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#FBFAF7');
    grad.addColorStop(0.5, '#F2EEE7');
    grad.addColorStop(1, '#E5DFD4');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    const grainCount = 140;
    for (let i = 0; i < grainCount; i++) {
        const y = Math.random() * h;
        const alpha = 0.025 + Math.random() * 0.07;
        const choice = Math.random();
        let color: string;
        if (choice < 0.55) color = `rgba(160, 140, 110, ${alpha})`;
        else if (choice < 0.85) color = `rgba(110, 90, 65, ${alpha * 0.7})`;
        else color = `rgba(255, 250, 240, ${alpha * 1.2})`;
        ctx.fillStyle = color;
        const thickness = 0.6 + Math.random() * 2.5;
        ctx.fillRect(0, y, w, thickness);
    }
    const flecks = 16;
    for (let i = 0; i < flecks; i++) {
        const cx = Math.random() * w;
        const cy = Math.random() * h;
        const len = 18 + Math.random() * 50;
        const thick = 1 + Math.random() * 1.5;
        ctx.fillStyle = `rgba(130, 110, 85, ${0.04 + Math.random() * 0.06})`;
        ctx.fillRect(cx, cy, len, thick);
    }
    ctx.restore();

    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(border, border, w - border * 2, h - border * 2);
}

function drawFrame(ctx: CanvasRenderingContext2D, w: number, h: number, border: number, colour: FrameColour) {
    if (colour === 'Oak') drawOakFrame(ctx, w, h, border);
    else if (colour === 'Black') drawBlackFrame(ctx, w, h, border);
    else drawWhiteFrame(ctx, w, h, border);
}

export type ComposeParams = {
    bareSrc: string;
    colour: FrameColour;
    size: FrameSizeDef;
};

const composeCache = new Map<string, Promise<string>>();

export function composeFramedArtwork(p: ComposeParams): Promise<string> {
    const key = `${p.bareSrc}|${p.colour}|${p.size.id}`;
    const cached = composeCache.get(key);
    if (cached) return cached;
    const promise = doCompose(p);
    composeCache.set(key, promise);
    return promise;
}

async function doCompose({ bareSrc, colour, size }: ComposeParams): Promise<string> {
    const pxPerMm = 3;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(size.widthMm * pxPerMm);
    canvas.height = Math.round(size.heightMm * pxPerMm);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    const minDim = Math.min(canvas.width, canvas.height);
    const frameBorder = Math.round(minDim * 0.07);
    const matBorder = Math.round(minDim * 0.085);

    drawFrame(ctx, canvas.width, canvas.height, frameBorder, colour);

    const matX = frameBorder;
    const matY = frameBorder;
    const matW = canvas.width - frameBorder * 2;
    const matH = canvas.height - frameBorder * 2;
    ctx.fillStyle = '#F8F4EC';
    ctx.fillRect(matX, matY, matW, matH);

    const artX = matX + matBorder;
    const artY = matY + matBorder;
    const artW = matW - matBorder * 2;
    const artH = matH - matBorder * 2;

    const img = await loadImage(bareSrc);
    const imgAspect = img.width / img.height;
    const areaAspect = artW / artH;
    let drawW: number;
    let drawH: number;
    if (imgAspect > areaAspect) {
        drawW = artW;
        drawH = artW / imgAspect;
    } else {
        drawH = artH;
        drawW = artH * imgAspect;
    }
    const dx = artX + (artW - drawW) / 2;
    const dy = artY + (artH - drawH) / 2;
    ctx.drawImage(img, dx, dy, drawW, drawH);

    ctx.save();
    const inset = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = inset;
    ctx.strokeRect(matX + 0.5, matY + 0.5, matW - 1, matH - 1);
    ctx.restore();

    return canvas.toDataURL('image/jpeg', 0.85);
}

export function srcHash(s: string): string {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
}

export function clearComposeCache() {
    composeCache.clear();
}
