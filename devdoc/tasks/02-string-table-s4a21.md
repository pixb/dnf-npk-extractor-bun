# 任务 02: 字符串表解析

## 目标

实现 86jp sTrA/sTrW 字符串表解析。

## 参考实现

### C# 源码 (PvfArchive.cs)

```csharp
private void BuildStringBuffers(byte[] nameBytes)
{
    if (nameBytes == null || nameBytes.Length < 16) return;
    
    int idx = 8;
    _strABuffer = DecryptStringBuffer(nameBytes, ref idx, "sTrA", 0xAA74472E);
    _strWBuffer = DecryptStringBuffer(nameBytes, ref idx, "sTrW", 0x9A82F037);
}

private static byte[] DecryptStringBuffer(byte[] bytes, ref int index, string key, uint xorConst)
{
    if (index + 8 > bytesBytes.Length)
        return Array.Empty<byte>();
    
    int cnt1 = BitConverter.ToInt32(bytes, index); index += 4;
    int cnt2 = BitConverter.ToInt32(bytes, index); index += 4;
    
    int encSize = (int)(cnt1 ^ xorConst);
    if (encSize <= 0 || index + encSize > bytes.Length)
        return Array.Empty<byte>();
    
    byte[] encrypted = bytes.Skip(index).Take(encSize).ToArray();
    index += encSize;
    
    PvfDecryptor.Decrypt2(key, encrypted);
    return PvfDecryptor.ZlibDecompress(encrypted);
}
```

### Python 源码 (read_pvf.py)

```python
def _build_strings(self):
    nb = bytearray(self.data[self.name_off:self.name_off + self.name_size])
    decrypt("HASH", nb)  # already done in __init__
    
    idx = 8
    self._str_a = self._decrypt_str_section(nb, idx, "sTrA", 0xAA74472E)
    idx += 4 + len(self._str_a) + 4  # skip header + data + decompressed size
    self._str_w = self._decrypt_str_section(nb, idx, "sTrW", 0x9A82F037)

def _decrypt_str_section(self, nb, idx, key, xor_const):
    if idx + 8 > len(nb):
        return b''
    cnt1 = struct.unpack_from('<i', nb, idx)[0]
    cnt2 = struct.unpack_from('<i', nb, idx + 4)[0]
    enc_size = cnt1 ^ xor_const
    if enc_size <= 0 or idx + 8 + enc_size > len(nb):
        return b''
    encrypted = nb[idx + 8:idx + 8 + enc_size]
    decrypt2(key, encrypted)
    return zlib.decompress(encrypted)
```

## TypeScript 实现

### 文件: `src/pvf/string-table-s4a21.ts`

```typescript
import { decrypt2 } from './decryptor-s4a21';
import { inflateSync } from 'zlib';

const XOR_CONST_A = 0xAA74472E;
const XOR_CONST_W = 0x9A82F037;

interface StringSection {
    data: Buffer;
    strings: string[];
}

export function parseStringSection(
    bytes: Buffer,
    index: { value: number },
    key: string,
    xorConst: number
): StringSection {
    if (index.value + 8 > bytes.length) {
        return { data: Buffer.alloc(0), strings: [] };
    }
    
    const cnt1 = bytes.readInt32LE(index.value);
    const cnt2 = bytes.readInt32LE(index.value + 4);
    index.value += 8;
    
    const encSize = cnt1 ^ xorConst;
    if (encSize <= 0 || index.value + encSize > bytes.length) {
        return { data: Buffer.alloc(0), strings: [] };
    }
    
    const encrypted = bytes.slice(index.value, index.value + encSize);
    index.value += encSize;
    
    // 解密
    const decrypted = Buffer.from(encrypted);
    decrypt2(key, decrypted);
    
    // Zlib 解压
    const decompressed = inflateSync(decrypted);
    
    // 解析字符串 (null 分隔)
    const strings = decompressed
        .toString('utf-8')
        .split('\0')
        .filter(s => s.length > 0);
    
    return { data: decompressed, strings };
}

export function parseS4A21StringTable(
    nameBytes: Buffer
): { strA: string[]; strW: string[] } {
    if (!nameBytes || nameBytes.length < 16) {
        return { strA: [], strW: [] };
    }
    
    const index = { value: 8 };
    const strASection = parseStringSection(nameBytes, index, 'sTrA', XOR_CONST_A);
    const strWSection = parseStringSection(nameBytes, index, 'sTrW', XOR_CONST_W);
    
    return {
        strA: strASection.strings,
        strW: strWSection.strings
    };
}
```

## 字符串访问方式

### 台服
```typescript
// 通过索引直接访问
const str = stringTable[index];  // O(1)
```

### 86jp
```typescript
// 通过偏移量访问
// sTrA: UTF-8 编码，按 null 分隔
// sTrW: UTF-16LE 编码，按 null 分隔
function resolveString(offset: number, isWide: boolean): string {
    if (isWide) {
        // sTrW: UTF-16LE
        return strWData.slice(offset).toString('utf-16le').split('\0')[0];
    } else {
        // sTrA: UTF-8
        return strAData.slice(offset).toString('utf-8').split('\0')[0];
    }
}
```

## 验证步骤

1. 单元测试
   - 使用已知的字符串表数据测试解析
   - 验证 UTF-8 和 UTF-16LE 解码正确

2. 集成测试
   - 从真实 86jp PVF 提取字符串表
   - 验证字符串可正确访问

## 依赖

- `src/pvf/decryptor-s4a21.ts` (解密函数)
- Node.js `zlib` 模块 (解压)

## 产出

- `src/pvf/string-table-s4a21.ts`
- 单元测试用例
