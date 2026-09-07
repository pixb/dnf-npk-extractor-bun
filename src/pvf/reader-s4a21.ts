/**
 * 86jp (S4A21) PVF 读取器
 *
 * 移植自: libs/server-s4a12/Tool/PvfLib/PvfArchive.cs
 *
 * PVF 文件结构:
 * - Header (0x30 = 48 字节, 加密 "HeaD")
 * - File Table (FileCount * 0x18 字节)
 * - Hash Table (HashTableSize 字节, 加密 "HASH")
 * - Name Table (NameTableSize 字节, 包含 sTrA/sTrW)
 * - GRPI (GroupCount * 8 字节, 加密 "GRPI")
 * - Body (BodySize 字节, 加密 "BodY" + Zlib 压缩)
 */

import { decrypt, decrypt2, decryptGuard } from './decryptor-s4a21.js';
import { decodeScriptFile, parseAniFile } from './script-file.js';
import type { PvfFileEntry, PvfHeader } from './types.js';

const M32 = 0xFFFFFFFF;

/** 默认解密密钥 (86jp S4A21) */
export const DEFAULT_KEY = 'qTG/891YmHRE';

/** PVF 签名 */
const MAGIC_SIGNATURE = 0x69706B6E; // "npki"

/** PVF 文件头大小 */
const HEADER_SIZE = 0x30;

/** 文件表条目大小 */
const FILE_ITEM_SIZE = 0x18;

/** GRPI 条目大小 */
const GRPI_ITEM_SIZE = 8;

/** 字符串表 XOR 常量 */
const STR_A_XOR = 0xAA74472E;
const STR_W_XOR = 0x9A82F037;

/** PvfHeader 结构 */
interface PvfHeaderRaw {
    signature: number;
    guid: Uint8Array;
    fileCount: number;
    padding: number;
    bodySize: number;
    groupCount: number;
    hashTableSize: number;
    nameTableSize: number;
}

/** PvfFileItem 结构 */
interface PvfFileItemRaw {
    nameOffset: number;
    pathOffset: number;
    chunkIndex: number;
    dataOffset: number;
    dataSize: number;
    dataType: number;
}

/** GrpiItem 结构 */
interface GrpiItemRaw {
    compressedSize: number;
    originalSize: number;
}

export class PvfArchiveS4A21 {
    private data: Buffer;
    private header!: PvfHeaderRaw;
    private files: PvfFileItemRaw[] = [];
    private groups: GrpiItemRaw[] = [];
    private strABuffer: Buffer = Buffer.alloc(0);
    private strWBuffer: Buffer = Buffer.alloc(0);
    private bodyOffset: number = 0;
    private bodyLength: number = 0;

    constructor(data: Buffer) {
        this.data = data;
        this.parse();
    }

    /**
     * 解析 PVF 文件
     */
    private parse(): void {
        const data = this.data;

        // 1. 解密头部
        // 注意: 正确的顺序是先 Decrypt('HeaD')，不应用 DecryptGuard
        // 这与 C# 代码不同，但与 Python reader 一致
        const headerBytes = data.subarray(0, HEADER_SIZE);
        decrypt('HeaD', headerBytes);

        // 2. 解析头部结构
        this.header = {
            signature: headerBytes.readUInt32LE(0),
            guid: headerBytes.subarray(4, 24),
            fileCount: headerBytes.readInt32LE(24),
            padding: headerBytes.readInt32LE(28),
            bodySize: headerBytes.readInt32LE(32),
            groupCount: headerBytes.readInt32LE(36),
            hashTableSize: headerBytes.readInt32LE(40),
            nameTableSize: headerBytes.readInt32LE(44),
        };

        console.log(`PVF Header:`);
        console.log(`  Signature: 0x${this.header.signature.toString(16)}`);
        console.log(`  FileCount: ${this.header.fileCount}`);
        console.log(`  BodySize: ${this.header.bodySize}`);
        console.log(`  GroupCount: ${this.header.groupCount}`);
        console.log(`  HashTableSize: ${this.header.hashTableSize}`);
        console.log(`  NameTableSize: ${this.header.nameTableSize}`);

        if (this.header.signature !== MAGIC_SIGNATURE) {
            console.warn(`Invalid signature: 0x${this.header.signature.toString(16)}`);
        }

        // 3. 计算各段偏移
        let pos = HEADER_SIZE;

        const tableOffset = pos;
        pos += this.header.fileCount * FILE_ITEM_SIZE;

        const hashOffset = pos;
        pos += this.header.hashTableSize;

        const nameOffset = pos;
        pos += this.header.nameTableSize;

        const grpiOffset = pos;
        const grpiSize = this.header.groupCount * GRPI_ITEM_SIZE;
        pos += grpiSize;

        this.bodyOffset = pos;
        this.bodyLength = this.header.bodySize;

        // 4. 解密并解析文件表
        this.parseFileTable(data, tableOffset, this.header.fileCount);

        // 5. 解密并解析 GRPI
        const grpiBytes = data.subarray(grpiOffset, grpiOffset + grpiSize);
        decrypt('GRPI', grpiBytes);
        this.parseGrpi(grpiBytes, this.header.groupCount);

        // 6. 解析字符串表
        this.parseNameTable(data.subarray(nameOffset, nameOffset + this.header.nameTableSize));
    }

