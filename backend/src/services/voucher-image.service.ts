/**
 * Generates discount voucher images by overlaying dynamic text onto template images.
 * In Supabase: all templates (voucher writable templates, regular voucher images, invoice templates)
 * live in the same bucket under templates/ — no subfolders. Paths: templates/Voucher Orange template.png, etc.
 * Font: Amita from public/fonts/amita.ttf (or VOUCHER_FONT_PATH).
 */
import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import { createAdminClient } from '../config/supabase'

export type VoucherImageType = 'regular' | 'nss'

export interface VoucherImageOptions {
  /** Voucher code (for checkout); drawn on voucher if provided */
  code?: string
  /** Recipient name (optional) */
  userName?: string
  /** Expiry line e.g. "until November 12, 2025" */
  expiryText?: string
  /** Main discount line e.g. "GHC 100 OFF" (large, prominent) */
  discountText?: string
  /** Offer description e.g. "Buy all items and get discount GHC 100 until November 12, 2025" */
  offerDescription?: string
  /** Fill color for text (hex or CSS color). Default #1a1a1a; use light color on orange/green backgrounds */
  textColor?: string
  /** Font size for main discount line. Default 44 */
  discountFontSize?: number
  /** Font size for code. Default 24 */
  codeFontSize?: number
  /** Font size for offer description and expiry. Default 16 */
  secondaryFontSize?: number
  /** Pixel positions; omit to use Figma-aligned defaults */
  positions?: {
    code?: { x: number; y: number }
    name?: { x: number; y: number }
    expiry?: { x: number; y: number }
    discount?: { x: number; y: number }
    offerDescription?: { x: number; y: number }
  }
}

const DEFAULT_TEXT_COLOR = '#1a1a1a'
const DEFAULT_DISCOUNT_FONT_SIZE = 44
const DEFAULT_CODE_FONT_SIZE = 24
const DEFAULT_SECONDARY_FONT_SIZE = 16

/** Positions aligned with Figma: GROVIO top-left, then large GHC OFF, then offer line, then expiry/code */
const DEFAULT_POSITIONS = {
  discount: { x: 40, y: 100 },
  offerDescription: { x: 40, y: 155 },
  expiry: { x: 40, y: 195 },
  code: { x: 40, y: 235 },
  name: { x: 40, y: 260 },
}

export class VoucherImageService {
  private font: unknown = null
  private fontLoaded = false
  private supabase = createAdminClient()
  private templatesBucket = process.env.SUPABASE_STORAGE_BUCKET || 'invoices'

  /** Preferred template filenames in SUPABASE_STORAGE_BUCKET/templates/ (same bucket as invoice templates). */
  private static readonly DEFAULT_TEMPLATE_FILES: Record<VoucherImageType, string[]> = {
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
  }

