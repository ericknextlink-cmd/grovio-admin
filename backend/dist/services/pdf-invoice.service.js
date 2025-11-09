"use strict";
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
class PDFInvoiceService {
    constructor() {
        this.bucketName = 'invoices';
        this.supabase = (0, supabase_1.createAdminClient)();
        this.templatePath = path_1.default.join(__dirname, '../../public/Template.pdf');
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
     * Generate invoice PDF from template
     */
    async generateInvoice(data) {
        try {
            await this.ensureBucketExists();
            // 1. Generate QR Code
            const qrCodeData = await this.generateQRCode(data.invoiceNumber, data.orderNumber);
            // 2. Load or create PDF
            let pdfBytes;
            if ((0, fs_1.existsSync)(this.templatePath)) {
                pdfBytes = await this.fillTemplate(data, qrCodeData);
            }
            else {
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
     * Fill Template.pdf with invoice data
     */
    async fillTemplate(data, qrCodeDataUrl) {
        try {
            const templateBytes = await promises_1.default.readFile(this.templatePath);
            const pdfDoc = await pdf_lib_1.PDFDocument.load(templateBytes);
            const pages = pdfDoc.getPages();
            const firstPage = pages[0];
            const { width, height } = firstPage.getSize();
            // Embed fonts
            const helvetica = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
            const helveticaBold = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
            // Embed QR code
            const qrImage = await pdfDoc.embedPng(qrCodeDataUrl);
            const qrDims = qrImage.scale(0.35);
            // Position calculations (adjust based on actual template)
            const leftMargin = 60;
            const rightMargin = width - 60;
            // Invoice Number (top right)
            firstPage.drawText(data.invoiceNumber, {
                x: width - 180,
                y: height - 80,
                size: 12,
                font: helveticaBold,
                color: (0, pdf_lib_1.rgb)(0, 0, 0),
            });
            // Date
            const dateStr = data.date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
            firstPage.drawText(dateStr, {
                x: width - 180,
                y: height - 110,
                size: 10,
                font: helvetica,
                color: (0, pdf_lib_1.rgb)(0, 0, 0),
            });
            // Billed To
            let yPos = height - 200;
            firstPage.drawText(data.customerName, {
                x: leftMargin,
                y: yPos,
                size: 11,
                font: helveticaBold,
                color: (0, pdf_lib_1.rgb)(0, 0, 0),
            });
            yPos -= 20;
            firstPage.drawText(data.customerAddress, {
                x: leftMargin,
                y: yPos,
                size: 9,
                font: helvetica,
                color: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2),
            });
            yPos -= 15;
            firstPage.drawText(data.customerPhone, {
                x: leftMargin,
                y: yPos,
                size: 9,
                font: helvetica,
                color: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2),
            });
            // Items header - adjust based on template
            yPos = height - 320;
            // Items
            data.items.forEach((item) => {
                if (yPos < 200)
                    return; // Prevent overflow
                // Description
                const desc = item.description.substring(0, 60); // Truncate if too long
                firstPage.drawText(desc, {
                    x: leftMargin,
                    y: yPos,
                    size: 9,
                    font: helvetica,
                    color: (0, pdf_lib_1.rgb)(0, 0, 0),
                });
                // Quantity
                firstPage.drawText(item.quantity.toString(), {
                    x: width - 300,
                    y: yPos,
                    size: 9,
                    font: helvetica,
                    color: (0, pdf_lib_1.rgb)(0, 0, 0),
                });
                // Unit Price
                firstPage.drawText(item.unitPrice.toFixed(2), {
                    x: width - 200,
                    y: yPos,
                    size: 9,
                    font: helvetica,
                    color: (0, pdf_lib_1.rgb)(0, 0, 0),
                });
                // Total
                firstPage.drawText(item.total.toFixed(2), {
                    x: width - 100,
                    y: yPos,
                    size: 9,
                    font: helvetica,
                    color: (0, pdf_lib_1.rgb)(0, 0, 0),
                });
                yPos -= 25;
            });
            // Totals section
            yPos = yPos - 40;
            // Subtotal
            firstPage.drawText(`GHC ${data.subtotal.toFixed(2)}`, {
                x: width - 110,
                y: yPos,
                size: 11,
                font: helveticaBold,
                color: (0, pdf_lib_1.rgb)(0, 0, 0),
            });
            yPos -= 30;
            // Discount
            if (data.discount > 0) {
                firstPage.drawText(`GHC ${data.discount.toFixed(2)}`, {
                    x: width - 110,
                    y: yPos,
                    size: 10,
                    font: helvetica,
                    color: (0, pdf_lib_1.rgb)(0.83, 0.37, 0.05), // Orange color
                });
                yPos -= 25;
            }
            // Credits
            if (data.credits > 0) {
                firstPage.drawText(`GHC ${data.credits.toFixed(2)}`, {
                    x: width - 110,
                    y: yPos,
                    size: 10,
                    font: helvetica,
                    color: (0, pdf_lib_1.rgb)(0, 0, 0),
                });
                yPos -= 25;
            }
            yPos -= 10;
            // Total Amount
            firstPage.drawText(`GHC ${data.totalAmount.toFixed(2)}`, {
                x: width - 120,
                y: yPos,
                size: 14,
                font: helveticaBold,
                color: (0, pdf_lib_1.rgb)(0.83, 0.37, 0.05), // Orange color
            });
            // QR Code (bottom center)
            firstPage.drawImage(qrImage, {
                x: leftMargin,
                y: 120,
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
        // Embed QR code
        const qrImage = await pdfDoc.embedPng(qrCodeDataUrl);
        const qrDims = qrImage.scale(0.3);
        // Header
        page.drawText('Grovio', {
            x: 50,
            y: height - 50,
            size: 24,
            font: helveticaBold,
            color: (0, pdf_lib_1.rgb)(0.83, 0.37, 0.05),
        });
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
        // Grovio address
        let yPos = height - 110;
        page.drawText('Adjuma Crescent Road', { x: 50, y: yPos, size: 9, font: helvetica });
        yPos -= 15;
        page.drawText('South Industrial Area', { x: 50, y: yPos, size: 9, font: helvetica });
        yPos -= 15;
        page.drawText('Accra, Ghana', { x: 50, y: yPos, size: 9, font: helvetica });
        // Billed To
        yPos = height - 200;
        page.drawText('Billed To:', { x: 50, y: yPos, size: 11, font: helveticaBold });
        yPos -= 20;
        page.drawText(data.customerName, { x: 50, y: yPos, size: 10, font: helveticaBold });
        yPos -= 15;
        page.drawText(data.customerAddress, { x: 50, y: yPos, size: 9, font: helvetica });
        yPos -= 15;
        page.drawText(data.customerPhone, { x: 50, y: yPos, size: 9, font: helvetica });
        // Table header
        yPos = height - 340;
        page.drawText('Description', { x: 50, y: yPos, size: 10, font: helveticaBold });
        page.drawText('Qty', { x: width - 300, y: yPos, size: 10, font: helveticaBold });
        page.drawText('Unit Price', { x: width - 220, y: yPos, size: 10, font: helveticaBold });
        page.drawText('Total', { x: width - 120, y: yPos, size: 10, font: helveticaBold });
        // Line under header
        yPos -= 5;
        page.drawLine({
            start: { x: 50, y: yPos },
            end: { x: width - 50, y: yPos },
            thickness: 1,
            color: (0, pdf_lib_1.rgb)(0.8, 0.8, 0.8),
        });
        // Items
        yPos -= 20;
        data.items.forEach((item) => {
            if (yPos < 180)
                return;
            page.drawText(item.description.substring(0, 50), {
                x: 50,
                y: yPos,
                size: 9,
                font: helvetica,
            });
            page.drawText(item.quantity.toString(), {
                x: width - 300,
                y: yPos,
                size: 9,
                font: helvetica,
            });
            page.drawText(item.unitPrice.toFixed(2), {
                x: width - 220,
                y: yPos,
                size: 9,
                font: helvetica,
            });
            page.drawText(item.total.toFixed(2), {
                x: width - 120,
                y: yPos,
                size: 9,
                font: helvetica,
            });
            yPos -= 22;
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
        // Discount
        if (data.discount > 0) {
            page.drawText('Discounts:', { x: width - 220, y: yPos, size: 9, font: helvetica });
            page.drawText(`GHC ${data.discount.toFixed(2)}`, {
                x: width - 120,
                y: yPos,
                size: 9,
                font: helvetica,
                color: (0, pdf_lib_1.rgb)(0.83, 0.37, 0.05),
            });
            yPos -= 20;
        }
        // Credits
        if (data.credits > 0) {
            page.drawText('Credits:', { x: width - 220, y: yPos, size: 9, font: helvetica });
            page.drawText(`GHC ${data.credits.toFixed(2)}`, {
                x: width - 120,
                y: yPos,
                size: 9,
                font: helvetica,
            });
            yPos -= 20;
        }
        yPos -= 10;
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
            y: 50,
            size: 10,
            font: helveticaBold,
            color: (0, pdf_lib_1.rgb)(0, 0, 0),
        });
        page.drawText('Grovio – Redefining the Way You Save.', {
            x: 50,
            y: 30,
            size: 8,
            font: helvetica,
            color: (0, pdf_lib_1.rgb)(0.4, 0.4, 0.4),
        });
        return await pdfDoc.save();
    }
    /**
     * Generate QR code for invoice
     */
    async generateQRCode(invoiceNumber, orderNumber) {
        try {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
            const invoiceUrl = `${frontendUrl}/invoice/${orderNumber}?inv=${invoiceNumber}`;
            const qrCodeDataUrl = await qrcode_1.default.toDataURL(invoiceUrl, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF',
                },
                errorCorrectionLevel: 'M',
            });
            return qrCodeDataUrl;
        }
        catch (error) {
            console.error('QR code generation error:', error);
            // Return empty QR code as fallback
            return await qrcode_1.default.toDataURL('https://grovio.com', { width: 200 });
        }
    }
    /**
     * Generate PNG image from PDF
     */
    async generatePDFImage(pdfBytes, invoiceNumber) {
        try {
            // Using Puppeteer to convert PDF to image
            const puppeteer = require('puppeteer');
            const browser = await puppeteer.launch({
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
            const { data, error } = await this.supabase.storage
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
            console.log(`🗑️  Deleted invoice files for: ${invoiceNumber}`);
        }
        catch (error) {
            console.error('Delete invoice error:', error);
        }
    }
}
exports.PDFInvoiceService = PDFInvoiceService;
