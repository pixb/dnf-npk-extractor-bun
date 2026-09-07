/**
 * NPK 文件读取器
 *
 * 支持 DNF (Dungeon & Fighters) NPK 资源包格式
 * 格式: NeoplePack_Bill
 */

import type { NpkArchive, NpkFileEntry } from "./types.js";

// NPK 魔数
const NPK_MAGIC = "NeoplePack_Bill";

// 文件名解密 key
const DECODE_KEY = "puchikon@neople dungeon and fighter DNF";
const DECODE_KEY_BUFFER = (() => {
	const buf = Buffer.alloc(256, 0);
	for (let i = 0; i < 256; i++) {
		if (i < DECODE_KEY.length) {
			buf[i] = DECODE_KEY.charCodeAt(i);
		} else {
			// 剩余部分用 "DNF" 填充
			buf[i] = DECODE_KEY.charCodeAt((i % 3) + DECODE_KEY.length - 3);
		}
	}
	// 最后一个字节置 0
	buf[255] = 0;
	return buf;
})();

// CRC32 查找表
const CRC32_TABLE: Uint32Array = (() => {
	const table = new Uint32Array(256);
	for (let i = 0; i < 256; i++) {
		let crc = i;
		for (let j = 0; j < 8; j++) {
			if (crc & 1) {
				crc = (crc >>> 1) ^ 0xedb88320;
			} else {
				crc = crc >>> 1;
			}
		}
		table[i] = crc;
	}
	return table;
})();

/**
 * 计算 CRC32 校验和
 */
function _crc32(data: Buffer): number {
	let crc = 0xffffffff;
	for (let i = 0; i < data.length; i++) {
		crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ data[i]) & 0xff];
	}
	return (crc ^ 0xffffffff) >>> 0;
}

/**
 * 解密文件名
 */
function decryptFileName(encrypted: Buffer): string {
	const decrypted = Buffer.alloc(256, 0);
	for (let i = 0; i < 256; i++) {
		decrypted[i] = encrypted[i] ^ DECODE_KEY_BUFFER[i];
	}
	// 找到 null 终止符
	let end = 0;
	while (end < 256 && decrypted[end] !== 0) {
		end++;
	}
	return decrypted.subarray(0, end).toString("utf-8");
}

/**
 * 读取 NPK 文件
 */
export async function readNpk(filePath: string): Promise<NpkArchive> {
	const file = Bun.file(filePath);
	const buffer = Buffer.from(await file.arrayBuffer());

	return readNpkFromBuffer(buffer);
}

/**
 * 从 Buffer 读取 NPK
 */
export function readNpkFromBuffer(buffer: Buffer): NpkArchive {
	// 解析头部 (16 bytes)
	if (buffer.length < 20) {
		throw new Error("NPK 文件太小");
	}

	// 读取魔数 (15 bytes, 不含 null 终止符)
	const magic = buffer.subarray(0, 15).toString("utf-8");
	if (magic !== NPK_MAGIC) {
		throw new Error(`无效的 NPK 魔数: ${magic}`);
	}

	// 读取文件数量
	const fileCount = buffer.readUInt32LE(16);

	console.log("NPK Header:");
	console.log(`  Magic: ${magic}`);
	console.log(`  FileCount: ${fileCount}`);

	// 解析文件表
	const files: NpkFileEntry[] = [];
	let pos = 20; // 16 (magic) + 4 (fileCount)

	for (let i = 0; i < fileCount; i++) {
		// 读取文件条目: offset(4) + size(4) + name(256) = 264 bytes
		if (pos + 264 > buffer.length) {
			throw new Error(`文件 ${i} 的条目数据不足`);
		}

		const offset = buffer.readUInt32LE(pos);
		const size = buffer.readUInt32LE(pos + 4);
		const nameEncrypted = buffer.subarray(pos + 8, pos + 264);
		const name = decryptFileName(nameEncrypted);

		const entry: NpkFileEntry = {
			name,
			offset,
			size,
			crc32: 0, // NPK 格式不存储 CRC32
		};

		files.push(entry);
		pos += 264;
	}

	console.log(`  Parsed ${files.length} file entries`);

	// 显示前 5 个文件名
	console.log("  First files:");
	for (let i = 0; i < Math.min(5, files.length); i++) {
		console.log(`    ${files[i].name}`);
	}

	return {
		header: {
			magic: 0,
			fileCount,
			version: 0,
			unknown1: 0,
			unknown2: 0,
		},
		files,
		data: buffer,
	};
}

/**
 * 获取 NPK 文件数据
 */
export function getNpkFileData(
	archive: NpkArchive,
	fileIndex: number,
): Buffer | null {
	if (fileIndex < 0 || fileIndex >= archive.files.length) {
		return null;
	}

	const entry = archive.files[fileIndex];
	if (entry.offset + entry.size > archive.data.length) {
		return null;
	}

	return Buffer.from(
		archive.data.subarray(entry.offset, entry.offset + entry.size),
	);
}

/**
 * 根据名称查找 NPK 文件
 */
export function findNpkFile(
	archive: NpkArchive,
	fileName: string,
): NpkFileEntry | undefined {
	return archive.files.find((f) => f.name === fileName);
}

/**
 * 列出 NPK 文件
 */
export function listNpkFiles(
	archive: NpkArchive,
	filter?: string,
): NpkFileEntry[] {
	if (!filter) {
		return archive.files;
	}

	const lowerFilter = filter.toLowerCase();
	return archive.files.filter((f) =>
		f.name.toLowerCase().includes(lowerFilter),
	);
}
