/**
 * Generates discount voucher images by overlaying dynamic text onto template images.
 * Templates: SUPABASE_STORAGE_BUCKET/templates/ or public/voucher-templates/
 * Fonts: Amita-Bold (amount line), Poppins-Regular (all other text) — local public/fonts or env overrides.
 */
import sharp from 'sharp'
import bwipjs from 'bwip-js'
import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import { createAdminClient } from '../config/supabase'

export type VoucherImageType = 'regular' | 'nss'

export interface VoucherImageOptions {
  code?: string
  expiryText?: string
  upToText?: string
  amountText?: string
  offerDescription?: string
  websiteText?: string
  taglineText?: string
  termsText?: string
  textColor?: string
  /** Stub serial digits (beside barcode); warm tone on white. Default if omitted. */
  serialTextColor?: string
  upToFontSize?: number
  amountFontSize?: number
  codeFontSize?: number
  secondaryFontSize?: number
  websiteFontSize?: number
  positions?: {
    upTo?: { x: number; y: number }
    amount?: { x: number; y: number }
    code?: { x: number; y: number }
    expiry?: { x: number; y: number }
    discount?: { x: number; y: number }
    offerDescription?: { x: number; y: number }
    website?: { x: number; y: number }
    tagline?: { x: number; y: number }
    terms?: { x: number; y: number }
    barcode?: { x: number; y: number }
  }
}

const DEFAULT_TEXT_COLOR = '#ffffff'
/** Prior headline baseline (102 × 1.3); amount +40% and UP TO −10% from this. */
const PRIOR_AMOUNT_BASE = Math.round(102 * 1.3)
const DEFAULT_AMOUNT_FONT_SIZE = Math.round(PRIOR_AMOUNT_BASE * 1.4)
/** 10% smaller than prior UP TO sizing (PRIOR_AMOUNT_BASE × 0.9 × 0.9). */
const DEFAULT_UP_TO_FONT_SIZE = Math.round(PRIOR_AMOUNT_BASE * 0.9 * 0.9)
const DEFAULT_STUB_SERIAL_TEXT_COLOR = '#C2A550'
const DEFAULT_SERIAL_FONT_SIZE = Math.round(Math.round(24 * 1.4) * 1.1)
const DEFAULT_SECONDARY_FONT_SIZE = 36
const DEFAULT_WEBSITE_FONT_SIZE = Math.round(24 * 1.2)
const DEFAULT_WEBSITE_TEXT = 'WWW.GROVIOGHANA.COM'
const DEFAULT_TAGLINE_TEXT = 'Visit us for amazing grocery deals'
const DEFAULT_TERMS_TEXT = 'Terms and Conditions Apply'
const DEFAULT_UP_TO_TEXT = 'UP TO'

/** Orange / green panel: horizontal slice used to center text (fractions of width). */
const PANEL_LEFT_FRAC = 0.06
const PANEL_RIGHT_FRAC = 0.67

/** Stub Code128 bars (matches serial text tone). */
const BARCODE_BARP_COLOR = 'C2A550'
/** Stub width as fraction of canvas (green panel ends at PANEL_RIGHT_FRAC). */
const STUB_WIDTH_FRAC = 1 - PANEL_RIGHT_FRAC
/**
 * rotate R: `scale` → bar module size / overall barcode span; `height` → bar thickness (orthogonal).
 * bwip-js truncates scale/height to integers internally; fractional values are applied via Sharp after render.
 */
const BARCODE_STUB_PRESET = {
  leftFrac: 0.818 - STUB_WIDTH_FRAC * 0.05,
  topFrac: 0.062,
  scale: 5.9,
  height: 12,
} as const

/** Nudge serial code text left (fraction of canvas width); barcode position unchanged. */
const SERIAL_TEXT_SHIFT_LEFT_FRAC = 0.03

const SERIAL_STUB_PRESET = {
  leftFrac: 0.978 - STUB_WIDTH_FRAC * 0.3,
  topFrac: 0.5,
  lineHeightFrac: 0.026,
} as const

