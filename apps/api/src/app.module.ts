import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./modules/auth/auth.module";
import { FilesModule } from "./modules/files/files.module";
import { FriendsModule } from "./modules/friends/friends.module";
import { GroupsModule } from "./modules/groups/groups.module";
import { MessagesModule } from "./modules/messages/messages.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { RealtimeModule } from "./modules/realtime/realtime.module";
import { UsersModule } from "./modules/users/users.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RealtimeModule,
    AuthModule,
    UsersModule,
    FriendsModule,
    GroupsModule,
    MessagesModule,
    FilesModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
