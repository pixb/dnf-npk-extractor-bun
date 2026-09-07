# 参考资料

## 开源库索引

### 1. skypub/ServerS4A12.0719 (最重要)

**仓库**: https://github.com/skypub/ServerS4A12.0719

**本地路径**: `libs/server-s4a12/`

**用途**: 86jp 服务器模拟器，包含完整的 PVF 解析实现

**关键文件**:

| 文件 | 内容 | 优先级 |
|------|------|--------|
| `Tool/PvfLib/PvfDecryptor.cs` | 完整解密算法 | ⭐ P0 |
| `Tool/PvfLib/PvfArchive.cs` | PVF 归档解析 | ⭐ P0 |
| `Tool/PvfLib/PvfUnpacker.cs` | 解包逻辑 | P1 |
| `Tool/PvfLib/PvfPacker.cs` | 打包逻辑 | P2 |

**关键代码位置**:

```
PvfDecryptor.cs:1-100
├── DecryptCore()          # 核心解密算法
├── DecryptGuard()         # 头部保护解密
├── Decrypt()              # 标准解密 (magic=0x269EC3)
├── Decrypt2()             # 备用解密 (magic=0x269EC9)
└── ZlibDecompress()       # Zlib 解压

PvfArchive.cs:81-180
├── Parse()                # 主解析流程
├── BuildStringBuffers()   # sTrA/sTrW 解析
└── DecryptStringBuffer()  # 字符串表解密
```

---

### 2. Zageku/DNF_pvf_python

**仓库**: https://github.com/Zageku/DNF_pvf_python

**本地路径**: `libs/dnf-pvf-python/`

**用途**: 台服 PVF Python 解析器 (459 星)

**特点**:
- 台服 PVF 读取
- 数据库 blob 解析
- 背包编辑工具

**参考价值**: 对比台服实现

---

### 3. onlyGuo/dnf_parser

**仓库**: https://github.com/onlyGuo/dnf_parser

**本地路径**: `libs/dnf-parser-java/`

**用途**: Java 版 DNF 解析器

**特点**:
- 多模块架构
- NPK + PVF 解析
- 修复了 PVF 文本匹配问题

**参考价值**: 架构设计参考

---

### 4. flwmxd/DNF-Porting

**仓库**: https://github.com/flwmxd/DNF-Porting

**本地路径**: `libs/dnf-porting/`

**用途**: DNF Client and PVF Reader

**参考价值**: API 设计参考

---

### 5. dof-dev/pvftools

**仓库**: https://github.com/dof-dev/pvftools

**本地路径**: `libs/pvftools/`

**用途**: PVF 工具集

**功能**:
- 世界掉落编辑
- 怪物掉率修改
- 礼盒生成器
- 技能数据修改

**参考价值**: 功能扩展参考

---

### 6. Qswhisper/PVF-Ai-Agent-Workbench

**仓库**: https://github.com/Qswhisper/PVF-Ai-Agent-Workbench

**本地路径**: `libs/pvf-agent-workbench/`

**用途**: PVF AI Agent 工作台

**特点**:
- AI 辅助 PVF 编辑
- 知识库
- 常见问题提醒

**参考价值**: 文档和知识库

---

## pvf-reader Skill

**本地路径**: `.opencode/skills/pvf-reader/`

**用途**: 86jp PVF 读取器 (Python)

**关键文件**:

| 文件 | 内容 | 优先级 |
|------|------|--------|
| `scripts/read_pvf.py` | PVF 读取器 | ⭐ P0 |
| `scripts/pvf_repack.py` | 格式转换器 | P1 |
| `SKILL.md` | 使用说明 | 参考 |

**关键代码位置**:

```
read_pvf.py:26-66
├── decrypt_core()         # 核心解密算法
├── decrypt()              # 标准解密
├── decrypt2()             # 备用解密
└── decrypt_guard()        # 头部保护解密

read_pvf.py:69-120
└── PvfArchive
    ├── _parse_header()    # 头部解析
    ├── _parse_tables()    # 表解析
    └── _build_strings()   # 字符串表构建

read_pvf.py:216-238
└── decode_type1_raw()     # ScriptFile 解码
```

---

## 原始 dfo-npk-extractor-bun

**本地路径**: `tools/dfo-npk-extractor-bun/` (原始版本)

**用途**: 台服/国际服 PVF 解析器

**关键文件**:

| 文件 | 内容 | 优先级 |
|------|------|--------|
| `src/pvf/reader.ts` | PVF 读取器 | 参考 |
| `src/pvf/decoders/script-file-json.ts` | ScriptFile 解析 | 参考 |
| `src/pvf/string-table.ts` | 字符串表解析 | 参考 |
| `src/pvf/encoding.ts` | 编码处理 | 复用 |

---

## 格式规范文档

### 台服 PVF 格式

**来源**: `tools/dfo-npk-extractor-bun/docs/pvf-format.md`

**关键点**:
- 56 字节头部
- `sizeGUID = 0x24`
- `PASSWORD_PVF = 0x81A79011`
- XOR + rotateRight6 加密
- BIG5 编码

### 86jp PVF 格式

**来源**: `libs/server-s4a12/` + `.opencode/skills/pvf-reader/`

**关键点**:
- 0x30 字节头部
- 签名 `0x69706B6E` ("npki")
- S4A21 加密 (LCG 流密码)
- sTrA/sTrW 字符串表
- UTF-8/UTF-16LE 编码

---

## 学习路径

### 第一步: 理解台服实现

1. 阅读 `tools/dfo-npk-extractor-bun/src/pvf/reader.ts`
2. 理解解密算法
3. 理解目录树解析

### 第二步: 理解 86jp 实现

1. 阅读 `libs/server-s4a12/Tool/PvfLib/PvfDecryptor.cs`
2. 阅读 `libs/server-s4a12/Tool/PvfLib/PvfArchive.cs`
3. 对比与台服的差异

### 第三步: 理解 pvf-reader

1. 阅读 `.opencode/skills/pvf-reader/scripts/read_pvf.py`
2. 理解解密流程
3. 理解 ScriptFile 解析

### 第四步: 开始移植

1. 从解密算法开始
2. 逐步添加功能
3. 每步都进行测试

---

## 常见问题

### Q: 为什么 86jp 格式与台服不兼容?

A: 两者使用完全不同的加密方案:
- 台服: 单一密钥 `0x81A79011` + XOR + rotateRight6
- 86jp: S4A21 多阶段密钥派生 + LCG 流密码

### Q: ScriptFile 格式有什么不同?

A: 主要差异:
- 台服: 有 `0xD0B0` Header
- 86jp: 无 Header，直接 token 流
- Token 类型编号不同
- 字符串解析方式不同

### Q: 如何验证移植正确性?

A: 使用以下测试:
1. 对比 C# 和 TypeScript 的解密输出
2. 使用真实 86jp PVF 测试
3. 在 Godot 中验证生成的资产