/**
 * Voucher background PNGs in `templates/` or `public/voucher-templates/` (exact names; `regular-organge` matches asset spelling).
 */
export const VOUCHER_ART_TEMPLATE_FILENAMES = [
  'regular-organge.png',
  'regular-green.png',
  'regular-blue.png',
  'nss-orange.png',
  'nss-green.png',
  'nss-blue.png',
] as const

type PathLike = { toPathData?: (n?: number) => string; toSVG?: (n?: number) => string; fill?: string }
type OpentypeFont = {
  getPath: (text: string, x: number, y: number, fontSize: number) => PathLike
  getAdvanceWidth: (text: string, fontSize: number) => number
}

export type VoucherUsageDisplay = 'recurring' | 'one_time'

export function formatVoucherOfferDescription(params: {
  discountType: string
  discountValue: number
  validUntil: Date | string | null | undefined
  usageDisplay: VoucherUsageDisplay
}): string {
  const amt = params.discountValue.toFixed(0)
  if (params.usageDisplay === 'one_time') {
    if (params.discountType === 'percentage') {
      return `Buy your groceries and get\na discount of up to ${params.discountValue}% off`
    }
    return `Buy your groceries and get\na discount of up GHC ${amt}`
  }

  const raw = params.validUntil
  const d = raw ? (typeof raw === 'string' ? new Date(raw) : raw) : null
  const valid = d && !Number.isNaN(d.getTime()) ? d : null
  const year = valid ? valid.getFullYear() : new Date().getFullYear()
  const dateWithoutYear = valid
    ? valid.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })
    : ''
  const line1 = 'Buy all items and get\ndiscount'
  if (params.discountType === 'percentage') {
    const line2 = dateWithoutYear
      ? `${params.discountValue}% until ${dateWithoutYear}`
      : `${params.discountValue}% off`
    return [line1, line2, String(year)].join('\n')
  }
  const line2 = dateWithoutYear ? `GHC ${amt} until ${dateWithoutYear}` : `GHC ${amt}`
  return [line1, line2, String(year)].join('\n')
}

function stripLegacyCediGlyphs(text: string): string {
  return text.replace(/GH\u20B5/g, 'GHC').replace(/\u20B5/g, '')
}

export class VoucherImageService {
  private amountFont: OpentypeFont | null = null
  private bodyFont: OpentypeFont | null = null
  private fontsReady = false
  private supabase = createAdminClient()
  private templatesBucket = process.env.SUPABASE_STORAGE_BUCKET || 'invoices'

  /** One default file per API imageType (no candidate loop). */
  private static readonly DEFAULT_TEMPLATE_BY_TYPE: Record<VoucherImageType, string> = {
    regular: 'regular-organge.png',
    nss: 'nss-orange.png',
  }
  private static readonly ALLOWED_TEMPLATE_FILES = new Set<string>(VOUCHER_ART_TEMPLATE_FILENAMES)

  private resolveAmountFontPath(): string | null {
    const env = process.env.VOUCHER_AMOUNT_FONT_PATH
    if (env && existsSync(env)) return env
    const fontsDir = path.join(process.cwd(), 'public', 'fonts')
    const bold = path.join(fontsDir, 'Amita', 'Amita-Bold.ttf')
    if (existsSync(bold)) return bold
    const legacy = path.join(fontsDir, 'amita.ttf')
    return existsSync(legacy) ? legacy : null
  }

  private resolveBodyFontPath(): string | null {
    const env = process.env.VOUCHER_BODY_FONT_PATH
    if (env && existsSync(env)) return env
    const fontsDir = path.join(process.cwd(), 'public', 'fonts')
    const candidates = [
      path.join(fontsDir, 'Poppins', 'Poppins-Regular.ttf'),
      path.join(fontsDir, 'Poppins-Regular.ttf'),
    ]
    for (const p of candidates) {
      if (existsSync(p)) return p
    }
    return null
  }

