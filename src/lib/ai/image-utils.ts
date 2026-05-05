"use client";

import type { ChatImage } from "./gemini";

export const MAX_IMAGES = 3;
export const MAX_FILE_BYTES = 10_000_000; // 10MB raw upload allowed (client resizes down)
export const RESIZE_MAX_DIMENSION = 1280;
export const RESIZE_JPEG_QUALITY = 0.85;

export type ImagePreview = ChatImage & {
  /** Object URL for <img> preview. Must be revoked when removed. */
  previewUrl: string;
  filename: string;
};

export async function resizeImageToBase64(
  file: File,
  maxSize: number = RESIZE_MAX_DIMENSION,
  quality: number = RESIZE_JPEG_QUALITY,
): Promise<{ mimeType: string; data: string }> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(
      `파일이 너무 큽니다 (최대 ${(MAX_FILE_BYTES / 1_000_000).toFixed(0)}MB)`,
    );
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
    const w = Math.round(img.width * ratio);
    const h = Math.round(img.height * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas context unavailable");
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const base64 = dataUrl.split(",", 2)[1] ?? "";
    return { mimeType: "image/jpeg", data: base64 };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 읽을 수 없습니다"));
    img.src = src;
  });
}

export function makePreviewFromFile(file: File): { previewUrl: string } {
  return { previewUrl: URL.createObjectURL(file) };
}

export function isAcceptableImageType(file: File): boolean {
  return /^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type);
}
