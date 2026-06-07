import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthenticatedUser } from "../../common/authenticated-user";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateFriendRequestDto } from "./dto/friend-request.dto";
import { FriendsService } from "./friends.service";

@UseGuards(JwtAuthGuard)
@Controller()
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post("friend-requests")
  createRequest(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateFriendRequestDto) {
    return this.friendsService.createRequest(user.id, body.addresseeUid);
  }

  @Get("friend-requests/incoming")
  incoming(@CurrentUser() user: AuthenticatedUser) {
    return this.friendsService.listIncoming(user.id);
  }

  @Get("friend-requests/outgoing")
  outgoing(@CurrentUser() user: AuthenticatedUser) {
    return this.friendsService.listOutgoing(user.id);
  }

  @Post("friend-requests/:id/accept")
  accept(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.friendsService.accept(user.id, id);
  }

  @Post("friend-requests/:id/reject")
  reject(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.friendsService.reject(user.id, id);
  }

  @Get("friends")
  friends(@CurrentUser() user: AuthenticatedUser) {
    return this.friendsService.listFriends(user.id);
  }
}
