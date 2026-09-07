/**
 * PVF 类型定义
 */

/** PVF 版本 */
export type PvfVersion = "default" | "s4a21";

/** PVF 文件头 */
export interface PvfHeader {
	// 通用字段
	fileCount: number;
	dirTreeLength: number;
	dirTreeChecksum: number;
	numFilesInDirTree: number;

	// 台服特有
	sizeGUID?: number;
	GUID?: Uint8Array;
	fileVersion?: number;

	// 86jp 特有
	signature?: number;
	bodySize?: number;
	groupCount?: number;
	hashTableSize?: number;
	nameTableSize?: number;
}

/** PVF 文件条目 */
export interface PvfFileEntry {
	filePath: string;
	chunkIndex: number;
	dataOffset: number;
	dataSize: number;
	dataType: number;
	crc32: number;
}

/** PVF 字符串上下文 */
export interface PvfStringContext {
	binMap: Map<number, string>;
	resolveString(id: number): string;
	resolveStringLink?(listId: number, keyId: number): string;
}

/** PVF 解密器接口 */
export interface PvfDecryptor {
	decryptData(data: Buffer, length: number, checksum: number): Buffer;
	decryptFileData(data: Buffer, length: number, crc32: number): Buffer;
}

/** PVF 提取选项 */
export interface PvfExtractOptions {
	pvfPath: string;
	outputDir: string;
	resolveStringLink?: boolean;
	version?: PvfVersion;
	filter?: string;
	limit?: number;
}

/** PVF 归档对象 */
export interface PvfArchive {
	header: PvfHeader;
	files: PvfFileEntry[];
	version: PvfVersion;

	getFilePath(entry: PvfFileEntry): string;
	getFileData(entry: PvfFileEntry): Promise<Buffer>;
	getChunkData(chunkIndex: number): Promise<Buffer>;
}

/** Token 类型 */
export interface Token {
	type: number;
	value: number;
	strValue?: string;
}
