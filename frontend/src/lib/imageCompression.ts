'use client'

export interface CompressOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  mimeType?: string
  folder?: 'products' | 'categories'
}

function clampQuality(value: number): number {
  if (Number.isNaN(value)) return 0.8
  return Math.min(1, Math.max(0.1, value))
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Failed to load image for compression'))
    image.src = dataUrl
  })
}

export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<string> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.82,
    mimeType
  } = options

  try {
    const dataUrl = await readFileAsDataUrl(file)
    const image = await loadImage(dataUrl)

    const widthRatio = maxWidth / image.width
    const heightRatio = maxHeight / image.height
    const scaleRatio = Math.min(1, widthRatio, heightRatio)

    const targetWidth = Math.round(image.width * scaleRatio)
    const targetHeight = Math.round(image.height * scaleRatio)

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Unable to create canvas context')
    }

    ctx.drawImage(image, 0, 0, targetWidth, targetHeight)

    const outputMime = mimeType || (file.type === 'image/png' ? 'image/png' : 'image/webp')
    const outputQuality = clampQuality(quality)

    return canvas.toDataURL(outputMime, outputQuality)
  } catch (error) {
    console.warn('Image compression failed, returning original image data', error)
    return readFileAsDataUrl(file)
  }
}

export async function recompressDataUrl(
  dataUrl: string,
  options: Omit<CompressOptions, 'mimeType'> & { mimeType?: string } = {}
): Promise<string> {
  try {
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    const file = new File([blob], `image-${Date.now()}.png`, { type: blob.type || 'image/png' })
    return compressImage(file, options)
  } catch (error) {
    console.warn('Failed to recompress data URL, returning original', error)
    return dataUrl
  }
}

