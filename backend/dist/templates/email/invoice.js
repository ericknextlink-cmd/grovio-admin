"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceHtml = invoiceHtml;
exports.invoiceText = invoiceText;
const shared_1 = require("./shared");
function invoiceHtml(params) {
    const { displayName, orderNumber, invoicePdfUrl } = params;
    const content = `
    <h2 style="${shared_1.h2Style}">Thank you for your order</h2>
    <p style="${shared_1.pStyle}">Hi ${displayName},</p>
    <p style="${shared_1.pStyle}">Your payment was successful. Please find your invoice for order <strong>${orderNumber}</strong> below.</p>
    <div style="text-align: center; margin: 35px 0;">
      <a href="${invoicePdfUrl}" style="${shared_1.primaryButtonStyle}">Download invoice (PDF)</a>
    </div>
    <div style="${shared_1.boxStyle}">
      <p style="color: #64748b; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">Invoice link:</p>
      <p style="color: #1e3a8a; font-size: 12px; word-break: break-all; margin: 0;">${invoicePdfUrl}</p>
    </div>
    <p style="color: #64748b; font-size: 14px; margin: 30px 0 0 0;">Grovio – Redefining the Way You Save.</p>
  `;
    return (0, shared_1.emailLayout)({
        title: `Your Grovio invoice – Order ${orderNumber}`,
        headerTitle: 'Your Invoice',
        content,
        footerTagline: 'The Grovio Team',
    });
}
function invoiceText(params) {
    const { displayName, orderNumber, invoicePdfUrl } = params;
    return `Thank you for your order

Hi ${displayName},

Your payment was successful. Download your invoice for order ${orderNumber} here:

${invoicePdfUrl}

Grovio – Redefining the Way You Save.`.trim();
}
