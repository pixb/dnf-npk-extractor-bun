# PVF 格式对比分析

## 概述

本文档详细对比台服/国际服 PVF 格式与 86jp (次元彼端) PVF 格式的差异，为开发86jp支持提供技术参考。

## 文件头对比

### 台服 PVF 文件头 (56 字节)

```
Offset  Size  Field               说明
0x00    4     sizeGUID            固定值 0x24 (36)
0x04    36    GUID                唯一标识符
0x28    4     fileVersion         文件版本 (通常为1)
0x2C    4     dirTreeLength       目录树长度
0x30    4     dirTreeChecksum     目录树校验和
0x34    4     numFilesInDirTree   文件数量
```

### 86jp PVF 文件头 (0x30 字节)

```
Offset  Size  Field               说明
0x00    4     Signature           签名 0x69706B6E ("npki")
0x04    20    GUID                唯一标识符
0x18    4     FileCount           文件数量
0x1C    4     Padding             保留
0x20    4     BodySize            数据体大小
0x24    4     GroupCount          分组数量
0x28    4     HashTableSize       哈希表大小
0x2C    4     NameTableSize       名称表大小
```

## 加密方案对比

### 台服加密

```
密钥: 0x81A79011 (固定)
算法: 
  key = PASSWORD_PVF XOR crc32
  for each 4-byte block:
    data = rotateRight32(XOR(data, key), 6)
特征: 单一密钥，简单XOR+循环移位
```

### 86jp 加密 (S4A21)

```
密钥: 分段密钥 (HeaD, HASH, GRPI, BodY, sTrA, sTrW)
算法:
  seed = 0x76826701 * k[0] + 0x1C1 * (k[3] + 0x1C1 * (k[2] + 0x1C1 * k[1]))
  for each 4-byte block:
    t1 = 0x343FD * seed + magic
    seed = 0x343FD * t1 + magic
    xor_key = ((seed >> 16) & 0xFFFF) + (t1 & 0xFFFF0000)
    data = XOR(data, xor_key)
特征: LCG流密码，多阶段密钥派生
```

### 解密流程对比

```
台服:
1. 读取56字节头部 (明文)
2. 解密目录树 (XOR+rotateRight6)
3. 解密文件数据 (同上)

86jp:
1. DecryptGuard (XOR bytes 24-28 with 0x55)
2. 解密头部 ("HeaD" 密钥)
3. 解密哈希表 ("HASH" 密钥)
4. 解密分组表 ("GRPI" 密钥)
5. 解密数据体 ("BodY" 密钥)
6. Zlib 解压数据体
```

## 目录树对比

### 台服目录树

```
每个条目 0x18 字节:
- filePathLength (2 bytes)
- filePath (variable, BIG5 编码)
- chunkIndex (4 bytes)
- dataOffset (4 bytes)
- dataSize (4 bytes)
- dataType (4 bytes)
- crc32 (4 bytes)
```

### 86jp 目录树

```
每个条目 0x18 字节:
- filePathLength (2 bytes)
- filePath (variable, 可能是 Shift-JIS 或 UTF-8)
- chunkIndex (4 bytes)
- dataOffset (4 bytes)
- dataSize (4 bytes)
- dataType (4 bytes)
- crc32 (4 bytes)
```

## 字符串表对比

### 台服字符串表

```
文件: stringtable.bin
格式: 
  [count: 4 bytes]
  [offsets: count * 4 bytes]
  [strings: variable, BIG5 编码]
编码: BIG5 (繁体中文)
访问: 通过索引直接查找
```

### 86jp 字符串表

```
文件: sTrA (ASCII/UTF-8), sTrW (UTF-16LE)
位置: 嵌入在名称表中
格式:
  [cnt1: 4 bytes]
  [cnt2: 4 bytes]
  [encrypted_size: cnt1 XOR xorConst]
  [encrypted_data: encrypted_size bytes]
编码: sTrA = UTF-8, sTrW = UTF-16LE
解密: 使用 "sTrA" 或 "sTrW" 密钥 + Zlib 解压
访问: 通过偏移量查找
```

