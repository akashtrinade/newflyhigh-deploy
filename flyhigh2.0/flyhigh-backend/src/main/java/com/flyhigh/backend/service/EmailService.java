package com.flyhigh.backend.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Email Service for sending OTPs and notifications.
 *
 * SECURITY:
 * - Uses MIME format with HTML content for better rendering.
 * - Sender address is configured in application.properties.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Sends a 6-digit OTP to the user's email with a professional FlyHigh template.
     */
    public void sendOtpEmail(String to, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject("FlyHigh - Your OTP for Email Verification");

            String htmlContent = """
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8"></head>
                <body style="font-family: 'Segoe UI', Tahoma, sans-serif; background: #f4f7fc; margin: 0; padding: 0;">
                    <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                        <div style="background: linear-gradient(135deg, #2563EB, #7C3AED); padding: 32px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 8px;">✈️</div>
                            <h1 style="color: white; font-size: 24px; margin: 0; font-weight: 700;">FlyHigh</h1>
                            <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 14px;">Email Verification</p>
                        </div>
                        <div style="padding: 32px; text-align: center;">
                            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                                Use the following OTP to verify your email address. This code expires in <strong>10 minutes</strong>.
                            </p>
                            <div style="background: #f1f5f9; border-radius: 12px; padding: 16px; letter-spacing: 12px; font-size: 36px; font-weight: 800; color: #2563EB; font-family: 'Courier New', monospace;">
                                %s
                            </div>
                            <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">
                                If you didn't request this, please ignore this email.
                            </p>
                        </div>
                        <div style="background: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                                &copy; 2025 FlyHigh. All rights reserved.
                            </p>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(otp);

            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("OTP email sent to: {}", to);
        } catch (MessagingException e) {
            log.error("Failed to send OTP email to {}: {}", to, e.getMessage());
            throw new RuntimeException("Failed to send OTP email. Please try again.");
        }
    }

    /**
     * Sends a notification email to an expert when a new call request is received.
     * SILENT FAILURE — email delivery failure never blocks the call request flow.
     */
    public void sendCallRequestNotification(String expertEmail, String expertName,
                                            String clientName, String clientEmail) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(expertEmail);
            helper.setSubject("FlyHigh — New Consultation Request from " + clientName);

            String htmlContent = """
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8"></head>
                <body style="font-family: 'Segoe UI', Tahoma, sans-serif; background: #f4f7fc; margin: 0; padding: 0;">
                    <div style="max-width: 480px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                        <div style="background: linear-gradient(135deg, #7C3AED, #2563EB); padding: 32px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 8px;">🔔</div>
                            <h1 style="color: white; font-size: 24px; margin: 0; font-weight: 700;">New Consultation Request</h1>
                            <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 14px;">Someone wants to connect with you</p>
                        </div>
                        <div style="padding: 32px;">
                            <table style="width: 100%%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">Client Name</td>
                                    <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px; font-weight: 600;">%s</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">Client Email</td>
                                    <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px;">%s</td>
                                </tr>
                            </table>
                            <div style="margin-top: 24px; padding: 16px; background: #fef3c7; border-radius: 12px; border-left: 4px solid #f59e0b;">
                                <p style="color: #92400e; font-size: 13px; margin: 0;">
                                    ⚡ Open the FlyHigh dashboard to accept or decline this request. Pending requests expire automatically.
                                </p>
                            </div>
                        </div>
                        <div style="background: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                                &copy; 2025 FlyHigh. All rights reserved.
                            </p>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(clientName, clientEmail);

            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("AUDIT: Call request notification email sent to expert: {}", expertEmail);
        } catch (MessagingException e) {
            log.error("Failed to send call request notification to {}: {}", expertEmail, e.getMessage());
            // SILENT FAILURE — do not throw; the call request was already created successfully
        }
    }

    /**
     * Sends a contact form submission to the FlyHigh support inbox.
     * Side-effect only — does NOT block the HTTP response.
     */
    public void sendContactFormEmail(String fromName, String fromEmail,
                                     String subject, String messageBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo("support@flyhigh.com");
            helper.setReplyTo(fromEmail);
            helper.setSubject("Contact Form: " + subject);

            String htmlContent = """
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8"></head>
                <body style="font-family: 'Segoe UI', Tahoma, sans-serif; background: #f4f7fc; margin: 0; padding: 0;">
                    <div style="max-width: 520px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                        <div style="background: linear-gradient(135deg, #2563EB, #7C3AED); padding: 28px; text-align: center;">
                            <div style="font-size: 36px; margin-bottom: 4px;">📬</div>
                            <h1 style="color: white; font-size: 20px; margin: 0; font-weight: 700;">New Contact Message</h1>
                        </div>
                        <div style="padding: 28px;">
                            <table style="width: 100%%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px;">From</td>
                                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px; font-weight: 600;">%s</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px;">Email</td>
                                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px;">%s</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px;">Subject</td>
                                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px; font-weight: 600;">%s</td>
                                </tr>
                            </table>
                            <div style="margin-top: 20px; padding: 16px; background: #f8fafc; border-radius: 10px; border-left: 4px solid #2563EB;">
                                <p style="color: #334155; font-size: 14px; line-height: 1.7; margin: 0; white-space: pre-wrap;">%s</p>
                            </div>
                        </div>
                        <div style="background: #f8fafc; padding: 14px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                                Sent via FlyHigh Contact Form &bull; Reply to %s
                            </p>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(
                    escapeHtml(fromName),
                    escapeHtml(fromEmail),
                    escapeHtml(subject),
                    escapeHtml(messageBody),
                    escapeHtml(fromEmail)
                );

            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("Contact form email sent: from={} subject={}", fromEmail, subject);
        } catch (MessagingException e) {
            log.error("Failed to send contact form email from {}: {}", fromEmail, e.getMessage());
            throw new RuntimeException("Failed to send message. Please try again.");
        }
    }

    /** Basic XSS prevention for contact form fields rendered in HTML email. */
    private String escapeHtml(String input) {
        if (input == null) return "";
        return input
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
