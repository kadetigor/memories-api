// src/services/storage.service.ts
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface StorageFile {
  name: string;
  size: number;
  mimetype: string;
  url: string;
  createdAt: Date;
}

export interface StorageQuota {
  used: number;
  total: number;
  percentage: number;
}

@Injectable()
export class StorageService {
  private supabase: SupabaseClient;
  private bucketName = 'event-photos';
  private logger = new Logger(StorageService.name);
  
  // Allowed file types
  private readonly ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ];
  
  private readonly ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
  ];
  
  // Size limits
  private readonly MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly DEFAULT_QUOTA = 100 * 1024 * 1024 * 1024; // 100GB

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('supabase.url');
    const supabaseKey = this.configService.get<string>('supabase.serviceKey');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is missing');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.initializeBucket();
  }

  private async initializeBucket() {
    try {
      const { data, error } = await this.supabase.storage
        .getBucket(this.bucketName);
        
      if (error && error.message.includes('not found')) {
        // Create bucket if it doesn't exist
        const { error: createError } = await this.supabase.storage
          .createBucket(this.bucketName, {
            public: false,
            fileSizeLimit: this.MAX_VIDEO_SIZE,
          });
          
        if (createError) {
          this.logger.error('Failed to create storage bucket', createError);
        } else {
          this.logger.log('Storage bucket created successfully');
        }
      }
    } catch (error) {
      this.logger.error('Failed to initialize storage bucket', error);
    }
  }

  /**
   * Generate a unique file path for storage
   */
  private generateFilePath(eventId: string, fileName: string): string {
    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `events/${eventId}/${timestamp}-${sanitizedName}`;
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: Express.Multer.File): void {
    const allowedTypes = [...this.ALLOWED_IMAGE_TYPES, ...this.ALLOWED_VIDEO_TYPES];
    
    if (!allowedTypes.includes(file.mimetype)) {
      throw new HttpException(
        'Invalid file type. Only images and videos are allowed.',
        HttpStatus.BAD_REQUEST
      );
    }
    
    const isVideo = this.ALLOWED_VIDEO_TYPES.includes(file.mimetype);
    const maxSize = isVideo ? this.MAX_VIDEO_SIZE : this.MAX_IMAGE_SIZE;
    
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      throw new HttpException(
        `File too large. Maximum size is ${maxSizeMB}MB`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Get presigned upload URL for direct browser upload
   */
  async getPresignedUploadUrl(
    eventId: string, 
    fileName: string, 
    fileType: string
  ): Promise<{ uploadUrl: string; filePath: string }> {
    try {
      const filePath = this.generateFilePath(eventId, fileName);
      
      // Validate file type
      if (![...this.ALLOWED_IMAGE_TYPES, ...this.ALLOWED_VIDEO_TYPES].includes(fileType)) {
        throw new HttpException('Invalid file type', HttpStatus.BAD_REQUEST);
      }
      
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .createSignedUploadUrl(filePath);
        
      if (error) {
        this.logger.error('Failed to create upload URL', error);
        throw new HttpException(
          'Failed to generate upload URL',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      
      return {
        uploadUrl: data.signedUrl,
        filePath,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error('Unexpected error in getPresignedUploadUrl', error);
      throw new HttpException(
        'Failed to process upload request',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Upload file from server (for server-side uploads)
   */
  async uploadFile(
    eventId: string, 
    file: Express.Multer.File
  ): Promise<StorageFile> {
    try {
      this.validateFile(file);
      
      const filePath = this.generateFilePath(eventId, file.originalname);
      
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });
        
      if (error) {
        this.logger.error('Failed to upload file', error);
        throw new HttpException(
          'Failed to upload file',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      
      // Get public URL
      const { data: urlData } = await this.supabase.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, 3600 * 24 * 7); // 7 days
        
      return {
        name: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        url: urlData?.signedUrl || '',
        createdAt: new Date(),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error('Unexpected error in uploadFile', error);
      throw new HttpException(
        'Failed to upload file',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get all files for an event
   */
  async getEventFiles(eventId: string): Promise<StorageFile[]> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list(`events/${eventId}`, {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' },
        });
        
      if (error) {
        this.logger.error('Failed to list files', error);
        throw new HttpException(
          'Failed to retrieve files',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      
      const files: StorageFile[] = [];
      
      for (const file of data || []) {
        const { data: urlData } = await this.supabase.storage
          .from(this.bucketName)
          .createSignedUrl(`events/${eventId}/${file.name}`, 3600 * 24);
          
        files.push({
          name: file.name,
          size: file.metadata?.size || 0,
          mimetype: file.metadata?.mimetype || 'application/octet-stream',
          url: urlData?.signedUrl || '',
          createdAt: new Date(file.created_at),
        });
      }
      
      return files;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error('Unexpected error in getEventFiles', error);
      throw new HttpException(
        'Failed to retrieve files',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Delete a single file
   */
  async deleteFile(eventId: string, fileName: string): Promise<void> {
    try {
      const filePath = `events/${eventId}/${fileName}`;
      
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([filePath]);
        
      if (error) {
        this.logger.error('Failed to delete file', error);
        throw new HttpException(
          'Failed to delete file',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error('Unexpected error in deleteFile', error);
      throw new HttpException(
        'Failed to delete file',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Delete all files for an event
   */
  async deleteEventFiles(eventId: string): Promise<void> {
    try {
      const files = await this.getEventFiles(eventId);
      const filePaths = files.map(f => `events/${eventId}/${f.name}`);
      
      if (filePaths.length === 0) return;
      
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove(filePaths);
        
      if (error) {
        this.logger.error('Failed to delete event files', error);
        throw new HttpException(
          'Failed to delete event files',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error('Unexpected error in deleteEventFiles', error);
      throw new HttpException(
        'Failed to delete event files',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get storage usage for an event
   */
  async getEventStorageUsage(eventId: string): Promise<StorageQuota> {
    try {
      const files = await this.getEventFiles(eventId);
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      
      return {
        used: totalSize,
        total: this.DEFAULT_QUOTA,
        percentage: (totalSize / this.DEFAULT_QUOTA) * 100,
      };
    } catch (error) {
      this.logger.error('Failed to calculate storage usage', error);
      throw new HttpException(
        'Failed to calculate storage usage',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Check if event has storage space available
   */
  async hasStorageSpace(eventId: string, fileSize: number): Promise<boolean> {
    const usage = await this.getEventStorageUsage(eventId);
    return (usage.used + fileSize) <= usage.total;
  }

  /**
   * Generate a public share URL for a file (valid for specified duration)
   */
  async generatePublicUrl(
    eventId: string, 
    fileName: string, 
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const filePath = `events/${eventId}/${fileName}`;
      
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);
        
      if (error) {
        this.logger.error('Failed to generate public URL', error);
        throw new HttpException(
          'Failed to generate public URL',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      
      return data.signedUrl;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error('Unexpected error in generatePublicUrl', error);
      throw new HttpException(
        'Failed to generate public URL',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(eventId: string, fileName: string): Promise<any> {
    try {
      const filePath = `events/${eventId}/${fileName}`;
      
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .download(filePath);
        
      if (error) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }
      
      return {
        size: data.size,
        type: data.type,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error('Unexpected error in getFileMetadata', error);
      throw new HttpException(
        'Failed to get file metadata',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}