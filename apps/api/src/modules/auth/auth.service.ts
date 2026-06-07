import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { AuthResponse, SafeUser } from "@encrypted-chat/shared";
import { Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { presentUser } from "../../common/user-presenter";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async register(username: string, password: string, publicKey: JsonWebKey): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) {
      throw new ConflictException("Username already exists");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: {
        uid: await this.generateUid(),
        username,
        passwordHash,
        publicKey: publicKey as Prisma.InputJsonValue
      }
    });

    return this.createAuthResponse(presentUser(user));
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) {
      throw new UnauthorizedException("Invalid username or password");
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid username or password");
    }

    return this.createAuthResponse(presentUser(user));
  }

  private createAuthResponse(user: SafeUser): AuthResponse {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      uid: user.uid,
      username: user.username
    });

    return { accessToken, user };
  }

  private async generateUid(): Promise<string> {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const uid = Array.from({ length: 10 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
      const existing = await this.prisma.user.findUnique({ where: { uid } });
      if (!existing) {
        return uid;
      }
    }

    throw new ConflictException("Could not allocate a unique UID");
  }
}
