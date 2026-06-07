import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthenticatedUser } from "../../common/authenticated-user";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UpdatePublicKeyDto } from "./dto/update-public-key.dto";
import { UsersService } from "./users.service";

@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getById(user.id);
  }

  @Get("by-uid/:uid")
  byUid(@Param("uid") uid: string) {
    return this.usersService.getByUid(uid);
  }

  @Patch("me/public-key")
  updatePublicKey(@CurrentUser() user: AuthenticatedUser, @Body() body: UpdatePublicKeyDto) {
    return this.usersService.updatePublicKey(user.id, body.publicKey);
  }
}
