import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import supabaseConfig from './config/supabase.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, supabaseConfig],
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
      validationSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        const databaseUrl = configService.get<string>('database.url');
        
        // Parse the database URL to check if it's Supabase
        const isSupabase = databaseUrl?.includes('supabase.co') || 
                          databaseUrl?.includes('pooler.supabase.com');
        
        // SSL configuration for different environments
        let sslConfig: any = false;
        
        if (configService.get<string>('database.ssl') === 'true' || isSupabase) {
          if (isProduction || isSupabase) {
            // For Supabase, we need to allow their certificates
            sslConfig = {
              rejectUnauthorized: false, // Supabase uses valid certs but Node.js might not recognize them
            };
          } else {
            // Local development with SSL
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
          synchronize: !isProduction, // Simplified - remove the extra config check
          logging: !isProduction,
          retryAttempts: 10, // Increased for better stability
          retryDelay: 3000,
          connectTimeoutMS: 10000, // 10 seconds timeout
          // DO NOT include 'extra' field - it causes conflicts with ssl config
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}