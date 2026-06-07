import { Injectable, NotFoundException } from "@nestjs/common";
import type { SafeUser } from "@encrypted-chat/shared";
import { Prisma } from "@prisma/client";
import { presentUser } from "../../common/user-presenter";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return presentUser(user);
  }

  async getByUid(uid: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({ where: { uid } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return presentUser(user);
  }

  async updatePublicKey(userId: string, publicKey: JsonWebKey): Promise<SafeUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { publicKey: publicKey as Prisma.InputJsonValue }
    });
    return presentUser(user);
  }

  async updateDisplayName(userId: string, displayName?: string | null): Promise<SafeUser> {
    const normalized = displayName?.trim() || null;
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { displayName: normalized }
    });
    return presentUser(user);
  }
}
