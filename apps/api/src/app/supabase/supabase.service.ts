import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  readonly client: SupabaseClient;

  constructor(config: ConfigService) {
    const url = config.get<string>('SUPABASE_URL') ?? '';
    const key =
      config.get<string>('SUPABASE_SERVICE_ROLE_KEY') ??
      config.get<string>('SUPABASE_ANON_KEY') ??
      '';
    this.client = createClient(url, key);
  }
}
