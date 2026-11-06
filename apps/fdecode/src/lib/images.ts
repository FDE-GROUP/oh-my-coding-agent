/**
 * 图片附件预处理。
 *
 * @remarks
 * 在浏览器内把图片缩到长边 2048px、单图不超过 5MB，减少上传体积。Pi 之后仍会
 * 按当前模型的 `inputLimits.images.resize` 做最终规范化。
 *
 * @internal
 */

/**
 * 图片附件。
 *
 * @internal
 */
export interface ImageAttachment {
	/** 本地唯一 id。 */
	id: string;
	/** 发送给 Pi 的 MIME 类型。 */
	mimeType: string;
	/** base64 数据，不含 data URL 前缀。 */
	data: string;
	/** 预览用 object URL。 */
	preview: string;
	/** 原始文件名，仅用于展示。 */
	name: string;
}

const MAX_EDGE = 2048;
const MAX_BYTES = 5 * 1024 * 1024;
const START_QUALITY = 0.85;
const MIN_QUALITY = 0.5;
let sequence = 0;

function bytesToBase64(bytes: Uint8Array): string {
	let binary = "";
	const chunk = 0x8000;
	for (let index = 0; index < bytes.length; index += chunk) {
		binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
	}
	return btoa(binary);
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) resolve(blob);
				else reject(new Error("图片编码失败"));
			},
			"image/jpeg",
			quality,
		);
	});
}

/**
 * 缩放并编码一张图片。
 *
 * @param source - 粘贴、拖拽或选择的图片。
 * @param name - 展示用文件名。
 * @returns 可发送的附件。
 * @internal
 */
export async function prepareImage(source: Blob, name: string): Promise<ImageAttachment> {
	if (!source.type.startsWith("image/")) throw new Error("只支持图片文件");
	const bitmap = await createImageBitmap(source);
	try {
		const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
		const width = Math.max(1, Math.round(bitmap.width * scale));
		const height = Math.max(1, Math.round(bitmap.height * scale));
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("无法创建画布");
		context.drawImage(bitmap, 0, 0, width, height);

		let quality = START_QUALITY;
		let blob = await canvasToBlob(canvas, quality);
		while (blob.size > MAX_BYTES && quality > MIN_QUALITY) {
			quality -= 0.1;
			blob = await canvasToBlob(canvas, quality);
		}
		if (blob.size > MAX_BYTES) throw new Error("图片压缩后仍超过 5MB");

		const bytes = new Uint8Array(await blob.arrayBuffer());
		return {
			id: `image-${Date.now()}-${++sequence}`,
			mimeType: "image/jpeg",
			data: bytesToBase64(bytes),
			preview: URL.createObjectURL(blob),
			name,
		};
	} finally {
		bitmap.close();
	}
}

/**
 * 释放附件的预览 URL。
 *
 * @param attachment - 要释放的附件。
 * @internal
 */
export function releaseImage(attachment: ImageAttachment): void {
	URL.revokeObjectURL(attachment.preview);
}
