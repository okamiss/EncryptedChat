import type { CreateGroupInviteRequest, CreateGroupRequest } from "@encrypted-chat/shared";
import { IsInt, IsString, IsUUID, Max, Min, MinLength } from "class-validator";

export class CreateGroupDto implements CreateGroupRequest {
  @IsString()
  @MinLength(1)
  groupName!: string;

  @IsString()
  @MinLength(1)
  encryptedGroupKey!: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  keyVersion!: number;
}

export class CreateGroupInviteDto implements CreateGroupInviteRequest {
  @IsUUID()
  inviteeId!: string;

  @IsString()
  @MinLength(1)
  encryptedGroupKey!: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  keyVersion!: number;
}