  private normalizeFilename(value: string): string {
    return value
      .toLowerCase()
      .replace(/\.(png|jpg|jpeg|webp)$/i, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  }

  /** Load from Supabase: bucket (SUPABASE_STORAGE_BUCKET), path templates/<filename> (no subfolders). */
  private async loadTemplateFromStorage(imageType: VoucherImageType): Promise<Buffer | null> {
    const candidates = VoucherImageService.DEFAULT_TEMPLATE_FILES[imageType]

    // 1) Try known candidate names first.
    for (const filename of candidates) {
      const storagePath = `templates/${filename}`
      const { data, error } = await this.supabase.storage
        .from(this.templatesBucket)
        .download(storagePath)
      if (!error && data) {
        return Buffer.from(await data.arrayBuffer())
      }
    }

    // 2) Fallback: list templates/ and fuzzy match by keywords.
    const { data: listed, error: listErr } = await this.supabase.storage
      .from(this.templatesBucket)
      .list('templates', { limit: 200 })
    if (listErr || !listed || listed.length === 0) return null

    const allowedExt = /\.(png|jpg|jpeg|webp)$/i
    const files = listed
      .map((f) => f.name)
      .filter((name) => allowedExt.test(name))

    const pick = files.find((name) => {
      const n = this.normalizeFilename(name)
      if (imageType === 'regular') {
        return n.includes('voucher') && n.includes('orange')
      }
      return n.includes('voucher') && (n.includes('blue') || n.includes('nss'))
    })

    if (!pick) return null

    const { data, error } = await this.supabase.storage
      .from(this.templatesBucket)
      .download(`templates/${pick}`)
    if (error || !data) return null
    return Buffer.from(await data.arrayBuffer())
  }

  /** Load exact template filename from Supabase templates/ */
  private async loadTemplateByNameFromStorage(templateName: string): Promise<Buffer | null> {
    const cleaned = templateName.replace(/^templates\//, '').trim()
    if (!cleaned) return null
    const { data, error } = await this.supabase.storage
      .from(this.templatesBucket)
      .download(`templates/${cleaned}`)
    if (error || !data) return null
    return Buffer.from(await data.arrayBuffer())
  }

  private getTemplatePath(imageType: VoucherImageType): string | null {
    const envPath =
      imageType === 'nss'
        ? process.env.VOUCHER_TEMPLATE_NSS_PATH
        : process.env.VOUCHER_TEMPLATE_REGULAR_PATH
    if (envPath && existsSync(envPath)) return envPath
    const filenames = VoucherImageService.DEFAULT_TEMPLATE_FILES[imageType]
    for (const filename of filenames) {
      const inVoucherFolder = path.join(process.cwd(), 'public', 'voucher-templates', filename)
      if (existsSync(inVoucherFolder)) return inVoucherFolder
      const inPublic = path.join(process.cwd(), 'public', filename)
      if (existsSync(inPublic)) return inPublic
    }
    return null
  }

  private getTemplatePathByName(templateName: string): string | null {
    const cleaned = templateName.replace(/^templates\//, '').trim()
    if (!cleaned) return null
    const inVoucherFolder = path.join(process.cwd(), 'public', 'voucher-templates', cleaned)
    if (existsSync(inVoucherFolder)) return inVoucherFolder
    const inPublic = path.join(process.cwd(), 'public', cleaned)
    return existsSync(inPublic) ? inPublic : null
  }

  private getFontPath(): string | null {
    const envPath = process.env.VOUCHER_FONT_PATH
    if (envPath && existsSync(envPath)) return envPath
    const fontsDir = path.join(process.cwd(), 'public', 'fonts')
    const amita = path.join(fontsDir, 'amita.ttf')
    if (existsSync(amita)) return amita
    const voucherFont = path.join(fontsDir, 'voucher-font.ttf')
    return existsSync(voucherFont) ? voucherFont : null
  }

  /** Load font once (optional). Uses opentype.js if available and VOUCHER_FONT_PATH is set. */
  private async loadFont(): Promise<void> {
    if (this.fontLoaded) return
    const fontPath = this.getFontPath()
    if (!fontPath) {
      this.fontLoaded = true
      return
    }
    try {
      const opentype = await import('opentype.js')
      this.font = opentype.default.loadSync(fontPath)
    } catch {
      this.font = null
    }
    this.fontLoaded = true
  }

  /**
   * Build an SVG string that contains text as paths (Amita font via opentype) or fallback text.
   * Layout matches Figma: large discount (GHC X OFF), then offer line, then expiry/code.
   */
  private async buildTextOverlaySvg(
    width: number,
    height: number,
    options: VoucherImageOptions
  ): Promise<string> {
    const pos = {
      code: options.positions?.code ?? DEFAULT_POSITIONS.code,
      name: options.positions?.name ?? DEFAULT_POSITIONS.name,
      expiry: options.positions?.expiry ?? DEFAULT_POSITIONS.expiry,
      discount: options.positions?.discount ?? DEFAULT_POSITIONS.discount,
      offerDescription: options.positions?.offerDescription ?? DEFAULT_POSITIONS.offerDescription,
    }
    const discountSize = options.discountFontSize ?? DEFAULT_DISCOUNT_FONT_SIZE
    const codeSize = options.codeFontSize ?? DEFAULT_CODE_FONT_SIZE
    const secSize = options.secondaryFontSize ?? DEFAULT_SECONDARY_FONT_SIZE
    const fill = options.textColor ?? DEFAULT_TEXT_COLOR

    await this.loadFont()
    type PathLike = { toPathData?: (n?: number) => string; toSVG?: (n?: number) => string; fill?: string }
    const font = this.font as { getPath: (text: string, x: number, y: number, fontSize: number) => PathLike } | null

    const drawText = (text: string, x: number, y: number, fontSize: number): string => {
      if (!font?.getPath) return ''
      const p = font.getPath(text, x, y, fontSize) as PathLike
      if (p.fill !== undefined) p.fill = fill
      if (p.toPathData) {
        const d = p.toPathData(2)
        return d ? `<path d="${d}" fill="${fill}"/>` : ''
      }
      if (p.toSVG) return p.toSVG(2)
      return ''
    }

    const fallbackText = (x: number, y: number, fontSize: number, text: string) =>
      `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${fill}" font-family="Arial, sans-serif">${escapeXml(text)}</text>`

    const lines: string[] = []
    if (options.discountText) {
      const svgLine = drawText(options.discountText, pos.discount.x, pos.discount.y, discountSize)
      lines.push(svgLine || fallbackText(pos.discount.x, pos.discount.y, discountSize, options.discountText))
    }
    if (options.offerDescription) {
      const svgLine = drawText(options.offerDescription, pos.offerDescription.x, pos.offerDescription.y, secSize)
      lines.push(svgLine || fallbackText(pos.offerDescription.x, pos.offerDescription.y, secSize, options.offerDescription))
    }
    if (options.expiryText) {
      const svgLine = drawText(options.expiryText, pos.expiry.x, pos.expiry.y, secSize)
      lines.push(svgLine || fallbackText(pos.expiry.x, pos.expiry.y, secSize, options.expiryText))
    }
    if (options.code) {
      const svgLine = drawText(options.code, pos.code.x, pos.code.y, codeSize)
      lines.push(svgLine || fallbackText(pos.code.x, pos.code.y, codeSize, options.code))
    }
    if (options.userName) {
      const svgLine = drawText(options.userName, pos.name.x, pos.name.y, secSize)
      lines.push(svgLine || fallbackText(pos.name.x, pos.name.y, secSize, options.userName))
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  ${lines.join('\n  ')}
</svg>`
  }

  /**
   * Load template: 1) Supabase Storage (SUPABASE_STORAGE_BUCKET/templates/), 2) local public paths.
   */
  private async loadTemplateBuffer(imageType: VoucherImageType): Promise<Buffer | null> {
    const fromStorage = await this.loadTemplateFromStorage(imageType)
    if (fromStorage && fromStorage.length > 0) return fromStorage
    const filePath = this.getTemplatePath(imageType)
    if (filePath) return fs.readFile(filePath)
    return null
  }

  private async loadTemplateBufferByName(templateName: string): Promise<Buffer | null> {
    const fromStorage = await this.loadTemplateByNameFromStorage(templateName)
    if (fromStorage && fromStorage.length > 0) return fromStorage
    const filePath = this.getTemplatePathByName(templateName)
    if (filePath) return fs.readFile(filePath)
    return null
  }

  private async compose(templateBuffer: Buffer, options: VoucherImageOptions): Promise<Buffer> {
    const image = sharp(templateBuffer)
    const meta = await image.metadata()
    const width = meta.width ?? 600
    const height = meta.height ?? 400

    const svg = await this.buildTextOverlaySvg(width, height, options)
    const svgBuffer = Buffer.from(svg)

    return image
      .composite([{ input: svgBuffer, top: 0, left: 0 }])
      .png()
      .toBuffer()
  }

  /**
   * Generate a voucher image with dynamic text overlaid.
   * Returns PNG buffer or null if no template is configured.
   */
  async generate(
    imageType: VoucherImageType,
    options: VoucherImageOptions
  ): Promise<Buffer | null> {
    const templateBuffer = await this.loadTemplateBuffer(imageType)
    if (!templateBuffer) return null
    return this.compose(templateBuffer, options)
  }

  /** Generate using exact template filename from templates/ directory. */
  async generateFromTemplateName(
    templateName: string,
    options: VoucherImageOptions
  ): Promise<Buffer | null> {
    const templateBuffer = await this.loadTemplateBufferByName(templateName)
    if (!templateBuffer) return null
    return this.compose(templateBuffer, options)
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
