"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = exports.ProfileController = void 0;
const profile_service_1 = require("../services/profile.service");
const multer_1 = __importDefault(require("multer"));
class ProfileController {
    constructor() {
        /**
         * Get user profile
         */
        this.getProfile = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'Not authenticated',
                        errors: ['Please sign in']
                    });
                    return;
                }
                const result = await this.profileService.getProfile(userId);
                if (result.success) {
                    res.status(200).json(result);
                }
                else {
                    res.status(404).json(result);
                }
            }
            catch (error) {
                console.error('Get profile controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong while fetching profile']
                });
            }
        };
        /**
         * Update user profile
         */
        this.updateProfile = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'Not authenticated',
                        errors: ['Please sign in']
                    });
                    return;
                }
                const profileData = req.body;
                const result = await this.profileService.updateProfile(userId, profileData);
                if (result.success) {
                    res.status(200).json(result);
                }
                else {
                    res.status(400).json(result);
                }
            }
            catch (error) {
                console.error('Update profile controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong while updating profile']
                });
            }
        };
        /**
         * Upload profile picture
         */
        this.uploadProfilePicture = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'Not authenticated',
                        errors: ['Please sign in']
                    });
                    return;
                }
                if (!req.file) {
                    res.status(400).json({
                        success: false,
                        message: 'No file uploaded',
                        errors: ['Please select a profile picture to upload']
                    });
                    return;
                }
                // Validate file type
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                if (!allowedTypes.includes(req.file.mimetype)) {
                    res.status(400).json({
                        success: false,
                        message: 'Invalid file type',
                        errors: ['Only JPEG, PNG, and WebP images are allowed']
                    });
                    return;
                }
                // Validate file size (5MB max)
                const maxSize = 5 * 1024 * 1024; // 5MB
                if (req.file.size > maxSize) {
                    res.status(400).json({
                        success: false,
                        message: 'File too large',
                        errors: ['Profile picture must be less than 5MB']
                    });
                    return;
                }
                const result = await this.profileService.uploadProfilePicture(userId, req.file.buffer, req.file.originalname, req.file.mimetype);
                if (result.success) {
                    res.status(200).json(result);
                }
                else {
                    res.status(400).json(result);
                }
            }
            catch (error) {
                console.error('Upload profile picture controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong while uploading profile picture']
                });
            }
        };
        /**
         * Delete profile picture
         */
        this.deleteProfilePicture = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'Not authenticated',
                        errors: ['Please sign in']
                    });
                    return;
                }
                const result = await this.profileService.deleteProfilePicture(userId);
                if (result.success) {
                    res.status(200).json(result);
                }
                else {
                    res.status(400).json(result);
                }
            }
            catch (error) {
                console.error('Delete profile picture controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong while deleting profile picture']
                });
            }
        };
        this.profileService = new profile_service_1.ProfileService();
    }
}
exports.ProfileController = ProfileController;
// Multer configuration for file uploads
exports.upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
        }
    }
});
