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
}
