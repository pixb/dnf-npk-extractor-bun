# 架构设计文档

## 概述

本项目旨在扩展 `dfo-npk-extractor-bun` 工具，添加对 86jp (次元彼端) PVF 格式的支持，使其能够：

1. 读取 86jp 格式的 PVF 文件
2. 提取所有文件内容（包括 ScriptFile、.ani、.str 等）
3. 生成 Godot 引擎可用的 SpriteFrames `.tres` 文件
4. 生成 Godot 场景 `.tscn` 文件

## 架构原则

### 1. 策略模式 (Strategy Pattern)

解密算法和字符串表解析采用策略模式，允许运行时选择：

```typescript
// 解密策略接口
interface PvfDecryptor {
  decryptData(data: Uint8Array, length: number, checksum: number): Uint8Array;
  decryptFileData(data: Uint8Array, length: number, crc32: number): Uint8Array;
}

// 台服实现
class DefaultPvfDecryptor implements PvfDecryptor { ... }

// 86jp 实现
class S4A21PvfDecryptor implements PvfDecryptor { ... }
```

### 2. 依赖注入 (Dependency Injection)

字符串表上下文通过参数传递，支持不同版本：

```typescript
interface PvfStringContext {
  binMap: Map<number, string>;
  resolveString(id: number): string;
}

// 台服: stringtable.bin
class DefaultStringContext implements PvfStringContext { ... }

// 86jp: sTrA/sTrW
class S4A21StringContext implements PvfStringContext { ... }
```

### 3. 向后兼容 (Backward Compatibility)

所有修改通过参数/条件分支实现，默认行为不变：

```typescript
// CLI 参数
--version <default|s4a21>  // 默认: default

// 内部路由
if (version === 's4a21') {
  return new S4A21PvfDecryptor();
} else {
  return new DefaultPvfDecryptor();
}
```

## 模块架构

### 核心模块

```
src/
├── pvf/
│   ├── reader.ts                 # 主读取器 (修改)
│   ├── reader-s4a21.ts           # 86jp 读取器 (新增)
│   ├── decryptor.ts              # 台服解密 (现有)
│   ├── decryptor-s4a21.ts        # 86jp 解密 (新增)
│   ├── string-table.ts           # 台服字符串表 (现有)
│   ├── string-table-s4a21.ts     # 86jp 字符串表 (新增)
│   ├── types.ts                  # 类型定义 (修改)
│   ├── encoding.ts               # 编码处理 (修改)
│   └── decoders/
│       ├── script-file.ts        # ScriptFile 检测 (修改)
│       ├── script-file-json.ts   # ScriptFile 解析 (修改)
│       └── script-file-s4a21.ts  # 86jp ScriptFile (新增)
├── godot/                        # Godot 资产生成 (新增)
│   ├── tres-generator.ts         # SpriteFrames 生成
│   └── scene-generator.ts        # 场景生成
└── utils/
    └── zlib.ts                   # Zlib 压缩/解压 (新增)
```

### 数据流

```
输入 PVF 文件
    ↓
[版本检测] --version 参数或自动检测
    ↓
[解密器选择] DefaultPvfDecryptor / S4A21PvfDecryptor
    ↓
[头部解析] 56字节 (台服) / 0x30字节 (86jp)
    ↓
[目录树解密] XOR+rotateRight6 (台服) / LCG流密码 (86jp)
    ↓
[字符串表解析] stringtable.bin (台服) / sTrA+sTrW (86jp)
    ↓
[文件数据解密] 同目录树算法
    ↓
[文件类型路由] ScriptFile / ANI / STR / Binary
    ↓
[解码器处理] JSON 反编译 / 编码转换
    ↓
输出文件/JSON/ tres
```

## 关键数据结构

### PvfHeader

```typescript
interface PvfHeader {
  // 台服特有
  sizeGUID: number;           // 0x24 (台服) / 其他值 (86jp)
  GUID: Uint8Array;
  fileVersion: number;
  
  // 通用
  dirTreeLength: number;
  dirTreeChecksum: number;
  numFilesInDirTree: number;
  
  // 86jp 特有
  bodySize?: number;
  groupCount?: number;
  hashTableSize?: number;
  nameTableSize?: number;
}
```

### PvfFileEntry

```typescript
interface PvfFileEntry {
  filePath: string;
  chunkIndex: number;
  dataOffset: number;
  dataSize: number;
  dataType: number;           // 1=ScriptFile, 3=String, 其他=Binary
  crc32: number;
}
```

### PvfStringContext

```typescript
interface PvfStringContext {
  // 字符串映射
  binMap: Map<number, string>;
  
  // 方法
  resolveString(id: number): string;
  resolveStringLink(listId: number, keyId: number): string;
}
```

## 加密算法对比

### 台服 (Default)

```
密钥: 0x81A79011
算法: rotateRight32(XOR(data, key), 6)
校验: CRC32
```

### 86jp (S4A21)

```
密钥: HeaD, HASH, GRPI, BodY, sTrA, sTrW (分段)
算法: LCG流密码
  seed = 0x76826701 * k[0] + 0x1C1 * (k[3] + 0x1C1 * (k[2] + 0x1C1 * k[1]))
  xor_key = ((seed >> 16) & 0xFFFF) + (t1 & 0xFFFF0000)
校验: Adler32
压缩: zlib
```

## ScriptFile 格式对比

### 台服 Token 格式

```
[Header: 0xD0B0] [Token: 5 bytes] ...
Token: [type: 1 byte][value: 4 bytes LE]
Type: 2=Int, 4=Float, 5=Section, 6=Command, 7=String, 8=Separator, 9/10=Link
字符串: 通过 stringtable.bin 索引
```

### 86jp Token 格式

```
无 Header，直接 token 流
Token: [type: 1 byte][value: 4 bytes LE]
Type: 0=Int, 2=Float, 3=String, 5=Section, 6=Command, 7=Script
字符串: 通过 sTrA/sTrW 解析
```

## 测试策略

### 单元测试

- 解密算法测试
- 字符串表解析测试
- ScriptFile 解析测试

### 集成测试

- 完整 PVF 提取测试
- 86jp PVF 提取测试
- Godot 资产生成测试

### 回归测试

- 确保台服功能不受影响
- 确保默认行为不变

## 风险与缓解

| 风险 | 概率 | 缓解措施 |
|------|------|----------|
| 算法移植错误 | 中 | 对比测试多个 PVF 文件 |
| 字符串编码问题 | 中 | 使用现有 encoding.ts 扩展 |
| ScriptFile 格式差异 | 低 | 参考已验证的 pvf-reader 实现 |
| 性能问题 | 低 | 延后优化，先保证正确性 |

## 参考实现

### 86jp 解密

- `libs/server-s4a12/Tool/PvfLib/PvfDecryptor.cs`
- `.opencode/skills/pvf-reader/scripts/read_pvf.py`

### 86jp 字符串表

- `libs/server-s4a12/Tool/PvfLib/PvfArchive.cs` (BuildStringBuffers)
- `.opencode/skills/pvf-reader/scripts/read_pvf.py` (PvfArchive._build_strings)

### 86jp ScriptFile

- `.opencode/skills/pvf-reader/scripts/read_pvf.py` (decode_type1_raw)
