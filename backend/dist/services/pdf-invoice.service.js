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
exports.PDFInvoiceService = void 0;
const pdf_lib_1 = require("pdf-lib");
const qrcode_1 = __importDefault(require("qrcode"));
const sharp_1 = __importDefault(require("sharp"));
const supabase_1 = require("../config/supabase");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
/** Decode a data URL (e.g. from QRCode.toDataURL) to PNG bytes for pdf-lib embedPng */
function dataUrlToPngBytes(dataUrl) {
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    const binary = Buffer.from(base64, 'base64');
    return new Uint8Array(binary);
}
/** Split text into lines of up to N words per line (word wrap). */
function wrapTextByWords(text, wordsPerLine) {
    if (!text?.trim())
        return [''];
    const words = text.trim().split(/\s+/);
    const lines = [];
    for (let i = 0; i < words.length; i += wordsPerLine) {
        lines.push(words.slice(i, i + wordsPerLine).join(' '));
    }
    return lines;
}
/** Default template filename in storage (templates folder) and local public folder */
const DEFAULT_TEMPLATE_FILENAME = 'Template.pdf';
/** Logo filename (SVG or PNG) in templates/ and public/ */
const LOGO_FILENAME = 'logo-black.svg';
const LOGO_FILENAME_PNG = 'logo-black.png';
class PDFInvoiceService {
    constructor() {
        /** Bucket for generated invoices (output) */
        this.bucketName = 'invoices';
        this.supabase = (0, supabase_1.createAdminClient)();
        this.templatesBucketName = process.env.SUPABASE_STORAGE_BUCKET || 'invoices';
        this.localTemplatePath = path_1.default.join(process.cwd(), 'public', DEFAULT_TEMPLATE_FILENAME);
    }
    /**
     * Load logo as PNG bytes: try Supabase templates/ (logo-black.png then logo-black.svg),
     * then local public/logo-black.svg. Converts SVG to PNG via sharp.
     */
    async getLogoBytes() {
        const tryPaths = [
            `templates/${LOGO_FILENAME_PNG}`,
            `templates/${LOGO_FILENAME}`,
        ];
        for (const storagePath of tryPaths) {
            const { data, error } = await this.supabase.storage
                .from(this.templatesBucketName)
                .download(storagePath);
            if (!error && data) {
                const bytes = new Uint8Array(await data.arrayBuffer());
                if (bytes.length > 0) {
                    if (storagePath.endsWith('.svg')) {
                        const png = await (0, sharp_1.default)(Buffer.from(bytes))
                            .png()
                            .toBuffer();
                        return new Uint8Array(png);
                    }
                    return bytes;
                }
            }
        }
        const localSvg = path_1.default.join(process.cwd(), 'public', LOGO_FILENAME);
        const localPng = path_1.default.join(process.cwd(), 'public', LOGO_FILENAME_PNG);
        if ((0, fs_1.existsSync)(localPng)) {
            const buf = await promises_1.default.readFile(localPng);
            return new Uint8Array(buf);
        }
        if ((0, fs_1.existsSync)(localSvg)) {
            const buf = await promises_1.default.readFile(localSvg);
            const png = await (0, sharp_1.default)(buf).png().toBuffer();
            return new Uint8Array(png);
        }
        return null;
    }
    /**
     * Load template PDF bytes: first from Supabase storage (templates/Template.pdf),
     * then fallback to local public/Template.pdf.
     */
    async getTemplateBytes() {
        const storagePath = `templates/${DEFAULT_TEMPLATE_FILENAME}`;
        const { data, error } = await this.supabase.storage
            .from(this.templatesBucketName)
            .download(storagePath);
        if (!error && data) {
            const bytes = new Uint8Array(await data.arrayBuffer());
            if (bytes.length > 0)
                return bytes;
        }
        if ((0, fs_1.existsSync)(this.localTemplatePath)) {
            const buf = await promises_1.default.readFile(this.localTemplatePath);
            return new Uint8Array(buf);
        }
        throw new Error(`Invoice template not found. Upload templates/${DEFAULT_TEMPLATE_FILENAME} to Supabase bucket "${this.templatesBucketName}" or place Template.pdf in backend/public/`);
    }
    /**
     * Ensure Supabase storage bucket exists
     */
    async ensureBucketExists() {
        try {
            const { data: buckets } = await this.supabase.storage.listBuckets();
            const bucketExists = buckets?.some((b) => b.name === this.bucketName);
            if (!bucketExists) {
                const { error } = await this.supabase.storage.createBucket(this.bucketName, {
                    public: true,
                    fileSizeLimit: 10485760, // 10MB
                    allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg'],
                });
                if (error && !error.message.includes('already exists')) {
                    console.error('Failed to create bucket:', error);
                }
                else {
                    console.log(`Created Supabase storage bucket: ${this.bucketName}`);
                }
            }
        }
        catch (error) {
            console.error('Error ensuring bucket exists:', error);
        }
    }
    /**
     * Generate invoice PDF and return bytes only (no upload). Use for testing or custom storage.
     */
    async generateInvoiceToBuffer(data) {
        const qrCodeData = await this.generateQRCode(data.invoiceNumber, data.orderNumber);
        try {
            const templateBytes = await this.getTemplateBytes();
            return await this.fillTemplate(data, qrCodeData, templateBytes);
        }
        catch {
            return await this.createInvoiceFromScratch(data, qrCodeData);
        }
    }
    /**
     * Generate invoice PDF from template
     */
    async generateInvoice(data) {
        try {
            await this.ensureBucketExists();
            // 1. Generate QR Code
            const qrCodeData = await this.generateQRCode(data.invoiceNumber, data.orderNumber);
            // 2. Load or create PDF (template from Supabase templates/ or local public/)
            let pdfBytes;
            try {
                const templateBytes = await this.getTemplateBytes();
                pdfBytes = await this.fillTemplate(data, qrCodeData, templateBytes);
            }
            catch {
                pdfBytes = await this.createInvoiceFromScratch(data, qrCodeData);
            }
            // 3. Upload PDF to Supabase storage
            const pdfFileName = `pdf/${data.invoiceNumber}.pdf`;
            const pdfUrl = await this.uploadToStorage(pdfFileName, pdfBytes, 'application/pdf');
            if (!pdfUrl) {
                throw new Error('Failed to upload PDF to storage');
            }
            // 4. Generate PNG image from PDF first page
            const imageUrl = await this.generatePDFImage(pdfBytes, data.invoiceNumber);
            // 5. Upload QR code separately
            const qrFileName = `qr/${data.invoiceNumber}.png`;
            const qrBuffer = Buffer.from(qrCodeData.split(',')[1], 'base64');
            const qrUrl = await this.uploadToStorage(qrFileName, qrBuffer, 'image/png');
            return {
                success: true,
                pdfUrl,
                imageUrl: imageUrl || undefined,
                qrCodeUrl: qrUrl || undefined,
                invoiceNumber: data.invoiceNumber,
            };
        }
        catch (error) {
            console.error('Invoice generation error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to generate invoice',
            };
        }
    }
    /**
     * Multi-page strategy (for when items > ~6):
     * - Page 1: Current template WITHOUT footer (logo, Billed To, barcode, QR, first ~5–6 items). No "Grovio – Redefining..." or secure check.
     * - Page 2: Continuation of items (full page of rows), then totals, then footer (tagline, secure check, contact). If items still don't fit:
     * - Page 2..N-1: Full pages of item listing only (same template or listing-only template).
     * - Page N: Remaining items, then totals, then footer.
     * Requires: TemplatePage1NoFooter.pdf (or strip footer when items > 6), optional TemplateListingOnly.pdf for continuation pages.
     */
    /**
     * Fill Template.pdf with invoice data.
     * Uses consistent row height per item so multiple products don't require fixed template lines.
     */
    async fillTemplate(data, qrCodeDataUrl, templateBytes) {
        try {
            const pdfDoc = await pdf_lib_1.PDFDocument.load(templateBytes);
            const pages = pdfDoc.getPages();
            const firstPage = pages[0];
            const { width, height } = firstPage.getSize();
            // Embed fonts
            const helvetica = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
            const helveticaBold = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
            // Embed QR code (smaller source = chunkier modules when scaled up)
            const qrImage = await pdfDoc.embedPng(dataUrlToPngBytes(qrCodeDataUrl));
            const qrDims = qrImage.scale(3.2);
            // Position calculations (adjust based on actual template)
            const leftMargin = 250;
            const descLineHeight = 42;
            // Item row lines: horizontal position (width) and thickness
            const itemLineLeftOffset = 700; // distance from leftMargin to start of line (increase = line starts further right, shorter)
            const itemLineRightMargin = 200; // distance from page right to end of line (smaller = line extends further right)
            const lineLeft = leftMargin + itemLineLeftOffset;
            const lineRight = width - itemLineRightMargin;
            const lineThickness = 0.5; // line thickness in points (e.g. 0.5, 1, 1.5)
            // Vertical position of line under each item: positive = move line up (closer under text), negative = move line down (in points)
            const itemLineVerticalOffset = 75;
            // Logo (top left) – from public/ or Supabase templates
            const logoMarginTop = 220; // distance from top of page to top of logo (decrease to move logo up, increase to move down)
            const logoBytes = await this.getLogoBytes();
            if (logoBytes) {
                try {
                    const logoImage = await pdfDoc.embedPng(logoBytes);
                    const logoH = 180;
                    const logoW = (logoImage.width / logoImage.height) * logoH;
                    firstPage.drawImage(logoImage, {
                        x: leftMargin,
                        y: height - logoMarginTop - logoH,
                        width: logoW,
                        height: logoH,
                    });
                }
                catch (e) {
                    console.warn('Logo embed skipped:', e);
                }
            }
            // Invoice Number (top right)
            firstPage.drawText(data.invoiceNumber, {
                x: width - 1530,
                y: height - 320,
                size: 48,
                font: helvetica,
                color: (0, pdf_lib_1.rgb)(0, 0, 0),
            });
            // Date
            const dateStr = data.date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
            firstPage.drawText(dateStr, {
                x: width - 1530,
                y: height - 520,
                size: 48,
                font: helvetica,
                color: (0, pdf_lib_1.rgb)(0, 0, 0),
            });
            // Billed To
            let yPos = height - 1000;
            firstPage.drawText(data.customerName, {
                x: leftMargin,
                y: yPos,
                size: 52,
                font: helveticaBold,
                color: (0, pdf_lib_1.rgb)(0, 0, 0),
            });
            yPos -= 60;
            const addressLines = wrapTextByWords(data.customerAddress, 3);
            for (let i = 0; i < addressLines.length; i++) {
                firstPage.drawText(addressLines[i], {
                    x: leftMargin,
                    y: yPos - 40 - i * 52,
                    size: 52,
                    font: helvetica,
                    color: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2),
                });
            }
            yPos -= 60 + Math.max(0, (addressLines.length - 1) * 52);
            firstPage.drawText(data.customerPhone, {
                x: leftMargin,
                y: yPos - 80,
                size: 52,
                font: helvetica,
                color: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2),
            });
            // Serial barcode (below Billed To)
            const barcodePng = await this.generateBarcodePng(data.invoiceNumber);
            if (barcodePng) {
                try {
                    const barcodeImage = await pdfDoc.embedPng(barcodePng);
                    const barcodeW = 320;
                    const barcodeH = (barcodeImage.height / barcodeImage.width) * barcodeW;
                    const barcodeY = yPos - 80 - 120;
                    firstPage.drawImage(barcodeImage, {
                        x: leftMargin,
                        y: barcodeY - barcodeH,
                        width: barcodeW,
                        height: barcodeH,
                    });
                    const serialDisplay = this.formatSerialForDisplay(data.invoiceNumber);
                    firstPage.drawText(serialDisplay, {
                        x: leftMargin,
                        y: barcodeY - barcodeH - 36,
                        size: 32,
                        font: helvetica,
                        color: (0, pdf_lib_1.rgb)(0, 0, 0),
                    });
                }
                catch (e) {
                    console.warn('Barcode embed skipped:', e);
                }
            }
            // Items header – table headers only; line under each row is drawn below row content
            yPos = height - 320;
            // Items: description wrapped to 4 words per line; row height grows with wrap lines
            data.items.forEach((item) => {
                const descLines = wrapTextByWords(item.description, 4);
                const rowHeight = PDFInvoiceService.ITEM_ROW_HEIGHT + 80 + Math.max(0, (descLines.length - 1) * descLineHeight);
                const rowContentBottom = yPos - 530 - rowHeight + itemLineVerticalOffset;
                // Only draw item content and line when there is space (so last drawn item always has a line)
                if (yPos >= 200) {
                    // Description (multi-line, 4 words per line)
                    descLines.forEach((line, i) => {
                        firstPage.drawText(line, {
                            x: leftMargin + 700,
                            y: yPos - 530 - i * descLineHeight,
                            size: 38,
                            font: helveticaBold,
                            color: (0, pdf_lib_1.rgb)(0, 0, 0),
                        });
                    });
                    // Quantity, Unit Price, Total (aligned to first line of description)
                    firstPage.drawText(item.quantity.toString(), {
                        x: width - 840,
                        y: yPos - 530,
                        size: 38,
                        font: helveticaBold,
                        color: (0, pdf_lib_1.rgb)(0, 0, 0),
                    });
                    firstPage.drawText(item.unitPrice.toFixed(2), {
                        x: width - 560,
                        y: yPos - 530,
                        size: 38,
                        font: helveticaBold,
                        color: (0, pdf_lib_1.rgb)(0, 0, 0),
                    });
                    firstPage.drawText(item.total.toFixed(2), {
                        x: width - 280,
                        y: yPos - 525,
                        size: 38,
                        font: helveticaBold,
                        color: (0, pdf_lib_1.rgb)(0, 0, 0),
                    });
                    // Line under this item row (below row content) – every drawn item gets a line
                    firstPage.drawLine({
                        start: { x: lineLeft, y: rowContentBottom },
                        end: { x: lineRight + 90, y: rowContentBottom },
                        thickness: lineThickness,
                        color: (0, pdf_lib_1.rgb)(0, 0, 0),
                    });
                }
                yPos -= rowHeight;
            });
            // Totals section (labels same x as items listing, values on right)
            yPos = yPos - 620;
            const totalsLabelX = leftMargin + 700;
            const totalsValueX = width - 320;
            const totalAmountGap = 18; // gap between line above Total Amount and the text (reduced so Total Amount comes up)
            // Subtotal (label left, value right)
            firstPage.drawText('Subtotal', {
                x: totalsLabelX,
                y: yPos + 40,
                size: 48,
                font: helveticaBold,
                color: (0, pdf_lib_1.rgb)(0, 0, 0)
            });
            firstPage.drawText(`GHC ${data.subtotal.toFixed(2)}`, {
                x: totalsValueX - 80,
                y: yPos + 40,
                size: 48,
                font: helveticaBold,
                color: (0, pdf_lib_1.rgb)(0, 0, 0),
            });
            yPos -= 66;
            // Discounts & Credits section title
            firstPage.drawText('Discounts & Credits', { x: totalsLabelX, y: yPos, size: 55, font: helveticaBold, color: (0, pdf_lib_1.rgb)(0, 0, 0) });
            yPos -= 86;
            // Discount
            firstPage.drawText('Discounts', { x: totalsLabelX, y: yPos, size: 38, font: helvetica, color: (0, pdf_lib_1.rgb)(0, 0, 0) });
            firstPage.drawText(`GHC ${data.discount.toFixed(2)}`, {
                x: width - 360,
                y: yPos,
                size: 48,
                font: helvetica,
                color: (0, pdf_lib_1.rgb)(0, 0, 0),
            });
            yPos -= 86;
            // Credits (always show; 0.00 when zero)
            firstPage.drawText('Credits', { x: totalsLabelX, y: yPos, size: 38, font: helvetica, color: (0, pdf_lib_1.rgb)(0, 0, 0) });
            firstPage.drawText(`GHC ${data.credits.toFixed(2)}`, {
                x: width - 360,
                y: yPos,
                size: 48,
                font: helvetica,
                color: (0, pdf_lib_1.rgb)(0, 0, 0),
            });
            yPos -= 86;
            // Discount + Credits subtotal
            firstPage.drawText('Subtotal', { x: totalsLabelX, y: yPos, size: 38, font: helveticaBold, color: (0, pdf_lib_1.rgb)(0, 0, 0) });
            firstPage.drawText(`GHC ${(data.discount + data.credits).toFixed(2)}`, {
                x: width - 360,
                y: yPos,
                size: 48,
                font: helveticaBold,
                color: (0, pdf_lib_1.rgb)(0, 0, 0),
            });
            yPos -= 38;
            // Line above Subtotal
            firstPage.drawLine({
                start: { x: lineLeft, y: yPos + 92 },
                end: { x: lineRight + 90, y: yPos + 92 },
                thickness: lineThickness,
                color: (0, pdf_lib_1.rgb)(0, 0, 0),
            });
            // Line under Discounts & Credits section only
            firstPage.drawLine({
                start: { x: lineLeft, y: yPos + 188 },
                end: { x: lineRight + 90, y: yPos + 188 },
                thickness: lineThickness,
                color: (0, pdf_lib_1.rgb)(0, 0, 0),
            });
            yPos -= totalAmountGap;
            // Line above Total Amount (last line before total)
            firstPage.drawLine({
                start: { x: lineLeft, y: yPos },
                end: { x: lineRight + 90, y: yPos },
                thickness: lineThickness,
                color: (0, pdf_lib_1.rgb)(0, 0, 0),
            });
            yPos -= totalAmountGap;
            // Total Amount (label left, value right) – brought up closer to the line above
            firstPage.drawText('Total Amount', {
                x: totalsLabelX,
                y: yPos - 80,
                size: 48,
                font: helveticaBold,
                color: (0, pdf_lib_1.rgb)(0, 0, 0)
            });
            firstPage.drawText(`GHC ${data.totalAmount.toFixed(2)}`, {
                x: width - 380,
                y: yPos - 80,
                size: 48,
                font: helveticaBold,
                color: (0, pdf_lib_1.rgb)(0, 0, 0),
            });
            // Thank you – just below totals (same x-axis as items)
            firstPage.drawText('Thank you for shopping with us!', {
                x: totalsLabelX - 90,
                y: yPos - 250,
                size: 60,
                font: helveticaBold,
                color: (0, pdf_lib_1.rgb)(0, 0, 0),
            });
            // QR Code (bottom center)
            firstPage.drawImage(qrImage, {
                x: leftMargin - 40,
                y: 1240,
                width: qrDims.width,
                height: qrDims.height,
            });
            return await pdfDoc.save();
        }
        catch (error) {
            console.error('Template fill error:', error);
            throw error;
        }
    }
    /**
     * Create invoice PDF from scratch (if no template)
     */
    async createInvoiceFromScratch(data, qrCodeDataUrl) {
        const pdfDoc = await pdf_lib_1.PDFDocument.create();
        const page = pdfDoc.addPage([595, 842]); // A4 size
        const { width, height } = page.getSize();
        const helvetica = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
        const helveticaBold = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
        // Embed QR code (chunkier modules from smaller source, scaled up)
        const qrImage = await pdfDoc.embedPng(dataUrlToPngBytes(qrCodeDataUrl));
        const qrDims = qrImage.scale(1.2);
        // Logo (top left) when available
        const logoBytesScratch = await this.getLogoBytes();
        if (logoBytesScratch) {
            try {
                const logoImg = await pdfDoc.embedPng(logoBytesScratch);
                const lh = 80;
                const lw = (logoImg.width / logoImg.height) * lh;
                page.drawImage(logoImg, { x: 50, y: height - 550, width: lw, height: lh });
            }
            catch {
                // skip
            }
        }
        // Header (text only if no logo)
        if (!logoBytesScratch) {
            page.drawText('Grovio', {
                x: 50,
                y: height - 50,
                size: 24,
                font: helveticaBold,
                color: (0, pdf_lib_1.rgb)(0.83, 0.37, 0.05),
            });
        }
        page.drawText('Invoice', {
            x: width - 150,
            y: height - 50,
            size: 28,
            font: helveticaBold,
            color: (0, pdf_lib_1.rgb)(0, 0, 0),
        });
        // Invoice details
        page.drawText(`Invoice Number: ${data.invoiceNumber}`, {
            x: width - 250,
            y: height - 90,
            size: 10,
            font: helvetica,
            color: (0, pdf_lib_1.rgb)(0, 0, 0),
        });
        page.drawText(`Date: ${data.date.toLocaleDateString('en-GB')}`, {
            x: width - 250,
            y: height - 110,
            size: 10,
            font: helvetica,
            color: (0, pdf_lib_1.rgb)(0, 0, 0),
        });
        let yPos = height - 110;
        // Billed To (address: 3 words per line)
        yPos = height - 200;
        page.drawText('Billed To:', { x: 50, y: yPos, size: 11, font: helveticaBold });
        yPos -= 20;
        page.drawText(data.customerName, { x: 50, y: yPos, size: 10, font: helveticaBold });
        yPos -= 15;
        const addressLinesScratch = wrapTextByWords(data.customerAddress, 3);
        addressLinesScratch.forEach((line) => {
            page.drawText(line, { x: 50, y: yPos, size: 9, font: helvetica });
            yPos -= 20;
        });
        page.drawText(data.customerPhone, { x: 50, y: yPos, size: 9, font: helvetica });
        yPos = height - 340;
        // Items (description: 4 words per line wrap)
        yPos -= 20;
        const descLineHeightScratch = 14;
        data.items.forEach((item) => {
            if (yPos < 180)
                return;
            const descLinesScratch = wrapTextByWords(item.description, 4);
            descLinesScratch.forEach((line, i) => {
                page.drawText(line, {
                    x: 50,
                    y: yPos - i * descLineHeightScratch,
                    size: 9,
                    font: helvetica,
                });
            });
            const itemFirstY = yPos;
            page.drawText(item.quantity.toString(), {
                x: width - 300,
                y: itemFirstY,
                size: 9,
                font: helvetica,
            });
            page.drawText(item.unitPrice.toFixed(2), {
                x: width - 220,
                y: itemFirstY,
                size: 9,
                font: helvetica,
            });
            page.drawText(item.total.toFixed(2), {
                x: width - 120,
                y: itemFirstY,
                size: 9,
                font: helvetica,
            });
            yPos -= 22 + Math.max(0, (descLinesScratch.length - 1) * descLineHeightScratch);
        });
        // Totals section
        yPos -= 30;
        // Subtotal
        page.drawText('Subtotal:', { x: width - 220, y: yPos, size: 10, font: helveticaBold });
        page.drawText(`GHC ${data.subtotal.toFixed(2)}`, {
            x: width - 120,
            y: yPos,
            size: 10,
            font: helveticaBold,
        });
        yPos -= 25;
        // Discount (always show)
        page.drawText('Discounts:', { x: width - 220, y: yPos, size: 9, font: helvetica });
        page.drawText(`GHC ${data.discount.toFixed(2)}`, {
            x: width - 120,
            y: yPos,
            size: 9,
            font: helvetica,
            color: (0, pdf_lib_1.rgb)(0.83, 0.37, 0.05),
        });
        yPos -= 20;
        // Credits (always show; 0.00 when zero)
        page.drawText('Credits:', { x: width - 220, y: yPos, size: 9, font: helvetica });
        page.drawText(`GHC ${data.credits.toFixed(2)}`, {
            x: width - 120,
            y: yPos,
            size: 9,
            font: helvetica,
        });
        yPos -= 20;
        // Discount + Credits subtotal (always show)
        page.drawText('Discounts + Credits:', { x: width - 220, y: yPos, size: 9, font: helvetica });
        page.drawText(`GHC ${(data.discount + data.credits).toFixed(2)}`, {
            x: width - 120,
            y: yPos,
            size: 9,
            font: helvetica,
        });
        yPos -= 25;
        // Total Amount (bold, larger)
        page.drawText('Total Amount:', { x: width - 220, y: yPos, size: 12, font: helveticaBold });
        page.drawText(`GHC ${data.totalAmount.toFixed(2)}`, {
            x: width - 140,
            y: yPos,
            size: 14,
            font: helveticaBold,
            color: (0, pdf_lib_1.rgb)(0.83, 0.37, 0.05),
        });
        // QR Code
        page.drawImage(qrImage, {
            x: 50,
            y: 100,
            width: qrDims.width,
            height: qrDims.height,
        });
        // Footer
        page.drawText('Thank you for shopping with us!', {
            x: 50,
            y: 120,
            size: 12,
            font: helveticaBold,
            color: (0, pdf_lib_1.rgb)(0, 0, 0),
        });
        return await pdfDoc.save();
    }
    /** Format invoice number as serial display (e.g. 4474 94949 04848 5959 4848) */
    formatSerialForDisplay(invoiceNumber) {
        const digits = invoiceNumber.replace(/\D/g, '').padStart(24, '0').slice(0, 24);
        const parts = [digits.slice(0, 4), digits.slice(4, 9), digits.slice(9, 14), digits.slice(14, 19), digits.slice(19, 24)];
        return parts.filter(Boolean).join(' ');
    }
    /**
     * Generate 1D barcode (Code128) PNG bytes for serial number
     */
    async generateBarcodePng(invoiceNumber) {
        try {
            const bwipjs = await Promise.resolve().then(() => __importStar(require('bwip-js')));
            const digits = invoiceNumber.replace(/\D/g, '').padStart(20, '0').slice(0, 20);
            if (!digits.length)
                return null;
            const png = await bwipjs.toBuffer({
                bcid: 'code128',
                text: digits,
                scale: 2,
                height: 10,
                includetext: false,
            });
            return new Uint8Array(png);
        }
        catch (e) {
            console.warn('Barcode generation failed:', e);
            return null;
        }
    }
    /**
     * Generate QR code for invoice
     */
    async generateQRCode(invoiceNumber, orderNumber) {
        try {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
            const invoiceUrl = `${frontendUrl}/invoice/${orderNumber}?inv=${invoiceNumber}`;
            // Smaller pixel size = fewer modules = chunkier squares when scaled up on PDF
            const qrCodeDataUrl = await qrcode_1.default.toDataURL(invoiceUrl, {
                width: 170,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF',
                },
                errorCorrectionLevel: 'L',
            });
            return qrCodeDataUrl;
        }
        catch (error) {
            console.error('QR code generation error:', error);
            return await qrcode_1.default.toDataURL('https://grovio.com', { width: 96 });
        }
    }
    /**
     * Generate PNG image from PDF
     */
    async generatePDFImage(pdfBytes, invoiceNumber) {
        try {
            const puppeteer = await Promise.resolve().then(() => __importStar(require('puppeteer')));
            const browser = await puppeteer.default.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
            const page = await browser.newPage();
            await page.setViewport({ width: 595, height: 842 }); // A4 in pixels at 72dpi
            // Convert PDF to data URL
            const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
            const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;
            await page.goto(pdfDataUrl, { waitUntil: 'networkidle0' });
            // Take screenshot
            const screenshot = await page.screenshot({
                type: 'png',
                fullPage: false,
            });
            await browser.close();
            // Optimize image with sharp
            const optimizedImage = await (0, sharp_1.default)(screenshot)
                .resize(1240, null, { fit: 'inside' }) // Max width 1240px
                .png({ quality: 90 })
                .toBuffer();
            // Upload to storage
            const imageFileName = `images/${invoiceNumber}.png`;
            const imageUrl = await this.uploadToStorage(imageFileName, optimizedImage, 'image/png');
            return imageUrl;
        }
        catch (error) {
            console.error('PDF to image conversion error:', error);
            console.warn('PDF generated but image conversion failed. Continuing without image.');
            return null;
        }
    }
    /**
     * Upload file to Supabase storage
     */
    async uploadToStorage(fileName, fileBuffer, contentType) {
        try {
            const { error } = await this.supabase.storage
                .from(this.bucketName)
                .upload(fileName, fileBuffer, {
                contentType,
                upsert: true, // Overwrite if exists
            });
            if (error) {
                console.error('Supabase storage upload error:', error);
                return null;
            }
            // Get public URL
            const { data: publicData } = this.supabase.storage
                .from(this.bucketName)
                .getPublicUrl(fileName);
            return publicData.publicUrl;
        }
        catch (error) {
            console.error('Storage upload error:', error);
            return null;
        }
    }
    /**
     * Generate unique invoice number (10 digits)
     */
    generateInvoiceNumber() {
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        return timestamp + random;
    }
    /**
     * Generate order ID (format: ORD-AC23-233E)
     */
    generateOrderId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = 'ORD-';
        for (let i = 0; i < 8; i++) {
            if (i === 4)
                result += '-'; // Add dash after 4 chars
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    /**
     * Delete invoice files from storage
     */
    async deleteInvoice(invoiceNumber) {
        try {
            await this.supabase.storage
                .from(this.bucketName)
                .remove([
                `pdf/${invoiceNumber}.pdf`,
                `images/${invoiceNumber}.png`,
                `qr/${invoiceNumber}.png`,
            ]);
            console.log(`Deleted invoice files for: ${invoiceNumber}`);
        }
        catch (error) {
            console.error('Delete invoice error:', error);
        }
    }
}
exports.PDFInvoiceService = PDFInvoiceService;
/** Fixed row height for each item line (same spacing for any number of products) */
PDFInvoiceService.ITEM_ROW_HEIGHT = 28;
