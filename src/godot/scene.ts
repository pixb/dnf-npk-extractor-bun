/**
 * Godot 场景生成器
 *
 * 将 SpriteFrames 转换为 Godot 场景文件
 */

import type { SpriteFramesData } from './sprite-frames.js';

/**
 * Godot 场景节点
 */
export interface SceneNode {
    name: string;
    type: string;
    properties: Record<string, string | number | boolean>;
    children: SceneNode[];
}

/**
 * 从 SpriteFrames 创建场景
 */
export function createSceneFromSpriteFrames(
    spriteFrames: SpriteFramesData,
    sceneName: string
): SceneNode {
    return {
        name: sceneName,
        type: 'Node2D',
        properties: {
            position: 'Vector2(0, 0)',
            scale: 'Vector2(1, 1)',
        },
        children: [{
            name: 'Sprite2D',
            type: 'Sprite2D',
            properties: {
                position: 'Vector2(0, 0)',
                texture: `ExtResource("sprite_frames")`,
                animation: '&"default"',
                frame: 0,
            },
            children: [],
        }],
    };
}

/**
 * 生成 Godot .tscn 格式的场景
 */
export function generateSceneTres(
    scene: SceneNode,
    spriteFramesPath: string
): string {
    const lines: string[] = [];

    // 头部
    lines.push('[gd_scene load_steps=2 format=3 uid="uid://placeholder"]');
    lines.push('');

    // 外部资源
    lines.push('[ext_resource type="SpriteFrames" path="res://' + spriteFramesPath + '" id="sprite_frames"]');
    lines.push('');

    // 节点
    lines.push('[node name="' + scene.name + '" type="' + scene.type + '"]');
    for (const [key, value] of Object.entries(scene.properties)) {
        lines.push(key + ' = ' + String(value));
    }

    for (const child of scene.children) {
      lines.push('');
      lines.push('[node name="' + child.name + '" type="' + child.type + '" parent="."]');
      for (const [key, value] of Object.entries(child.properties)) {
          lines.push(key + ' = ' + String(value));
      }
    }

    return lines.join('\n');
}

/**
 * 生成简单的 Sprite2D 场景
 */
export function generateSimpleSpriteScene(
    spriteFramesPath: string,
    animationName: string = 'default'
): string {
    const lines: string[] = [];

    // 头部
    lines.push('[gd_scene load_steps=2 format=3 uid="uid://placeholder"]');
    lines.push('');

    // 外部资源
    lines.push('[ext_resource type="SpriteFrames" path="res://' + spriteFramesPath + '" id="sprite_frames"]');
    lines.push('');

    // 根节点
    lines.push('[node name="Root" type="Node2D"]');
    lines.push('');

    // Sprite2D 节点
    lines.push('[node name="Sprite2D" type="Sprite2D" parent="."]');
    lines.push('texture = ExtResource("sprite_frames")');
    lines.push('animation = &"' + animationName + '"');
    lines.push('frame = 0');

    return lines.join('\n');
}
