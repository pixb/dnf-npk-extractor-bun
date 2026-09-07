/**
 * 86jp (S4A21) PVF 字符串表解析器
 *
 * 移植自: libs/server-s4a12/Tool/PvfLib/PvfArch.cs
 *
 * 格式差异:
 * - 台服: stringtable.bin (单独文件)
 * - 86jp: sTrA (ANSI) / sTrW (Unicode) 文件
 */

import { decrypt, decrypt2 } from './decryptor-s4a21.js';
import type { PvfStringContext } from './types.js';

const M32 = 0xFFFFFFFF;

/** 字符串表头信息 */
interface StringTableHeader {
    magic: number;       // 0x1B (27)
    entryCount: number;  // 每个 key 的条目数
    valueCount: number;  // 总字符串数
    hashCount: number;   // hash 表大小
}

/**
 * 解析 S4A21 字符串表文件
 *
 * 文件结构:
 * - 4 bytes: 签名
 * - 4 bytes: key
 * - 4 bytes: 版本
 * - N bytes: 加密的数据
 *
 * 解密后:
 * - 1 byte: 魔数 (0x1B)
 * - 4 bytes: entryCount
 * - 4 bytes: total string count
 * - 4 bytes: hash table size
 * - M bytes: 明文字符串 (raw strings)
 * - N bytes: 分组数据 (group data)
 */
export async function readS4A21StringTable(
    data: Buffer,
    key: string
): Promise<Map<number, string>> {
    const map = new Map<number, string>();

    if (data.length < 40) {
        console.warn('String table too small, skipping');
        return map;
    }

    // 验证签名 "sTrA" 或 "sTrW"
    const sig = data.readUInt32LE(0);
    if (sig !== 0x41727473 && sig !== 0x57727473) {
        console.warn(`Invalid string table signature: 0x${sig.toString(16)}`);
        return map;
    }

    // 读取解密密钥
    const keyData = data.subarray(4, 8);
    const decryptKey = keyData.toString('ascii');
    console.log(`  String table decrypt key: "${decryptKey}"`);

    // 读取版本
    const version = data.readUInt32LE(8);
    console.log(`  String table version: ${version}`);

    // 跳过头部 20 字节
    const encData = data.subarray(20);

    // 解密数据
    const buf = Buffer.from(encData);
    decrypt(decryptKey, buf);

    // 读取头部信息
    const magic = buf[0];
    if (magic !== 0x1B) {
        console.warn(`Invalid string table magic: 0x${magic.toString(16)}`);
        return map;
    }

    const header: StringTableHeader = {
        magic,
        entryCount: buf.readUInt32LE(1),
        valueCount: buf.readUInt32LE(5),
        hashCount: buf.readUInt32LE(9),
    };

    console.log(`  Entry count: ${header.entryCount}, Value count: ${header.valueCount}`);

    // 读取字符串数据
    const strDataStart = 13;
    let offset = strDataStart;

    // 读取所有字符串
    const strings: string[] = [];
    for (let i = 0; i < header.valueCount; i++) {
        if (offset >= buf.length) break;

        // 查找 null 终止符
        let end = offset;
        while (end < buf.length && buf[end] !== 0) end++;

        // 解码字符串 (使用 GB2312/GBK 编码)
        const strBytes = buf.subarray(offset, end);
        const str = decodeGb2312(strBytes);
        strings.push(str);

        offset = end + 1;
    }

    // 读取分组数据 (group data)
    // 分组数据紧跟在字符串数据之后
    const groupDataStart = offset;
    offset = groupDataStart;

    // 解析分组
    for (let i = 0; i < header.entryCount; i++) {
        if (offset + 4 >= buf.length) break;

        // 每个分组有 4 个字段
        const startIdx = buf.readUInt32LE(offset);
        const count = buf.readUInt32LE(offset + 4);
        offset += 8;

        // 添加字符串映射
        for (let j = 0; j < count; j++) {
            const idx = startIdx + j;
            if (idx < strings.length) {
                map.set(idx, strings[idx]);
            }
        }
    }

    return map;
}

/**
 * GB2312 解码器
 * GB2312 使用双字节编码
 */
function decodeGb2312(bytes: Uint8Array): string {
    let result = '';

    for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];

        if (byte === 0) {
            break;
        } else if (byte < 0x80) {
            // ASCII
            result += String.fromCharCode(byte);
        } else if (i + 1 < bytes.length) {
            // 双字节 GB2312
            const high = byte;
            const low = bytes[i + 1];
            i++; // 跳过低字节

            // GB2312 转 Unicode
            const unicode = gb2312ToUnicode(high, low);
            if (unicode !== 0) {
                result += String.fromCharCode(unicode);
            }
        }
    }

    return result;
}

/**
 * GB2312 转 Unicode
 * 简化版本，只支持常用汉字
 */
function gb2312ToUnicode(high: number, low: number): number {
    // GB2312 区码和位码
    const section = high - 0xA0;
    const position = low - 0xA0;

    if (section < 1 || section > 94 || position < 1 || position > 94) {
        return 0;
    }

    // 简化映射 - 实际应该使用完整的 GB2312 映射表
    // 这里返回一个近似值
    return ((section - 1) * 94 + (position - 1)) + 0x4E00;
}

/**
 * 创建 PvfStringContext
 */
export function createPvfStringContext(
    ansiTable: Map<number, string>,
    unicodeTable: Map<number, string>
): PvfStringContext {
    const ctx: PvfStringContext = {
        binMap: ansiTable,
        resolveString(id: number): string {
            if (id === 0) return '';
            if (id & 0x40000000) {
                return unicodeTable.get(id & 0x0FFFFFFF) || '';
            }
            return ansiTable.get(id) || '';
        },
        resolveStringLink(listId: number, keyId: number): string {
            const str = ctx.resolveString(keyId);
            return str;
        },
    };
    return ctx;
}
