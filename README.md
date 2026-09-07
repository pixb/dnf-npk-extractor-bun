# DNF NPK Extractor Bun

DNF (Dungeon & Fighters) 资源包解析器，支持 86jp 私服格式。

## 功能

- **PVF 解析**: 读取 86jp 格式的 PVF 脚本文件
- **NPK 解包**: 解析 NeoplePack_Bill 格式的资源包
- **IMG 解析**: 读取 DNF 图像格式 (版本 2/4/5/6)
- **PNG 导出**: 将 IMG 帧转换为 PNG 图像
- **Godot 集成**: 生成 SpriteFrames 和场景文件

## 安装

```bash
bun install
```

## 使用

### PVF 命令

```bash
# 读取 PVF 文件
bun run index.ts pvf <pvf文件路径>

# 列出 PVF 文件
bun run index.ts pvf-list <pvf文件路径> [-f 过滤] [-n 数量]

# 提取文件
bun run index.ts pvf-extract -p <内部路径> <pvf文件路径> [-o 输出路径]

# 解码脚本
bun run index.ts pvf-decode -p <内部路径> <pvf文件路径>
```

### NPK 命令

```bash
# 读取 NPK 文件
bun run index.ts npk <npk文件路径> [-f 过滤] [-n 数量]

# 提取文件
bun run index.ts npk-extract -i <索引> <npk文件路径> [-o 输出路径]
```

### IMG 命令

```bash
# 读取 IMG 文件
bun run index.ts img <img文件路径> [-n 数量]

# 导出 PNG
bun run index.ts img-export -i <帧索引> <img文件路径> [-o 输出目录]
```

### Godot 命令

```bash
# 生成 SpriteFrames
bun run index.ts godot-sprite <img文件路径> [-o 输出目录] [-f 动画名]
```

## API 文档

### PVF 模块

```typescript
import { readPvfS4A21 } from './src/pvf/reader-s4a21.js';

// 读取 PVF 文件
const pvf = await readPvfS4A21('path/to/script.pvf');

// 获取文件列表
const files = pvf.getFiles();

// 查找文件
const entry = pvf.findFile('npc/118_seria.npc');

// 解码脚本
const text = pvf.decodeScriptFile(entry);

// 获取文件数据
const data = pvf.getFileByPath('npc/118_seria.npc');
```

### NPK 模块

```typescript
import { readNpk, getNpkFileData, listNpkFiles } from './src/npk/reader.js';

// 读取 NPK 文件
const npk = await readNpk('path/to/file.NPK');

// 列出文件
const files = listNpkFiles(npk, 'filter');

// 获取文件数据
const data = getNpkFileData(npk, 0);
```

### IMG 模块

```typescript
import { readImg } from './src/img/reader.js';
import { exportFrameToPng } from './src/img/png.js';

// 读取 IMG 文件
const img = readImg(buffer);

// 导出帧为 PNG
const png = exportFrameToPng(img.frames[0]);
```

### Godot 模块

```typescript
import { createSpriteFramesFromImg, generateSpriteFramesTres } from './src/godot/sprite-frames.js';
import { generateSimpleSpriteScene } from './src/godot/scene.js';

// 创建 SpriteFrames
const spriteFrames = createSpriteFramesFromImg(img, 'sprite_name');

// 生成 .tres 文件
const tres = generateSpriteFramesTres(spriteFrames);

// 生成场景
const scene = generateSimpleSpriteScene('sprite.tres');
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

## 测试

```bash
# 运行所有测试
bun test

# 运行特定测试
bun test test/decryptor.test.ts
bun test test/integration.test.ts
```

## 开发

```bash
# 格式化代码
bun run fmt

# 类型检查
bun run typecheck
```

## 许可证

MIT
