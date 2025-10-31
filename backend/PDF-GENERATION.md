# Backend PDF Generation Implementation Guide

## Overview

This document outlines the recommended approach for implementing server-side PDF generation for invoices. The backend will handle PDF generation using the PDF template (`Template.pdf`), while the frontend maintains its preview capability.

## Why Backend PDF Generation?

### Advantages:
1. **Better Performance**: Server has more resources for rendering
2. **Consistency**: Same PDF output regardless of client browser
3. **Security**: PDF template and generation logic stay on server
4. **Scalability**: Can handle high-volume PDF generation
5. **Quality**: Server-side rendering produces higher quality PDFs
6. **Template Management**: Centralized template updates without redeploying frontend

### Current Issues with Frontend Generation:
- Browser compatibility issues (lab() colors, CORS)
- Inconsistent rendering across browsers
- Large bundle size with html2canvas + jsPDF
- Client-side resource constraints
- Template.pdf not being utilized

---

## Recommended Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  Frontend   │────────▶│   Backend    │────────▶│  Template   │
│  (Preview)  │ API Call│ (Generate)   │  Merge  │  (PDF File) │
└─────────────┘         └──────────────┘         └─────────────┘
      │                         │
      │                         ▼
      │                  ┌─────────────┐
      └─────────────────▶│  Generated  │
         Display URL     │  PDF (S3)   │
                         └─────────────┘
```

---

## Backend Implementation (Node.js/Express)

### Required Dependencies

```json
{
  "dependencies": {
    "pdf-lib": "^1.17.1",         // For PDF manipulation
    "puppeteer": "^23.9.0",       // For HTML to PDF
    "@aws-sdk/client-s3": "^3.x", // For S3 storage (optional)
    "qrcode": "^1.5.4"            // For QR code generation
  }
}
```

### API Endpoint Structure

```typescript
// routes/invoice.ts

import { Router } from 'express'
import { generateInvoicePDF } from '../services/pdf-service'
import { authenticateUser } from '../middleware/auth'

const router = Router()

/**
 * POST /api/invoices/generate
 * 
 * Request Body:
 * {
 *   orderId: string,
 *   customerId?: string, // Optional, will use authenticated user if not provided
 *   discount?: number,
 *   credits?: number
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   pdfUrl: string,        // Public URL to access PDF
 *   imageUrl?: string,     // Optional: PNG preview
 *   invoiceNumber: string,
 *   expiresAt: Date        // URL expiration (if using signed URLs)
 * }
 */
router.post('/generate', authenticateUser, async (req, res) => {
  try {
    const { orderId, customerId, discount, credits } = req.body
    const userId = customerId || req.user.id

    // Generate PDF
    const result = await generateInvoicePDF({
      orderId,
      userId,
      discount,
      credits
    })

    res.json({
      success: true,
      pdfUrl: result.pdfUrl,
      imageUrl: result.imageUrl,
      invoiceNumber: result.invoiceNumber,
      expiresAt: result.expiresAt
    })
  } catch (error) {
    console.error('PDF generation failed:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice PDF'
    })
  }
})

/**
 * GET /api/invoices/:invoiceNumber/pdf
 * 
 * Returns the PDF file directly (for download/print)
 */
