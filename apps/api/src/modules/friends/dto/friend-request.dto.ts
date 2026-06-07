import type { CreateFriendRequestRequest } from "@encrypted-chat/shared";
import { IsString, Length } from "class-validator";

export class CreateFriendRequestDto implements CreateFriendRequestRequest {
  @IsString()
  @Length(10, 10)
  addresseeUid!: string;
}
