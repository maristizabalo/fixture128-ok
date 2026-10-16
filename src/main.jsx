import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource/anton/400.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/800.css';
import '@fontsource/montserrat/900.css';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './estilos/base.css';

import App from './App.jsx';

createRoot(document.getElementById('raiz')).render(
	<StrictMode>
		<App />
	</StrictMode>
);
