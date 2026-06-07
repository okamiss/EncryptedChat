import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateDisplayNameDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  displayName?: string | null;
}
