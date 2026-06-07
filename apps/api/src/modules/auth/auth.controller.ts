import { Body, Controller, Post } from "@nestjs/common";
import { LoginDto, RegisterDto } from "./dto/auth.dto";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() body: RegisterDto) {
    return this.authService.register(body.username, body.password, body.publicKey);
  }

  @Post("login")
  login(@Body() body: LoginDto) {
    return this.authService.login(body.username, body.password);
  }
}
