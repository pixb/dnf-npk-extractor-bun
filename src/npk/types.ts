/**
 * NPK 文件格式类型定义
 */

export interface NpkHeader {
	magic: number; // 0x706F654E ("NeoP") 或 0x1F4E504B ("NPKG")
	fileCount: number;
	version: number;
	unknown1: number;
	unknown2: number;
}

export interface NpkFileEntry {
	name: string; // 文件名 (null-terminated UTF-8)
	offset: number; // 数据偏移
	size: number; // 数据大小
	crc32: number; // CRC32 校验和
}

export interface NpkArchive {
	header: NpkHeader;
	files: NpkFileEntry[];
	data: Buffer;
}

export interface NpkExtractOptions {
	outputDir: string;
	filter?: string;
	limit?: number;
}
