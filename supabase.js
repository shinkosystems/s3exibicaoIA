// supabase.js
import { createClient } from '@supabase/supabase-js'

// Ajuste a leitura para o padrão de Web/Vercel
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Verificação de segurança
if (!supabaseUrl || !supabaseAnonKey) {
  // Você pode retornar um erro de inicialização ou usar valores mock
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)