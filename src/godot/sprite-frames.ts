/**
 * Godot SpriteFrames 生成器
 *
 * 将 IMG 帧转换为 Godot SpriteFrames 资源
 */

import type { ImgArchive } from "../img/types.js";

/**
 * Godot SpriteFrames 格式
 */
export interface SpriteFramesData {
	name: string;
	frames: Array<{
		name: string;
		texture: Buffer;
		duration: number;
	}>;
	animations: Array<{
		name: string;
		frames: number[];
		loop: boolean;
		speed: number;
	}>;
}

/**
 * 从 IMG 创建 SpriteFrames
 */
export function createSpriteFramesFromImg(
	img: ImgArchive,
	baseName: string,
	animationName: string = "default",
): SpriteFramesData {
	const frames = img.frames.map((frame, index) => ({
		name: `${baseName}_${index.toString().padStart(4, "0")}`,
		texture: frame.data || Buffer.alloc(0),
		duration: 1.0 / 60, // 默认 60 FPS
	}));

	return {
		name: baseName,
		frames,
		animations: [
			{
				name: animationName,
				frames: frames.map((_, i) => i),
				loop: true,
				speed: 60,
			},
		],
	};
}

/**
 * 生成 Godot .tres 格式的 SpriteFrames
 */
export function generateSpriteFramesTres(
	spriteFrames: SpriteFramesData,
): string {
	const lines: string[] = [];

	// 头部
	lines.push(
		'[gd_resource type="SpriteFrames" format=3 uid="uid://placeholder"]',
	);
	lines.push("");

	// 加载动画
	lines.push('[sub_resource type="SpriteFrames" id="SpriteFrames_1"]');
	lines.push("animations = [");

	for (const animation of spriteFrames.animations) {
		const frameRefs = animation.frames
			.map((i) => `"${spriteFrames.frames[i]?.name || `frame_${i}`}"`)
			.join(", ");

		lines.push(`{`);
		lines.push(`"frames": [${frameRefs}],`);
		lines.push(`"loop": ${animation.loop ? "true" : "false"},`);
		lines.push(`"name": &"${animation.name}",`);
		lines.push(`"speed": ${animation.speed}.0`);
		lines.push(`},`);
	}

	lines.push("]");
	lines.push("");

	// 资源引用
	lines.push("[resource]");
	lines.push('SpriteFrames = SubResource("SpriteFrames_1")');

	return lines.join("\n");
}

/**
 * 生成 Godot .tres 格式的帧纹理列表
 */
export function generateFrameTextures(
	spriteFrames: SpriteFramesData,
	outputDir: string,
): Array<{ name: string; path: string; data: Buffer }> {
	return spriteFrames.frames.map((frame) => ({
		name: frame.name,
		path: `${outputDir}/${frame.name}.png`,
		data: frame.texture,
	}));
}
