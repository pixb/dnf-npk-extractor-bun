/**
 * DNF NPK Extractor Bun
 *
 * 支持台服/国际服 (DFO) 和 86jp (次元彼端) 私服格式
 *
 * 用法:
 *   bun run index.ts <command> [options]
 *
 * 命令:
 *   pvf         读取 PVF 文件
 *   npk         解包 NPK 文件
 *   pvf-list    列出 PVF 文件内容
 */

import { parseArgs } from "node:util";
import { generateSimpleSpriteScene } from "./src/godot/scene.js";
import {
	createSpriteFramesFromImg,
	generateFrameTextures,
	generateSpriteFramesTres,
} from "./src/godot/sprite-frames.js";
import { exportFrameToPng } from "./src/img/png.js";
import { readImg } from "./src/img/reader.js";
import { getNpkFileData, listNpkFiles, readNpk } from "./src/npk/reader.js";
import { readPvfS4A21 } from "./src/pvf/reader-s4a21.js";

const { values, positionals } = parseArgs({
	args: Bun.argv.slice(2),
	options: {
		version: {
			type: "string",
			short: "v",
			default: "86jp",
		},
		key: {
			type: "string",
			short: "k",
			default: "qTG/891YmHRE",
		},
		output: {
			type: "string",
			short: "o",
			default: "./output",
		},
		filter: {
			type: "string",
			short: "f",
		},
		limit: {
			type: "string",
			short: "n",
		},
		path: {
			type: "string",
			short: "p",
		},
		index: {
			type: "string",
			short: "i",
		},
		help: {
			type: "boolean",
			short: "h",
		},
	},
	strict: false,
});

const command = positionals[0];
const target = positionals[1];

function printHelp(): void {
	console.log(`
DNF NPK Extractor Bun - DNF 资源包解析器

用法:
  bun run index.ts <command> [options] <file>

命令:
  pvf           读取 PVF 文件 (支持 86jp 格式)
  pvf-list      列出 PVF 文件内容
  pvf-extract   提取 PVF 文件中的单个文件
  pvf-decode    解码脚本文件 (.act/.ani/.lst)
  npk           读取 NPK 文件
  npk-extract   提取 NPK 文件中的单个文件
  img           读取 IMG 文件
  img-export    导出 IMG 帧为 PNG
  godot-sprite  生成 Godot SpriteFrames 资源

选项:
  -v, --version <ver>    PVF 版本 (86jp, default, 台服)
  -k, --key <key>        解密密钥
  -o, --output <dir>     输出目录
  -f, --filter <pattern> 文件过滤/动画名称
  -n, --limit <n>        限制文件数量
  -p, --path <path>      PVF 内部文件路径
  -i, --index <n>        NPK/IMG 文件索引 (-1 表示全部)
  -h, --help             显示帮助

示例:
  # 读取 86jp PVF 文件
  bun run index.ts pvf "C:\\game\\86jpA21次元彼端\\S4A21_CN\\S4A21_CN\\script.pvf"

  # 列出 PVF 中的文件
  bun run index.ts pvf-list "C:\\game\\86jpA21次元彼端\\S4A21_CN\\S4A21_CN\\script.pvf"

  # 提取单个文件
  bun run index.ts pvf-extract -p "npc/118_seria.npc" "C:\\game\\86jpA21次元彼端\\S4A21_CN\\S4A21_CN\\script.pvf"

  # 解码脚本文件
  bun run index.ts pvf-decode -p "npc/118_seria.npc" "C:\\game\\86jpA21次元彼端\\S4A21_CN\\S4A21_CN\\script.pvf"

  # 读取 NPK 文件
  bun run index.ts npk "C:\\game\\86jpA21次元彼端\\S4A21_CN\\S4A21_CN\\ImagePacks2\\xxx.NPK"

  # 提取 NPK 文件
  bun run index.ts npk-extract -i 0 "C:\\game\\86jpA21次元彼端\\S4A21_CN\\S4A21_CN\\ImagePacks2\\xxx.NPK"

  # 读取 IMG 文件
  bun run index.ts img "C:\\game\\86jpA21次元彼端\\S4A21_CN\\S4A21_CN\\ImagePacks2\\xxx.img"

  # 导出 IMG 第 0 帧为 PNG
  bun run index.ts img-export -i 0 "C:\\game\\86jpA21次元彼端\\S4A21_CN\\S4A21_CN\\ImagePacks2\\xxx.img"

  # 生成 Godot SpriteFrames 资源
  bun run index.ts godot-sprite -o ./output "C:\\game\\86jpA21次元彼端\\S4A21_CN\\S4A21_CN\\ImagePacks2\\xxx.img"
`);
}

