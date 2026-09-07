# 实施路线图

## 项目概述

**目标**: 扩展 dnf-npk-extractor-bun，添加 86jp (次元彼端) PVF 格式支持

**预计工时**: 15-20 小时

**优先级**: P0 (核心功能)

---

## 阶段 0: 基础设施 (2h)

### 任务 0.1: 项目初始化
- [ ] 创建 `package.json`
- [ ] 配置 TypeScript (`tsconfig.json`)
- [ ] 设置 Bun 运行时
- [ ] 创建基本目录结构

### 任务 0.2: 参考库集成
- [ ] 验证 `libs/server-s4a12` 可访问
- [ ] 创建 `libs/README.md` 说明参考库用途
- [ ] 设置 `.gitignore` 排除 libs 目录

**产出**: 可运行的空项目骨架

---

## 阶段 1: 86jp 解密算法移植 (5-8h)

### 任务 1.1: 分析参考实现
- [ ] 阅读 `libs/server-s4a12/Tool/PvfLib/PvfDecryptor.cs`
- [ ] 阅读 `.opencode/skills/pvf-reader/scripts/read_pvf.py`
- [ ] 记录关键算法步骤

### 任务 1.2: 实现 DecryptCore
- [ ] 创建 `src/pvf/decryptor-s4a21.ts`
- [ ] 实现 `decryptCore(key, buf, magic)` 函数
- [ ] 实现 `decryptGuard(buf)` 函数
- [ ] 实现 `zlibDecompress(buf)` 函数

### 任务 1.3: 实现分段解密
- [ ] 实现 "HeaD" 解密
- [ ] 实现 "HASH" 解密
- [ ] 实现 "GRPI" 解密
- [ ] 实现 "BodY" 解密

### 任务 1.4: 实现 PvfDecryptor 接口
- [ ] 定义 `PvfDecryptor` 接口
- [ ] 实现 `S4A21PvfDecryptor` 类
- [ ] 实现 `DefaultPvfDecryptor` 类 (保持现有)

**产出**: `src/pvf/decryptor-s4a21.ts`

**参考文件**:
- `libs/server-s4a12/Tool/PvfLib/PvfDecryptor.cs:1-100`
- `.opencode/skills/pvf-reader/scripts/read_pvf.py:26-66`

---

## 阶段 2: 86jp PVF 读取器 (3-4h)

### 任务 2.1: 实现头部解析
- [ ] 创建 `src/pvf/reader-s4a21.ts`
- [ ] 实现 `readPvfHeader()` 解析 0x30 字节头部
- [ ] 验证签名 0x69706B6E

### 任务 2.2: 实现目录树解析
- [ ] 解析文件条目 (0x18 字节)
- [ ] 处理文件路径编码 (UTF-8/Shift-JIS)
- [ ] 构建 `PvfFileEntry[]`

### 任务 2.3: 实现数据体解析
- [ ] 解密 BodY chunk
- [ ] Zlib 解压
- [ ] 按 group 索引文件数据

### 任务 2.4: 实现完整读取器
- [ ] 整合头部、目录树、数据体解析
- [ ] 实现 `readPvfS4A21(path)` 函数
- [ ] 返回 `PvfArchive` 对象

**产出**: `src/pvf/reader-s4a21.ts`

**参考文件**:
- `libs/server-s4a12/Tool/PvfLib/PvfArchive.cs:81-152`
- `.opencode/skills/pvf-reader/scripts/read_pvf.py:69-120`

---

## 阶段 3: 字符串表解析 (3-4h)

### 任务 3.1: 分析 sTrA/sTrW 格式
- [ ] 研究 `libs/server-s4a12/Tool/PvfLib/PvfArchive.cs:BuildStringBuffers`
- [ ] 理解字符串表的加密和压缩方式

### 任务 3.2: 实现字符串表解析
- [ ] 创建 `src/pvf/string-table-s4a21.ts`
- [ ] 实现 `parseS4A21StringTableA()` (UTF-8)
- [ ] 实现 `parseS4A21StringTableW()` (UTF-16LE)

### 任务 3.3: 实现字符串上下文
- [ ] 实现 `S4A21StringContext` 类
- [ ] 实现 `resolveString(id)` 方法
- [ ] 集成到 `buildStringContext()`

**产出**: `src/pvf/string-table-s4a21.ts`

**参考文件**:
- `libs/server-s4a12/Tool/PvfLib/PvfArchive.cs:154-180`
- `.opencode/skills/pvf-reader/scripts/read_pvf.py:122-160`

---

## 阶段 4: ScriptFile 适配 (2-3h)

