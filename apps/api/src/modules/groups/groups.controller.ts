import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthenticatedUser } from "../../common/authenticated-user";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateGroupDto, CreateGroupInviteDto } from "./dto/groups.dto";
import { GroupsService } from "./groups.service";

@UseGuards(JwtAuthGuard)
@Controller()
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post("groups")
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateGroupDto) {
    return this.groupsService.create(user.id, body.groupName, body.encryptedGroupKey, body.keyVersion);
  }

  @Get("groups")
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.groupsService.list(user.id);
  }

  @Get("groups/:id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.groupsService.get(user.id, id);
  }

  @Post("groups/:id/invites")
  invite(@CurrentUser() user: AuthenticatedUser, @Param("id") groupId: string, @Body() body: CreateGroupInviteDto) {
    return this.groupsService.invite(user.id, groupId, body.inviteeId, body.encryptedGroupKey, body.keyVersion);
  }

  @Get("group-invites")
  invites(@CurrentUser() user: AuthenticatedUser) {
    return this.groupsService.listInvites(user.id);
  }

  @Post("group-invites/:id/accept")
  acceptInvite(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.groupsService.acceptInvite(user.id, id);
  }

  @Post("group-invites/:id/reject")
  rejectInvite(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.groupsService.rejectInvite(user.id, id);
  }
}
