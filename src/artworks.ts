export type Aspect = 'square' | 'portrait';

export type Artwork = {
    id: string;
    name: string;
    bareSrc: string;
    aspect: Aspect;
};

export type SceneArtwork = {
    id: string;
    name: string;
    src: string;
    widthMm: number;
    heightMm: number;
    frameColour: 'Oak' | 'Black' | 'White';
};

export const DEFAULT_ARTWORK_ID = 'portrait-d';

export function getDefaultArtwork(): Artwork {
    return ARTWORKS.find((a) => a.id === DEFAULT_ARTWORK_ID) ?? ARTWORKS[0];
}

export const ARTWORKS: Artwork[] = [
    { id: 'xl-square', name: 'XL Square', bareSrc: '/artworks/products/xl-square.jpg', aspect: 'square' },
    { id: 'square-a', name: 'Square A', bareSrc: '/artworks/products/square-a.jpg', aspect: 'square' },
    { id: 'square-b', name: 'Square B', bareSrc: '/artworks/products/square-b.jpg', aspect: 'square' },
    { id: 'portrait-a', name: 'Portrait A', bareSrc: '/artworks/products/portrait-a.jpg', aspect: 'portrait' },
    { id: 'portrait-b', name: 'Portrait B', bareSrc: '/artworks/products/portrait-b.jpg', aspect: 'portrait' },
    { id: 'portrait-c', name: 'Portrait C', bareSrc: '/artworks/products/portrait-c.jpg', aspect: 'portrait' },
    { id: 'portrait-d', name: 'Portrait D', bareSrc: '/artworks/products/portrait-d.jpg', aspect: 'portrait' },
];
