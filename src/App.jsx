import { lazy, Suspense } from 'react';
import Publico from './paginas/Publico.jsx';

// El panel se descarga solo si alguien entra a /admin: el lector de Excel pesa
// más que todo el cuadro y el público nunca lo necesita.
const Admin = lazy(() => import('./paginas/Admin.jsx'));

export default function App() {
	const enPanel = window.location.pathname.replace(/\/+$/, '') === '/admin';
	if (!enPanel) return <Publico />;
	return (
		<Suspense fallback={null}>
			<Admin />
		</Suspense>
	);
}
