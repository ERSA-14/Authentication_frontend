// Supabase Client Configuration
import { createClient } from '@supabase/supabase-js';
import env from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
env.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Please add to your .env file:');
  console.error('SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co');
  console.error('SUPABASE_ANON_KEY=your_anon_key_here');
  process.exit(1);
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('✅ Supabase client initialized');
