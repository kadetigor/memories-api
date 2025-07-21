// src/modules/storage/storage.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  HttpCode,
  UseGuards,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService, StorageFile, StorageQuota } from './storage.service';

// You'll need to implement this guard
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface PresignedUploadDto {
  fileName: string;
  fileType: string;
}

@Controller('storage')
// @UseGuards(JwtAuthGuard) // Uncomment when you have auth implemented
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Get presigned upload URL for direct browser uploads
   */
  @Post('events/:eventId/upload-url')
  @HttpCode(HttpStatus.OK)
  async getUploadUrl(
    @Param('eventId') eventId: string,
    @Body() dto: PresignedUploadDto,
  ) {
    return this.storageService.getPresignedUploadUrl(
      eventId,
      dto.fileName,
      dto.fileType,
    );
  }

  /**
   * Upload file through server (alternative to presigned URL)
   */
  @Post('events/:eventId/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('eventId') eventId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'No file provided',
      };
    }

    // Check storage quota before upload
    const hasSpace = await this.storageService.hasStorageSpace(
      eventId,
      file.size,
    );

    if (!hasSpace) {
      return {
        statusCode: HttpStatus.INSUFFICIENT_STORAGE,
        message: 'Storage quota exceeded',
      };
    }

    return this.storageService.uploadFile(eventId, file);
  }

  /**
   * Get all files for an event
   */
  @Get('events/:eventId/files')
  async getEventFiles(@Param('eventId') eventId: string): Promise<StorageFile[]> {
    return this.storageService.getEventFiles(eventId);
  }

  /**
   * Get storage usage for an event
   */
  @Get('events/:eventId/usage')
  async getStorageUsage(@Param('eventId') eventId: string): Promise<StorageQuota> {
    return this.storageService.getEventStorageUsage(eventId);
  }

  /**
   * Generate public URL for sharing
   */
  @Post('events/:eventId/files/:fileName/share')
  async generateShareUrl(
    @Param('eventId') eventId: string,
    @Param('fileName') fileName: string,
    @Query('expiresIn') expiresIn?: string,
  ) {
    const duration = expiresIn ? parseInt(expiresIn, 10) : 3600;
    const url = await this.storageService.generatePublicUrl(
      eventId,
      fileName,
      duration,
    );

    return { url, expiresIn: duration };
  }

  /**
   * Delete a single file
   */
  @Delete('events/:eventId/files/:fileName')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(
    @Param('eventId') eventId: string,
    @Param('fileName') fileName: string,
  ) {
    await this.storageService.deleteFile(eventId, fileName);
  }

  /**
   * Delete all files for an event
   */
  @Delete('events/:eventId/files')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAllFiles(@Param('eventId') eventId: string) {
    await this.storageService.deleteEventFiles(eventId);
  }
}