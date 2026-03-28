'use client';

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read image file'));
    reader.readAsDataURL(file);
  });
}

export async function compressImageFile(file, options = {}) {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.84,
    mimeType = 'image/jpeg'
  } = options;

  const src = await readFileAsDataUrl(file);

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const ratio = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
      const width = Math.max(1, Math.floor(image.width * ratio));
      const height = Math.max(1, Math.floor(image.height * ratio));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Unable to process image'));
        return;
      }
      ctx.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL(mimeType, quality));
    };
    image.onerror = () => reject(new Error('Unable to process image'));
    image.src = src;
  });
}

export async function compressImageFiles(files, options = {}) {
  const list = Array.from(files || []);
  const outputs = [];
  for (const file of list) {
    outputs.push(await compressImageFile(file, options));
  }
  return outputs;
}