## ScriptFile Token 对比

### 台服 Token 格式

```
Header: 0xD0B0 (2 bytes)
Token:  [type: 1 byte][value: 4 bytes LE]

Type 定义:
  2 = Int         整数值
  3 = IntEx       扩展整数
  4 = Float       浮点数
  5 = Section     节标记 (通过 stringtable.bin)
  6 = Command     命令标记 (通过 stringtable.bin)
  7 = String      字符串值 (通过 stringtable.bin)
  8 = Separator   分隔符
  9 = LinkIndex   链接索引
  10 = Link       链接值 (通过 stringtable.bin)

字符串解析: token.strValue = ctx.binMap[value]
```

### 86jp Token 格式

```
无 Header，直接 token 流
Token: [type: 1 byte][value: 4 bytes LE]

Type 定义:
  0 = Int         整数值
  2 = Float       浮点数 (int→float 转换)
  3 = String      字符串值 (通过 sTrA/sTrW)
  5 = Section     节标记
  6 = Command     命令标记 (通过 sTrA/sTrW)
  7 = Script      脚本标记

字符串解析: resolve_string(value) 从 sTrA/sTrW
```

### Token 类型映射

| 功能 | 台服 Type | 86jp Type |
|------|-----------|-----------|
| 整数 | 2 | 0 |
| 浮点数 | 4 | 2 |
| 字符串 | 7 | 3 |
| Section | 5 | 5 (相同) |
| Command | 6 | 6 (相同) |

## 编码对比

### 台服编码

```
文件路径: BIG5HKSCS (繁体中文)
字符串表: BIG5
.str 文件: BIG5
默认编码: BIG5
```

### 86jp 编码

```
文件路径: 可能是 Shift-JIS 或 UTF-8
字符串表: sTrA = UTF-8, sTrW = UTF-16LE
.str 文件: UTF-8 或 UTF-16LE
默认编码: UTF-8
```

## 文件类型对比

### 台服文件类型

```
dataType = 1: ScriptFile (0xD0B0 header)
dataType = 3: String (.str 文件)
dataType = 其他: Binary (.ani, .img, etc.)
```

### 86jp 文件类型

```
dataType = 1: ScriptFile (无 header，直接 token 流)
dataType = 3: String (.str 文件)
dataType = 其他: Binary (.ani, .img, etc.)
```

## 数据体结构对比

### 台服数据体

```
[chunk0 encrypted] [chunk1 encrypted] ...
每个 chunk 独立加密，使用自己的 CRC32
```

### 86jp 数据体

```
[group0 compressed] [group1 compressed] ...
每个 group 使用 zlib 压缩
整个数据体先解密，再按 group 解压
```

## 校验方式对比

### 台服校验

```
CRC32: 用于加密密钥和数据完整性校验
校验和: dirTreeChecksum 用于目录树完整性
```

### 86jp 校验

```
Adler32: 用于 zlib 解压后的数据校验
签名: 0x69706B6N ("npki") 用于格式识别
```

## 性能考虑

### 台服

- 单一密钥，解密速度快
- 无压缩，内存占用低
- 适合大文件处理

### 86jp

- 多阶段密钥派生，解密较慢
- 使用 zlib 压缩，需要解压
- 内存占用较高

## 兼容性总结

| 特性 | 台服 | 86jp | 兼容性 |
|------|------|------|--------|
| 文件头 | 56字节 | 0x30字节 | ❌ 不兼容 |
| 加密算法 | XOR+rotateRight6 | LCG流密码 | ❌ 不兼容 |
| 字符串表 | stringtable.bin | sTrA/sTrW | ❌ 不兼容 |
| Token格式 | 有Header | 无Header | ❌ 不兼容 |
| Token类型 | 2,4,5,6,7,8,9,10 | 0,2,3,5,6,7 | ❌ 不兼容 |
| 编码 | BIG5 | UTF-8/UTF-16LE | ❌ 不兼容 |
| 数据体 | 独立加密chunk | 压缩group | ❌ 不兼容 |

**结论**: 台服和86jp是完全不兼容的格式，需要独立的解析器实现。
