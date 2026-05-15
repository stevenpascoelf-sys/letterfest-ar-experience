import type { SceneArtwork } from '@/artworks';
import { FRAME_SIDE_RGB } from '@/frame';

type Artwork = SceneArtwork;

const SHADOW_PAD_RATIO = 0.22;
const SHADOW_DROP_RATIO = 0.14;
const SHADOW_DEPTH_M = 0.003;
const SHADOW_OPACITY = 0.7;
const FRAME_DEPTH_M = 0.02;

function makeCrc32Table(): Uint32Array {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
    }
    return table;
}
const CRC_TABLE = makeCrc32Table();

function crc32(data: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    return (~crc) >>> 0;
}

function buildUsda(artwork: Artwork): Uint8Array {
    const widthM = artwork.widthMm / 1000;
    const heightM = artwork.heightMm / 1000;
    const w = widthM / 2;
    const h = heightM / 2;
    const d = FRAME_DEPTH_M;
    const zBack = SHADOW_DEPTH_M + 0.0005;
    const zFront = zBack + d;

    const sw = (widthM * (1 + 2 * SHADOW_PAD_RATIO)) / 2;
    const sh = (heightM * (1 + 2 * SHADOW_PAD_RATIO)) / 2;
    const cy = -heightM * SHADOW_DROP_RATIO;
    const cz = SHADOW_DEPTH_M;

    const [sR, sG, sB] = FRAME_SIDE_RGB[artwork.frameColour];

    const text = `#usda 1.0
(
    defaultPrim = "Frame"
    metersPerUnit = 1
    upAxis = "Y"
)

def Xform "Frame" (
    assetInfo = {
        string name = "Frame"
    }
    kind = "component"
    prepend apiSchemas = ["Preliminary_AnchoringAPI"]
)
{
    token preliminary:anchoring:type = "plane"
    token preliminary:planeAnchoring:alignment = "vertical"


    def Mesh "ShadowQuad"
    {
        float3[] extent = [(${-sw}, ${cy - sh}, ${cz}), (${sw}, ${cy + sh}, ${cz})]
        int[] faceVertexCounts = [4]
        int[] faceVertexIndices = [0, 1, 2, 3]
        point3f[] points = [(${-sw}, ${cy - sh}, ${cz}), (${sw}, ${cy - sh}, ${cz}), (${sw}, ${cy + sh}, ${cz}), (${-sw}, ${cy + sh}, ${cz})]
        normal3f[] primvars:normals = [(0, 0, 1), (0, 0, 1), (0, 0, 1), (0, 0, 1)] (
            interpolation = "vertex"
        )
        texCoord2f[] primvars:st = [(0, 0), (1, 0), (1, 1), (0, 1)] (
            interpolation = "vertex"
        )
        uniform token subdivisionScheme = "none"
        rel material:binding = </Frame/ShadowMaterial>
    }

    def Material "ShadowMaterial"
    {
        token outputs:surface.connect = </Frame/ShadowMaterial/ShadowShader.outputs:surface>

        def Shader "ShadowShader"
        {
            uniform token info:id = "UsdPreviewSurface"
            color3f inputs:diffuseColor = (0, 0, 0)
            float inputs:metallic = 0
            float inputs:roughness = 1
            float inputs:opacity.connect = </Frame/ShadowMaterial/ShadowAlphaTex.outputs:a>
            int inputs:useSpecularWorkflow = 0
            token outputs:surface
        }

        def Shader "ShadowAlphaTex"
        {
            uniform token info:id = "UsdUVTexture"
            asset inputs:file = @0/shadow.png@
            float2 inputs:st.connect = </Frame/ShadowMaterial/ShadowSTReader.outputs:result>
            token inputs:wrapS = "clamp"
            token inputs:wrapT = "clamp"
            float outputs:a
        }

        def Shader "ShadowSTReader"
        {
            uniform token info:id = "UsdPrimvarReader_float2"
            token inputs:varname = "st"
            float2 outputs:result
        }
    }

    def Mesh "FrontQuad"
    {
        float3[] extent = [(${-w}, ${-h}, ${zFront}), (${w}, ${h}, ${zFront})]
        int[] faceVertexCounts = [4]
        int[] faceVertexIndices = [0, 1, 2, 3]
        point3f[] points = [(${-w}, ${-h}, ${zFront}), (${w}, ${-h}, ${zFront}), (${w}, ${h}, ${zFront}), (${-w}, ${h}, ${zFront})]
        normal3f[] primvars:normals = [(0, 0, 1), (0, 0, 1), (0, 0, 1), (0, 0, 1)] (interpolation = "vertex")
        texCoord2f[] primvars:st = [(0, 0), (1, 0), (1, 1), (0, 1)] (interpolation = "vertex")
        uniform token subdivisionScheme = "none"
        rel material:binding = </Frame/PreviewMaterial>
    }

    def Mesh "TopQuad"
    {
        float3[] extent = [(${-w}, ${h}, ${zBack}), (${w}, ${h}, ${zFront})]
        int[] faceVertexCounts = [4]
        int[] faceVertexIndices = [0, 1, 2, 3]
        point3f[] points = [(${-w}, ${h}, ${zBack}), (${-w}, ${h}, ${zFront}), (${w}, ${h}, ${zFront}), (${w}, ${h}, ${zBack})]
        normal3f[] primvars:normals = [(0, 1, 0), (0, 1, 0), (0, 1, 0), (0, 1, 0)] (interpolation = "vertex")
        texCoord2f[] primvars:st = [(0, 0), (1, 0), (1, 1), (0, 1)] (interpolation = "vertex")
        uniform token subdivisionScheme = "none"
        rel material:binding = </Frame/SideMaterial>
    }

    def Mesh "BottomQuad"
    {
        float3[] extent = [(${-w}, ${-h}, ${zBack}), (${w}, ${-h}, ${zFront})]
        int[] faceVertexCounts = [4]
        int[] faceVertexIndices = [0, 1, 2, 3]
        point3f[] points = [(${-w}, ${-h}, ${zFront}), (${-w}, ${-h}, ${zBack}), (${w}, ${-h}, ${zBack}), (${w}, ${-h}, ${zFront})]
        normal3f[] primvars:normals = [(0, -1, 0), (0, -1, 0), (0, -1, 0), (0, -1, 0)] (interpolation = "vertex")
        texCoord2f[] primvars:st = [(0, 0), (1, 0), (1, 1), (0, 1)] (interpolation = "vertex")
        uniform token subdivisionScheme = "none"
        rel material:binding = </Frame/SideMaterial>
    }

    def Mesh "RightQuad"
    {
        float3[] extent = [(${w}, ${-h}, ${zBack}), (${w}, ${h}, ${zFront})]
        int[] faceVertexCounts = [4]
        int[] faceVertexIndices = [0, 1, 2, 3]
        point3f[] points = [(${w}, ${-h}, ${zFront}), (${w}, ${-h}, ${zBack}), (${w}, ${h}, ${zBack}), (${w}, ${h}, ${zFront})]
        normal3f[] primvars:normals = [(1, 0, 0), (1, 0, 0), (1, 0, 0), (1, 0, 0)] (interpolation = "vertex")
        texCoord2f[] primvars:st = [(0, 0), (1, 0), (1, 1), (0, 1)] (interpolation = "vertex")
        uniform token subdivisionScheme = "none"
        rel material:binding = </Frame/SideMaterial>
    }

    def Mesh "LeftQuad"
    {
        float3[] extent = [(${-w}, ${-h}, ${zBack}), (${-w}, ${h}, ${zFront})]
        int[] faceVertexCounts = [4]
        int[] faceVertexIndices = [0, 1, 2, 3]
        point3f[] points = [(${-w}, ${-h}, ${zBack}), (${-w}, ${-h}, ${zFront}), (${-w}, ${h}, ${zFront}), (${-w}, ${h}, ${zBack})]
        normal3f[] primvars:normals = [(-1, 0, 0), (-1, 0, 0), (-1, 0, 0), (-1, 0, 0)] (interpolation = "vertex")
        texCoord2f[] primvars:st = [(0, 0), (1, 0), (1, 1), (0, 1)] (interpolation = "vertex")
        uniform token subdivisionScheme = "none"
        rel material:binding = </Frame/SideMaterial>
    }

    def Material "PreviewMaterial"
    {
        token outputs:surface.connect = </Frame/PreviewMaterial/PBRShader.outputs:surface>

        def Shader "PBRShader"
        {
            uniform token info:id = "UsdPreviewSurface"
            color3f inputs:diffuseColor.connect = </Frame/PreviewMaterial/DiffuseTex.outputs:rgb>
            float inputs:metallic = 0
            float inputs:roughness = 0.4
            int inputs:useSpecularWorkflow = 0
            token outputs:surface
        }

        def Shader "DiffuseTex"
        {
            uniform token info:id = "UsdUVTexture"
            asset inputs:file = @0/texture.jpg@
            float2 inputs:st.connect = </Frame/PreviewMaterial/STReader.outputs:result>
            token inputs:wrapS = "clamp"
            token inputs:wrapT = "clamp"
            float3 outputs:rgb
        }

        def Shader "STReader"
        {
            uniform token info:id = "UsdPrimvarReader_float2"
            token inputs:varname = "st"
            float2 outputs:result
        }
    }

    def Material "SideMaterial"
    {
        token outputs:surface.connect = </Frame/SideMaterial/SideShader.outputs:surface>

        def Shader "SideShader"
        {
            uniform token info:id = "UsdPreviewSurface"
            color3f inputs:diffuseColor = (${sR}, ${sG}, ${sB})
            float inputs:metallic = 0
            float inputs:roughness = 0.7
            int inputs:useSpecularWorkflow = 0
            token outputs:surface
        }
    }
}
`;
    return new TextEncoder().encode(text);
}

