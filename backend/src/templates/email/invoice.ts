import { emailLayout, h2Style, pStyle, primaryButtonStyle, boxStyle } from './shared'

export function invoiceHtml(params: { displayName: string; orderNumber: string; invoicePdfUrl: string }): string {
  const { displayName, orderNumber, invoicePdfUrl } = params
  const content = `
    <h2 style="${h2Style}">Thank you for your order</h2>
    <p style="${pStyle}">Hi ${displayName},</p>
    <p style="${pStyle}">Your payment was successful. Please find your invoice for order <strong>${orderNumber}</strong> below.</p>
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
    title: `Your Grovio invoice – Order ${orderNumber}`,
    headerTitle: 'Your Invoice',
    content,
    footerTagline: 'The Grovio Team',
  })
}

export function invoiceText(params: { displayName: string; orderNumber: string; invoicePdfUrl: string }): string {
  const { displayName, orderNumber, invoicePdfUrl } = params
  return `Thank you for your order

Hi ${displayName},

Your payment was successful. Download your invoice for order ${orderNumber} here:

${invoicePdfUrl}

Grovio – Redefining the Way You Save.`.trim()
}
