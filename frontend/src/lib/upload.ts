import { apiClient } from './api'

export interface UploadResult {
  url: string
  path: string
  size: number
  contentType: string
}

/**
 * Upload a single image (base64 or file)
 */
export async function uploadImage(
  image: string | File,
  folder: 'products' | 'categories' = 'products'
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    let imageData: string

    if (image instanceof File) {
      // Convert file to base64
      imageData = await fileToBase64(image)
    } else {
      imageData = image
    }

    const response = await apiClient.post<UploadResult>('/api/upload/single/base64', {
      image: imageData,
      folder
    })

    if (response.success && response.data) {
      return {
        success: true,
        url: response.data.url
      }
    }

    return {
      success: false,
      error: response.message || 'Failed to upload image'
    }
  } catch (error) {
    console.error('Upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Upload multiple images
 */
export async function uploadMultipleImages(
  images: Array<string | File>,
  folder: 'products' | 'categories' = 'products'
): Promise<{ success: boolean; urls: string[]; errors: string[] }> {
  const urls: string[] = []
  const errors: string[] = []

  // Process images sequentially to avoid overwhelming the server
  for (let i = 0; i < images.length; i++) {
    const result = await uploadImage(images[i], folder)
    
    if (result.success && result.url) {
      urls.push(result.url)
    } else {
      errors.push(result.error || `Failed to upload image ${i + 1}`)
    }
  }

  return {
    success: urls.length > 0,
    urls,
    errors
  }
}

/**
 * Convert File to base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Check if image is a base64 data URL or blob URL
 */
export function isLocalImage(url: string): boolean {
  return url.startsWith('data:') || url.startsWith('blob:')
}

/**
 * Upload images that are local (base64 or blob) and return updated array
 */
export async function uploadLocalImages(
  images: string[],
  folder: 'products' | 'categories' = 'products'
): Promise<{ success: boolean; images: string[]; errors: string[] }> {
  const updatedImages: string[] = []
  const errors: string[] = []

  for (const image of images) {
    if (isLocalImage(image)) {
      const result = await uploadImage(image, folder)
      if (result.success && result.url) {
        updatedImages.push(result.url)
      } else {
        errors.push(result.error || 'Failed to upload image')
      }
    } else {
      // Already uploaded, keep as is
      updatedImages.push(image)
    }
  }

  return {
    success: errors.length === 0,
    images: updatedImages,
    errors
  }
}

