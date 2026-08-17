import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './data/editorialEnhancements';
import { App } from './app/App';
import './styles/index.css';
import './styles/fidelity.css';

registerSW({ immediate: true });
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
