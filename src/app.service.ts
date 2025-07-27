import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Supabase } from './modules/supabase/supabase';

type Hello = {
  id: number;
  email: string;
};

@Injectable()
export class AppService {
  constructor(private readonly supabase: Supabase) {}

  async getHello(): Promise<Hello[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('auth')
      .select();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data as Hello[];
  }
}
