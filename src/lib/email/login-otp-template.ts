export const getLoginOTPTemplate = (otp: string, baseURL: string = "http://localhost:3000") => {
  const logoURL = "https://nexbrix.com.au/logos/logo.png";
  const dashboardURL = `${baseURL}/dashboard`;
  const privacyURL = `${baseURL}/privacy-policy`;
  const termsURL = `${baseURL}/terms`;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e4e4e7; border-radius: 16px; background-color: #ffffff;">
      <!-- Logo Header -->
      <div style="margin-bottom: 24px; text-align: left;">
        <img src="${logoURL}" alt="NexBrix Logo" style="height: 32px; max-width: 150px; display: block; object-fit: contain;" />
      </div>

      <!-- Content -->
      <h2 style="font-size: 20px; font-weight: 700; color: #09090b; margin-top: 0; margin-bottom: 12px; tracking-tight: -0.02em;">OTP for Login</h2>
      <p style="color: #52525b; font-size: 14px; line-height: 1.5; margin-top: 0; margin-bottom: 24px;">
        Hello,<br/><br/>
        You are receiving this email because a request was made to log in to your NexBrix account. Please use the following One-Time Password (OTP) to securely complete your login:
      </p>

      <!-- OTP Display -->
      <div style="background-color: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <div style="font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace; font-size: 32px; font-weight: 700; color: #09090b; letter-spacing: 6px; line-height: 1;">
          ${otp}
        </div>
      </div>

      <!-- Notice -->
      <p style="color: #71717a; font-size: 12px; line-height: 1.6; margin-top: 0; margin-bottom: 32px;">
        This verification code is valid for <strong>10 minutes</strong>. If you did not request this login, you can safely ignore this email or contact support if you have security concerns.
      </p>

      <!-- Divider -->
      <div style="border-top: 1px solid #e4e4e7; margin-bottom: 20px;"></div>

      <!-- Footer -->
      <div style="text-align: center;">
        <p style="color: #a1a1aa; font-size: 11px; margin-top: 0; margin-bottom: 12px; font-weight: 500;">
          <a href="${dashboardURL}" style="color: #71717a; text-decoration: underline; margin-right: 12px;">Dashboard</a>
          <a href="${privacyURL}" style="color: #71717a; text-decoration: underline; margin-right: 12px;">Privacy Policy</a>
          <a href="${termsURL}" style="color: #71717a; text-decoration: underline;">Terms of Service</a>
        </p>
        <p style="color: #a1a1aa; font-size: 11px; line-height: 1.4; margin: 0;">
          © ${new Date().getFullYear()} NexBrix. All rights reserved.
        </p>
      </div>
    </div>
  `;
};
