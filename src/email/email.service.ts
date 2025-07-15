import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Plunk from "@plunk/node";

@Injectable()
export class EmailService {
  private plunk: Plunk;

  constructor(private configService: ConfigService) {
    this.plunk = new Plunk(this.configService.get("PLUNK_API_KEY"));
  }

  async sendLoginCredentials(
    email: string,
    username: string,
    password: string
  ) {
    await this.plunk.emails.send({
      to: email,
      subject: "Your Login Credentials",
      body: `
        <h2>Welcome!</h2>
        <p>Your account has been created successfully.</p>
        <p><strong>Username:</strong> ${username}</p>
        <p><strong>Password:</strong> ${password}</p>
        <p>Please keep these credentials safe.</p>
      `,
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    const resetUrl = `${this.configService.get(
      "FRONTEND_URL"
    )}/reset-password?token=${resetToken}`;

    await this.plunk.emails.send({
      to: email,
      subject: "Password Reset Request",
      body: `
        <h2>Password Reset Request</h2>
        <p>You have requested to reset your password. Click the link below to reset your password:</p>
        <p><a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p>${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
      `,
    });
  }
}
