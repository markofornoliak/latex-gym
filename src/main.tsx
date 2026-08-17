import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './data/editorialEnhancements';
import './data/curriculumExpansion';
import { App } from './app/App';
import './styles/index.css';
import './styles/fidelity.css';
import './styles/deviceLayouts.css';
import './styles/laptopPolish.css';

registerSW({ immediate: true });
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