async function main(): Promise<void> {
	if (values.help || !command) {
		printHelp();
		process.exit(0);
	}

	if (!target) {
		console.error("错误: 请指定文件路径");
		process.exit(1);
	}

	console.log(`命令: ${command}`);
	console.log(`目标: ${target}`);
	console.log("");

	switch (command) {
		case "pvf":
		case "pvf-list": {
			console.log("正在读取 PVF 文件...");

			try {
				const pvf = await readPvfS4A21(target);
				const files = pvf.getFiles();

				console.log(`\n找到 ${files.length} 个文件:\n`);

				// 显示前 20 个文件
				const limit = values.limit ? parseInt(values.limit as string, 10) : 20;
				const filter = values.filter as string | undefined;

				let count = 0;
				for (const file of files) {
					const fullPath = file.path ? `${file.path}/${file.name}` : file.name;
					if (
						filter &&
						!fullPath.toLowerCase().includes(filter.toLowerCase())
					) {
						continue;
					}

					if (count >= limit) {
						console.log(`... 及更多文件 (共 ${files.length} 个)`);
						break;
					}

					console.log(`  ${fullPath}`);
					console.log(
						`    Chunk: ${file.entry.chunkIndex}, Offset: ${file.entry.dataOffset}, Size: ${file.entry.dataSize}, Type: ${file.entry.dataType}`,
					);
					count++;
				}
			} catch (error) {
				console.error("读取 PVF 失败:", error);
				process.exit(1);
			}
			break;
		}

		case "pvf-extract": {
			const pvfPath = values.path as string | undefined;
			if (!pvfPath) {
				console.error("错误: 请使用 -p 或 --path 指定 PVF 内部文件路径");
				process.exit(1);
			}

			console.log("正在读取 PVF 文件...");

			try {
				const pvf = await readPvfS4A21(target);
				const result = pvf.getFileByPath(pvfPath);

				if (!result) {
					console.error(`未找到文件: ${pvfPath}`);
					process.exit(1);
				}

				console.log(`\n找到文件: ${result.path}/${result.name}`);
				console.log(`  大小: ${result.data.length} 字节`);
				console.log(`  类型: ${result.entry.dataType}`);

				// 写入文件
				const outputPath = (values.output as string) || `${result.name}`;
				await Bun.write(outputPath, result.data);
				console.log(`  已保存到: ${outputPath}`);
			} catch (error) {
				console.error("提取文件失败:", error);
				process.exit(1);
			}
			break;
		}

		case "pvf-decode": {
			const pvfPath = values.path as string | undefined;
			if (!pvfPath) {
				console.error("错误: 请使用 -p 或 --path 指定 PVF 内部文件路径");
				process.exit(1);
			}

			console.log("正在读取 PVF 文件...");

			try {
				const pvf = await readPvfS4A21(target);
				const entry = pvf.findFile(pvfPath);

				if (!entry) {
					console.error(`未找到文件: ${pvfPath}`);
					process.exit(1);
				}

				if (entry.dataType !== 1) {
					console.error(
						`文件类型不是脚本 (Type=1): ${pvfPath} (Type=${entry.dataType})`,
					);
					process.exit(1);
				}

				const text = pvf.decodeScriptFile(entry);
				if (text === null) {
					console.error("解码脚本文件失败");
					process.exit(1);
				}

				console.log(`\n=== ${pvfPath} ===\n`);
				console.log(text);
			} catch (error) {
				console.error("解码脚本文件失败:", error);
				process.exit(1);
			}
			break;
		}

		case "npk": {
			console.log("正在读取 NPK 文件...");

			try {
				const npk = await readNpk(target);
				console.log(`\nNPK 文件信息:`);
				console.log(`  文件数: ${npk.files.length}`);
				console.log(`  版本: ${npk.header.version}`);

				// 显示前 10 个文件
				const limit = values.limit ? parseInt(values.limit as string, 10) : 10;
				const filter = values.filter as string | undefined;
				const files = listNpkFiles(npk, filter);

				console.log(`\n文件列表 (显示前 ${Math.min(limit, files.length)} 个):`);
				for (let i = 0; i < Math.min(limit, files.length); i++) {
					const file = files[i];
					console.log(`  ${file.name}`);
					console.log(`    Offset: ${file.offset}, Size: ${file.size}`);
				}
			} catch (error) {
				console.error("读取 NPK 失败:", error);
				process.exit(1);
			}
			break;
		}

		case "npk-extract": {
			const npkIndex = values.index ? parseInt(values.index as string, 10) : -1;
			if (npkIndex < 0) {
				console.error("错误: 请使用 -i 或 --index 指定文件索引");
				process.exit(1);
			}

			console.log("正在读取 NPK 文件...");

			try {
				const npk = await readNpk(target);
				const entry = npk.files[npkIndex];
				if (!entry) {
					console.error(`未找到文件索引: ${npkIndex}`);
					process.exit(1);
				}

				const data = getNpkFileData(npk, npkIndex);
				if (!data) {
					console.error("获取文件数据失败");
					process.exit(1);
				}

				console.log(`\n提取文件: ${entry.name}`);
				console.log(`  大小: ${data.length} 字节`);

				// 写入文件
				const outputPath =
					(values.output as string) || entry.name.split("/").pop() || "output";
				await Bun.write(outputPath, data);
				console.log(`  已保存到: ${outputPath}`);
			} catch (error) {
				console.error("提取文件失败:", error);
				process.exit(1);
			}
			break;
		}

		case "img": {
			console.log("正在读取 IMG 文件...");

			try {
				const file = Bun.file(target);
				const buffer = Buffer.from(await file.arrayBuffer());
				const img = readImg(buffer);

				console.log(`\nIMG 文件信息:`);
				console.log(`  版本: ${img.header.version}`);
				console.log(`  帧数: ${img.frames.length}`);
				console.log(`  大小: ${img.header.width}x${img.header.height}`);

				// 显示帧信息
				const limit = values.limit ? parseInt(values.limit as string, 10) : 5;
				console.log(
					`\n帧列表 (显示前 ${Math.min(limit, img.frames.length)} 个):`,
				);
				for (let i = 0; i < Math.min(limit, img.frames.length); i++) {
					const frame = img.frames[i];
					console.log(
						`  帧 ${i}: ${frame.width}x${frame.height} @ (${frame.offset.x}, ${frame.offset.y})`,
					);
					console.log(
						`    大小: ${frame.dataSize} 字节, 压缩: ${frame.compression}`,
					);
				}
			} catch (error) {
				console.error("读取 IMG 失败:", error);
				process.exit(1);
			}
			break;
		}

		case "img-export": {
			const frameIndex = values.index
				? parseInt(values.index as string, 10)
				: 0;
			const outputDir = (values.output as string) || "./output";

			console.log("正在读取 IMG 文件...");

			try {
				const file = Bun.file(target);
				const buffer = Buffer.from(await file.arrayBuffer());
				const img = readImg(buffer);

				console.log(`\nIMG 文件信息:`);
				console.log(`  版本: ${img.header.version}`);
				console.log(`  帧数: ${img.frames.length}`);

				// 导出指定帧或所有帧
				const framesToExport =
					frameIndex >= 0 ? [img.frames[frameIndex]] : img.frames;

				for (let i = 0; i < framesToExport.length; i++) {
					const frame = framesToExport[i];
					const actualIndex = frameIndex >= 0 ? frameIndex : i;

					console.log(
						`\n导出帧 ${actualIndex}: ${frame.width}x${frame.height}`,
					);

					const pngData = exportFrameToPng(frame);
					if (!pngData) {
						console.error(`  导出帧 ${actualIndex} 失败`);
						continue;
					}

					const outputPath = `${outputDir}/frame_${actualIndex}.png`;
					await Bun.write(outputPath, pngData);
					console.log(`  已保存到: ${outputPath}`);
				}
			} catch (error) {
				console.error("导出 IMG 失败:", error);
				process.exit(1);
			}
			break;
		}

		case "godot-sprite": {
			const outputDir = (values.output as string) || "./output";
			const animName = (values.filter as string) || "default";

			console.log("正在读取 IMG 文件...");

			try {
				const file = Bun.file(target);
				const buffer = Buffer.from(await file.arrayBuffer());
				const img = readImg(buffer);

				console.log(`\nIMG 文件信息:`);
				console.log(`  版本: ${img.header.version}`);
				console.log(`  帧数: ${img.frames.length}`);

				// 创建 SpriteFrames
				const baseName =
					target
						.split("/")
						.pop()
						?.replace(/\.[^.]+$/, "") || "sprite";
				const spriteFrames = createSpriteFramesFromImg(img, baseName, animName);

				// 生成 .tres 文件
				const tresContent = generateSpriteFramesTres(spriteFrames);
				const tresPath = `${outputDir}/${baseName}.tres`;
				await Bun.write(tresPath, tresContent);
				console.log(`\n已生成 SpriteFrames: ${tresPath}`);

				// 导出帧纹理
				const textures = generateFrameTextures(spriteFrames, outputDir);
				for (const texture of textures) {
					const pngData = exportFrameToPng(
						img.frames[textures.indexOf(texture)],
					);
					if (pngData) {
						await Bun.write(texture.path, pngData);
					}
				}
				console.log(`已导出 ${textures.length} 个帧纹理`);

				// 生成场景文件
				const sceneContent = generateSimpleSpriteScene(
					`${baseName}.tres`,
					animName,
				);
				const scenePath = `${outputDir}/${baseName}.tscn`;
				await Bun.write(scenePath, sceneContent);
				console.log(`已生成场景: ${scenePath}`);
			} catch (error) {
				console.error("生成 Godot 资源失败:", error);
				process.exit(1);
			}
			break;
		}

		default: {
			console.error(`未知命令: ${command}`);
			printHelp();
			process.exit(1);
		}
	}
}

main().catch((error) => {
	console.error("错误:", error);
	process.exit(1);
});
