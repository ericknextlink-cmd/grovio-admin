/**
 * Generate sample discount voucher PNGs locally (same pipeline as GET /api/vouchers/:code/image).
 *
 * Templates:
 * - Supabase: bucket SUPABASE_STORAGE_BUCKET (default `invoices`), path `templates/<filename>`
 * - Local: `public/voucher-templates/<filename>`
 *
 * Allowed filenames: `VOUCHER_ART_TEMPLATE_FILENAMES` in `voucher-image.service.ts` (six PNGs).
 *
 * Fonts: `public/fonts/Amita/Amita-Bold.ttf` (amount), `public/fonts/Poppins/Poppins-Regular.ttf` (body), or `VOUCHER_AMOUNT_FONT_PATH` / `VOUCHER_BODY_FONT_PATH`.
 *
 * Run from backend directory:
 *   pnpm run test:voucher-images
 *   pnpm exec ts-node -r dotenv/config scripts/test-voucher-images.ts
 */

import path from 'path'
import fs from 'fs/promises'
import {
  formatVoucherOfferDescription,
  VoucherImageService,
  VOUCHER_ART_TEMPLATE_FILENAMES,
} from '../src/services/voucher-image.service'

async function main() {
  const outDir = path.join(process.cwd(), 'output')
  await fs.mkdir(outDir, { recursive: true })

  const service = new VoucherImageService()

  const sampleOptions = {
    code: 'TEST-GROV-99',
    upToText: 'UP TO',
    amountText: 'GHC 50 OFF',
    offerDescription: formatVoucherOfferDescription({
      discountType: 'fixed',
      discountValue: 50,
      validUntil: '2026-12-31',
      usageDisplay: 'one_time',
    }),
    websiteText: 'WWW.GROVIOGHANA.COM',
    textColor: '#ffffff',
  } as const

  let anyOk = false

  const regular = await service.generate('regular', sampleOptions)
  const regularPath = path.join(outDir, 'voucher-test-regular.png')
  if (regular) {
    await fs.writeFile(regularPath, regular)
    console.log(`Wrote ${regular.length} bytes → ${regularPath}`)
    anyOk = true
  } else {
    console.warn(
      'Regular voucher: no template. Add regular-organge.png to Supabase templates/ or public/voucher-templates/.'
    )
  }

  const nss = await service.generate('nss', sampleOptions)
  const nssPath = path.join(outDir, 'voucher-test-nss.png')
  if (nss) {
    await fs.writeFile(nssPath, nss)
    console.log(`Wrote ${nss.length} bytes → ${nssPath}`)
    anyOk = true
  } else {
    console.warn(
      'NSS voucher: no template. Add nss-orange.png to Supabase templates/ or public/voucher-templates/.'
    )
  }

  for (const name of VOUCHER_ART_TEMPLATE_FILENAMES) {
    const buf = await service.generateFromTemplateName(name, sampleOptions)
    const safe = name.replace(/\.png$/i, '').replace(/[^a-z0-9-]+/gi, '-')
    const out = path.join(outDir, `voucher-test-${safe}.png`)
    if (buf) {
      await fs.writeFile(out, buf)
      console.log(`Wrote ${buf.length} bytes → ${out}`)
      anyOk = true
    } else {
      console.warn(`Skipped (not found): ${name}`)
    }
  }

  if (!anyOk) {
    console.error(
      'No images generated. Check SUPABASE_SERVICE_ROLE + SUPABASE_STORAGE_BUCKET and templates/, or local public/voucher-templates/.'
    )
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
