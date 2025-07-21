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
        const databaseUrl = configService.get<string>('database.url');
        
        // Append SSL mode to the connection string
        const urlWithSSL = databaseUrl!.includes('?') 
          ? `${databaseUrl}&sslmode=require`
          : `${databaseUrl}?sslmode=require`;
        
        return {
          type: 'postgres',
          url: urlWithSSL,
          ssl: {
            rejectUnauthorized: false,
          },
          autoLoadEntities: true,
          synchronize: configService.get('NODE_ENV') !== 'production',
          logging: configService.get('NODE_ENV') !== 'production',
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}