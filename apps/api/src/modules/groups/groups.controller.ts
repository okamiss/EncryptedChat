import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthenticatedUser } from "../../common/authenticated-user";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  ApproveGroupJoinRequestDto,
  CreateGroupDto,
  CreateGroupInviteDto,
  CreateGroupJoinRequestDto,
  UpdateGroupMemberRoleDto,
  UpdateGroupDto
} from "./dto/groups.dto";
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

  @Patch("groups/:id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: UpdateGroupDto) {
    return this.groupsService.updateName(user.id, id, body.groupName);
  }

  @Delete("groups/:id")
  @HttpCode(204)
  deleteGroup(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.groupsService.deleteGroup(user.id, id);
  }

  @Patch("groups/:id/members/:userId/role")
  updateMemberRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") groupId: string,
    @Param("userId") userId: string,
    @Body() body: UpdateGroupMemberRoleDto
  ) {
    return this.groupsService.updateMemberRole(user.id, groupId, userId, body.role);
  }

  @Delete("groups/:id/members/:userId")
  @HttpCode(204)
  removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") groupId: string,
    @Param("userId") userId: string
  ) {
    return this.groupsService.removeMember(user.id, groupId, userId);
  }

  @Post("groups/:id/invites")
  invite(@CurrentUser() user: AuthenticatedUser, @Param("id") groupId: string, @Body() body: CreateGroupInviteDto) {
    return this.groupsService.invite(user.id, groupId, body.inviteeId, body.encryptedGroupKey, body.keyVersion);
  }

  @Get("groups/:id/join-requests")
  joinRequests(@CurrentUser() user: AuthenticatedUser, @Param("id") groupId: string) {
    return this.groupsService.listJoinRequests(user.id, groupId);
  }

  @Post("group-join-requests")
  requestJoin(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateGroupJoinRequestDto) {
    return this.groupsService.requestJoin(user.id, body.groupCode);
  }

  @Post("group-join-requests/:id/approve")
  approveJoinRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: ApproveGroupJoinRequestDto
  ) {
    return this.groupsService.approveJoinRequest(user.id, id, body.encryptedGroupKey, body.keyVersion);
  }

  @Post("group-join-requests/:id/reject")
  rejectJoinRequest(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.groupsService.rejectJoinRequest(user.id, id);
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