    /**
     * 解析文件表
     */
    private parseFileTable(data: Buffer, offset: number, count: number): void {
        this.files = [];

        for (let i = 0; i < count; i++) {
            const pos = offset + i * FILE_ITEM_SIZE;
            const item: PvfFileItemRaw = {
                nameOffset: data.readInt32LE(pos),
                pathOffset: data.readInt32LE(pos + 4),
                chunkIndex: data.readInt32LE(pos + 8),
                dataOffset: data.readInt32LE(pos + 12),
                dataSize: data.readInt32LE(pos + 16),
                dataType: data.readInt32LE(pos + 20),
            };
            this.files.push(item);
        }

        console.log(`  Parsed ${this.files.length} file entries`);
    }

    /**
     * 解析 GRPI
     */
    private parseGrpi(data: Buffer, count: number): void {
        this.groups = [];

        for (let i = 0; i < count; i++) {
            const pos = i * GRPI_ITEM_SIZE;
            const item: GrpiItemRaw = {
                compressedSize: data.readInt32LE(pos),
                originalSize: data.readInt32LE(pos + 4),
            };
            this.groups.push(item);
        }

        console.log(`  Parsed ${this.groups.length} group entries`);
    }

    /**
     * 解析字符串表
     */
    private parseNameTable(nameTableData: Buffer): void {
        console.log(`  Name table size: ${nameTableData.length} bytes`);

        if (nameTableData.length < 16) {
            console.log('  Name table too small');
            return;
        }

        // 跳过前 8 字节
        let idx = 8;

        // 解析 sTrA
        const strAResult = this.decryptStringBuffer(nameTableData, idx, 'sTrA', STR_A_XOR);
        this.strABuffer = strAResult.buffer;
        console.log(`  sTrA decoded: ${this.strABuffer.length} bytes`);

        // 解析 sTrW (从 sTrA 结束后的位置)
        if (strAResult.nextIdx + 8 <= nameTableData.length) {
            const strWResult = this.decryptStringBuffer(nameTableData, strAResult.nextIdx, 'sTrW', STR_W_XOR);
            this.strWBuffer = strWResult.buffer;
            console.log(`  sTrW decoded: ${this.strWBuffer.length} bytes`);
        }
    }

    /**
     * 解密字符串缓冲区
     */
    private decryptStringBuffer(data: Buffer, index: number, key: string, xorConst: number): { buffer: Buffer; nextIdx: number } {
        if (index + 8 > data.length) {
            return { buffer: Buffer.alloc(0), nextIdx: index };
        }

        // 读取为无符号 32 位整数
        const cnt1 = data.readUInt32LE(index);
        const cnt2 = data.readUInt32LE(index + 4);

        const encSize = (cnt1 ^ xorConst) >>> 0;

        if (encSize <= 0 || index + 8 + encSize > data.length) {
            return { buffer: Buffer.alloc(0), nextIdx: index + 8 };
        }

        // 复制加密数据
        const encrypted = Buffer.alloc(encSize);
        data.copy(encrypted, 0, index + 8, index + 8 + encSize);

        // 解密
        decrypt2(key, encrypted);

        // Zlib 解压
        try {
            if (encrypted.length < 6 || encrypted[0] !== 0x78) {
                return { buffer: Buffer.alloc(0), nextIdx: index + 8 + encSize };
            }
            // 跳过 2 字节 Zlib 头 (0x78 0x9C), 去掉末尾 4 字节 Adler32 校验和
            const rawDeflate = encrypted.subarray(2, encrypted.length - 4);
            const decompressed = Buffer.from(Bun.inflateSync(rawDeflate));
            return { buffer: decompressed, nextIdx: index + 8 + encSize };
        } catch {
            return { buffer: Buffer.alloc(0), nextIdx: index + 8 + encSize };
        }
    }

    /**
     * 解析字符串
     */
    resolveString(magicOffset: number): string {
        if (magicOffset < 0) return '';

        if ((magicOffset & 1) !== 0) {
            // Unicode 字符串
            const offset = (magicOffset >> 1) * 2;
            return this.readUnicodeString(this.strWBuffer, offset);
        } else {
            // ANSI/UTF8 字符串
            const offset = magicOffset >> 1;
            return this.readUtf8String(this.strABuffer, offset);
        }
    }

