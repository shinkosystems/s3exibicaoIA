// supabase.js
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'; // Ou o método de leitura de .env que você usa

const supabaseUrl = Constants.expoConfig.extra.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig.extra.supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey)