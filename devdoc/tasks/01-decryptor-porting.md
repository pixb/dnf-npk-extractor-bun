# 任务 01: 解密算法移植

## 目标

将 86jp S4A21 解密算法从 C# 移植到 TypeScript。

## 参考实现

### C# 源码 (PvfDecryptor.cs)

```csharp
private static int DecryptCore(string key, byte[] buf, int magic)
{
    byte[] k = Encoding.ASCII.GetBytes(key);
    int seed = 0x76826701 * k[0] + 0x1C1 * (k[3] + 0x1C1 * (k[2] + 0x1C1 * k[1]));
    
    int quadCount = buf.Length >> 2;
    int tail = buf.Length - (quadCount << 2);
    
    for (int i = 0; i < quadCount; i++)
    {
        int t1 = 0x343FD * seed + magic;
        seed = 0x343FD * t1 + magic;
        uint xorKey = (uint)(((seed >> 16) & 0xFFFF) + (t1 & 0xFFFF0000));
        int off = i << 2;
        uint data = BitConverter.ToUInt32(buf, off) ^ xorKey;
        Buffer.BlockCopy(BitConverter.GetBytes(data), 0, buf, off, 4);
    }
    
    if (tail > 0)
    {
        int t1 = 0x343FD * seed + magic;
        int t2 = 0x343FD * t1 + magic;
        uint finalKey = (uint)((t1 & 0xFFFF0000) + ((t2 >> 16) & 0xFFFF));
        byte[] keyBytes = BitConverter.GetBytes(finalKey);
        int start = buf.Length - tail;
        for (int i = 0; i < tail; i++)
            buf[start + i] ^= keyBytes[i];
    }
    
    return tail;
}
```

### Python 源码 (read_pvf.py)

```python
def decrypt_core(key: str, buf: bytearray, magic: int = 0x269EC3) -> int:
    k = key.encode('ascii')
    if len(k) < 4:
        return 0
    seed = (0x76826701 * k[0] + 0x1C1 * (k[3] + 0x1C1 * (k[2] + 0x1C1 * k[1]))) & M32
    n = len(buf)
    quad = n >> 2
    tail = n - (quad << 2)
    for i in range(quad):
        t1 = (0x343FD * seed + magic) & M32
        seed = (0x343FD * t1 + magic) & M32
        xor_key = (((seed >> 16) & 0xFFFF) + (t1 & 0xFFFF0000)) & M32
        off = i << 2
        data = struct.unpack_from('<I', buf, off)[0] ^ xor_key
        struct.pack_into('<I', buf, off, data & M32)
    if tail > 0:
        t1 = (0x343FD * seed + magic) & M32
        t2 = (0x343FD * t1 + magic) & M32
        final_key = ((t1 & 0xFFFF0000) + ((t2 >> 16) & 0xFFFF)) & M32
        kb = struct.pack('<I', final_key)
        start = n - tail
        for i in range(tail):
            buf[start + i] ^= kb[i]
    return tail
```

## TypeScript 实现

### 文件: `src/pvf/decryptor-s4a21.ts`

```typescript
const M32 = 0xFFFFFFFF;

export function decryptCore(key: string, buf: Buffer, magic: number = 0x269EC3): number {
    const k = Buffer.from(key, 'ascii');
    if (k.length < 4) return 0;
    
    let seed = (0x76826701 * k[0] + 0x1C1 * (k[3] + 0x1C1 * (k[2] + 0x1C1 * k[1]))) & M32;
    const n = buf.length;
    const quad = n >> 2;
    const tail = n - (quad << 2);
    
    for (let i = 0; i < quad; i++) {
        let t1 = (0x343FD * seed + magic) & M32;
        seed = (0x343FD * t1 + magic) & M32;
        const xorKey = (((seed >> 16) & 0xFFFF) + (t1 & 0xFFFF0000)) & M32;
        const off = i << 2;
        const data = buf.readUInt32LE(off) ^ xorKey;
        buf.writeUInt32LE(data & M32, off);
    }
    
    if (tail > 0) {
        let t1 = (0x343FD * seed + magic) & M32;
        let t2 = (0x343FD * t1 + magic) & M32;
        const finalKey = ((t1 & 0xFFFF0000) + ((t2 >> 16) & 0xFFFF)) & M32;
        const keyBytes = Buffer.alloc(4);
        keyBytes.writeUInt32LE(finalKey, 0);
        const start = n - tail;
        for (let i = 0; i < tail; i++) {
            buf[start + i] ^= keyBytes[i];
        }
    }
    
    return tail;
}

export function decrypt(key: string, buf: Buffer): number {
    return decryptCore(key, buf, 0x269EC3);
}

export function decrypt2(key: string, buf: Buffer): number {
    return decryptCore(key, buf, 0x269EC9);
}

export function decryptGuard(buf: Buffer): void {
    if (!buf || buf.length < 28) return;
    for (let i = 24; i < 28; i++) {
        buf[i] ^= 0x55;
    }
}
```

## 验证步骤

1. 单元测试
   - 使用已知的测试向量验证解密结果
   - 对比 C# 和 Python 实现的输出

2. 集成测试
   - 使用真实的 86jp PVF 文件测试
   - 验证头部解密正确
   - 验证目录树解密正确

## 依赖

- 无外部依赖
- 使用 Node.js Buffer API

## 产出

- `src/pvf/decryptor-s4a21.ts`
- 单元测试用例
