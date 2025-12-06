import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173, // or your port
    allowedHosts: [
      "678ff51efdeb.ngrok-free.app",
      "2c71c0040efe.ngrok-free.app",
      // add your ngrok URL here
    ],
  },
});