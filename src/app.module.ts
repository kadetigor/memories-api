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
      validationSchema, // You had this in your file structure but not used
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], // This was missing - CRITICAL!
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        
        // Option 2: Or use DATABASE_URL if you prefer
        url: configService.get<string>('database.url'),
        
        autoLoadEntities: true,
        synchronize: configService.get<string>('NODE_ENV') === 'development',
        logging: configService.get<string>('NODE_ENV') === 'development',
        retryAttempts: 3,
        retryDelay: 3000,
      }),
      inject: [ConfigService], // This was missing - CRITICAL!
    }),
  ],
})
export class AppModule {}