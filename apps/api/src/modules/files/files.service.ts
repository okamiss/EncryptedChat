import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { FileScopeType, UploadEncryptedFileResponse } from "@encrypted-chat/shared";
import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { FriendsService } from "../friends/friends.service";
import { GroupsService } from "../groups/groups.service";

@Injectable()
export class FilesService {
  private readonly uploadDir: string;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly friendsService: FriendsService,
    private readonly groupsService: GroupsService
  ) {
    this.uploadDir = resolve(process.cwd(), config.get<string>("UPLOAD_DIR", "uploads"));
  }

  async saveEncryptedFile(
    ownerId: string,
    file: Express.Multer.File,
    metadata: { scopeType: FileScopeType; targetUserId?: string; groupId?: string; sha256: string }
  ): Promise<UploadEncryptedFileResponse> {
    await this.assertWriteAccess(ownerId, metadata);
    await mkdir(this.uploadDir, { recursive: true });

    const id = randomUUID();
    const storagePath = join(this.uploadDir, `${id}.enc`);
    await writeFile(storagePath, file.buffer);

    const record = await this.prisma.encryptedFile.create({
      data: {
        id,
        ownerId,
        scopeType: metadata.scopeType,
        targetUserId: metadata.targetUserId,
        groupId: metadata.groupId,
        storagePath,
        size: file.size,
        sha256: metadata.sha256
      }
    });

    return {
      id: record.id,
      size: record.size,
      sha256: record.sha256,
      createdAt: record.createdAt.toISOString()
    };
  }

  async openEncryptedFile(userId: string, fileId: string) {
    const record = await this.prisma.encryptedFile.findUnique({ where: { id: fileId } });
    if (!record) {
      throw new NotFoundException("Encrypted file not found");
    }

    await this.assertReadAccess(userId, {
      ownerId: record.ownerId,
      scopeType: record.scopeType,
      targetUserId: record.targetUserId ?? undefined,
      groupId: record.groupId ?? undefined
    });

    return {
      stream: createReadStream(record.storagePath),
      fileName: basename(record.storagePath),
      size: record.size,
      sha256: record.sha256
    };
  }

  private async assertWriteAccess(
    ownerId: string,
    metadata: { scopeType: FileScopeType; targetUserId?: string; groupId?: string }
  ) {
    if (metadata.scopeType === "direct") {
      if (!metadata.targetUserId || metadata.groupId) {
        throw new ForbiddenException("Direct file upload requires targetUserId only");
      }
      const areFriends = await this.friendsService.areFriends(ownerId, metadata.targetUserId);
      if (!areFriends) {
        throw new ForbiddenException("Direct encrypted files can only be sent to friends");
      }
      return;
    }

    if (!metadata.groupId || metadata.targetUserId) {
      throw new ForbiddenException("Group file upload requires groupId only");
    }
    const isMember = await this.groupsService.isMember(ownerId, metadata.groupId);
    if (!isMember) {
      throw new ForbiddenException("Only group members can upload group files");
    }
  }

  private async assertReadAccess(
    userId: string,
    metadata: { ownerId: string; scopeType: FileScopeType; targetUserId?: string; groupId?: string }
  ) {
    if (metadata.ownerId === userId) {
      return;
    }

    if (metadata.scopeType === "direct") {
      if (metadata.targetUserId === userId) {
        return;
      }
      throw new ForbiddenException("You cannot read this encrypted file");
    }

    if (metadata.groupId && (await this.groupsService.isMember(userId, metadata.groupId))) {
      return;
    }

    throw new ForbiddenException("You cannot read this encrypted file");
  }
}
