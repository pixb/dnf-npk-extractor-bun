/**
 * 86jp (S4A21) PVF ScriptFile 解析器
 *
 * 用于解析 Type=1 的脚本文件 (.act/.ani/.lst)
 *
 * 格式: 每个 token 5 字节
 * - 1 byte: 类型 (0, 2, 3, 5, 6, 7)
 * - 4 bytes: 值 (little-endian int32)
 *
 * Token 类型:
 * - 0: 整数值
 * - 2: 浮点值 (IEEE 754)
 * - 3: 字符串引用 (新段落)
 * - 5: 特殊标记 {5=``}
 * - 6: 字符串引用 (反引号)
 * - 7: 特殊标记 {7=``}
 */

export interface ScriptToken {
    type: number;
    value: number;
    stringValue?: string;
}

export interface ScriptFile {
    tokens: ScriptToken[];
    raw: Buffer;
}

/**
 * 解码 Type-1 脚本文件
 */
export function decodeScriptFile(data: Buffer, resolveString: (id: number) => string): string {
    const lineCount = Math.floor(data.length / 5);
    const out: string[] = [];

    for (let i = 0; i < lineCount; i++) {
        const off = i * 5;
        const t = data[off];
        const v = data.readInt32LE(off + 1);

        switch (t) {
            case 0: // 整数值
                out.push(v.toString() + ' ');
                break;
            case 2: // 浮点值
                out.push(readFloatLE(data, off + 1).toFixed(2) + ' ');
                break;
            case 3: // 字符串引用 (新段落)
                out.push('\n' + resolveString(v) + '\n');
                break;
            case 5: // 特殊标记 {5=``}
                out.push('\n{5=``}');
                break;
            case 6: // 字符串引用 (反引号)
                out.push('`' + resolveString(v) + '` ');
                break;
            case 7: // 特殊标记 {7=``}
                out.push('\n{7=``}');
                break;
            default:
                out.push(`<t${t}=${v}> `);
                break;
        }
    }

    return out.join('');
}

/**
 * 解析脚本文件为 token 数组
 */
export function parseScriptFile(data: Buffer): ScriptToken[] {
    const lineCount = Math.floor(data.length / 5);
    const tokens: ScriptToken[] = [];

    for (let i = 0; i < lineCount; i++) {
        const off = i * 5;
        tokens.push({
            type: data[off],
            value: data.readInt32LE(off + 1),
        });
    }

    return tokens;
}

/**
 * 解析 .ani 文件为结构化数据
 */
export function parseAniFile(text: string): {
    loop: number | null;
    frameCount: number | null;
    frames: Array<{
        image: string | null;
        frame: number | null;
        x: number | null;
        y: number | null;
        delayMs: number | null;
    }>;
    fps: number | null;
} {
    const info: {
        loop: number | null;
        frameCount: number | null;
        frames: Array<{
            image: string | null;
            frame: number | null;
            x: number | null;
            y: number | null;
            delayMs: number | null;
        }>;
        fps: number | null;
    } = {
        loop: null,
        frameCount: null,
        frames: [],
        fps: null,
    };

    let cur: {
        image: string | null;
        frame: number | null;
        x: number | null;
        y: number | null;
        delayMs: number | null;
    } | null = null;
    let expect: string | null = null;

    for (const line of text.split('\n')) {
        const s = line.trim();
        if (!s) continue;

        if (s.startsWith('[')) {
            const low = s.toLowerCase();
            if (low === '[loop]') {
                expect = 'loop';
            } else if (low === '[frame max]') {
                expect = 'frame_max';
            } else if (low === '[delay]') {
                expect = 'delay';
            } else if (low === '[image pos]') {
                expect = 'pos';
            } else if (low === '[image]') {
                expect = 'image_frame';
            } else if (low.startsWith('[frame') && low.endsWith(']')) {
                cur = { image: null, frame: null, x: null, y: null, delayMs: null };
                info.frames.push(cur);
                expect = null;
            } else {
                expect = null;
            }
            continue;
        }

        // 值行
        try {
            if (expect === 'loop') {
                info.loop = parseInt(s, 10);
            } else if (expect === 'frame_max') {
                info.frameCount = parseInt(s, 10);
            } else if (expect === 'delay' && cur !== null) {
                cur.delayMs = parseInt(s, 10);
            } else if (expect === 'pos' && cur !== null) {
                const parts = s.split(' ');
                cur.x = parseInt(parts[0], 10);
                cur.y = parseInt(parts[1], 10);
            } else if (expect === 'image_frame' && cur !== null) {
                const parts = s.split('`');
                if (parts.length >= 2) {
                    cur.image = parts[1];
                    const rest = parts[2]?.split(' ');
                    if (rest && rest[0]) {
                        cur.frame = parseInt(rest[0], 10);
                    }
                }
            }
        } catch {
            // 忽略解析错误
        }
        expect = null;
    }

    // 计算 FPS
    if (info.frames.length > 0) {
        const delays = info.frames
            .map(f => f.delayMs)
            .filter((d): d is number => d !== null && d > 0);

        if (delays.length > 0 && delays.every(d => d === delays[0])) {
            info.fps = 1000.0 / delays[0];
        }
    }

    return info;
}

/**
 * 读取 IEEE 754 浮点数 (little-endian)
 */
function readFloatLE(buffer: Buffer, offset: number): number {
    const int = buffer.readInt32LE(offset);
    const buf = Buffer.alloc(4);
    buf.writeInt32LE(int, 0);
    return buf.readFloatLE(0);
}