router.get('/:invoiceNumber/pdf', async (req, res) => {
  try {
    const { invoiceNumber } = req.params
    
    // Retrieve PDF from storage
    const pdfBuffer = await getPDFFromStorage(invoiceNumber)
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="invoice-${invoiceNumber}.pdf"`)
    res.send(pdfBuffer)
  } catch (error) {
    res.status(404).json({ success: false, message: 'Invoice not found' })
  }
})

export default router
```

### PDF Generation Service

```typescript
// services/pdf-service.ts

import { PDFDocument, rgb } from 'pdf-lib'
import fs from 'fs/promises'
import path from 'path'
import QRCode from 'qrcode'
import { uploadToS3 } from './storage-service'
import { getOrderDetails, getUserDetails } from './database-service'

interface GenerateInvoiceParams {
  orderId: string
  userId: string
  discount?: number
  credits?: number
}

export async function generateInvoicePDF(params: GenerateInvoiceParams) {
  const { orderId, userId, discount = 0, credits = 0 } = params
  
  // 1. Fetch data from database
  const order = await getOrderDetails(orderId)
  const user = await getUserDetails(userId)
  
  // 2. Load PDF template
  const templatePath = path.join(__dirname, '../templates/Template.pdf')
  const templateBytes = await fs.readFile(templatePath)
  const pdfDoc = await PDFDocument.load(templateBytes)
  
  // 3. Get first page
  const pages = pdfDoc.getPages()
  const firstPage = pages[0]
  
  // 4. Generate QR Code as data URL
  const invoiceUrl = `${process.env.FRONTEND_URL}/invoice?order=${order.orderNumber}`
  const qrCodeDataUrl = await QRCode.toDataURL(invoiceUrl, {
    width: 120,
    margin: 1,
    errorCorrectionLevel: 'M'
  })
  
  // 5. Embed QR code image
  const qrImage = await pdfDoc.embedPng(qrCodeDataUrl)
  const qrDims = qrImage.scale(0.5)
  
  // 6. Fill in template fields (adjust coordinates based on template)
  const { width, height } = firstPage.getSize()
  
  // Customer Name
  firstPage.drawText(`${user.firstName} ${user.lastName}`, {
    x: 50,
    y: height - 200,
    size: 14,
    color: rgb(0, 0, 0)
  })
  
  // Invoice Number
  firstPage.drawText(order.orderNumber, {
    x: width - 200,
    y: height - 120,
    size: 12,
    color: rgb(0, 0, 0)
  })
  
  // Order Date
  firstPage.drawText(new Date(order.createdAt).toLocaleDateString(), {
    x: width - 200,
    y: height - 150,
    size: 12,
    color: rgb(0, 0, 0)
  })
  
  // Items (loop through order items)
  let yPosition = height - 350
  order.items.forEach((item, index) => {
    firstPage.drawText(item.name, { x: 50, y: yPosition, size: 10 })
    firstPage.drawText(item.quantity.toString(), { x: 300, y: yPosition, size: 10 })
    firstPage.drawText(`GHC ${item.price}`, { x: 400, y: yPosition, size: 10 })
    firstPage.drawText(`GHC ${(item.price * item.quantity).toFixed(2)}`, { x: 500, y: yPosition, size: 10 })
    yPosition -= 25
  })
  
  // Totals
  const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const total = subtotal - discount - credits
  
  firstPage.drawText(`GHC ${subtotal.toFixed(2)}`, { x: 500, y: yPosition - 20, size: 12 })
  firstPage.drawText(`GHC ${discount.toFixed(2)}`, { x: 500, y: yPosition - 60, size: 10 })
  firstPage.drawText(`GHC ${credits.toFixed(2)}`, { x: 500, y: yPosition - 80, size: 10 })
  firstPage.drawText(`GHC ${total.toFixed(2)}`, { x: 500, y: yPosition - 120, size: 14, color: rgb(0.83, 0.37, 0.05) })
  
  // QR Code
  firstPage.drawImage(qrImage, {
    x: width / 2 - qrDims.width / 2,
    y: 150,
    width: qrDims.width,
    height: qrDims.height
  })
  
  // 7. Save PDF
  const pdfBytes = await pdfDoc.save()
  
  // 8. Upload to storage (S3 or local)
  const fileName = `invoices/${order.orderNumber}.pdf`
  const pdfUrl = await uploadToS3(fileName, pdfBytes, 'application/pdf')
  
  // 9. Optionally generate PNG preview
  const imageUrl = await generatePDFPreview(pdfBytes, order.orderNumber)
  
  return {
    pdfUrl,
    imageUrl,
    invoiceNumber: order.orderNumber,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  }
}

async function generatePDFPreview(pdfBytes: Buffer, invoiceNumber: string): Promise<string> {
  // Use Puppeteer or ImageMagick to convert PDF to PNG
  // This is optional - frontend can render PDF directly
  // Implementation depends on your requirements
  return '' // Return empty or actual URL
}
```

### Storage Service (S3)

```typescript
// services/storage-service.ts

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
})

export async function uploadToS3(key: string, body: Buffer, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    Body: body,
    ContentType: contentType
  })
  
  await s3Client.send(command)
  
  // Generate signed URL (valid for 24 hours)
  const getCommand = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key
  })
  
  const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 86400 })
  return url
}

export async function getPDFFromStorage(invoiceNumber: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: `invoices/${invoiceNumber}.pdf`
  })
  
  const response = await s3Client.send(command)
  const stream = response.Body as any
  const chunks: Uint8Array[] = []
  
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  
  return Buffer.concat(chunks)
}
```

---

## Frontend Integration

### Updated Invoice Component

```typescript
// src/hooks/use-invoice-generation.ts

import { useState } from 'react'
import { toast } from 'sonner'

interface GenerateInvoiceParams {
  orderId: string
  discount?: number
  credits?: number
}

interface InvoiceResult {
  pdfUrl: string
  imageUrl?: string
  invoiceNumber: string
}

export function useInvoiceGeneration() {
  const [isGenerating, setIsGenerating] = useState(false)
  
  const generateInvoice = async (params: GenerateInvoiceParams): Promise<InvoiceResult | null> => {
    setIsGenerating(true)
    const loadingToast = toast.loading('Generating invoice...')
    
    try {
      const response = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(params)
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to generate invoice')
      }
      
      toast.dismiss(loadingToast)
      toast.success('Invoice generated successfully!')
      
      return {
        pdfUrl: data.pdfUrl,
        imageUrl: data.imageUrl,
        invoiceNumber: data.invoiceNumber
      }
    } catch (error) {
      console.error('Invoice generation error:', error)
      toast.dismiss(loadingToast)
      toast.error('Failed to generate invoice. Please try again.')
      return null
    } finally {
      setIsGenerating(false)
    }
  }
  
  return { generateInvoice, isGenerating }
}
```

### Updated Invoice Component Buttons

```typescript
// src/components/invoice.tsx (updated download section)

import { useInvoiceGeneration } from '@/hooks/use-invoice-generation'

export default function Invoice({ orderNumber, /* ... */ }: InvoiceProps) {
  const { generateInvoice, isGenerating } = useInvoiceGeneration()
  
  const handleDownloadPDF = async () => {
    // Try backend generation first
    const result = await generateInvoice({
      orderId: orderNumber,
      discount,
      credits
    })
    
    if (result) {
      // Open PDF in new tab
      window.open(result.pdfUrl, '_blank')
    } else {
      // Fallback to client-side generation
      // ... existing html2canvas code ...
    }
  }
  
  // ... rest of component
}
```

---

## Environment Variables

### Backend (.env)

```bash
# PDF Generation
FRONTEND_URL=https://grovio.com.gh
PDF_TEMPLATE_PATH=./templates/Template.pdf

# AWS S3 (for PDF storage)
AWS_REGION=us-east-1
AWS_S3_BUCKET=grovio-invoices
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Alternative: Local Storage
STORAGE_TYPE=local  # or 's3'
LOCAL_STORAGE_PATH=./storage/invoices
PUBLIC_URL=https://api.grovio.com.gh/public
```

### Frontend (.env)

```bash
NEXT_PUBLIC_API_URL=https://api.grovio.com.gh
```

---

## Template.pdf Integration

Since you have `Template.pdf` in the `public` folder, move it to the backend:

```bash
# Backend structure
backend/
├── templates/
│   └── Template.pdf      # Your invoice template
├── services/
│   ├── pdf-service.ts    # PDF generation logic
│   └── storage-service.ts # S3/local storage
└── routes/
    └── invoice.ts        # API endpoints
```

The template can have:
- Grovio branding (logo, colors)
- Pre-designed layout structure
- Placeholder text/coordinates for dynamic data
- Professional fonts and styling

---

## Migration Steps

### Phase 1: Backend Setup (Week 1)
1. ✅ Create invoice API endpoints
2. ✅ Implement PDF generation service
3. ✅ Set up S3 storage (or local alternative)
4. ✅ Test with sample data

### Phase 2: Frontend Integration (Week 1)
1. ✅ Create `useInvoiceGeneration` hook
2. ✅ Update invoice component to call backend
3. ✅ Keep client-side generation as fallback
4. ✅ Test end-to-end flow

### Phase 3: Optimization (Week 2)
1. ✅ Add caching for generated PDFs
2. ✅ Implement background job queue for bulk generation
3. ✅ Add webhook for invoice ready notification
4. ✅ Monitor performance and optimize

### Phase 4: Deprecation (Week 3)
1. ✅ Remove client-side PDF generation code
2. ✅ Remove html2canvas and jsPDF dependencies
3. ✅ Update documentation

---

## Benefits Summary

| Aspect | Frontend Generation | Backend Generation |
|--------|--------------------|--------------------|
| **Performance** | Slow (browser limited) | Fast (server resources) |
| **Quality** | Inconsistent | High & consistent |
| **Template** | Not utilized | Fully utilized |
| **Security** | Template exposed | Template secure |
| **Scalability** | Limited | High |
| **Bundle Size** | +500KB | Minimal |
| **CORS Issues** | Common | None |
| **Browser Compat** | Varies | N/A |

---

## Support & Maintenance

- **Backend API**: Document all endpoints with Swagger/OpenAPI
- **Template Updates**: Version control Template.pdf
- **Monitoring**: Track PDF generation success/failure rates
- **Error Handling**: Comprehensive logging for debugging

---
