import type { UpdatePasswordRequest } from "@encrypted-chat/shared";
import { IsString, MinLength } from "class-validator";

export class UpdatePasswordDto implements UpdatePasswordRequest {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
