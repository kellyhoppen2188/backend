import { Controller, Post, Body } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("signup")
  signup(
    @Body()
    signupDto: {
      phone: string;
      email: string;
      username: string;
      inviteCode: string;
    }
  ) {
    return this.authService.signup(signupDto);
  }

  @Post("login")
  login(@Body() loginDto: { username: string; password: string }) {
    return this.authService.login(loginDto.username, loginDto.password);
  }

  @Post("forgot-password")
  forgotPassword(@Body() forgotPasswordDto: { email: string }) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post("reset-password")
  resetPassword(@Body() resetPasswordDto: { token: string; password: string }) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password
    );
  }
}
