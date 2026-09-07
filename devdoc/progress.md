# Progress

## Current Status

- **Phase**: Core implementation
- **Completed**: All core features + integration tests + documentation
- **Status**: Ready for production use

## Milestones

### 1. 项目初始化 ✅
- [x] 创建项目结构
- [x] 配置 TypeScript + Bun
- [x] 添加 Git 子模块
- [x] 实现 86jp 解密器

### 2. 86jp PVF 格式支持 ✅
- [x] 实现头部解析 (解密 + DecryptGuard)
- [x] 实现文件表解析 (757,300 文件)
- [x] 实现 GRPI 表解析 (6,211 groups)
- [x] 实现字符串表解析 (sTrA/sTrW)
- [x] 实现 ScriptFile 解码器 (.act/.ani/.lst)
- [x] 实现文件数据提取 (chunk 解密 + Zlib 解压)
- [x] 添加 CLI 命令 (pvf, pvf-list, pvf-extract, pvf-decode)

### 3. NPK 解包支持 ✅
- [x] 实现 NPK 头部解析 (NeoplePack_Bill)
- [x] 实现文件名解密 (XOR 加密)
- [x] 添加 CLI 命令 (npk, npk-extract)

### 4. IMG 文件解析 ✅
- [x] 实现 IMG 头部解析 (版本 2/4/5/6)
- [x] 实现帧数据读取
- [x] 实现 Zlib 解压
- [x] 添加 CLI 命令 (img)

### 5. PNG 导出 ✅
- [x] 实现 BGRA 到 RGBA 转换
- [x] 实现 PNG 编码
- [x] 添加 CLI 命令 (img-export)

### 6. Godot 资源生成 ✅
- [x] 实现 SpriteFrames 生成
- [x] 实现场景生成
- [x] 添加 CLI 命令 (godot-sprite)

### 7. 集成测试和文档 ✅
- [x] 编写集成测试 (16 个测试用例)
- [x] 编写 API 文档
- [x] 编写 README.md

## 测试结果

```
bun test v1.4.2 (744846f8)
 16 pass
 0 fail
 145 expect() calls
Ran 16 tests across 2 files. [645.00ms]
```

## 文件结构

```
src/
├── pvf/           # PVF 解析模块
│   ├── decryptor-s4a21.ts  # 86jp 解密器
│   ├── reader-s4a21.ts     # PVF 读取器
│   ├── script-file.ts      # 脚本解码器
│   └── types.ts            # 类型定义
├── npk/           # NPK 解析模块
│   ├── reader.ts           # NPK 读取器
│   └── types.ts            # 类型定义
├── img/           # IMG 解析模块
│   ├── reader.ts           # IMG 读取器
│   ├── png.ts              # PNG 导出器
│   └── types.ts            # 类型定义
└── godot/         # Godot 资源生成
    ├── sprite-frames.ts    # SpriteFrames 生成
    └── scene.ts            # 场景生成
```

## 下一步

项目已准备就绪，可以用于：
1. 从 NPK 提取 IMG 资源
2. 将 IMG 转换为 PNG
3. 生成 Godot SpriteFrames 和场景文件
4. 解析 PVF 脚本文件
