import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import supabaseConfig from './config/supabase.config';
import { SupabaseModule } from 'nestjs-supabase-js';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { APP_GUARD } from '@nestjs/core';
import { SupabaseGuard } from './modules/supabase/supabase.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, supabaseConfig],
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
      validationSchema,
    }),
    ConfigModule.forRoot(), 
    PassportModule, 
    SupabaseModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: SupabaseGuard,
    },
  ],
})
export class AppModule {}