// src/services/storage.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';
import { AppConfig } from '../config/config.interface';

@Injectable()
export class StorageService {
  private s3: S3;
  private bucketName: string;

  constructor(private configService: ConfigService<AppConfig>) {
    const awsConfig = this.configService.get('aws', { infer: true })!;
    
    this.s3 = new S3({
      region: awsConfig.region,
      credentials: {
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey,
      },
    });
    
    this.bucketName = awsConfig.bucketName;
  }

  async getPresignedUploadUrl(eventId: string, fileName: string) {
    const key = `events/${eventId}/${Date.now()}-${fileName}`;
    
    const params = {
      Bucket: this.bucketName,
      Key: key,
      Expires: 300, // 5 minutes
      ContentType: 'image/jpeg',
    };

    return {
      uploadUrl: await this.s3.getSignedUrlPromise('putObject', params),
      key,
    };
  }
}