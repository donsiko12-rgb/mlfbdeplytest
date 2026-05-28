/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utility to compress and resize images client-side before processing or uploading.
 */

export interface CompressionResult {
  dataUrl: string;
  originalSize: number; // in bytes
  compressedSize: number; // in bytes
  percentageSaved: number;
}

export function getBase64Size(base64String: string): number {
  if (!base64String) return 0;
  const parts = base64String.split(',');
  const base64Content = parts[1] || parts[0];
  const padding = (base64Content.match(/=/g) || []).length;
  return Math.floor((base64Content.length * 3) / 4) - padding;
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export async function compressImage(
  src: string | File,
  maxDimension: number = 1600,
  quality: number = 0.85
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    let originalSize = 0;
    let dataUrlPromise: Promise<string>;

    if (src instanceof File) {
      originalSize = src.size;
      dataUrlPromise = new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = (e) => res(e.target?.result as string);
        reader.onerror = (e) => rej(e);
        reader.readAsDataURL(src);
      });
    } else {
      originalSize = getBase64Size(src);
      dataUrlPromise = Promise.resolve(src);
    }

    dataUrlPromise
      .then((dataUrl) => {
        const img = new Image();
        img.onload = () => {
          let width = img.naturalWidth;
          let height = img.naturalHeight;

          // Only downscale if the dimensions exceed the maxDimension limit
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo obtener el contexto 2D del Canvas'));
            return;
          }

          // Anti-aliasing quality settings
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw the image onto the canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Export as JPEG
          try {
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            const compressedSize = getBase64Size(compressedDataUrl);
            const percentageSaved = Math.max(
              0,
              Math.round(((originalSize - compressedSize) / originalSize) * 100)
            );

            resolve({
              dataUrl: compressedDataUrl,
              originalSize,
              compressedSize,
              percentageSaved,
            });
          } catch (e) {
            reject(e);
          }
        };

        img.onerror = () => {
          reject(new Error('No se pudo cargar la imagen original.'));
        };

        img.src = dataUrl;
      })
      .catch((err) => reject(err));
  });
}
