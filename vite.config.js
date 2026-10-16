import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Las funciones de /api corriendo dentro del servidor de Vite.
 *
 * En Vercel cada archivo de /api es una función. En la computadora no hace
 * falta el CLI de Vercel: este middleware carga el mismo archivo y le pasa la
 * petición con la misma forma (`req.body` ya leído), así que `npm run dev`
 * levanta la página y la API juntas.
 */
function apiLocal() {
	return {
		name: 'api-local',
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				const url = new URL(req.url ?? '/', 'http://localhost');
				const nombre = url.pathname.match(/^\/api\/([a-z0-9-]+)\/?$/)?.[1];
				if (!nombre) return next();
				try {
					const modulo = await server.ssrLoadModule(`/api/${nombre}.js`);
					const trozos = [];
					for await (const t of req) trozos.push(t);
					const crudo = Buffer.concat(trozos).toString('utf8');
					req.body = crudo ? JSON.parse(crudo) : undefined;
					await modulo.default(req, res);
				} catch (e) {
					if (e?.code === 'ERR_LOAD_URL' || /Failed to load url/.test(e?.message)) return next();
					res.statusCode = 500;
					res.setHeader('Content-Type', 'application/json');
					res.end(JSON.stringify({ error: e?.message ?? 'Error' }));
				}
			});
		}
	};
}

export default defineConfig(({ mode }) => {
	// Las variables de .env (ADMIN_PIN, Redis) para las funciones de /api.
	Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
	return {
		plugins: [react(), apiLocal()],
		server: { port: 5173 },
		// SheetJS pesa ~500 kB, pero solo se descarga en /admin al leer o exportar un Excel.
		build: { chunkSizeWarningLimit: 600 }
	};
});
