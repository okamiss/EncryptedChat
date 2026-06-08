import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MessagesModule } from "../messages/messages.module";
import { RealtimeEventsService } from "./realtime-events.service";
import { RealtimeGateway } from "./realtime.gateway";

@Module({
  imports: [AuthModule, MessagesModule],
  providers: [RealtimeEventsService, RealtimeGateway],
  exports: [RealtimeEventsService]
})
export class RealtimeModule {}
