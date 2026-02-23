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
  private defaultBucketName = 'product-images'
  private bucketMap: Record<'products' | 'categories', string> = {
    products: 'product-images',
    categories: 'category-images'
  }
  private bucketInitialized: Map<string, Promise<void>> = new Map()

  private resolveBucket(folder: 'products' | 'categories'): string {
    return this.bucketMap[folder] || this.defaultBucketName
  }

  private resolveBucketFromPath(path: string): string {
    if (path.startsWith('categories/')) {
      return this.bucketMap.categories
    }

    return this.bucketMap.products
  }

  /**
   * Validate image buffer by checking file signatures (magic numbers)
   */
  private async validateImageBuffer(buffer: Buffer): Promise<void> {
    if (!buffer || buffer.length < 8) {
      throw new Error('Invalid image: buffer too small')
    }

    const signatures = {
      // JPEG: FF D8 FF
      jpeg: [0xFF, 0xD8, 0xFF],
      // PNG: 89 50 4E 47 0D 0A 1A 0A
      png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
      // WebP: RIFF....WEBP
      webp: [0x52, 0x49, 0x46, 0x46],
      // AVIF: ftyp...avif
      avif: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
      // GIF: GIF87a or GIF89a
      gif87a: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
      gif89a: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
    }

    const header = Array.from(buffer.slice(0, 12))
    
    // Check JPEG
    if (signatures.jpeg.every((byte, i) => header[i] === byte)) {
      return
    }
    
    // Check PNG
    if (signatures.png.every((byte, i) => header[i] === byte)) {
      return
    }
    
    // Check WebP
    if (signatures.webp.every((byte, i) => header[i] === byte) && 
        buffer.toString('ascii', 8, 12) === 'WEBP') {
      return
    }
    
    // Check AVIF (simplified check)
    const bufferStr = buffer.toString('ascii', 4, 12)
    if (bufferStr.includes('ftyp') && bufferStr.includes('avif')) {
      return
    }
    
    // Check GIF
    if (signatures.gif87a.every((byte, i) => header[i] === byte) ||
        signatures.gif89a.every((byte, i) => header[i] === byte)) {
      return
    }

    // If none match, try to validate with sharp (fallback)
    try {
      await sharp(buffer).metadata()
      return
    } catch {
      throw new Error('Invalid image: file signature verification failed')
    }
  }

  private getFormatInfo(contentType: string): {
    extension: string
    mimeType: string
    format: 'jpeg' | 'png' | 'webp' | 'avif'
  } {
    switch (contentType) {
      case 'image/png':
        return { extension: 'png', mimeType: 'image/png', format: 'png' }
      case 'image/webp':
        return { extension: 'webp', mimeType: 'image/webp', format: 'webp' }
      case 'image/avif':
        return { extension: 'avif', mimeType: 'image/avif', format: 'avif' }
      case 'image/jpeg':
      case 'image/jpg':
      default:
        return { extension: 'jpg', mimeType: 'image/jpeg', format: 'jpeg' }
    }
  }

  private async ensureBucketExists(bucketName: string): Promise<void> {
    if (!this.bucketInitialized.has(bucketName)) {
      const initPromise = (async () => {
        try {
          const { data, error } = await this.supabase.storage.getBucket(bucketName)
          if (error || !data) {
            const { error: createError } = await this.supabase.storage.createBucket(bucketName, {
              public: true
            })
            if (createError && !createError.message.includes('already exists')) {
              throw createError
            }
          } else if (!data.public) {
            await this.supabase.storage.updateBucket(bucketName, { public: true })
          }
        } catch (error) {
          console.error('ensureBucketExists error:', error)
          throw error instanceof Error ? error : new Error('Failed to initialize storage bucket')
        }
      })()

      this.bucketInitialized.set(bucketName, initPromise)
    }

    return this.bucketInitialized.get(bucketName) as Promise<void>
  }

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
          // Validate content type is an image
          if (!contentType.startsWith('image/')) {
            return {
              success: false,
              message: 'Invalid content type: only images are allowed'
            }
          }
          imageBuffer = Buffer.from(matches[2], 'base64')
          
          // Validate buffer size (10MB max)
          if (imageBuffer.length > 10 * 1024 * 1024) {
            return {
              success: false,
              message: 'Image file too large (max 10MB)'
            }
          }
          
          // Verify it's actually a valid image by checking file signatures
          await this.validateImageBuffer(imageBuffer)
        } else {
          return {
            success: false,
            message: 'Invalid base64 image format'
          }
        }
      } else {
        imageBuffer = file
        
        // Validate buffer size (10MB max)
        if (imageBuffer.length > 10 * 1024 * 1024) {
          return {
            success: false,
            message: 'Image file too large (max 10MB)'
          }
        }
        
        // Verify it's actually a valid image by checking file signatures
        await this.validateImageBuffer(imageBuffer)
      }

      const formatInfo = this.getFormatInfo(contentType)
      const transformer = sharp(imageBuffer).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })

      let optimizedBuffer: Buffer
      switch (formatInfo.format) {
        case 'png':
          optimizedBuffer = await transformer.png({ compressionLevel: 8 }).toBuffer()
          break
        case 'webp':
          optimizedBuffer = await transformer.webp({ quality: 85 }).toBuffer()
          break
        case 'avif':
          optimizedBuffer = await transformer.avif({ quality: 70 }).toBuffer()
          break
        case 'jpeg':
        default:
          optimizedBuffer = await transformer.jpeg({ quality: 85 }).toBuffer()
          break
      }

      contentType = formatInfo.mimeType

      // Generate unique filename
      const fileExtension = formatInfo.extension
      const uniqueFilename = filename || `${uuidv4()}.${fileExtension}`
      const filePath = `${folder}/${uniqueFilename}`

      const bucketName = this.resolveBucket(folder)
      await this.ensureBucketExists(bucketName)

      // Upload to Supabase Storage
      const { error } = await this.supabase.storage
        .from(bucketName)
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
        .from(bucketName)
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
      const bucketName = this.resolveBucketFromPath(path)
      await this.ensureBucketExists(bucketName)

      const { error } = await this.supabase.storage
        .from(bucketName)
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
      const bucketGroups = paths.reduce<Record<string, string[]>>((acc, path) => {
        const bucket = this.resolveBucketFromPath(path)
        if (!acc[bucket]) {
          acc[bucket] = []
        }
        acc[bucket].push(path)
        return acc
      }, {})

      for (const [bucketName, bucketPaths] of Object.entries(bucketGroups)) {
        await this.ensureBucketExists(bucketName)
        const { error } = await this.supabase.storage.from(bucketName).remove(bucketPaths)
        if (error) {
          return {
            success: false,
            message: `Failed to delete images: ${error.message}`
          }
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

