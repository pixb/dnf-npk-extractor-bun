# 任务 03: ScriptFile 适配

## 目标

实现 86jp ScriptFile 解析，支持不同的 Token 格式。

## 参考实现

### Python 源码 (read_pvf.py)

```python
def decode_type1_raw(data: bytes, p: PvfArchive) -> str:
    """Decode type==1 (script file) raw tokens."""
    line_count = len(data) // 5
    out = []
    for i in range(line_count):
        off = i * 5
        t = data[off]
        v = struct.unpack_from('<i', data, off + 1)[0]
        if t == 0:
            out.append(str(v) + ' ')
        elif t == 2:
            out.append('%.2f ' % struct.unpack('<f', struct.pack('<i', v))[0])
        elif t == 3:
            out.append('\n' + p.resolve_string(v) + '\n')
        elif t == 5:
            out.append('\n{5=``}')
        elif t == 6:
            out.append('`' + p.resolve_string(v) + '` ')
        elif t == 7:
            out.append('\n{7=``}')
        else:
            out.append('<t%d=%d> ' % (t, v))
    return ''.join(out)
```

## Token 类型映射

| 功能 | 台服 Type | 86jp Type | 说明 |
|------|-----------|-----------|------|
| Int | 2 | 0 | 整数值 |
| Float | 4 | 2 | 浮点数 (int→float) |
| Section | 5 | 5 | 节标记 (相同) |
| Command | 6 | 6 | 命令标记 (相同) |
| String | 7 | 3 | 字符串值 |
| Script | - | 7 | 脚本标记 (86jp特有) |

## TypeScript 实现

### 文件: `src/pvf/decoders/script-file-s4a21.ts`

```typescript
import { PvfStringContext } from '../types';

export interface Token {
    type: number;
    value: number;
    strValue?: string;
}

export function isScriptFileS4A21(data: Buffer): boolean {
    // 86jp ScriptFile 无 header，直接是 token 流
    // 检测: 第一个字节是已知 token type (0, 2, 3, 5, 6, 7)
    if (data.length < 5) return false;
    const firstType = data[0];
    if (![0, 2, 3, 5, 6, 7].includes(firstType)) return false;
    
    // 验证: 跳过一个 token 后，下一个 token 的 type 也应在合理范围
    if (data.length >= 10) {
        const secondType = data[5];
        return [0, 2, 3, 5, 6, 7].includes(secondType);
    }
    return true;
}

export function parseTokensS4A21(
    data: Buffer,
    ctx: PvfStringContext
): Token[] {
    const tokens: Token[] = [];
    const lineCount = data.length / 5;
    
    for (let i = 0; i < lineCount; i++) {
        const off = i * 5;
        const type = data[off];
        const value = data.readInt32LE(off + 1);
        
        const token: Token = { type, value };
        
        // 根据类型解析字符串
        switch (type) {
            case 0: // Int
                token.strValue = String(value);
                break;
            case 2: // Float
                // int → float 转换
                const buf = Buffer.alloc(4);
                buf.writeInt32LE(value, 0);
                token.strValue = buf.readFloatLE(0).toFixed(2);
                break;
            case 3: // String
                token.strValue = ctx.resolveString(value);
                break;
            case 5: // Section
                token.strValue = '{5=``}';
                break;
            case 6: // Command
                token.strValue = '`' + ctx.resolveString(value) + '`';
                break;
            case 7: // Script
                token.strValue = '{7=``}';
                break;
        }
        
        tokens.push(token);
    }
    
    return tokens;
}

export function tokensToSource(tokens: Token[]): string {
    return tokens
        .map(t => t.strValue || `<t${t.type}=${t.value}>`)
        .join(' ');
}
```

## 与台服解析器的差异

### 台服解析器 (script-file-json.ts)

```typescript
// 有 Header: 0xD0B0
// Token 步长: 5 bytes
// 字符串引用: ctx.binMap[value]
// 支持类型: 2,4,5,6,7,8,9,10
```

### 86jp 解析器

```typescript
// 无 Header: 直接 token 流
// Token 步长: 5 bytes (相同)
// 字符串引用: ctx.resolveString(value) (不同)
// 支持类型: 0,2,3,5,6,7
```

## 验证步骤

1. 单元测试
   - 使用已知的 86jp ScriptFile 测试
   - 验证 Token 解析正确
   - 验证字符串解析正确

2. 集成测试
   - 从真实 86jp PVF 提取 ScriptFile
   - 验证 JSON 输出正确

## 依赖

- `src/pvf/types.ts` (PvfStringContext)
- `src/pvf/string-table-s4a21.ts` (字符串解析)

## 产出

- `src/pvf/decoders/script-file-s4a21.ts`
- 单元测试用例
