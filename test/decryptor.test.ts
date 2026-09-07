/**
 * PVF 解密器测试
 */

import { describe, expect, it } from "bun:test";
import {
	decrypt,
	decrypt2,
	decryptGuard,
	verifySignature,
} from "../src/pvf/decryptor-s4a21.js";

describe("PVF Decryptor", () => {
	it("should decrypt data with standard key", () => {
		const key = "qTG/891YmHRE";
		const data = Buffer.from("Hello, World!");
		const original = Buffer.from(data);

		decrypt(key, data);

		// 数据应该被修改
		expect(data.equals(original)).toBe(false);

		// 再次解密应该恢复原始数据
		decrypt(key, data);
		expect(data.equals(original)).toBe(true);
	});

	it("should decrypt data with alternative magic", () => {
		const key = "test";
		const data = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);

		decrypt2(key, data);

		// 数据应该被修改
		expect(data[0]).not.toBe(1);
	});

	it("should apply header guard decryption", () => {
		const data = Buffer.alloc(32, 0x55);
		// writeUInt32LE 使用小端序: 0x12345678 存储为 [0x78, 0x56, 0x34, 0x12]
		data.writeUInt32LE(0x12345678, 24);

		decryptGuard(data);

		// 字节 24-27 应该被 XOR 0x55
		// 小端序: 0x78 ^ 0x55 = 0x2D = 45
		//         0x56 ^ 0x55 = 0x03 = 3
		//         0x34 ^ 0x55 = 0x61 = 97
		//         0x12 ^ 0x55 = 0x47 = 71
		expect(data[24]).toBe(0x78 ^ 0x55); // 0x2D = 45
		expect(data[25]).toBe(0x56 ^ 0x55); // 0x03 = 3
		expect(data[26]).toBe(0x34 ^ 0x55); // 0x61 = 97
		expect(data[27]).toBe(0x12 ^ 0x55); // 0x47 = 71
	});

	it("should verify valid signature", () => {
		const data = Buffer.alloc(4);
		data.writeUInt32LE(0x69706b6e, 0); // "npki"

		expect(verifySignature(data)).toBe(true);
	});

	it("should reject invalid signature", () => {
		const data = Buffer.alloc(4);
		data.writeUInt32LE(0x00000000, 0);

		expect(verifySignature(data)).toBe(false);
	});
});
