import { Request, Response } from 'express'
import { UploadService } from '../services/upload.service'
import { ApiResponse } from '../types/api.types'
import multer from 'multer'

// Configure multer for memory storage
const storage = multer.memoryStorage()
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'))
      return
    }
    cb(null, true)
  },
})

export class UploadController {
  private uploadService: UploadService

  constructor() {
    this.uploadService = new UploadService()
  }

  /**
   * Upload single image (file or base64)
   */
  uploadSingle = async (req: Request, res: Response): Promise<void> => {
    try {
      const { folder } = req.body as { folder?: 'products' | 'categories' }
      let file: Buffer | string

      // Check if it's a file upload or base64
      if (req.file) {
        file = req.file.buffer
      } else if (req.body.image) {
        file = req.body.image
      } else {
        res.status(400).json({
          success: false,
          message: 'No image provided. Send either a file or base64 image in "image" field'
        } as ApiResponse<null>)
        return
      }

      const result = await this.uploadService.uploadImage(file, folder || 'products')

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: result.data
      } as ApiResponse<typeof result.data>)
    } catch (error) {
      console.error('Upload single error:', error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to upload image'
      } as ApiResponse<null>)
    }
  }

  /**
   * Upload multiple images
   */
  uploadMultiple = async (req: Request, res: Response): Promise<void> => {
    try {
      const { folder, images } = req.body as { 
        folder?: 'products' | 'categories'
        images?: string[]
      }
      
      let files: Array<Buffer | string> = []

      // Check if it's file uploads or base64
      if (req.files && Array.isArray(req.files)) {
        files = req.files.map((file: Express.Multer.File) => file.buffer)
      } else if (images && Array.isArray(images)) {
        files = images
      } else {
        res.status(400).json({
          success: false,
          message: 'No images provided. Send either files or array of base64 images in "images" field'
        } as ApiResponse<null>)
        return
      }

      const result = await this.uploadService.uploadMultipleImages(files, folder || 'products')

      res.json({
        success: result.success,
        message: result.message,
        data: result.data,
        errors: result.errors
      } as ApiResponse<typeof result.data>)
    } catch (error) {
      console.error('Upload multiple error:', error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to upload images'
      } as ApiResponse<null>)
    }
  }

  /**
   * Delete image
   */
  deleteImage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { path } = req.body as { path: string }

      if (!path) {
        res.status(400).json({
          success: false,
          message: 'Image path is required'
        } as ApiResponse<null>)
        return
      }

      const result = await this.uploadService.deleteImage(path)

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: result.message
      } as ApiResponse<null>)
    } catch (error) {
      console.error('Delete image error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to delete image'
      } as ApiResponse<null>)
    }
  }
}

