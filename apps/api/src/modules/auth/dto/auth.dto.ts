import type { LoginRequest, RegisterRequest } from "@encrypted-chat/shared";
import { IsNotEmpty, IsObject, IsString, Length, MinLength } from "class-validator";

export class RegisterDto implements RegisterRequest {
  @IsString()
  @Length(3, 64)
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsObject()
  publicKey!: JsonWebKey;
}

export class LoginDto implements LoginRequest {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
