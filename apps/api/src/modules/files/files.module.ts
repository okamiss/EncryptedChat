import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { FriendsModule } from "../friends/friends.module";
import { GroupsModule } from "../groups/groups.module";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";

@Module({
  imports: [AuthModule, FriendsModule, GroupsModule],
  controllers: [FilesController],
  providers: [FilesService]
})
export class FilesModule {}
