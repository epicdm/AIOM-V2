/**
 * Image Processing Utilities
 *
 * Provides utilities for processing receipt images including:
 * - EXIF orientation detection and auto-rotation
 * - Image compression and resizing
 * - Canvas-based image manipulation
 */

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface ProcessedImage {
  blob: Blob;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  wasRotated: boolean;
}

/**
 * Reads EXIF orientation from image file
 * Returns orientation value (1-8) or 1 if not found
 */
export async function getExifOrientation(file: File): Promise<number> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const view = new DataView(e.target?.result as ArrayBuffer);

      // Check for JPEG marker
      if (view.getUint16(0, false) !== 0xFFD8) {
        resolve(1);
        return;
      }

      const length = view.byteLength;
      let offset = 2;

      while (offset < length) {
        if (view.getUint16(offset + 2, false) <= 8) {
          resolve(1);
          return;
        }

        const marker = view.getUint16(offset, false);
        offset += 2;

        // APP1 marker (contains EXIF)
        if (marker === 0xFFE1) {
          const exifIdCode = view.getUint32(offset + 2, false);
          if (exifIdCode !== 0x45786966) { // 'Exif'
            resolve(1);
            return;
          }

          const tiffOffset = offset + 8;
          const littleEndian = view.getUint16(tiffOffset, false) === 0x4949;

          if (view.getUint16(tiffOffset + 2, littleEndian) !== 0x002A) {
            resolve(1);
            return;
          }

          const firstIFDOffset = view.getUint32(tiffOffset + 4, littleEndian);
          if (firstIFDOffset < 0x00000008) {
            resolve(1);
            return;
          }

          const ifdOffset = tiffOffset + firstIFDOffset;
          const entries = view.getUint16(ifdOffset, littleEndian);

          for (let i = 0; i < entries; i++) {
            const entryOffset = ifdOffset + 2 + (i * 12);
            const tag = view.getUint16(entryOffset, littleEndian);

            // Orientation tag
            if (tag === 0x0112) {
              const orientation = view.getUint16(entryOffset + 8, littleEndian);
              resolve(orientation);
              return;
            }
          }

          resolve(1);
          return;
        } else if ((marker & 0xFF00) !== 0xFF00) {
          break;
        } else {
          offset += view.getUint16(offset, false);
        }
      }

      resolve(1);
    };

    reader.onerror = () => resolve(1);

    // Read first 64KB for EXIF data
    reader.readAsArrayBuffer(file.slice(0, 65536));
  });
}

/**
 * Loads an image from a File or Blob
 */
export function loadImage(source: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      if (typeof source !== 'string') {
        URL.revokeObjectURL(img.src);
      }
      resolve(img);
    };

    img.onerror = () => {
      if (typeof source !== 'string') {
        URL.revokeObjectURL(img.src);
      }
      reject(new Error('Failed to load image'));
    };

    if (typeof source === 'string') {
      img.src = source;
    } else {
      img.src = URL.createObjectURL(source);
    }
  });
}

/**
 * Applies EXIF orientation transformation to canvas context
 */
function applyExifOrientation(
  ctx: CanvasRenderingContext2D,
  orientation: number,
  width: number,
  height: number
): void {
  switch (orientation) {
    case 2:
      ctx.transform(-1, 0, 0, 1, width, 0);
      break;
    case 3:
      ctx.transform(-1, 0, 0, -1, width, height);
      break;
    case 4:
      ctx.transform(1, 0, 0, -1, 0, height);
      break;
    case 5:
      ctx.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      ctx.transform(0, 1, -1, 0, height, 0);
      break;
    case 7:
      ctx.transform(0, -1, -1, 0, height, width);
      break;
    case 8:
      ctx.transform(0, -1, 1, 0, 0, width);
      break;
    default:
      break;
  }
}

/**
 * Determines if orientation requires width/height swap
 */
function orientationRequiresSwap(orientation: number): boolean {
  return orientation >= 5 && orientation <= 8;
}

/**
 * Calculates scaled dimensions while maintaining aspect ratio
 */
function calculateScaledDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let newWidth = width;
  let newHeight = height;

  if (width > maxWidth) {
    newWidth = maxWidth;
    newHeight = Math.round((height * maxWidth) / width);
  }

  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = Math.round((width * maxHeight) / height);
  }

  return { width: newWidth, height: newHeight };
}

/**
 * Processes an image with auto-rotation and optional resizing/compression
 */
export async function processImage(
  file: File,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImage> {
  const {
    maxWidth = 2048,
    maxHeight = 2048,
    quality = 0.85,
    outputType = 'image/jpeg',
  } = options;

  // Get EXIF orientation
  const orientation = await getExifOrientation(file);
  const wasRotated = orientation !== 1;

  // Load the image
  const img = await loadImage(file);
  const originalWidth = img.naturalWidth;
  const originalHeight = img.naturalHeight;

  // Determine if we need to swap dimensions
  const swap = orientationRequiresSwap(orientation);
  const srcWidth = swap ? originalHeight : originalWidth;
  const srcHeight = swap ? originalWidth : originalHeight;

  // Calculate target dimensions
  const { width, height } = calculateScaledDimensions(
    srcWidth,
    srcHeight,
    maxWidth,
    maxHeight
  );

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Apply orientation transformation
  ctx.save();

  if (swap) {
    applyExifOrientation(ctx, orientation, height, width);
    ctx.drawImage(
      img,
      0, 0, originalWidth, originalHeight,
      0, 0, height, width
    );
  } else {
    applyExifOrientation(ctx, orientation, width, height);
    ctx.drawImage(
      img,
      0, 0, originalWidth, originalHeight,
      0, 0, width, height
    );
  }

  ctx.restore();

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob'));
          return;
        }

        resolve({
          blob,
          width,
          height,
          originalWidth,
          originalHeight,
          wasRotated,
        });
      },
      outputType,
      quality
    );
  });
}

/**
 * Rotates an image by specified degrees (90, 180, 270)
 */
export async function rotateImage(
  source: File | Blob,
  degrees: 90 | 180 | 270,
  options: ImageProcessingOptions = {}
): Promise<Blob> {
  const {
    quality = 0.85,
    outputType = 'image/jpeg',
  } = options;

  const img = await loadImage(source);
  const { naturalWidth, naturalHeight } = img;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Set canvas dimensions based on rotation
  if (degrees === 90 || degrees === 270) {
    canvas.width = naturalHeight;
    canvas.height = naturalWidth;
  } else {
    canvas.width = naturalWidth;
    canvas.height = naturalHeight;
  }

  // Apply rotation
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(img, -naturalWidth / 2, -naturalHeight / 2);
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob'));
          return;
        }
        resolve(blob);
      },
      outputType,
      quality
    );
  });
}

/**
 * Creates a thumbnail from an image
 */
export async function createThumbnail(
  source: File | Blob,
  maxSize: number = 200,
  quality: number = 0.7
): Promise<Blob> {
  const img = await loadImage(source);
  const { naturalWidth, naturalHeight } = img;

  const { width, height } = calculateScaledDimensions(
    naturalWidth,
    naturalHeight,
    maxSize,
    maxSize
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create thumbnail'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Converts a File/Blob to base64 data URL
 */
export function toDataURL(source: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(source);
  });
}
