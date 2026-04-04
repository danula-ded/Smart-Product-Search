import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/health': 'http://127.0.0.1:8000',
      '/search': 'http://127.0.0.1:8000',
      '/events': 'http://127.0.0.1:8000',
      '/profiles': 'http://127.0.0.1:8000',
      '/metrics': 'http://127.0.0.1:8000',
      '/products': 'http://127.0.0.1:8000',
      '/saved-results': 'http://127.0.0.1:8000',
      '/feedback': 'http://127.0.0.1:8000',
      '/datasets': 'http://127.0.0.1:8000'
    }
  }
});