  private async ensureFonts(): Promise<void> {
    if (this.fontsReady) return
    try {
      const opentype = (await import('opentype.js')).default
      const amountPath = this.resolveAmountFontPath()
      const bodyPath = this.resolveBodyFontPath()
      this.amountFont = amountPath ? (opentype.loadSync(amountPath) as OpentypeFont) : null
      this.bodyFont = bodyPath ? (opentype.loadSync(bodyPath) as OpentypeFont) : null
    } catch {
      this.amountFont = null
      this.bodyFont = null
    }
    this.fontsReady = true
  }

  private pathFromGlyph(p: PathLike, fill: string): string {
    if (p.toPathData) {
      const d = p.toPathData(2)
      return d ? `<path d="${d}" fill="${fill}"/>` : ''
    }
    if (p.toSVG) return p.toSVG(2)
    return ''
  }

  private drawLine(
    font: OpentypeFont | null,
    text: string,
    x: number,
    y: number,
    fontSize: number,
    fill: string
  ): string {
    if (!font?.getPath || !text) return ''
    const p = font.getPath(text, x, y, fontSize) as PathLike
    return this.pathFromGlyph(p, fill)
  }

  /** Center-align: opentype paths use left baseline at x. */
  private drawCentered(
    font: OpentypeFont | null,
    text: string,
    centerX: number,
    y: number,
    fontSize: number,
    fill: string
  ): string {
    if (!font?.getAdvanceWidth || !text) return ''
    const w = font.getAdvanceWidth(text, fontSize)
    const x = centerX - w / 2
    return this.drawLine(font, text, x, y, fontSize, fill)
  }

  /**
   * Draw amount as spaced segments (avoids Amita ligature/overlap on digit pairs like “50”).
   */
  private drawCenteredSpacedWords(
    font: OpentypeFont | null,
    text: string,
    centerX: number,
    y: number,
    fontSize: number,
    fill: string
  ): string {
    if (!font?.getAdvanceWidth || !text) return ''
    const parts = text.split(/\s+/).filter(Boolean)
    if (parts.length === 0) return ''
    const spaceW = font.getAdvanceWidth(' ', fontSize)
    let totalW = 0
    const widths: number[] = []
    for (let i = 0; i < parts.length; i++) {
      const w = font.getAdvanceWidth(parts[i], fontSize)
      widths.push(w)
      totalW += w
      if (i < parts.length - 1) totalW += spaceW
    }
    let x = centerX - totalW / 2
    const chunks: string[] = []
    for (let i = 0; i < parts.length; i++) {
      const p = font.getPath(parts[i], x, y, fontSize) as PathLike
      chunks.push(this.pathFromGlyph(p, fill))
      x += widths[i] ?? 0
      if (i < parts.length - 1) x += spaceW
    }
    return chunks.join('\n')
  }

  private drawLeftAlignedSpacedWords(
    font: OpentypeFont | null,
    text: string,
    leftX: number,
    y: number,
    fontSize: number,
    fill: string
  ): string {
    if (!font?.getAdvanceWidth || !text) return ''
    const parts = text.split(/\s+/).filter(Boolean)
    if (parts.length === 0) return ''
    const spaceW = font.getAdvanceWidth(' ', fontSize)
    let x = leftX
    const chunks: string[] = []
    for (let i = 0; i < parts.length; i++) {
      const p = font.getPath(parts[i], x, y, fontSize) as PathLike
      chunks.push(this.pathFromGlyph(p, fill))
      x += font.getAdvanceWidth(parts[i], fontSize)
      if (i < parts.length - 1) x += spaceW
    }
    return chunks.join('\n')
  }

