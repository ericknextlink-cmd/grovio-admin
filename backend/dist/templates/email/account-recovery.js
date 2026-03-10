"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountRecoveryHtml = accountRecoveryHtml;
exports.accountRecoveryText = accountRecoveryText;
const shared_1 = require("./shared");
function accountRecoveryHtml(params) {
    const { recoveryUrl, recoveryToken } = params;
    const content = `
    <h2 style="${shared_1.h2Style}">Account Recovery Request</h2>
    <p style="${shared_1.pStyle}">Hello,</p>
    <p style="${shared_1.pStyle}">We received a request to recover your Grovio account. If you didn't make this request, you can safely ignore this email.</p>
    <p style="${shared_1.pStyle}">To recover your account, click the button below or copy the link into your browser:</p>
    <div style="text-align: center; margin: 35px 0;">
      <a href="${recoveryUrl}" style="${shared_1.primaryButtonStyle}">Recover Account</a>
    </div>
    <div style="${shared_1.boxStyle}">
      <p style="${shared_1.smallStyle} margin: 0 0 10px 0; font-weight: 600;">Recovery link:</p>
      <p style="color: #1e3a8a; font-size: 12px; word-break: break-all; margin: 0;">${recoveryUrl}</p>
      <p style="${shared_1.smallStyle} margin: 15px 0 0 0;">Recovery token: ${recoveryToken}</p>
    </div>
    <p style="${shared_1.pStyle} margin: 30px 0 0 0;">This link expires in 24 hours. If you didn't request this, you can safely ignore this email.</p>
  `;
    return (0, shared_1.emailLayout)({
        title: 'Account Recovery - Grovio',
        headerTitle: 'Account Recovery',
        content,
        footerTagline: 'The Grovio Team',
    });
}
function accountRecoveryText(params) {
    const { recoveryUrl, recoveryToken } = params;
    const year = new Date().getFullYear();
    return `Account Recovery Request

Hello,

We received a request to recover your Grovio account. If you didn't make this request, you can safely ignore this email.

To recover your account, please visit:
${recoveryUrl}

Recovery Token: ${recoveryToken}

This link expires in 24 hours.

© ${year} Grovio. All rights reserved.`.trim();
}
