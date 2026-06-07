import type { FileScopeType } from "@encrypted-chat/shared";
import { IsIn, IsOptional, IsString, IsUUID, Length } from "class-validator";

export class UploadEncryptedFileDto {
  @IsIn(["direct", "group"])
  scopeType!: FileScopeType;

  @IsOptional()
  @IsUUID()
  targetUserId?: string;

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsString()
  @Length(64, 64)
  sha256!: string;
}
