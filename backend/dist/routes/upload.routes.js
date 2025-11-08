"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRoutes = void 0;
const express_1 = require("express");
const upload_controller_1 = require("../controllers/upload.controller");
const adminAuth_middleware_1 = require("../middleware/adminAuth.middleware");
const express_validator_1 = require("express-validator");
const validation_middleware_1 = require("../middleware/validation.middleware");
const router = (0, express_1.Router)();
exports.uploadRoutes = router;
const uploadController = new upload_controller_1.UploadController();
// All upload routes require admin authentication
router.use(adminAuth_middleware_1.authenticateAdmin);
// Upload single image (multipart/form-data with file)
router.post('/single/file', upload_controller_1.upload.single('image'), uploadController.uploadSingle);
// Upload single image (JSON with base64)
router.post('/single/base64', [
    (0, express_validator_1.body)('image').notEmpty().withMessage('Image is required'),
    (0, express_validator_1.body)('folder').optional().isIn(['products', 'categories']).withMessage('Folder must be either "products" or "categories"'),
    validation_middleware_1.handleValidationErrors
], uploadController.uploadSingle);
// Upload multiple images (multipart/form-data with files)
router.post('/multiple/files', upload_controller_1.upload.array('images', 10), // Max 10 files
uploadController.uploadMultiple);
// Upload multiple images (JSON with base64 array)
router.post('/multiple/base64', [
    (0, express_validator_1.body)('images').isArray().withMessage('Images must be an array'),
    (0, express_validator_1.body)('images.*').notEmpty().withMessage('Each image must be provided'),
    (0, express_validator_1.body)('folder').optional().isIn(['products', 'categories']).withMessage('Folder must be either "products" or "categories"'),
    validation_middleware_1.handleValidationErrors
], uploadController.uploadMultiple);
// Delete image
router.delete('/', [
    (0, express_validator_1.body)('path').notEmpty().withMessage('Image path is required'),
    validation_middleware_1.handleValidationErrors
], uploadController.deleteImage);
