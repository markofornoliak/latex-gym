import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';
import { initializeDocumentPersistence } from './store/useAppStore';
import './styles/app.css';

const root=document.getElementById('root')!;
const qaMode=new URLSearchParams(window.location.search).get('qa');

if(qaMode==='compiler-api'){
  root.setAttribute('data-state','starting');
  root.textContent='COMPILER_API_SMOKE_LOADING';
  try{
    // Keep module evaluation pending until the asynchronous compiler smoke finishes.
    // Headless Chrome's --dump-dom can then wait on the document load lifecycle instead
    // of fast-forwarding virtual time, which otherwise races production timeout guards.
    const module=await import('./qa/compilerApiSmoke');
    await module.runCompilerApiSmoke(root);
  }catch(error){
    root.setAttribute('data-state','failed');
    root.textContent=`COMPILER_API_SMOKE_FAIL ${error instanceof Error?error.message:String(error)}`;
  }
}else{
  registerSW({ immediate: true });
  createRoot(root).render(<StrictMode><App/></StrictMode>);
  void initializeDocumentPersistence();
}
