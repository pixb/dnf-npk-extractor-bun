/**
 * 86jp (S4A21) PVF 解密算法
 *
 * 移植自:
 * - libs/server-s4a12/Tool/PvfLib/PvfDecryptor.cs
 * - .opencode/skills/pvf-reader/scripts/read_pvf.py
 */

const M32 = 0xFFFFFFFF;

/**
 * 核心解密函数
 * @param key 密钥字符串 (至少4个字符)
 * @param buf 要解密的缓冲区 (会被原地修改)
 * @param magic 魔数 (默认 0x269EC3)
 */
export function decryptCore(key: string, buf: Buffer, magic: number = 0x269EC3): number {
    const k = Buffer.from(key, 'ascii');
    if (k.length < 4) return 0;

    // 初始化种子 (使用无符号整数运算)
    let seed = (0x76826701 * k[0] + 0x1C1 * (k[3] + 0x1C1 * (k[2] + 0x1C1 * k[1]))) >>> 0;

    const n = buf.length;
    const quad = n >> 2;
    const tail = n - (quad << 2);

    // 解密 4 字节块
    for (let i = 0; i < quad; i++) {
        let t1 = (0x343FD * seed + magic) >>> 0;
        seed = (0x343FD * t1 + magic) >>> 0;
        // 计算 XOR 密钥: 高 16 位来自 seed，低 16 位来自 t1
        const xorKey = (((seed >>> 16) & 0xFFFF) + (t1 & 0xFFFF0000)) >>> 0;
        const off = i << 2;
        const data = (buf.readUInt32LE(off) ^ xorKey) >>> 0;
        buf.writeUInt32LE(data, off);
    }

    // 解密剩余字节
    if (tail > 0) {
        let t1 = (0x343FD * seed + magic) >>> 0;
        let t2 = (0x343FD * t1 + magic) >>> 0;
        const finalKey = ((t1 & 0xFFFF0000) + ((t2 >>> 16) & 0xFFFF)) >>> 0;
        const keyBytes = Buffer.alloc(4);
        keyBytes.writeUInt32LE(finalKey, 0);
        const start = n - tail;
        for (let i = 0; i < tail; i++) {
            buf[start + i] ^= keyBytes[i];
        }
    }

    return tail;
}

/**
 * 标准解密 (magic = 0x269EC3)
 */
export function decrypt(key: string, buf: Buffer): number {
    return decryptCore(key, buf, 0x269EC3);
}

/**
 * 备用解密 (magic = 0x269EC9)
 */
export function decrypt2(key: string, buf: Buffer): number {
    return decryptCore(key, buf, 0x269EC9);
}

/**
 * 头部保护解密
 * 对 buffer 的第 24-27 字节进行 XOR 0x55
 */
export function decryptGuard(buf: Buffer): void {
    if (!buf || buf.length < 28) return;
    for (let i = 24; i < 28; i++) {
        buf[i] ^= 0x55;
    }
}

/**
 * 验证 PVF 签名
 */
export function verifySignature(buf: Buffer): boolean {
    if (buf.length < 4) return false;
    const sig = buf.readUInt32LE(0);
    return sig === 0x69706B6E; // "npki"
}
