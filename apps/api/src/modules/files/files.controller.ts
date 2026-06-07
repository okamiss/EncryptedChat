import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthenticatedUser } from "../../common/authenticated-user";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UploadEncryptedFileDto } from "./dto/upload-encrypted-file.dto";
import { FilesService } from "./files.service";

@UseGuards(JwtAuthGuard)
@Controller("files")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("encrypted")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 20 * 1024 * 1024 } }))
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadEncryptedFileDto
  ) {
    return this.filesService.saveEncryptedFile(user.id, file, body);
  }

  @Get(":id/encrypted")
  @Header("Content-Type", "application/octet-stream")
  async download(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const encryptedFile = await this.filesService.openEncryptedFile(user.id, id);
    return new StreamableFile(encryptedFile.stream, {
      disposition: `attachment; filename="${encryptedFile.fileName}"`,
      length: encryptedFile.size
    });
  }
}
