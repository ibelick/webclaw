type CompressedImage = {
  mimeType: string
  content: string // base64
}

const MAX_DIMENSION = 1280
const INITIAL_QUALITY = 0.75
const TARGET_SIZE_BYTES = 300_000 // ~300KB -> ~400KB base64 -> under 512KB WS limit

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

function resizeAndCompress(
  img: HTMLImageElement,
  maxDim: number,
  quality: number,
): HTMLCanvasElement {
  let { width, height } = img
  if (width > maxDim || height > maxDim) {
    const ratio = Math.min(maxDim / width, maxDim / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.drawImage(img, 0, 0, width, height)
  return canvas
}

function canvasToBase64(canvas: HTMLCanvasElement, quality: number): string {
  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  return dataUrl.split(',')[1] ?? ''
}

function base64ByteSize(base64: string): number {
  return Math.ceil((base64.length * 3) / 4)
}

export async function compressImage(file: File): Promise<CompressedImage> {
  const img = await loadImage(file)
  const canvas = resizeAndCompress(img, MAX_DIMENSION, INITIAL_QUALITY)

  // Progressive quality reduction if over target
  let quality = INITIAL_QUALITY
  let base64 = canvasToBase64(canvas, quality)

  while (base64ByteSize(base64) > TARGET_SIZE_BYTES && quality > 0.3) {
    quality -= 0.1
    base64 = canvasToBase64(canvas, quality)
  }

  // Clean up object URL
  URL.revokeObjectURL(img.src)

  return {
    mimeType: 'image/jpeg',
    content: base64,
  }
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}