    /**
     * 读取 UTF8 字符串
     */
    private readUtf8String(buffer: Buffer, start: number): string {
        if (buffer.length === 0 || start < 0 || start >= buffer.length) {
            return '';
        }

        let end = start;
        while (end < buffer.length && buffer[end] !== 0) end++;

        return buffer.subarray(start, end).toString('utf-8');
    }

    /**
     * 读取 Unicode 字符串
     */
    private readUnicodeString(buffer: Buffer, start: number): string {
        if (buffer.length === 0 || start < 0 || start >= buffer.length) {
            return '';
        }

        let end = start;
        while (end + 1 < buffer.length && !(buffer[end] === 0 && buffer[end + 1] === 0)) {
            end += 2;
        }

        return buffer.subarray(start, end).toString('utf-16le');
    }

    /**
     * 获取文件列表
     */
    getFiles(): Array<{ name: string; path: string; entry: PvfFileItemRaw }> {
        return this.files.map((item, index) => ({
            name: this.resolveString(item.nameOffset),
            path: this.resolveString(item.pathOffset),
            entry: item,
            index,
        }));
    }

    /**
     * 根据路径查找文件
     */
    findFile(relativePath: string): PvfFileItemRaw | undefined {
        const normalized = relativePath.replace(/\\/g, '/').trim().toLowerCase();
        const files = this.getFiles();

        for (const file of files) {
            const fullPath = file.path ? `${file.path}/${file.name}` : file.name;
            if (fullPath.toLowerCase() === normalized) {
                return file.entry;
            }
        }

        return undefined;
    }

    /**
     * 获取 chunk 数据
     */
    getChunkData(chunkIndex: number): Buffer | null {
        if (chunkIndex < 0 || chunkIndex >= this.groups.length) {
            return null;
        }

        const prev = chunkIndex > 0 ? this.groups[chunkIndex - 1] : { compressedSize: 0, originalSize: 0 };
        const curr = this.groups[chunkIndex];

        const start = this.bodyOffset + prev.compressedSize;
        const size = curr.compressedSize - prev.compressedSize;

        if (size <= 0 || start + size > this.bodyOffset + this.bodyLength) {
            return null;
        }

        // 解密 chunk
        const encrypted = Buffer.from(this.data.subarray(start, start + size));
        decrypt('BodY', encrypted);

        // Zlib 解压 (跳过 0x78 0x9C 头 + Adler32 校验和)
        try {
            if (encrypted.length < 6 || encrypted[0] !== 0x78) {
                return null;
            }
            // 跳过 2 字节 Zlib 头, 去掉末尾 4 字节 Adler32 校验和
            const deflated = encrypted.subarray(2, encrypted.length - 4);
            return Buffer.from(Bun.inflateSync(deflated));
        } catch {
            return null;
        }
    }

    /**
     * 获取文件数据
     */
    getFileData(entry: PvfFileItemRaw): Buffer | null {
        const chunk = this.getChunkData(entry.chunkIndex);
        if (!chunk || entry.dataOffset < 0 || entry.dataSize <= 0 ||
            entry.dataOffset + entry.dataSize > chunk.length) {
            return null;
        }

        return chunk.subarray(entry.dataOffset, entry.dataOffset + entry.dataSize);
    }

    /**
     * 解码脚本文件 (Type=1)
     */
    decodeScriptFile(entry: PvfFileItemRaw): string | null {
        if (entry.dataType !== 1) return null;

        const data = this.getFileData(entry);
        if (!data) return null;

        return decodeScriptFile(data, (id) => this.resolveString(id));
    }

    /**
     * 解析 .ani 文件
     */
    parseAniFile(entry: PvfFileItemRaw): ReturnType<typeof parseAniFile> | null {
        const text = this.decodeScriptFile(entry);
        if (!text) return null;

        return parseAniFile(text);
    }

    /**
     * 根据路径查找并获取文件数据
     */
    getFileByPath(relativePath: string): { name: string; path: string; data: Buffer; entry: PvfFileItemRaw } | null {
        const entry = this.findFile(relativePath);
        if (!entry) return null;

        const data = this.getFileData(entry);
        if (!data) return null;

        const files = this.getFiles();
        const file = files.find(f => f.entry === entry);
        if (!file) return null;

        return { name: file.name, path: file.path, data, entry };
    }
}

/**
 * 读取 86jp PVF 文件
 */
export async function readPvfS4A21(path: string): Promise<PvfArchiveS4A21> {
    const file = Bun.file(path);
    const data = await file.arrayBuffer();

    return new PvfArchiveS4A21(Buffer.from(data));
}
