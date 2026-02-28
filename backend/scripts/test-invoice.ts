/**
 * Manual test script for PDF invoice generation.
 * Uses template from Supabase storage (templates/Template.pdf) if available,
 * otherwise local backend/public/Template.pdf.
 *
 * Run from backend directory:
 *   pnpm run test:invoice              # default: 6 products (single-page)
 *   pnpm run test:invoice -- 12         # 12 products (multi-page)
 *   ITEMS=20 pnpm run test:invoice      # 20 products via env
 *
 * Or: pnpm exec ts-node -r dotenv/config scripts/test-invoice.ts 8
 */

import path from 'path'
import fs from 'fs/promises'
import { PDFInvoiceService } from '../src/services/pdf-invoice.service'
import type { InvoiceData } from '../src/services/pdf-invoice.service'

function getItemCount(): number {
  const raw = process.argv[2]
  if (raw != null) {
    const arg = raw.replace(/^--+/, '') // allow --12 or ---5
    const n = parseInt(arg, 10)
    if (!Number.isNaN(n) && n >= 1) return n
  }
  const fromEnv = process.env.ITEMS
  if (fromEnv != null) {
    const n = parseInt(fromEnv, 10)
    if (!Number.isNaN(n) && n >= 1) return n
  }
  return 6
}

async function main() {
  const itemCount = getItemCount()
  const outDir = path.join(process.cwd(), 'output')
  await fs.mkdir(outDir, { recursive: true })
  const outPath = path.join(outDir, `invoice-test-${itemCount}-items.pdf`)

  const service = new PDFInvoiceService()

  const itemTotal = 650
  const items = Array.from({ length: itemCount }, (_, i) => ({
    description:
      'Authentic Royal Naturally Aged Indian White Basmati Rice, Long-Grain, Gluten-free - 5kg. Bag.',
    quantity: 5,
    unitPrice: 130,
    total: itemTotal,
  }))
  const subtotal = itemCount * itemTotal
  const discount = 300
  const credits = 0
  const totalAmount = subtotal - discount

  const sampleData: InvoiceData = {
    invoiceNumber: service.generateInvoiceNumber(),
    orderNumber: service.generateOrderId(),
    date: new Date(),
    customerName: 'William Duncan Bills',
    customerAddress: 'Adjuma Crescent Road, North Industrial Area, Accra, Ghana',
    customerPhone: '00233265713324',
    customerEmail: 'customer@example.com',
    items,
    subtotal,
    discount,
    credits,
    totalAmount,
    currency: 'GHC',
  }

  console.log(`Generating invoice PDF with ${itemCount} product(s)...`)
  const pdfBytes = await service.generateInvoiceToBuffer(sampleData)
  await fs.writeFile(outPath, pdfBytes)
  console.log(`Wrote ${pdfBytes.length} bytes to ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