type ZipEntry = { name: string; data: Uint8Array };

function packUsdz(entries: ZipEntry[]): Uint8Array {
    const enc = new TextEncoder();
    const processed = entries.map((e) => ({
        name: enc.encode(e.name),
        data: e.data,
        crc: crc32(e.data),
        localOffset: 0,
        extraLen: 0,
    }));

    let offset = 0;
    for (const p of processed) {
        const baseHeader = 30 + p.name.length;
        const dataStart = offset + baseHeader;
        const pad = (64 - (dataStart % 64)) % 64;
        p.localOffset = offset;
        p.extraLen = pad;
        offset += baseHeader + pad + p.data.length;
    }

    const cdirStart = offset;
    let cdirSize = 0;
    for (const p of processed) cdirSize += 46 + p.name.length;
    const totalSize = cdirStart + cdirSize + 22;
    const buf = new Uint8Array(totalSize);
    const view = new DataView(buf.buffer);

    for (const p of processed) {
        let pos = p.localOffset;
        view.setUint32(pos, 0x04034b50, true); pos += 4;
        view.setUint16(pos, 20, true); pos += 2;
        view.setUint16(pos, 0, true); pos += 2;
        view.setUint16(pos, 0, true); pos += 2;
        view.setUint16(pos, 0, true); pos += 2;
        view.setUint16(pos, 0, true); pos += 2;
        view.setUint32(pos, p.crc, true); pos += 4;
        view.setUint32(pos, p.data.length, true); pos += 4;
        view.setUint32(pos, p.data.length, true); pos += 4;
        view.setUint16(pos, p.name.length, true); pos += 2;
        view.setUint16(pos, p.extraLen, true); pos += 2;
        buf.set(p.name, pos); pos += p.name.length;
        pos += p.extraLen;
        buf.set(p.data, pos);
    }

    let cd = cdirStart;
    for (const p of processed) {
        view.setUint32(cd, 0x02014b50, true); cd += 4;
        view.setUint16(cd, 20, true); cd += 2;
        view.setUint16(cd, 20, true); cd += 2;
        view.setUint16(cd, 0, true); cd += 2;
        view.setUint16(cd, 0, true); cd += 2;
        view.setUint16(cd, 0, true); cd += 2;
        view.setUint16(cd, 0, true); cd += 2;
        view.setUint32(cd, p.crc, true); cd += 4;
        view.setUint32(cd, p.data.length, true); cd += 4;
        view.setUint32(cd, p.data.length, true); cd += 4;
        view.setUint16(cd, p.name.length, true); cd += 2;
        view.setUint16(cd, 0, true); cd += 2;
        view.setUint16(cd, 0, true); cd += 2;
        view.setUint16(cd, 0, true); cd += 2;
        view.setUint16(cd, 0, true); cd += 2;
        view.setUint32(cd, 0, true); cd += 4;
        view.setUint32(cd, p.localOffset, true); cd += 4;
        buf.set(p.name, cd); cd += p.name.length;
    }

    let e = cdirStart + cdirSize;
    view.setUint32(e, 0x06054b50, true); e += 4;
    view.setUint16(e, 0, true); e += 2;
    view.setUint16(e, 0, true); e += 2;
    view.setUint16(e, processed.length, true); e += 2;
    view.setUint16(e, processed.length, true); e += 2;
    view.setUint32(e, cdirSize, true); e += 4;
    view.setUint32(e, cdirStart, true); e += 4;
    view.setUint16(e, 0, true);

    return buf;
}

