import { defineConfig } from 'vite';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://13.229.132.48';

    return {
        plugins: [react()],
        server: {
            host: '0.0.0.0',
            port: 5173,
            proxy: {
                '/api': proxyTarget,
            },
        },
    };
});
