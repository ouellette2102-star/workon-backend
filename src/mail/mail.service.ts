/**
 * Mail Service - Email sending via Resend
 *
 * Provides email functionality for:
 * - OTP verification emails
 * - Password reset emails
 * - Account notifications
 *
 * Environment variables:
 * - RESEND_API_KEY: Resend API key (required)
 * - MAIL_FROM: Default sender email (default: noreply@workon.app)
 * - MAIL_FROM_NAME: Sender display name (default: WorkOn)
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendOtpEmailOptions {
  to: string;
  otp: string;
  purpose: 'email-change' | 'email-verify';
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend | null = null;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly isDev: boolean;

  constructor(private readonly configService: ConfigService) {
    this.fromEmail = this.configService.get<string>('MAIL_FROM', 'noreply@workon.app');
    this.fromName = this.configService.get<string>('MAIL_FROM_NAME', 'WorkOn');
    this.isDev = this.configService.get<string>('NODE_ENV') !== 'production';
  }

  onModuleInit() {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('✅ Resend email provider initialized');
    } else {
      this.logger.warn(
        '⚠️ RESEND_API_KEY not configured. Emails will be logged only (dev mode).',
      );
    }
  }

  /**
   * Check if email sending is available
   */
  isConfigured(): boolean {
    return this.resend !== null;
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { to, subject, html, text } = options;
    const from = `${this.fromName} <${this.fromEmail}>`;

    this.logger.log(`[Mail] Sending email to ${to}: "${subject}"`);

    // Dev mode: log only
    if (!this.resend) {
      this.logger.warn(`[Mail] DEV MODE - Email not sent (no API key)`);
      this.logger.debug(`[Mail] To: ${to}`);
      this.logger.debug(`[Mail] Subject: ${subject}`);
      this.logger.debug(`[Mail] HTML: ${html.substring(0, 200)}...`);
      return { success: true, messageId: 'dev-mode-no-send' };
    }

    try {
      const result = await this.resend.emails.send({
        from,
        to,
        subject,
        html,
        text: text || this.htmlToText(html),
      });

      if (result.error) {
        this.logger.error(`[Mail] Failed to send: ${result.error.message}`);
        return { success: false, error: result.error.message };
      }

      this.logger.log(`[Mail] ✅ Email sent successfully. ID: ${result.data?.id}`);
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[Mail] Exception: ${message}`);
      return { success: false, error: message };
    }
  }

  /**
   * Send OTP verification email
   */
  async sendOtpEmail(options: SendOtpEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { to, otp, purpose } = options;

    const subject =
      purpose === 'email-change'
        ? 'WorkOn - Code de vérification pour changer votre email'
        : 'WorkOn - Code de vérification';

    const purposeText =
      purpose === 'email-change'
        ? 'pour confirmer le changement de votre adresse email'
        : 'pour vérifier votre adresse email';

    const html = this.getOtpEmailTemplate(otp, purposeText);

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    resetUrl: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const subject = 'WorkOn - Réinitialisation de votre mot de passe';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; }
          .logo { font-size: 24px; font-weight: bold; color: #40E0D0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 10px; }
          .button { display: inline-block; background: #40E0D0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">WorkOn</div>
          </div>
          <div class="content">
            <h2>Réinitialisation de mot de passe</h2>
            <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
            <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
            </p>
            <p style="font-size: 12px; color: #666;">
              Ce lien expire dans 15 minutes.<br>
              Si vous n'avez pas fait cette demande, ignorez cet email.
            </p>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} WorkOn. Tous droits réservés.
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send account deletion confirmation email
   */
  async sendAccountDeletedEmail(to: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const subject = 'WorkOn - Votre compte a été supprimé';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; }
          .logo { font-size: 24px; font-weight: bold; color: #40E0D0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 10px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">WorkOn</div>
          </div>
          <div class="content">
            <h2>Compte supprimé</h2>
            <p>Votre compte WorkOn a été supprimé avec succès.</p>
            <p>Toutes vos données personnelles ont été supprimées conformément à notre politique de confidentialité.</p>
            <p>Nous sommes désolés de vous voir partir. Si vous changez d'avis, vous pouvez toujours créer un nouveau compte.</p>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} WorkOn. Tous droits réservés.
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to, subject, html });
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * OTP email template
   */
  private getOtpEmailTemplate(otp: string, purposeText: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; }
          .logo { font-size: 24px; font-weight: bold; color: #40E0D0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 10px; }
          .otp-box { background: #40E0D0; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">WorkOn</div>
          </div>
          <div class="content">
            <h2>Code de vérification</h2>
            <p>Utilisez ce code ${purposeText}:</p>
            <div class="otp-box">${otp}</div>
            <p style="font-size: 12px; color: #666;">
              Ce code expire dans 10 minutes.<br>
              Si vous n'avez pas fait cette demande, ignorez cet email.
            </p>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} WorkOn. Tous droits réservés.
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Strip HTML tags for plain text version
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

