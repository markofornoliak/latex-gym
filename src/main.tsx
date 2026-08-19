import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';
import { initializeDocumentPersistence } from './store/useAppStore';
import './styles/app.css';

registerSW({ immediate: true });

async function bootstrap(){
  await initializeDocumentPersistence();
  createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
}

void bootstrap();
