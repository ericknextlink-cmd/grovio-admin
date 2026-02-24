/**
 * Manual test script for PDF invoice generation.
 * Uses template from Supabase storage (templates/Template.pdf) if available,
 * otherwise local backend/public/Template.pdf.
 *
 * Run from backend directory:
 *   pnpm run test:invoice
 * or:
 *   pnpm exec ts-node -r dotenv/config scripts/test-invoice.ts
 */

import path from 'path'
import fs from 'fs/promises'
import { PDFInvoiceService } from '../src/services/pdf-invoice.service'
import type { InvoiceData } from '../src/services/pdf-invoice.service'

async function main() {
  const outDir = path.join(process.cwd(), 'output')
  await fs.mkdir(outDir, { recursive: true })
  const outPath = path.join(outDir, 'invoice-test.pdf')

  const service = new PDFInvoiceService()

  // Sample data matching the Grovio invoice layout (e.g. 6 items like the screenshot)
  const sampleData: InvoiceData = {
    invoiceNumber: service.generateInvoiceNumber(),
    orderNumber: service.generateOrderId(),
    date: new Date(),
    customerName: 'William Duncan Bills',
    customerAddress: 'Adjuma Crescent Road, North Industrial Area, Accra, Ghana',
    customerPhone: '00233265713324',
    customerEmail: 'customer@example.com',
    items: Array.from({ length: 6 }, () => ({
      description:
        'Authentic Royal Naturally Aged Indian White Basmati Rice, Long-Grain, Gluten-free - 5kg. Bag.',
      quantity: 5,
      unitPrice: 130,
      total: 650,
    })),
    subtotal: 3900,
    discount: 300,
    credits: 0,
    totalAmount: 3700,
    currency: 'GHC',
  }

  console.log('Generating invoice PDF (template from Supabase or public/Template.pdf)...')
  const pdfBytes = await service.generateInvoiceToBuffer(sampleData)
  await fs.writeFile(outPath, pdfBytes)
  console.log(`Wrote ${pdfBytes.length} bytes to ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
