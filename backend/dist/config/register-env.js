"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const path_1 = require("path");
const fs_1 = require("fs");
const possibleEnvPaths = [
    (0, path_1.resolve)(__dirname, '../../.env.local'),
    (0, path_1.resolve)(__dirname, '../../.env'),
    (0, path_1.resolve)(__dirname, '../../../.env.local'),
    (0, path_1.resolve)(__dirname, '../../../.env'),
    (0, path_1.resolve)(process.cwd(), '.env.local'),
    (0, path_1.resolve)(process.cwd(), '.env'),
];
let envLoaded = false;
for (const envPath of possibleEnvPaths) {
    if ((0, fs_1.existsSync)(envPath)) {
        (0, dotenv_1.config)({ path: envPath });
        envLoaded = true;
        break;
    }
}
if (!envLoaded) {
    console.warn('No .env file found. Using system environment variables only.');
}
