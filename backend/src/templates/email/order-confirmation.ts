import { emailLayout, h2Style, pStyle, primaryButtonStyle, boxStyle } from './shared'

export function orderConfirmationHtml(params: {
  displayName: string
  orderNumber: string
  invoicePdfUrl: string
  deliveryCode?: string
}): string {
  const { displayName, orderNumber, invoicePdfUrl, deliveryCode } = params
  const deliveryBlock = deliveryCode
    ? `<div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #D35F0E;">
      <p style="color: #1e3a8a; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">Delivery code (give to rider to confirm delivery):</p>
      <p style="color: #64748b; font-size: 20px; letter-spacing: 0.15em; margin: 0; font-weight: 600;">${deliveryCode}</p>
    </div>`
    : ''
  const content = `
    <h2 style="${h2Style}">Order confirmed</h2>
    <p style="${pStyle}">Hi ${displayName},</p>
    <p style="${pStyle}">Your payment was successful and your order <strong>${orderNumber}</strong> is confirmed.</p>
    ${deliveryBlock}
    <p style="${pStyle}">Download your invoice below:</p>
    <div style="text-align: center; margin: 35px 0;">
      <a href="${invoicePdfUrl}" style="${primaryButtonStyle}">Download invoice (PDF)</a>
    </div>
    <div style="${boxStyle}">
      <p style="color: #64748b; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">Invoice link:</p>
      <p style="color: #1e3a8a; font-size: 12px; word-break: break-all; margin: 0;">${invoicePdfUrl}</p>
    </div>
    <p style="color: #64748b; font-size: 14px; margin: 30px 0 0 0;">Grovio – Redefining the Way You Save.</p>
  `
  return emailLayout({
    title: `Order confirmed – ${orderNumber}`,
    headerTitle: 'Order confirmed',
    content,
    footerTagline: 'The Grovio Team',
  })
}

export function orderConfirmationText(params: {
  displayName: string
  orderNumber: string
  invoicePdfUrl: string
  deliveryCode?: string
}): string {
  const { displayName, orderNumber, invoicePdfUrl, deliveryCode } = params
  const textDelivery = deliveryCode ? `\nDelivery code (give to rider): ${deliveryCode}\n` : ''
  return `Order confirmed

Hi ${displayName},

Your order ${orderNumber} is confirmed.${textDelivery}
Download invoice: ${invoicePdfUrl}

Grovio – Redefining the Way You Save.`.trim()
}
