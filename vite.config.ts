import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({plugins:[react(),tailwindcss()],build:{target:'es2022',sourcemap:false,rollupOptions:{output:{manualChunks:{supabase:['@supabase/supabase-js'],icons:['lucide-react']}}}}});
