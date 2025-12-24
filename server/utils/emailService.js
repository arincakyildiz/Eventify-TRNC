const nodemailer = require('nodemailer');

// Create transporter - configure based on your email service
// For development, you can use Gmail, SendGrid, Mailgun, etc.
const createTransporter = () => {
  // Use real email service if EMAIL_SERVICE is set (production or development with email configured)
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  // SMTP configuration (works with most email providers)
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

const transporter = createTransporter();

/**
 * Send verification code email
 * @param {string} email - Recipient email
 * @param {string} code - 6-digit verification code
 * @param {string} name - User name
 */
const sendVerificationCode = async (email, code, name = 'User') => {
  try {
    const mailOptions = {
      from: `"Eventify TRNC" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email - Eventify TRNC',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }
            .code { font-size: 32px; font-weight: bold; color: #4CAF50; text-align: center; padding: 20px; background-color: white; border: 2px dashed #4CAF50; border-radius: 5px; margin: 20px 0; letter-spacing: 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Eventify TRNC</h1>
            </div>
            <div class="content">
              <h2>Hello ${name},</h2>
              <p>Thank you for registering with Eventify TRNC. Please verify your email address by entering the code below:</p>
              <div class="code">${code}</div>
              <p>This code will expire in 10 minutes.</p>
              <p>If you didn't create an account with Eventify TRNC, please ignore this email.</p>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Eventify TRNC. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hello ${name},
        
        Thank you for registering with Eventify TRNC. Please verify your email address by entering the code below:
        
        Verification Code: ${code}
        
        This code will expire in 10 minutes.
        
        If you didn't create an account with Eventify TRNC, please ignore this email.
        
        © ${new Date().getFullYear()} Eventify TRNC. All rights reserved.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

/**
 * Send password reset email with link
 * @param {string} email - Recipient email
 * @param {string} resetUrl - Password reset URL
 * @param {string} name - User name
 */
const sendPasswordResetEmail = async (email, resetUrl, name = 'User') => {
  try {
    const mailOptions = {
      from: `"Eventify TRNC" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reset Your Password - Eventify TRNC',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; padding: 12px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Eventify TRNC</h1>
            </div>
            <div class="content">
              <h2>Hello ${name},</h2>
              <p>You requested to reset your Eventify TRNC account password.</p>
              <p>Click the button below to reset your password. This link will expire in 10 minutes.</p>
              <a class="button" href="${resetUrl}">Reset Password</a>
              <p>If the button does not work, copy and paste this URL into your browser:</p>
              <p>${resetUrl}</p>
              <p>If you did not request this, you can ignore this email.</p>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Eventify TRNC. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hello ${name},

        You requested to reset your Eventify TRNC account password.

        Reset Link: ${resetUrl}

        This link will expire in 10 minutes.

        If you did not request this, you can ignore this email.

        © ${new Date().getFullYear()} Eventify TRNC. All rights reserved.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

module.exports = {
  sendVerificationCode,
  sendPasswordResetEmail
};

