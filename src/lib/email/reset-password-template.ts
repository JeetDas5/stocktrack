export const getResetPasswordTemplate = (name: string, url: string) => {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="font-size: 24px; font-weight: bold; color: #000; margin-bottom: 16px;">NexBrix</h2>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
        Hello ${name || "there"},<br/><br/>
        We received a request to reset the password for your account. Click the button below to choose a new password:
      </p>
      <div style="margin-bottom: 24px;">
        <a href="${url}" style="display: inline-block; background-color: #000; color: #fff; text-decoration: none; padding: 12px 24px; font-size: 16px; font-weight: 600; border-radius: 6px;">
          Reset Password
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 14px; line-height: 1.5; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        If you did not request a password reset, you can safely ignore this email.
      </p>
    </div>
  `;
};