### 任务 4.1: 分析 86jp ScriptFile 格式
- [ ] 研究 `decode_type1_raw()` 实现
- [ ] 理解 Token 类型差异

### 任务 4.2: 实现 86jp ScriptFile 解析器
- [ ] 创建 `src/pvf/decoders/script-file-s4a21.ts`
- [ ] 实现 `isScriptFileS4A21()` 检测
- [ ] 实现 `parseTokensS4A21()` 解析

### 任务 4.3: 集成到解码器路由
- [ ] 修改 `src/pvf/decoders/index.ts`
- [ ] 根据版本选择解析器
- [ ] 处理 Token 类型映射

**产出**: `src/pvf/decoders/script-file-s4a21.ts`

**参考文件**:
- `.opencode/skills/pvf-reader/scripts/read_pvf.py:216-238`

---

## 阶段 5: CLI 集成 (1h)

### 任务 5.1: 添加版本参数
- [ ] 修改 `index.ts`
- [ ] 添加 `--version <default|s4a21>` 参数
- [ ] 更新帮助文本

### 任务 5.2: 传递版本到核心函数
- [ ] 修改 `extractPvf()` 签名
- [ ] 修改 `generateItemList()` 签名
- [ ] 修改 `generateTres()` 签名

### 任务 5.3: 测试 CLI
- [ ] 测试台服 PVF (回归)
- [ ] 测试 86jp PVF (新功能)

**产出**: 更新后的 `index.ts`

---

## 阶段 6: Godot 资产管线 (3-5h)

### 任务 6.1: Tres 生成器
- [ ] 创建 `src/godot/tres-generator.ts`
- [ ] 从 PVF ANI 生成 SpriteFrames
- [ ] 处理 86jp ANI 格式

### 任务 6.2: 场景生成器
- [ ] 创建 `src/godot/scene-generator.ts`
- [ ] 生成 AnimatedSprite2D 节点
- [ ] 支持多动画序列

### 任务 6.3: 集成到 CLI
- [ ] 修改 `tres` 命令支持 86jp
- [ ] 添加 `--format <tres|tscn>` 参数

**产出**: `src/godot/` 模块

---

## 阶段 7: 测试与验证 (3-4h)

### 任务 7.1: 单元测试
- [ ] 解密算法测试
- [ ] 字符串表解析测试
- [ ] ScriptFile 解析测试

### 任务 7.2: 集成测试
- [ ] 完整台服 PVF 提取 (回归)
- [ ] 完整 86jp PVF 提取 (新功能)
- [ ] Godot 资产生成测试

### 任务 7.3: Godot 验证
- [ ] 生成 SpriteFrames
- [ ] 在 Godot 编辑器中测试
- [ ] 验证动画播放

**产出**: 测试用例和验证报告

---

## 时间线

```
Week 1:
├── Day 1: 阶段 0 (项目初始化)
├── Day 2-3: 阶段 1 (解密算法)
├── Day 4: 阶段 2 (PVF读取器)
└── Day 5: 阶段 3 (字符串表)

Week 2:
├── Day 6: 阶段 4 (ScriptFile)
├── Day 7: 阶段 5 (CLI集成)
├── Day 8-9: 阶段 6 (Godot管线)
└── Day 10: 阶段 7 (测试验证)
```

---

## 里程碑

### M1: 86jp PVF 可读取 (Week 1)
- [ ] 能解析 86jp PVF 头部
- [ ] 能解密目录树
- [ ] 能提取文件

### M2: ScriptFile 可解析 (Week 2 前半)
- [ ] 能解析 86jp ScriptFile
- [ ] 能生成 JSON 输出

### M3: Godot 资产可生成 (Week 2 后半)
- [ ] 能生成 SpriteFrames
- [ ] 能在 Godot 中验证

---

## 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 算法移植错误 | 中 | 高 | 对比测试多个 PVF 文件 |
| 字符串编码问题 | 中 | 中 | 使用现有 encoding.ts 扩展 |
| ScriptFile 格式差异 | 低 | 中 | 参考已验证的 pvf-reader |
| 性能问题 | 低 | 低 | 延后优化 |

---

## 成功标准

### 功能完成
- [ ] 能读取 86jp 格式 PVF 文件
- [ ] 能提取所有文件内容
- [ ] 能生成 Godot SpriteFrames `.tres`
- [ ] 能生成 Godot 场景 `.tscn`

### 测试通过
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试：86jp PVF 完整提取
- [ ] Godot 验证：场景可正常渲染

### 文档完整
- [ ] README.md 包含使用示例
- [ ] API 文档完整
- [ ] 开发文档清晰
