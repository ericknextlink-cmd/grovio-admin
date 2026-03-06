"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoucherImageService = void 0;
/**
 * Generates discount voucher images by overlaying dynamic text onto template images.
 * In Supabase: all templates (voucher writable templates, regular voucher images, invoice templates)
 * live in the same bucket under templates/ — no subfolders. Paths: templates/Voucher Orange template.png, etc.
 * Font: Amita from public/fonts/amita.ttf (or VOUCHER_FONT_PATH).
 */
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = require("fs");
const supabase_1 = require("../config/supabase");
const DEFAULT_TEXT_COLOR = '#1a1a1a';
const DEFAULT_DISCOUNT_FONT_SIZE = 44;
const DEFAULT_CODE_FONT_SIZE = 24;
const DEFAULT_SECONDARY_FONT_SIZE = 16;
/** Positions aligned with Figma: GROVIO top-left, then large GHC OFF, then offer line, then expiry/code */
const DEFAULT_POSITIONS = {
    discount: { x: 40, y: 100 },
    offerDescription: { x: 40, y: 155 },
    expiry: { x: 40, y: 195 },
    code: { x: 40, y: 235 },
    name: { x: 40, y: 260 },
};
class VoucherImageService {
    constructor() {
        this.font = null;
        this.fontLoaded = false;
        this.supabase = (0, supabase_1.createAdminClient)();
        this.templatesBucket = process.env.SUPABASE_STORAGE_BUCKET || 'invoices';
    }
    normalizeFilename(value) {
        return value
            .toLowerCase()
            .replace(/\.(png|jpg|jpeg|webp)$/i, '')
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }
    /** Load from Supabase: bucket (SUPABASE_STORAGE_BUCKET), path templates/<filename> (no subfolders). */
    async loadTemplateFromStorage(imageType) {
        const candidates = VoucherImageService.DEFAULT_TEMPLATE_FILES[imageType];
        // 1) Try known candidate names first.
        for (const filename of candidates) {
            const storagePath = `templates/${filename}`;
            const { data, error } = await this.supabase.storage
                .from(this.templatesBucket)
                .download(storagePath);
            if (!error && data) {
                return Buffer.from(await data.arrayBuffer());
            }
        }
        // 2) Fallback: list templates/ and fuzzy match by keywords.
        const { data: listed, error: listErr } = await this.supabase.storage
            .from(this.templatesBucket)
            .list('templates', { limit: 200 });
        if (listErr || !listed || listed.length === 0)
            return null;
        const allowedExt = /\.(png|jpg|jpeg|webp)$/i;
        const files = listed
            .map((f) => f.name)
            .filter((name) => allowedExt.test(name));
        const pick = files.find((name) => {
            const n = this.normalizeFilename(name);
            if (imageType === 'regular') {
                return n.includes('voucher') && n.includes('orange');
            }
            return n.includes('voucher') && (n.includes('blue') || n.includes('nss'));
        });
        if (!pick)
            return null;
        const { data, error } = await this.supabase.storage
            .from(this.templatesBucket)
            .download(`templates/${pick}`);
        if (error || !data)
            return null;
        return Buffer.from(await data.arrayBuffer());
    }
    /** Load exact template filename from Supabase templates/ */
    async loadTemplateByNameFromStorage(templateName) {
        const cleaned = templateName.replace(/^templates\//, '').trim();
        if (!cleaned)
            return null;
        const { data, error } = await this.supabase.storage
            .from(this.templatesBucket)
            .download(`templates/${cleaned}`);
        if (error || !data)
            return null;
        return Buffer.from(await data.arrayBuffer());
    }
    getTemplatePath(imageType) {
        const envPath = imageType === 'nss'
            ? process.env.VOUCHER_TEMPLATE_NSS_PATH
            : process.env.VOUCHER_TEMPLATE_REGULAR_PATH;
        if (envPath && (0, fs_1.existsSync)(envPath))
            return envPath;
        const filenames = VoucherImageService.DEFAULT_TEMPLATE_FILES[imageType];
        for (const filename of filenames) {
            const inVoucherFolder = path_1.default.join(process.cwd(), 'public', 'voucher-templates', filename);
            if ((0, fs_1.existsSync)(inVoucherFolder))
                return inVoucherFolder;
            const inPublic = path_1.default.join(process.cwd(), 'public', filename);
            if ((0, fs_1.existsSync)(inPublic))
                return inPublic;
        }
        return null;
    }
    getTemplatePathByName(templateName) {
        const cleaned = templateName.replace(/^templates\//, '').trim();
        if (!cleaned)
            return null;
        const inVoucherFolder = path_1.default.join(process.cwd(), 'public', 'voucher-templates', cleaned);
        if ((0, fs_1.existsSync)(inVoucherFolder))
            return inVoucherFolder;
        const inPublic = path_1.default.join(process.cwd(), 'public', cleaned);
        return (0, fs_1.existsSync)(inPublic) ? inPublic : null;
    }
    getFontPath() {
        const envPath = process.env.VOUCHER_FONT_PATH;
        if (envPath && (0, fs_1.existsSync)(envPath))
            return envPath;
        const fontsDir = path_1.default.join(process.cwd(), 'public', 'fonts');
        const amita = path_1.default.join(fontsDir, 'amita.ttf');
        if ((0, fs_1.existsSync)(amita))
            return amita;
        const voucherFont = path_1.default.join(fontsDir, 'voucher-font.ttf');
        return (0, fs_1.existsSync)(voucherFont) ? voucherFont : null;
    }
    /** Load font once (optional). Uses opentype.js if available and VOUCHER_FONT_PATH is set. */
    async loadFont() {
        if (this.fontLoaded)
            return;
        const fontPath = this.getFontPath();
        if (!fontPath) {
            this.fontLoaded = true;
            return;
        }
        try {
            const opentype = await Promise.resolve().then(() => __importStar(require('opentype.js')));
            this.font = opentype.default.loadSync(fontPath);
        }
        catch {
            this.font = null;
        }
        this.fontLoaded = true;
    }
    /**
     * Build an SVG string that contains text as paths (Amita font via opentype) or fallback text.
     * Layout matches Figma: large discount (GHC X OFF), then offer line, then expiry/code.
     */
    async buildTextOverlaySvg(width, height, options) {
        const pos = {
            code: options.positions?.code ?? DEFAULT_POSITIONS.code,
            name: options.positions?.name ?? DEFAULT_POSITIONS.name,
            expiry: options.positions?.expiry ?? DEFAULT_POSITIONS.expiry,
            discount: options.positions?.discount ?? DEFAULT_POSITIONS.discount,
            offerDescription: options.positions?.offerDescription ?? DEFAULT_POSITIONS.offerDescription,
        };
        const discountSize = options.discountFontSize ?? DEFAULT_DISCOUNT_FONT_SIZE;
        const codeSize = options.codeFontSize ?? DEFAULT_CODE_FONT_SIZE;
        const secSize = options.secondaryFontSize ?? DEFAULT_SECONDARY_FONT_SIZE;
        const fill = options.textColor ?? DEFAULT_TEXT_COLOR;
        await this.loadFont();
        const font = this.font;
        const drawText = (text, x, y, fontSize) => {
            if (!font?.getPath)
                return '';
            const p = font.getPath(text, x, y, fontSize);
            if (p.fill !== undefined)
                p.fill = fill;
            if (p.toPathData) {
                const d = p.toPathData(2);
                return d ? `<path d="${d}" fill="${fill}"/>` : '';
            }
            if (p.toSVG)
                return p.toSVG(2);
            return '';
        };
        const fallbackText = (x, y, fontSize, text) => `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${fill}" font-family="Arial, sans-serif">${escapeXml(text)}</text>`;
        const lines = [];
        if (options.discountText) {
            const svgLine = drawText(options.discountText, pos.discount.x, pos.discount.y, discountSize);
            lines.push(svgLine || fallbackText(pos.discount.x, pos.discount.y, discountSize, options.discountText));
        }
        if (options.offerDescription) {
            const svgLine = drawText(options.offerDescription, pos.offerDescription.x, pos.offerDescription.y, secSize);
            lines.push(svgLine || fallbackText(pos.offerDescription.x, pos.offerDescription.y, secSize, options.offerDescription));
        }
        if (options.expiryText) {
            const svgLine = drawText(options.expiryText, pos.expiry.x, pos.expiry.y, secSize);
            lines.push(svgLine || fallbackText(pos.expiry.x, pos.expiry.y, secSize, options.expiryText));
        }
        if (options.code) {
            const svgLine = drawText(options.code, pos.code.x, pos.code.y, codeSize);
            lines.push(svgLine || fallbackText(pos.code.x, pos.code.y, codeSize, options.code));
        }
        if (options.userName) {
            const svgLine = drawText(options.userName, pos.name.x, pos.name.y, secSize);
            lines.push(svgLine || fallbackText(pos.name.x, pos.name.y, secSize, options.userName));
        }
        return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  ${lines.join('\n  ')}
</svg>`;
    }
    /**
     * Load template: 1) Supabase Storage (SUPABASE_STORAGE_BUCKET/templates/), 2) local public paths.
     */
    async loadTemplateBuffer(imageType) {
        const fromStorage = await this.loadTemplateFromStorage(imageType);
        if (fromStorage && fromStorage.length > 0)
            return fromStorage;
        const filePath = this.getTemplatePath(imageType);
        if (filePath)
            return promises_1.default.readFile(filePath);
        return null;
    }
    async loadTemplateBufferByName(templateName) {
        const fromStorage = await this.loadTemplateByNameFromStorage(templateName);
        if (fromStorage && fromStorage.length > 0)
            return fromStorage;
        const filePath = this.getTemplatePathByName(templateName);
        if (filePath)
            return promises_1.default.readFile(filePath);
        return null;
    }
    async compose(templateBuffer, options) {
        const image = (0, sharp_1.default)(templateBuffer);
        const meta = await image.metadata();
        const width = meta.width ?? 600;
        const height = meta.height ?? 400;
        const svg = await this.buildTextOverlaySvg(width, height, options);
        const svgBuffer = Buffer.from(svg);
        return image
            .composite([{ input: svgBuffer, top: 0, left: 0 }])
            .png()
            .toBuffer();
    }
    /**
     * Generate a voucher image with dynamic text overlaid.
     * Returns PNG buffer or null if no template is configured.
     */
    async generate(imageType, options) {
        const templateBuffer = await this.loadTemplateBuffer(imageType);
        if (!templateBuffer)
            return null;
        return this.compose(templateBuffer, options);
    }
    /** Generate using exact template filename from templates/ directory. */
    async generateFromTemplateName(templateName, options) {
        const templateBuffer = await this.loadTemplateBufferByName(templateName);
        if (!templateBuffer)
            return null;
        return this.compose(templateBuffer, options);
    }
}
exports.VoucherImageService = VoucherImageService;
/** Preferred template filenames in SUPABASE_STORAGE_BUCKET/templates/ (same bucket as invoice templates). */
VoucherImageService.DEFAULT_TEMPLATE_FILES = {
    regular: [
        'Voucher Orange template.png',
        'Voucher Orange Template.png',
        'Voucher Orange.png',
        'voucher orange template.png',
        'voucher-orange-template.png',
    ],
    nss: [
        'Voucher Blue template.png',
        'Voucher Blue Template.png',
        'Voucher Blue.png',
        'voucher blue template.png',
        'voucher-blue-template.png',
    ],
};
function escapeXml(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
