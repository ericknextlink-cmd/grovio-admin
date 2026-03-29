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
exports.VoucherImageService = exports.VOUCHER_ART_TEMPLATE_FILENAMES = void 0;
exports.formatVoucherOfferDescription = formatVoucherOfferDescription;
/**
 * Generates discount voucher images by overlaying dynamic text onto template images.
 * Templates: SUPABASE_STORAGE_BUCKET/templates/ or public/voucher-templates/
 * Fonts: Amita-Bold (amount line), Poppins-Regular (all other text) — local public/fonts or env overrides.
 */
const sharp_1 = __importDefault(require("sharp"));
const bwip_js_1 = __importDefault(require("bwip-js"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = require("fs");
const supabase_1 = require("../config/supabase");
const DEFAULT_TEXT_COLOR = '#ffffff';
/** Prior headline baseline (102 × 1.3); amount +40% and UP TO −10% from this. */
const PRIOR_AMOUNT_BASE = Math.round(102 * 1.3);
const DEFAULT_AMOUNT_FONT_SIZE = Math.round(PRIOR_AMOUNT_BASE * 1.4);
/** 10% smaller than prior UP TO sizing (PRIOR_AMOUNT_BASE × 0.9 × 0.9). */
const DEFAULT_UP_TO_FONT_SIZE = Math.round(PRIOR_AMOUNT_BASE * 0.9 * 0.9);
const DEFAULT_STUB_SERIAL_TEXT_COLOR = '#C2A550';
const DEFAULT_SERIAL_FONT_SIZE = Math.round(Math.round(24 * 1.4) * 1.1);
const DEFAULT_SECONDARY_FONT_SIZE = 36;
const DEFAULT_WEBSITE_FONT_SIZE = Math.round(24 * 1.2);
const DEFAULT_WEBSITE_TEXT = 'WWW.GROVIOGHANA.COM';
const DEFAULT_TAGLINE_TEXT = 'Visit us for amazing grocery deals';
const DEFAULT_TERMS_TEXT = 'Terms and Conditions Apply';
const DEFAULT_UP_TO_TEXT = 'UP TO';
/** Orange / green panel: horizontal slice used to center text (fractions of width). */
const PANEL_LEFT_FRAC = 0.06;
const PANEL_RIGHT_FRAC = 0.67;
/** Stub Code128 bars (matches serial text tone). */
const BARCODE_BARP_COLOR = 'C2A550';
/** Stub width as fraction of canvas (green panel ends at PANEL_RIGHT_FRAC). */
const STUB_WIDTH_FRAC = 1 - PANEL_RIGHT_FRAC;
/**
 * rotate R: `scale` → bar module size / overall barcode span; `height` → bar thickness (orthogonal).
 * bwip-js truncates scale/height to integers internally; fractional values are applied via Sharp after render.
 */
const BARCODE_STUB_PRESET = {
    leftFrac: 0.818 - STUB_WIDTH_FRAC * 0.05,
    topFrac: 0.062,
    scale: 5.9,
    height: 12,
};
/** Nudge serial code text left (fraction of canvas width); barcode position unchanged. */
const SERIAL_TEXT_SHIFT_LEFT_FRAC = 0.03;
const SERIAL_STUB_PRESET = {
    leftFrac: 0.978 - STUB_WIDTH_FRAC * 0.3,
    topFrac: 0.5,
    lineHeightFrac: 0.026,
};
/**
 * Voucher background PNGs in `templates/` or `public/voucher-templates/` (exact names; `regular-organge` matches asset spelling).
 */
exports.VOUCHER_ART_TEMPLATE_FILENAMES = [
    'regular-organge.png',
    'regular-green.png',
    'regular-blue.png',
    'nss-orange.png',
    'nss-green.png',
    'nss-blue.png',
];
function formatVoucherOfferDescription(params) {
    const amt = params.discountValue.toFixed(0);
    if (params.usageDisplay === 'one_time') {
        if (params.discountType === 'percentage') {
            return `Buy your groceries and get\na discount of up to ${params.discountValue}% off`;
        }
        return `Buy your groceries and get\na discount of up GHC ${amt}`;
    }
    const raw = params.validUntil;
    const d = raw ? (typeof raw === 'string' ? new Date(raw) : raw) : null;
    const valid = d && !Number.isNaN(d.getTime()) ? d : null;
    const year = valid ? valid.getFullYear() : new Date().getFullYear();
    const dateWithoutYear = valid
        ? valid.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })
        : '';
    const line1 = 'Buy all items and get\ndiscount';
    if (params.discountType === 'percentage') {
        const line2 = dateWithoutYear
            ? `${params.discountValue}% until ${dateWithoutYear}`
            : `${params.discountValue}% off`;
        return [line1, line2, String(year)].join('\n');
    }
    const line2 = dateWithoutYear ? `GHC ${amt} until ${dateWithoutYear}` : `GHC ${amt}`;
    return [line1, line2, String(year)].join('\n');
}
function stripLegacyCediGlyphs(text) {
    return text.replace(/GH\u20B5/g, 'GHC').replace(/\u20B5/g, '');
}
class VoucherImageService {
    constructor() {
        this.amountFont = null;
        this.bodyFont = null;
        this.fontsReady = false;
        this.supabase = (0, supabase_1.createAdminClient)();
        this.templatesBucket = process.env.SUPABASE_STORAGE_BUCKET || 'invoices';
    }
    resolveAmountFontPath() {
        const env = process.env.VOUCHER_AMOUNT_FONT_PATH;
        if (env && (0, fs_1.existsSync)(env))
            return env;
        const fontsDir = path_1.default.join(process.cwd(), 'public', 'fonts');
        const bold = path_1.default.join(fontsDir, 'Amita', 'Amita-Bold.ttf');
        if ((0, fs_1.existsSync)(bold))
            return bold;
        const legacy = path_1.default.join(fontsDir, 'amita.ttf');
        return (0, fs_1.existsSync)(legacy) ? legacy : null;
    }
    resolveBodyFontPath() {
        const env = process.env.VOUCHER_BODY_FONT_PATH;
        if (env && (0, fs_1.existsSync)(env))
            return env;
        const fontsDir = path_1.default.join(process.cwd(), 'public', 'fonts');
        const candidates = [
            path_1.default.join(fontsDir, 'Poppins', 'Poppins-Regular.ttf'),
            path_1.default.join(fontsDir, 'Poppins-Regular.ttf'),
        ];
        for (const p of candidates) {
            if ((0, fs_1.existsSync)(p))
                return p;
        }
        return null;
    }
    async ensureFonts() {
        if (this.fontsReady)
            return;
        try {
            const opentype = (await Promise.resolve().then(() => __importStar(require('opentype.js')))).default;
            const amountPath = this.resolveAmountFontPath();
            const bodyPath = this.resolveBodyFontPath();
            this.amountFont = amountPath ? opentype.loadSync(amountPath) : null;
            this.bodyFont = bodyPath ? opentype.loadSync(bodyPath) : null;
        }
        catch {
            this.amountFont = null;
            this.bodyFont = null;
        }
        this.fontsReady = true;
    }
    pathFromGlyph(p, fill) {
        if (p.toPathData) {
            const d = p.toPathData(2);
            return d ? `<path d="${d}" fill="${fill}"/>` : '';
        }
        if (p.toSVG)
            return p.toSVG(2);
        return '';
    }
    drawLine(font, text, x, y, fontSize, fill) {
        if (!font?.getPath || !text)
            return '';
        const p = font.getPath(text, x, y, fontSize);
        return this.pathFromGlyph(p, fill);
    }
    /** Center-align: opentype paths use left baseline at x. */
    drawCentered(font, text, centerX, y, fontSize, fill) {
        if (!font?.getAdvanceWidth || !text)
            return '';
        const w = font.getAdvanceWidth(text, fontSize);
        const x = centerX - w / 2;
        return this.drawLine(font, text, x, y, fontSize, fill);
    }
    /**
     * Draw amount as spaced segments (avoids Amita ligature/overlap on digit pairs like “50”).
     */
    drawCenteredSpacedWords(font, text, centerX, y, fontSize, fill) {
        if (!font?.getAdvanceWidth || !text)
            return '';
        const parts = text.split(/\s+/).filter(Boolean);
        if (parts.length === 0)
            return '';
        const spaceW = font.getAdvanceWidth(' ', fontSize);
        let totalW = 0;
        const widths = [];
        for (let i = 0; i < parts.length; i++) {
            const w = font.getAdvanceWidth(parts[i], fontSize);
            widths.push(w);
            totalW += w;
            if (i < parts.length - 1)
                totalW += spaceW;
        }
        let x = centerX - totalW / 2;
        const chunks = [];
        for (let i = 0; i < parts.length; i++) {
            const p = font.getPath(parts[i], x, y, fontSize);
            chunks.push(this.pathFromGlyph(p, fill));
            x += widths[i] ?? 0;
            if (i < parts.length - 1)
                x += spaceW;
        }
        return chunks.join('\n');
    }
    drawLeftAlignedSpacedWords(font, text, leftX, y, fontSize, fill) {
        if (!font?.getAdvanceWidth || !text)
            return '';
        const parts = text.split(/\s+/).filter(Boolean);
        if (parts.length === 0)
            return '';
        const spaceW = font.getAdvanceWidth(' ', fontSize);
        let x = leftX;
        const chunks = [];
        for (let i = 0; i < parts.length; i++) {
            const p = font.getPath(parts[i], x, y, fontSize);
            chunks.push(this.pathFromGlyph(p, fill));
            x += font.getAdvanceWidth(parts[i], fontSize);
            if (i < parts.length - 1)
                x += spaceW;
        }
        return chunks.join('\n');
    }
    wrapLines(font, text, maxWidth, fontSize) {
        if (!text.trim())
            return [];
        if (!font?.getAdvanceWidth)
            return [text];
        const words = text.split(/\s+/).filter(Boolean);
        const lines = [];
        let line = '';
        for (const word of words) {
            const test = line ? `${line} ${word}` : word;
            if (font.getAdvanceWidth(test, fontSize) <= maxWidth) {
                line = test;
            }
            else {
                if (line)
                    lines.push(line);
                line = word;
            }
        }
        if (line)
            lines.push(line);
        return lines.length ? lines : [text];
    }
    wrapOfferParagraphs(font, text, maxWidth, fontSize) {
        const paragraphs = text.split(/\n/).map((p) => p.trim()).filter(Boolean);
        const out = [];
        for (const para of paragraphs) {
            out.push(...this.wrapLines(font, para, maxWidth, fontSize));
        }
        return out.length ? out : [];
    }
    drawLeftAligned(font, text, leftX, y, fontSize, fill) {
        if (!font?.getPath || !text)
            return '';
        const p = font.getPath(text, leftX, y, fontSize);
        return this.pathFromGlyph(p, fill);
    }
    /**
     * Stub serial: draw horizontally then rotate -90° (CCW) so digits read bottom-to-top along the stub.
     */
    drawSerialHorizontalRotateCCW(font, raw, anchorX, anchorY, charSize, fill) {
        if (!font?.getAdvanceWidth || !font?.getPath || !raw.trim())
            return '';
        const chars = raw.replace(/\s/g, '').split('');
        if (chars.length === 0)
            return '';
        let x = 0;
        const paths = [];
        for (const ch of chars) {
            const w = font.getAdvanceWidth(ch, charSize);
            const p = font.getPath(ch, x, 0, charSize);
            paths.push(this.pathFromGlyph(p, fill));
            x += w;
        }
        const totalW = x;
        const inner = paths.join('\n    ');
        return `<g transform="translate(${anchorX} ${anchorY})">
    <g transform="rotate(-90)">
    <g transform="translate(${-totalW / 2} 0)">
    ${inner}
    </g>
    </g>
  </g>`;
    }
    async loadTemplateByNameFromStorage(templateName) {
        const cleaned = templateName.replace(/^templates\//, '').trim();
        if (!cleaned || !VoucherImageService.ALLOWED_TEMPLATE_FILES.has(cleaned))
            return null;
        const { data, error } = await this.supabase.storage.from(this.templatesBucket).download(`templates/${cleaned}`);
        if (error || !data)
            return null;
        return Buffer.from(await data.arrayBuffer());
    }
    getTemplatePathByName(templateName) {
        const cleaned = templateName.replace(/^templates\//, '').trim();
        if (!cleaned || !VoucherImageService.ALLOWED_TEMPLATE_FILES.has(cleaned))
            return null;
        const inVoucherFolder = path_1.default.join(process.cwd(), 'public', 'voucher-templates', cleaned);
        return (0, fs_1.existsSync)(inVoucherFolder) ? inVoucherFolder : null;
    }
    /**
     * Resolve template buffer and filename for imageType (single fixed name per type).
     */
    async resolveTemplate(imageType) {
        const filename = VoucherImageService.DEFAULT_TEMPLATE_BY_TYPE[imageType];
        const storagePath = `templates/${filename}`;
        const { data, error } = await this.supabase.storage.from(this.templatesBucket).download(storagePath);
        if (!error && data) {
            return { buffer: Buffer.from(await data.arrayBuffer()), filename };
        }
        const localPath = path_1.default.join(process.cwd(), 'public', 'voucher-templates', filename);
        if ((0, fs_1.existsSync)(localPath)) {
            const buffer = await promises_1.default.readFile(localPath);
            return { buffer, filename };
        }
        return null;
    }
    async buildTextOverlaySvg(width, height, options, _templateFilename, layoutOverrides) {
        await this.ensureFonts();
        const bodyFont = this.bodyFont;
        const amountFont = this.amountFont;
        const fill = options.textColor ?? DEFAULT_TEXT_COLOR;
        const serialFill = options.serialTextColor ?? DEFAULT_STUB_SERIAL_TEXT_COLOR;
        const amountSize = options.amountFontSize ?? DEFAULT_AMOUNT_FONT_SIZE;
        const upToSize = options.upToFontSize ?? DEFAULT_UP_TO_FONT_SIZE;
        const secSize = options.secondaryFontSize ?? DEFAULT_SECONDARY_FONT_SIZE;
        const offerBodySize = secSize * 1.1 * 1.2;
        const websiteSize = options.websiteFontSize ?? DEFAULT_WEBSITE_FONT_SIZE;
        const serialSize = options.codeFontSize ?? DEFAULT_SERIAL_FONT_SIZE;
        const upToText = (options.upToText ?? DEFAULT_UP_TO_TEXT).trim();
        const amountText = stripLegacyCediGlyphs((options.amountText ?? '').trim());
        const websiteTextRaw = (options.websiteText ?? DEFAULT_WEBSITE_TEXT).trim();
        const websiteText = websiteTextRaw.toLowerCase();
        const taglineText = (options.taglineText ?? DEFAULT_TAGLINE_TEXT).trim();
        const termsText = (options.termsText ?? DEFAULT_TERMS_TEXT).trim();
        const contentLeft = width * PANEL_LEFT_FRAC;
        const contentRight = width * PANEL_RIGHT_FRAC;
        const maxTextWidth = contentRight - contentLeft - 48;
        const textInset = 20;
        const PANEL_TEXT_NUDGE_LEFT_FRAC = 0.05;
        const textLeft = contentLeft + textInset - Math.round(width * PANEL_TEXT_NUDGE_LEFT_FRAC);
        const fallbackText = (x, y, fontSize, text) => `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${fill}" font-family="Arial, sans-serif" text-anchor="middle">${escapeXml(text)}</text>`;
        const fallbackTextLeft = (x, y, fontSize, text) => `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${fill}" font-family="Arial, sans-serif" text-anchor="start">${escapeXml(text)}</text>`;
        const lines = [];
        let y = height * 0.32;
        if (upToText) {
            const svg = this.drawLeftAligned(bodyFont, upToText, textLeft, y, upToSize, fill) ||
                fallbackTextLeft(textLeft, y, upToSize, upToText);
            lines.push(svg);
        }
        y += upToSize * 1.05 * 1.05 * 1.4;
        if (amountText) {
            const svg = this.drawLeftAlignedSpacedWords(amountFont, amountText, textLeft, y, amountSize, fill) ||
                this.drawLeftAligned(amountFont, amountText, textLeft, y, amountSize, fill) ||
                fallbackTextLeft(textLeft, y, amountSize, amountText);
            lines.push(svg);
        }
        y += amountSize * 0.98;
        if (options.offerDescription?.trim()) {
            const rawOffer = stripLegacyCediGlyphs(options.offerDescription.trim());
            const wrapped = this.wrapOfferParagraphs(bodyFont, rawOffer, maxTextWidth - textInset, offerBodySize);
            const lineGap = offerBodySize * 1.25;
            for (const line of wrapped) {
                const svg = this.drawLeftAligned(bodyFont, line, textLeft, y, offerBodySize, fill) ||
                    fallbackTextLeft(textLeft, y, offerBodySize, line);
                lines.push(svg);
                y += lineGap;
            }
        }
        if (options.expiryText?.trim()) {
            y += secSize * 0.2;
            const svg = this.drawLeftAligned(bodyFont, options.expiryText.trim(), textLeft, y, secSize, fill) ||
                fallbackTextLeft(textLeft, y, secSize, options.expiryText.trim());
            lines.push(svg);
            y += secSize * 1.2;
        }
        const footerY = height * 0.87;
        const taglineFontSize = websiteSize * 1.35;
        const websiteLineFontSize = (websiteSize + 4) * 1.35;
        const termsFontSize = websiteSize * 0.85 * 1.4;
        const footerTextBlockHeight = taglineFontSize * 2.45 + websiteLineFontSize * 1.3 + termsFontSize * 1.15;
        const taglineY = footerY - height * 0.022 - footerTextBlockHeight * 0.3;
        const websiteY = taglineY + taglineFontSize * 1.45;
        const termsY = websiteY + websiteLineFontSize * 1.3 + height * 0.018;
        if (taglineText) {
            lines.push(this.drawLeftAligned(bodyFont, taglineText, textLeft, taglineY, taglineFontSize, fill) ||
                fallbackTextLeft(textLeft, taglineY, taglineFontSize, taglineText));
        }
        if (websiteText) {
            lines.push(this.drawLeftAligned(bodyFont, websiteText, textLeft, websiteY, websiteLineFontSize, fill) ||
                fallbackTextLeft(textLeft, websiteY, websiteLineFontSize, websiteText));
        }
        if (termsText) {
            lines.push(this.drawLeftAligned(bodyFont, termsText, textLeft, termsY, termsFontSize, fill) ||
                fallbackTextLeft(textLeft, termsY, termsFontSize, termsText));
        }
        const codeRaw = (options.code ?? '').trim();
        if (codeRaw) {
            const serialCenterX = (layoutOverrides?.serialCenterX ?? width * SERIAL_STUB_PRESET.leftFrac) -
                Math.round(width * SERIAL_TEXT_SHIFT_LEFT_FRAC);
            const serialAnchorY = height * SERIAL_STUB_PRESET.topFrac;
            lines.push(this.drawSerialHorizontalRotateCCW(bodyFont, codeRaw, serialCenterX, serialAnchorY, serialSize, serialFill));
        }
        return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  ${lines.join('\n  ')}
</svg>`;
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
    getBarcodePixels(width, height) {
        return {
            left: Math.round(width * BARCODE_STUB_PRESET.leftFrac),
            top: Math.round(height * BARCODE_STUB_PRESET.topFrac),
            scale: BARCODE_STUB_PRESET.scale,
            barHeight: BARCODE_STUB_PRESET.height,
        };
    }
    /**
     * Vertical Code128 (rotate R), then 180°. bwip-js forces integer scale/height (`sx|0` in drawing-builtin);
     * we pass floor values then Sharp-resize by (desired/int) so decimals like 5.5 work.
     */
    async renderVerticalBarcodeBuffer(text, scale, barHeight) {
        const scaleInt = Math.max(1, Math.floor(scale));
        const heightInt = Math.max(1, Math.floor(barHeight));
        const scaleFine = scale > 0 ? scale / scaleInt : 1;
        const heightFine = barHeight > 0 ? barHeight / heightInt : 1;
        const raw = await bwip_js_1.default.toBuffer({
            bcid: 'code128',
            text,
            scale: scaleInt,
            height: heightInt,
            includetext: false,
            rotate: 'R',
            barcolor: BARCODE_BARP_COLOR,
            backgroundcolor: 'FFFFFF',
        });
        let pipeline = (0, sharp_1.default)(raw).rotate(180);
        if (scaleFine !== 1 || heightFine !== 1) {
            const m = await pipeline.metadata();
            const w = m.width ?? 0;
            const h = m.height ?? 0;
            if (w > 0 && h > 0) {
                const nw = Math.max(1, Math.round(w * scaleFine));
                const nh = Math.max(1, Math.round(h * heightFine));
                pipeline = pipeline.resize({ width: nw, height: nh, fit: 'fill' });
            }
        }
        return pipeline.png().toBuffer();
    }
    /**
     * Sharp requires composite layers to fit inside the base image; large bwip outputs are scaled down.
     */
    async fitBarcodeOverlayToCanvas(barcodeBuf, left, top, canvasW, canvasH) {
        const meta = await (0, sharp_1.default)(barcodeBuf).metadata();
        let bw = meta.width ?? 0;
        let bh = meta.height ?? 0;
        const maxW = Math.max(1, canvasW - Math.max(0, left));
        const maxH = Math.max(1, canvasH - Math.max(0, top));
        if (bw <= maxW && bh <= maxH) {
            return { buf: barcodeBuf, width: bw, height: bh };
        }
        const resized = await (0, sharp_1.default)(barcodeBuf)
            .resize({
            width: maxW,
            height: maxH,
            fit: 'inside',
            withoutEnlargement: true,
        })
            .png()
            .toBuffer();
        const m2 = await (0, sharp_1.default)(resized).metadata();
        return {
            buf: resized,
            width: m2.width ?? bw,
            height: m2.height ?? bh,
        };
    }
    async compose(templateBuffer, options, templateFilename) {
        const image = (0, sharp_1.default)(templateBuffer);
        const meta = await image.metadata();
        const width = meta.width ?? 600;
        const height = meta.height ?? 400;
        const barcodeValue = (options.code ?? '').trim();
        const barcodePx = options.positions?.barcode
            ? {
                left: options.positions.barcode.x,
                top: options.positions.barcode.y,
                scale: BARCODE_STUB_PRESET.scale,
                barHeight: BARCODE_STUB_PRESET.height,
            }
            : this.getBarcodePixels(width, height);
        let serialCenterXOverride;
        const composites = [];
        if (barcodeValue) {
            let barcodeBuf = await this.renderVerticalBarcodeBuffer(barcodeValue, barcodePx.scale, barcodePx.barHeight);
            const fitted = await this.fitBarcodeOverlayToCanvas(barcodeBuf, barcodePx.left, barcodePx.top, width, height);
            barcodeBuf = fitted.buf;
            const bw = fitted.width;
            if (bw > 0) {
                const gapPx = 14;
                const serialNudgeRight = Math.round(width * 0.041);
                serialCenterXOverride =
                    barcodePx.left +
                        bw +
                        gapPx +
                        (options.codeFontSize ?? DEFAULT_SERIAL_FONT_SIZE) * 0.35 +
                        serialNudgeRight;
            }
            composites.push({ input: barcodeBuf, top: barcodePx.top, left: barcodePx.left });
        }
        const svg = await this.buildTextOverlaySvg(width, height, options, templateFilename, {
            serialCenterX: serialCenterXOverride,
        });
        const svgBuffer = Buffer.from(svg);
        composites.push({ input: svgBuffer, top: 0, left: 0 });
        return image.composite(composites).png().toBuffer();
    }
    async generate(imageType, options) {
        const resolved = await this.resolveTemplate(imageType);
        if (!resolved)
            return null;
        return this.compose(resolved.buffer, options, resolved.filename);
    }
    async generateFromTemplateName(templateName, options) {
        const cleaned = templateName.replace(/^templates\//, '').trim();
        if (!cleaned || !VoucherImageService.ALLOWED_TEMPLATE_FILES.has(cleaned))
            return null;
        const fromStorage = await this.loadTemplateByNameFromStorage(cleaned);
        if (fromStorage && fromStorage.length > 0) {
            return this.compose(fromStorage, options, cleaned);
        }
        const filePath = this.getTemplatePathByName(cleaned);
        if (!filePath)
            return null;
        const buf = await promises_1.default.readFile(filePath);
        return this.compose(buf, options, cleaned);
    }
}
exports.VoucherImageService = VoucherImageService;
/** One default file per API imageType (no candidate loop). */
VoucherImageService.DEFAULT_TEMPLATE_BY_TYPE = {
    regular: 'regular-organge.png',
    nss: 'nss-orange.png',
};
VoucherImageService.ALLOWED_TEMPLATE_FILES = new Set(exports.VOUCHER_ART_TEMPLATE_FILENAMES);
function escapeXml(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
