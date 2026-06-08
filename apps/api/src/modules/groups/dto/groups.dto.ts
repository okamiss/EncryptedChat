import type {
  ApproveGroupJoinRequestRequest,
  CreateGroupInviteRequest,
  CreateGroupJoinRequestRequest,
  CreateGroupRequest,
  UpdateGroupRequest
} from "@encrypted-chat/shared";
import { IsInt, IsString, IsUUID, Length, Max, Min, MinLength } from "class-validator";

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

export class CreateGroupJoinRequestDto implements CreateGroupJoinRequestRequest {
  @IsString()
  @Length(10, 10)
  groupCode!: string;
}

export class ApproveGroupJoinRequestDto implements ApproveGroupJoinRequestRequest {
  @IsString()
  @MinLength(1)
  encryptedGroupKey!: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  keyVersion!: number;
}

export class UpdateGroupDto implements UpdateGroupRequest {
  @IsString()
  @MinLength(1)
  groupName!: string;
}
