/**
 * IMG 文件读取器
 *
 * 支持 DNF (Dungeon & Fighters) IMG 图像格式
 * 版本: 2, 4, 5, 6
 */

import type { ImgArchive, ImgFrame, ImgHeader, ImgTexture } from "./types.js";

/**
 * 读取 IMG 文件
 */
export function readImg(buffer: Buffer): ImgArchive {
	if (buffer.length < 16) {
		throw new Error("IMG 文件太小");
	}

	// 读取头部
	const header: ImgHeader = {
		magic: buffer.readUInt32LE(0),
		version: buffer.readUInt32LE(4),
		frameCount: buffer.readUInt32LE(8),
		width: buffer.readUInt32LE(12),
		height: buffer.readUInt32LE(16),
		colorKey: buffer.readUInt32LE(20),
	};

	console.log("IMG Header:");
	console.log(`  Magic: 0x${header.magic.toString(16)}`);
	console.log(`  Version: ${header.version}`);
	console.log(`  FrameCount: ${header.frameCount}`);
	console.log(`  Size: ${header.width}x${header.height}`);
	console.log(`  ColorKey: 0x${header.colorKey.toString(16)}`);

	// 根据版本读取帧
	const frames: ImgFrame[] = [];
	let pos = 24;

	switch (header.version) {
		case 2:
		case 4:
			// 版本 2/4: 直接存储帧数据
			for (let i = 0; i < header.frameCount; i++) {
				if (pos + 20 > buffer.length) {
					throw new Error(`帧 ${i} 数据不足`);
				}

				const frame: ImgFrame = {
					width: buffer.readUInt32LE(pos),
					height: buffer.readUInt32LE(pos + 4),
					offset: {
						x: buffer.readInt32LE(pos + 8),
						y: buffer.readInt32LE(pos + 12),
					},
					dataSize: buffer.readUInt32LE(pos + 16),
					compression: 0,
					type: header.version === 2 ? 2 : 4,
				};

				// 读取像素数据
				pos += 20;
				if (pos + frame.dataSize > buffer.length) {
					throw new Error(`帧 ${i} 像素数据不足`);
				}
				frame.data = buffer.subarray(pos, pos + frame.dataSize);
				pos += frame.dataSize;

				frames.push(frame);
			}
			break;

		case 5:
		case 6:
			// 版本 5/6: 带压缩类型
			for (let i = 0; i < header.frameCount; i++) {
				if (pos + 24 > buffer.length) {
					throw new Error(`帧 ${i} 数据不足`);
				}

				const frame: ImgFrame = {
					width: buffer.readUInt32LE(pos),
					height: buffer.readUInt32LE(pos + 4),
					offset: {
						x: buffer.readInt32LE(pos + 8),
						y: buffer.readInt32LE(pos + 12),
					},
					dataSize: buffer.readUInt32LE(pos + 16),
					compression: buffer.readUInt32LE(pos + 20),
					type: header.version === 5 ? 5 : 6,
				};

				// 读取像素数据
				pos += 24;
				if (pos + frame.dataSize > buffer.length) {
					throw new Error(`帧 ${i} 像素数据不足`);
				}
				frame.data = buffer.subarray(pos, pos + frame.dataSize);
				pos += frame.dataSize;

				frames.push(frame);
			}
			break;

		default:
			throw new Error(`不支持的 IMG 版本: ${header.version}`);
	}

	console.log(`  Parsed ${frames.length} frames`);

	return {
		header,
		frames,
		data: buffer,
	};
}

/**
 * 解码帧像素数据为 BGRA
 */
export function decodeFrame(frame: ImgFrame): Buffer | null {
	if (!frame.data) {
		return null;
	}

	// 根据压缩类型解压
	let rawData: Buffer;
	switch (frame.compression) {
		case 0:
			// 无压缩
			rawData = frame.data;
			break;
		case 1:
			// Zlib 压缩
			try {
				rawData = Buffer.from(Bun.inflateSync(new Uint8Array(frame.data)));
			} catch {
				return null;
			}
			break;
		default:
			return null;
	}

	// 根据像素格式解码
	const pixelCount = frame.width * frame.height;
	const expectedSize = pixelCount * 4; // BGRA

	if (rawData.length < expectedSize) {
		return null;
	}

	// 直接返回 BGRA 数据
	return rawData.subarray(0, expectedSize);
}

/**
 * 获取帧纹理
 */
export function getFrameTexture(frame: ImgFrame): ImgTexture | null {
	const pixels = decodeFrame(frame);
	if (!pixels) {
		return null;
	}

	return {
		width: frame.width,
		height: frame.height,
		pixels,
	};
}
