import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';
import { bindPwaUpdater, initializePwaLifecycle, markPwaOfflineReady, markPwaUpdateAvailable } from './services/pwaLifecycle';
import { initializeDocumentPersistence } from './store/useAppStore';
import './styles/app.css';

initializePwaLifecycle();
const updateServiceWorker=registerSW({
  immediate:true,
  onNeedRefresh:markPwaUpdateAvailable,
  onOfflineReady:markPwaOfflineReady
});
bindPwaUpdater(updateServiceWorker);

createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
void initializeDocumentPersistence();
