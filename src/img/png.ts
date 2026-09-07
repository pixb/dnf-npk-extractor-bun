/**
 * PNG 导出器
 *
 * 支持 DNF IMG 像素数据到 PNG 转换
 */

import type { ImgFrame, ImgTexture } from '../img/types.js';

/**
 * BGRA 到 RGBA 转换
 */
function bgraToRgba(bgra: Buffer): Buffer {
    const rgba = Buffer.alloc(bgra.length);
    for (let i = 0; i < bgra.length; i += 4) {
        rgba[i] = bgra[i + 2];     // R
        rgba[i + 1] = bgra[i + 1]; // G
        rgba[i + 2] = bgra[i];     // B
        rgba[i + 3] = bgra[i + 3]; // A
    }
    return rgba;
}

/**
 * 简单的 PNG 编码器
 */
function encodePng(width: number, height: number, rgba: Buffer): Buffer {
    // PNG 文件签名
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR 块
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 6;  // color type: RGBA
    ihdr[10] = 0; // compression method
    ihdr[11] = 0; // filter method
    ihdr[12] = 0; // interlace method

    // IDAT 块 (原始图像数据)
    const rawSize = height * (1 + width * 4); // filter byte + pixel data per row
    const raw = Buffer.alloc(rawSize);
    let rawPos = 0;

    for (let y = 0; y < height; y++) {
        raw[rawPos++] = 0; // filter: None
        const rowStart = y * width * 4;
        rgba.copy(raw, rawPos, rowStart, rowStart + width * 4);
        rawPos += width * 4;
    }

    // 使用 Bun 的 deflateSync 压缩
    const compressed = Buffer.from(Bun.deflateSync(raw));

    // 构建 PNG
    const chunks: Buffer[] = [];

    // 签名
    chunks.push(signature);

    // IHDR
    chunks.push(createChunk('IHDR', ihdr));

    // IDAT
    chunks.push(createChunk('IDAT', compressed));

    // IEND
    chunks.push(createChunk('IEND', Buffer.alloc(0)));

    return Buffer.concat(chunks);
}

/**
 * 创建 PNG 块
 */
function createChunk(type: string, data: Buffer): Buffer {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);

    const typeBuffer = Buffer.from(type, 'ascii');
    const crcData = Buffer.concat([typeBuffer, data]);

    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcData), 0);

    return Buffer.concat([length, typeBuffer, data, crc]);
}

/**
 * CRC32 计算
 */
function crc32(data: Buffer): number {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
        crc ^= data[i];
        for (let j = 0; j < 8; j++) {
            if (crc & 1) {
                crc = (crc >>> 1) ^ 0xEDB88320;
            } else {
                crc = crc >>> 1;
            }
        }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * 导出帧为 PNG
 */
export function exportFrameToPng(frame: ImgFrame): Buffer | null {
    if (!frame.data) {
        return null;
    }

    // 解压像素数据
    let rawData: Buffer;
    switch (frame.compression) {
        case 0:
            rawData = frame.data;
            break;
        case 1:
            try {
                rawData = Buffer.from(Bun.inflateSync(frame.data));
            } catch {
                return null;
            }
            break;
        default:
            return null;
    }

    // 验证数据大小
    const expectedSize = frame.width * frame.height * 4;
    if (rawData.length < expectedSize) {
        return null;
    }

    // BGRA 转 RGBA
    const rgba = bgraToRgba(rawData.subarray(0, expectedSize));

    // 编码 PNG
    return encodePng(frame.width, frame.height, rgba);
}

/**
 * 导出纹理为 PNG
 */
export function exportTextureToPng(texture: ImgTexture): Buffer {
    // BGRA 转 RGBA
    const rgba = bgraToRgba(texture.pixels);

    // 编码 PNG
    return encodePng(texture.width, texture.height, rgba);
}
