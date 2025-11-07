import { createAdminClient } from '../config/supabase'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'

export interface UploadResult {
  url: string
  path: string
  size: number
  contentType: string
}

export class UploadService {
  private supabase = createAdminClient()
  private bucketName = 'product-images' // Change this to your bucket name

  /**
   * Upload image to Supabase Storage
   */
  async uploadImage(
    file: Buffer | string,
    folder: 'products' | 'categories' = 'products',
    filename?: string
  ): Promise<{
    success: boolean
    message: string
    data?: UploadResult
  }> {
    try {
      let imageBuffer: Buffer
      let contentType = 'image/jpeg'

      // Handle base64 strings
      if (typeof file === 'string') {
        // Extract base64 data and content type
        const matches = file.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
        if (matches && matches.length === 3) {
          contentType = matches[1]
          imageBuffer = Buffer.from(matches[2], 'base64')
        } else {
          return {
            success: false,
            message: 'Invalid base64 image format'
          }
        }
      } else {
        imageBuffer = file
      }

      // Optimize image using sharp
      const optimizedBuffer = await sharp(imageBuffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer()

      // Generate unique filename
      const fileExtension = contentType.split('/')[1] || 'jpg'
      const uniqueFilename = filename || `${uuidv4()}.${fileExtension}`
      const filePath = `${folder}/${uniqueFilename}`

      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, optimizedBuffer, {
          contentType,
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Supabase storage upload error:', error)
        return {
          success: false,
          message: `Failed to upload image: ${error.message}`
        }
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath)

      return {
        success: true,
        message: 'Image uploaded successfully',
        data: {
          url: urlData.publicUrl,
          path: filePath,
          size: optimizedBuffer.length,
          contentType
        }
      }
    } catch (error) {
      console.error('Upload service error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to upload image'
      }
    }
  }

  /**
   * Upload multiple images
   */
  async uploadMultipleImages(
    files: Array<Buffer | string>,
    folder: 'products' | 'categories' = 'products'
  ): Promise<{
    success: boolean
    message: string
    data?: UploadResult[]
    errors?: string[]
  }> {
    const results: UploadResult[] = []
    const errors: string[] = []

    for (let i = 0; i < files.length; i++) {
      const result = await this.uploadImage(files[i], folder)
      
      if (result.success && result.data) {
        results.push(result.data)
      } else {
        errors.push(`Image ${i + 1}: ${result.message}`)
      }
    }

    return {
      success: results.length > 0,
      message: `Uploaded ${results.length} of ${files.length} images`,
      data: results,
      errors: errors.length > 0 ? errors : undefined
    }
  }

  /**
   * Delete image from Supabase Storage
   */
  async deleteImage(path: string): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([path])

      if (error) {
        return {
          success: false,
          message: `Failed to delete image: ${error.message}`
        }
      }

      return {
        success: true,
        message: 'Image deleted successfully'
      }
    } catch (error) {
      console.error('Delete image error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete image'
      }
    }
  }

  /**
   * Delete multiple images
   */
  async deleteMultipleImages(paths: string[]): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove(paths)

      if (error) {
        return {
          success: false,
          message: `Failed to delete images: ${error.message}`
        }
      }

      return {
        success: true,
        message: `Deleted ${paths.length} images successfully`
      }
    } catch (error) {
      console.error('Delete multiple images error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete images'
      }
    }
  }
}

