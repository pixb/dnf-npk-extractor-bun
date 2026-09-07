/**
 * IMG 文件格式类型定义
 */

export interface ImgHeader {
	magic: number; // 0x00000003 or 0x00000004 etc.
	version: number;
	frameCount: number;
	width: number;
	height: number;
	colorKey: number; // BGRA 颜色键 (透明色)
}

export interface ImgFrame {
	width: number;
	height: number;
	offset: { x: number; y: number };
	dataSize: number;
	compression: number; // 0=无压缩, 1=Zlib, 2=BZ2
	type: number; // 像素格式类型
	data?: Buffer;
}

export interface ImgTexture {
	width: number;
	height: number;
	pixels: Buffer; // BGRA 像素数据
}

export interface ImgArchive {
	header: ImgHeader;
	frames: ImgFrame[];
	data: Buffer;
}