const jpgCache = new Map<string, Uint8Array>();

async function fetchJpg(src: string): Promise<Uint8Array> {
    const cached = jpgCache.get(src);
    if (cached) return cached;
    const r = await fetch(src);
    if (!r.ok) throw new Error(`Failed to fetch ${src}: ${r.status}`);
    const buf = new Uint8Array(await r.arrayBuffer());
    jpgCache.set(src, buf);
    return buf;
}

let shadowPngCache: Uint8Array | null = null;

async function getShadowPng(): Promise<Uint8Array> {
    if (shadowPngCache) return shadowPngCache;
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.clearRect(0, 0, size, size);

    const pad = size * 0.30;
    const r = pad * 0.45;
    ctx.shadowBlur = pad * 2.0;
    ctx.shadowColor = `rgba(0, 0, 0, ${SHADOW_OPACITY})`;
    ctx.fillStyle = `rgba(0, 0, 0, ${SHADOW_OPACITY})`;
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

    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))), 'image/png');
    });
    const buf = new Uint8Array(await blob.arrayBuffer());
    shadowPngCache = buf;
    return buf;
}

export async function buildArtworkUsdz(artwork: Artwork): Promise<Uint8Array> {
    const [jpg, shadow] = await Promise.all([fetchJpg(artwork.src), getShadowPng()]);
    const usda = buildUsda(artwork);
    return packUsdz([
        { name: `${artwork.id}.usda`, data: usda },
        { name: '0/texture.jpg', data: jpg },
        { name: '0/shadow.png', data: shadow },
    ]);
}
