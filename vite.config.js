import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './'：相对路径，构建产物可放任意子路径（docs/design.md「文件清单」）
export default defineConfig({
  plugins: [react()],
  base: './',
});
