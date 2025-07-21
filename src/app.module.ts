import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
      validationSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        const databaseUrl = configService.get<string>('database.url');
        
        // Proper SSL configuration
        let sslConfig: any = false;
        
        if (configService.get<boolean>('database.ssl')) {
          if (isProduction) {
            // Production: enforce SSL
            sslConfig = {
              rejectUnauthorized: true,
              // If you have a CA certificate, add it here:
              // ca: fs.readFileSync('path/to/ca-certificate.crt').toString()
            };
          } else {
            // Development: allow self-signed certificates
            console.warn('⚠️  SSL certificate verification disabled for development');
            sslConfig = {
              rejectUnauthorized: false,
            };
          }
        }

        return {
          type: 'postgres',
          url: databaseUrl,
          ssl: sslConfig,
          autoLoadEntities: true,
          synchronize: !isProduction, // Only sync in development
          logging: !isProduction,
          retryAttempts: 3,
          retryDelay: 3000,
          extra: {
            // Additional SSL options if needed
            ssl: sslConfig,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}