"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadController = exports.upload = void 0;
const upload_service_1 = require("../services/upload.service");
const multer_1 = __importDefault(require("multer"));
// Configure multer for memory storage
const storage = multer_1.default.memoryStorage();
exports.upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept images only
        if (!file.mimetype.startsWith('image/')) {
            cb(new Error('Only image files are allowed'));
            return;
        }
        cb(null, true);
    },
});
class UploadController {
    constructor() {
        /**
         * Upload single image (file or base64)
         */
        this.uploadSingle = async (req, res) => {
            try {
                const { folder } = req.body;
                let file;
                // Check if it's a file upload or base64
                if (req.file) {
                    file = req.file.buffer;
                }
                else if (req.body.image) {
                    file = req.body.image;
                }
                else {
                    res.status(400).json({
                        success: false,
                        message: 'No image provided. Send either a file or base64 image in "image" field'
                    });
                    return;
                }
                const result = await this.uploadService.uploadImage(file, folder || 'products');
                if (!result.success) {
                    res.status(400).json({
                        success: false,
                        message: result.message
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Image uploaded successfully',
                    data: result.data
                });
            }
            catch (error) {
                console.error('Upload single error:', error);
                res.status(500).json({
                    success: false,
                    message: error instanceof Error ? error.message : 'Failed to upload image'
                });
            }
        };
        /**
         * Upload multiple images
         */
        this.uploadMultiple = async (req, res) => {
            try {
                const { folder, images } = req.body;
                let files = [];
                // Check if it's file uploads or base64
                if (req.files && Array.isArray(req.files)) {
                    files = req.files.map((file) => file.buffer);
                }
                else if (images && Array.isArray(images)) {
                    files = images;
                }
                else {
                    res.status(400).json({
                        success: false,
                        message: 'No images provided. Send either files or array of base64 images in "images" field'
                    });
                    return;
                }
                const result = await this.uploadService.uploadMultipleImages(files, folder || 'products');
                res.json({
                    success: result.success,
                    message: result.message,
                    data: result.data,
                    errors: result.errors
                });
            }
            catch (error) {
                console.error('Upload multiple error:', error);
                res.status(500).json({
                    success: false,
                    message: error instanceof Error ? error.message : 'Failed to upload images'
                });
            }
        };
        /**
         * Delete image
         */
        this.deleteImage = async (req, res) => {
            try {
                const { path } = req.body;
                if (!path) {
                    res.status(400).json({
                        success: false,
                        message: 'Image path is required'
                    });
                    return;
                }
                const result = await this.uploadService.deleteImage(path);
                if (!result.success) {
                    res.status(400).json({
                        success: false,
                        message: result.message
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: result.message
                });
            }
            catch (error) {
                console.error('Delete image error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Failed to delete image'
                });
            }
        };
        this.uploadService = new upload_service_1.UploadService();
    }
}
exports.UploadController = UploadController;