  private wrapLines(
    font: OpentypeFont | null,
    text: string,
    maxWidth: number,
    fontSize: number
  ): string[] {
    if (!text.trim()) return []
    if (!font?.getAdvanceWidth) return [text]
    const words = text.split(/\s+/).filter(Boolean)
    const lines: string[] = []
    let line = ''
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (font.getAdvanceWidth(test, fontSize) <= maxWidth) {
        line = test
      } else {
        if (line) lines.push(line)
        line = word
      }
    }
    if (line) lines.push(line)
    return lines.length ? lines : [text]
  }

  private wrapOfferParagraphs(
    font: OpentypeFont | null,
    text: string,
    maxWidth: number,
    fontSize: number
  ): string[] {
    const paragraphs = text.split(/\n/).map((p) => p.trim()).filter(Boolean)
    const out: string[] = []
    for (const para of paragraphs) {
      out.push(...this.wrapLines(font, para, maxWidth, fontSize))
    }
    return out.length ? out : []
  }

  private drawLeftAligned(
    font: OpentypeFont | null,
    text: string,
    leftX: number,
    y: number,
    fontSize: number,
    fill: string
  ): string {
    if (!font?.getPath || !text) return ''
    const p = font.getPath(text, leftX, y, fontSize) as PathLike
    return this.pathFromGlyph(p, fill)
  }

  /**
   * Stub serial: draw horizontally then rotate -90° (CCW) so digits read bottom-to-top along the stub.
   */
  private drawSerialHorizontalRotateCCW(
    font: OpentypeFont | null,
    raw: string,
    anchorX: number,
    anchorY: number,
    charSize: number,
    fill: string
  ): string {
    if (!font?.getAdvanceWidth || !font?.getPath || !raw.trim()) return ''
    const chars = raw.replace(/\s/g, '').split('')
    if (chars.length === 0) return ''
    let x = 0
    const paths: string[] = []
    for (const ch of chars) {
      const w = font.getAdvanceWidth(ch, charSize)
      const p = font.getPath(ch, x, 0, charSize) as PathLike
      paths.push(this.pathFromGlyph(p, fill))
      x += w
    }
    const totalW = x
    const inner = paths.join('\n    ')
    return `<g transform="translate(${anchorX} ${anchorY})">
    <g transform="rotate(-90)">
    <g transform="translate(${-totalW / 2} 0)">
    ${inner}
    </g>
    </g>
  </g>`
  }

  private async loadTemplateByNameFromStorage(templateName: string): Promise<Buffer | null> {
    const cleaned = templateName.replace(/^templates\//, '').trim()
    if (!cleaned || !VoucherImageService.ALLOWED_TEMPLATE_FILES.has(cleaned)) return null
    const { data, error } = await this.supabase.storage.from(this.templatesBucket).download(`templates/${cleaned}`)
    if (error || !data) return null
    return Buffer.from(await data.arrayBuffer())
  }

  private getTemplatePathByName(templateName: string): string | null {
    const cleaned = templateName.replace(/^templates\//, '').trim()
    if (!cleaned || !VoucherImageService.ALLOWED_TEMPLATE_FILES.has(cleaned)) return null
    const inVoucherFolder = path.join(process.cwd(), 'public', 'voucher-templates', cleaned)
    return existsSync(inVoucherFolder) ? inVoucherFolder : null
  }

  /**
   * Resolve template buffer and filename for imageType (single fixed name per type).
   */
  private async resolveTemplate(
    imageType: VoucherImageType
  ): Promise<{ buffer: Buffer; filename: string } | null> {
    const filename = VoucherImageService.DEFAULT_TEMPLATE_BY_TYPE[imageType]
    const storagePath = `templates/${filename}`
    const { data, error } = await this.supabase.storage.from(this.templatesBucket).download(storagePath)
    if (!error && data) {
      return { buffer: Buffer.from(await data.arrayBuffer()), filename }
    }
    const localPath = path.join(process.cwd(), 'public', 'voucher-templates', filename)
    if (existsSync(localPath)) {
      const buffer = await fs.readFile(localPath)
      return { buffer, filename }
    }
    return null
  }

  private async buildTextOverlaySvg(
    width: number,
    height: number,
    options: VoucherImageOptions,
    _templateFilename: string,
    layoutOverrides?: { serialCenterX?: number }
  ): Promise<string> {
    await this.ensureFonts()
    const bodyFont = this.bodyFont
    const amountFont = this.amountFont
    const fill = options.textColor ?? DEFAULT_TEXT_COLOR
    const serialFill = options.serialTextColor ?? DEFAULT_STUB_SERIAL_TEXT_COLOR

    const amountSize = options.amountFontSize ?? DEFAULT_AMOUNT_FONT_SIZE
    const upToSize = options.upToFontSize ?? DEFAULT_UP_TO_FONT_SIZE
    const secSize = options.secondaryFontSize ?? DEFAULT_SECONDARY_FONT_SIZE
    const offerBodySize = secSize * 1.1 * 1.2
    const websiteSize = options.websiteFontSize ?? DEFAULT_WEBSITE_FONT_SIZE
    const serialSize = options.codeFontSize ?? DEFAULT_SERIAL_FONT_SIZE

    const upToText = (options.upToText ?? DEFAULT_UP_TO_TEXT).trim()
    const amountText = stripLegacyCediGlyphs((options.amountText ?? '').trim())
    const websiteTextRaw = (options.websiteText ?? DEFAULT_WEBSITE_TEXT).trim()
    const websiteText = websiteTextRaw.toLowerCase()
    const taglineText = (options.taglineText ?? DEFAULT_TAGLINE_TEXT).trim()
    const termsText = (options.termsText ?? DEFAULT_TERMS_TEXT).trim()

    const contentLeft = width * PANEL_LEFT_FRAC
    const contentRight = width * PANEL_RIGHT_FRAC
    const maxTextWidth = contentRight - contentLeft - 48
    const textInset = 20
    const PANEL_TEXT_NUDGE_LEFT_FRAC = 0.05
    const textLeft = contentLeft + textInset - Math.round(width * PANEL_TEXT_NUDGE_LEFT_FRAC)

    const fallbackText = (x: number, y: number, fontSize: number, text: string) =>
      `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${fill}" font-family="Arial, sans-serif" text-anchor="middle">${escapeXml(text)}</text>`
    const fallbackTextLeft = (x: number, y: number, fontSize: number, text: string) =>
      `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${fill}" font-family="Arial, sans-serif" text-anchor="start">${escapeXml(text)}</text>`

    const lines: string[] = []

    let y = height * 0.32
    if (upToText) {
      const svg =
        this.drawLeftAligned(bodyFont, upToText, textLeft, y, upToSize, fill) ||
        fallbackTextLeft(textLeft, y, upToSize, upToText)
      lines.push(svg)
    }
    y += upToSize * 1.05 * 1.05 * 1.4

    if (amountText) {
      const svg =
        this.drawLeftAlignedSpacedWords(amountFont, amountText, textLeft, y, amountSize, fill) ||
        this.drawLeftAligned(amountFont, amountText, textLeft, y, amountSize, fill) ||
        fallbackTextLeft(textLeft, y, amountSize, amountText)
      lines.push(svg)
    }
    y += amountSize * 0.98

    if (options.offerDescription?.trim()) {
      const rawOffer = stripLegacyCediGlyphs(options.offerDescription.trim())
      const wrapped = this.wrapOfferParagraphs(bodyFont, rawOffer, maxTextWidth - textInset, offerBodySize)
      const lineGap = offerBodySize * 1.25
      for (const line of wrapped) {
        const svg =
          this.drawLeftAligned(bodyFont, line, textLeft, y, offerBodySize, fill) ||
          fallbackTextLeft(textLeft, y, offerBodySize, line)
        lines.push(svg)
        y += lineGap
      }
    }

    if (options.expiryText?.trim()) {
      y += secSize * 0.2
      const svg =
        this.drawLeftAligned(bodyFont, options.expiryText.trim(), textLeft, y, secSize, fill) ||
        fallbackTextLeft(textLeft, y, secSize, options.expiryText.trim())
      lines.push(svg)
      y += secSize * 1.2
    }

    const footerY = height * 0.87
    const taglineFontSize = websiteSize * 1.35
    const websiteLineFontSize = (websiteSize + 4) * 1.35
    const termsFontSize = websiteSize * 0.85 * 1.4
    const footerTextBlockHeight =
      taglineFontSize * 2.45 + websiteLineFontSize * 1.3 + termsFontSize * 1.15
    const taglineY = footerY - height * 0.022 - footerTextBlockHeight * 0.3
    const websiteY = taglineY + taglineFontSize * 1.45
    const termsY = websiteY + websiteLineFontSize * 1.3 + height * 0.018
    if (taglineText) {
      lines.push(
        this.drawLeftAligned(bodyFont, taglineText, textLeft, taglineY, taglineFontSize, fill) ||
          fallbackTextLeft(textLeft, taglineY, taglineFontSize, taglineText)
      )
    }
    if (websiteText) {
      lines.push(
        this.drawLeftAligned(bodyFont, websiteText, textLeft, websiteY, websiteLineFontSize, fill) ||
          fallbackTextLeft(textLeft, websiteY, websiteLineFontSize, websiteText)
      )
    }
    if (termsText) {
      lines.push(
        this.drawLeftAligned(bodyFont, termsText, textLeft, termsY, termsFontSize, fill) ||
          fallbackTextLeft(textLeft, termsY, termsFontSize, termsText)
      )
    }

    const codeRaw = (options.code ?? '').trim()
    if (codeRaw) {
      const serialCenterX =
        (layoutOverrides?.serialCenterX ?? width * SERIAL_STUB_PRESET.leftFrac) -
        Math.round(width * SERIAL_TEXT_SHIFT_LEFT_FRAC)
      const serialAnchorY = height * SERIAL_STUB_PRESET.topFrac
      lines.push(
        this.drawSerialHorizontalRotateCCW(
          bodyFont,
          codeRaw,
          serialCenterX,
          serialAnchorY,
          serialSize,
          serialFill
        )
      )
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  ${lines.join('\n  ')}
</svg>`
  }

  private async loadTemplateBufferByName(templateName: string): Promise<Buffer | null> {
    const fromStorage = await this.loadTemplateByNameFromStorage(templateName)
    if (fromStorage && fromStorage.length > 0) return fromStorage
    const filePath = this.getTemplatePathByName(templateName)
    if (filePath) return fs.readFile(filePath)
    return null
  }

  private getBarcodePixels(width: number, height: number) {
    return {
      left: Math.round(width * BARCODE_STUB_PRESET.leftFrac),
      top: Math.round(height * BARCODE_STUB_PRESET.topFrac),
      scale: BARCODE_STUB_PRESET.scale,
      barHeight: BARCODE_STUB_PRESET.height,
    }
  }

  /**
   * Vertical Code128 (rotate R), then 180°. bwip-js forces integer scale/height (`sx|0` in drawing-builtin);
   * we pass floor values then Sharp-resize by (desired/int) so decimals like 5.5 work.
   */
  private async renderVerticalBarcodeBuffer(
    text: string,
    scale: number,
    barHeight: number
  ): Promise<Buffer> {
    const scaleInt = Math.max(1, Math.floor(scale))
    const heightInt = Math.max(1, Math.floor(barHeight))
    const scaleFine = scale > 0 ? scale / scaleInt : 1
    const heightFine = barHeight > 0 ? barHeight / heightInt : 1

    const raw = await bwipjs.toBuffer({
      bcid: 'code128',
      text,
      scale: scaleInt,
      height: heightInt,
      includetext: false,
      rotate: 'R',
      barcolor: BARCODE_BARP_COLOR,
      backgroundcolor: 'FFFFFF',
    })

    let pipeline = sharp(raw).rotate(180)
    if (scaleFine !== 1 || heightFine !== 1) {
      const m = await pipeline.metadata()
      const w = m.width ?? 0
      const h = m.height ?? 0
      if (w > 0 && h > 0) {
        const nw = Math.max(1, Math.round(w * scaleFine))
        const nh = Math.max(1, Math.round(h * heightFine))
        pipeline = pipeline.resize({ width: nw, height: nh, fit: 'fill' })
      }
    }
    return pipeline.png().toBuffer()
  }

  /**
   * Sharp requires composite layers to fit inside the base image; large bwip outputs are scaled down.
   */
  private async fitBarcodeOverlayToCanvas(
    barcodeBuf: Buffer,
    left: number,
    top: number,
    canvasW: number,
    canvasH: number
  ): Promise<{ buf: Buffer; width: number; height: number }> {
    const meta = await sharp(barcodeBuf).metadata()
    let bw = meta.width ?? 0
    let bh = meta.height ?? 0
    const maxW = Math.max(1, canvasW - Math.max(0, left))
    const maxH = Math.max(1, canvasH - Math.max(0, top))
    if (bw <= maxW && bh <= maxH) {
      return { buf: barcodeBuf, width: bw, height: bh }
    }
    const resized = await sharp(barcodeBuf)
      .resize({
        width: maxW,
        height: maxH,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png()
      .toBuffer()
    const m2 = await sharp(resized).metadata()
    return {
      buf: resized,
      width: m2.width ?? bw,
      height: m2.height ?? bh,
    }
  }

  private async compose(
    templateBuffer: Buffer,
    options: VoucherImageOptions,
    templateFilename: string
  ): Promise<Buffer> {
    const image = sharp(templateBuffer)
    const meta = await image.metadata()
    const width = meta.width ?? 600
    const height = meta.height ?? 400

    const barcodeValue = (options.code ?? '').trim()
    const barcodePx = options.positions?.barcode
      ? {
          left: options.positions.barcode.x,
          top: options.positions.barcode.y,
          scale: BARCODE_STUB_PRESET.scale,
          barHeight: BARCODE_STUB_PRESET.height,
        }
      : this.getBarcodePixels(width, height)

    let serialCenterXOverride: number | undefined
    const composites: Array<{ input: Buffer; top: number; left: number }> = []

    if (barcodeValue) {
      let barcodeBuf = await this.renderVerticalBarcodeBuffer(
        barcodeValue,
        barcodePx.scale,
        barcodePx.barHeight
      )
      const fitted = await this.fitBarcodeOverlayToCanvas(
        barcodeBuf,
        barcodePx.left,
        barcodePx.top,
        width,
        height
      )
      barcodeBuf = fitted.buf
      const bw = fitted.width
      if (bw > 0) {
        const gapPx = 14
        const serialNudgeRight = Math.round(width * 0.041)
        serialCenterXOverride =
          barcodePx.left +
          bw +
          gapPx +
          (options.codeFontSize ?? DEFAULT_SERIAL_FONT_SIZE) * 0.35 +
          serialNudgeRight
      }
      composites.push({ input: barcodeBuf, top: barcodePx.top, left: barcodePx.left })
    }

    const svg = await this.buildTextOverlaySvg(width, height, options, templateFilename, {
      serialCenterX: serialCenterXOverride,
    })
    const svgBuffer = Buffer.from(svg)

    composites.push({ input: svgBuffer, top: 0, left: 0 })

    return image.composite(composites).png().toBuffer()
  }

  async generate(imageType: VoucherImageType, options: VoucherImageOptions): Promise<Buffer | null> {
    const resolved = await this.resolveTemplate(imageType)
    if (!resolved) return null
    return this.compose(resolved.buffer, options, resolved.filename)
  }

  async generateFromTemplateName(
    templateName: string,
    options: VoucherImageOptions
  ): Promise<Buffer | null> {
    const cleaned = templateName.replace(/^templates\//, '').trim()
    if (!cleaned || !VoucherImageService.ALLOWED_TEMPLATE_FILES.has(cleaned)) return null
    const fromStorage = await this.loadTemplateByNameFromStorage(cleaned)
    if (fromStorage && fromStorage.length > 0) {
      return this.compose(fromStorage, options, cleaned)
    }
    const filePath = this.getTemplatePathByName(cleaned)
    if (!filePath) return null
    const buf = await fs.readFile(filePath)
    return this.compose(buf, options, cleaned)
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
