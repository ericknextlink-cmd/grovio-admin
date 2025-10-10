"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRefreshToken =
  exports.validateProfileUpdate =
  exports.validateGoogleAuth =
  exports.validateSignin =
  exports.validateSignup =
  exports.handleValidationErrors =
    void 0;
const express_validator_1 = require("express-validator");
/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = (0, express_validator_1.validationResult)(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((error) => error.msg),
    });
  }
  next();
};
exports.handleValidationErrors = handleValidationErrors;
/**
 * Validation rules for user signup
 */
exports.validateSignup = [
  (0, express_validator_1.body)("firstName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters"),
  (0, express_validator_1.body)("lastName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters"),
  (0, express_validator_1.body)("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  (0, express_validator_1.body)("phoneNumber")
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage(
      "Phone number must be in international format (e.g., +233241234567)"
    ),
  (0, express_validator_1.body)("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
  exports.handleValidationErrors,
];
/**
 * Validation rules for user signin
 */
exports.validateSignin = [
  (0, express_validator_1.body)("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  (0, express_validator_1.body)("password")
    .notEmpty()
    .withMessage("Password is required"),
  exports.handleValidationErrors,
];
/**
 * Validation rules for Google auth
 */
exports.validateGoogleAuth = [
  (0, express_validator_1.body)("idToken")
    .notEmpty()
    .withMessage("Google ID token is required"),
  (0, express_validator_1.body)("nonce")
    .optional()
    .isString()
    .withMessage("Nonce must be a string"),
  exports.handleValidationErrors,
];
/**
 * Validation rules for profile update
 */
exports.validateProfileUpdate = [
  (0, express_validator_1.body)("firstName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters"),
  (0, express_validator_1.body)("lastName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters"),
  (0, express_validator_1.body)("phoneNumber")
    .optional()
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage(
      "Phone number must be in international format (e.g., +233241234567)"
    ),
  (0, express_validator_1.body)("preferences")
    .optional()
    .isObject()
    .withMessage("Preferences must be an object"),
  (0, express_validator_1.body)("preferences.familySize")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("Family size must be between 1 and 20"),
  (0, express_validator_1.body)("preferences.language")
    .optional()
    .isIn(["en", "tw", "fr"])
    .withMessage("Language must be one of: en, tw, fr"),
  (0, express_validator_1.body)("preferences.currency")
    .optional()
    .isIn(["GHS", "USD"])
    .withMessage("Currency must be one of: GHS, USD"),
  exports.handleValidationErrors,
];
/**
 * Validation rules for refresh token
 */
exports.validateRefreshToken = [
  (0, express_validator_1.body)("refreshToken")
    .notEmpty()
    .withMessage("Refresh token is required"),
  exports.handleValidationErrors,
];
