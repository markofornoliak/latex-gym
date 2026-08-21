type InstallPromptEvent=Event&{
  prompt:()=>Promise<void>;
  userChoice:Promise<{outcome:'accepted'|'dismissed';platform:string}>;
};

export type PwaLifecycleState={
  online:boolean;
  canInstall:boolean;
  installed:boolean;
  updateAvailable:boolean;
  offlineReady:boolean;
};

type UpdateServiceWorker=(reloadPage?:boolean)=>Promise<void>;

const listeners=new Set<()=>void>();
let initialized=false;
let installPrompt:InstallPromptEvent|null=null;
let updateServiceWorker:UpdateServiceWorker|null=null;
let state:PwaLifecycleState={
  online:typeof navigator==='undefined'?true:navigator.onLine,
  canInstall:false,
  installed:typeof window==='undefined'?false:window.matchMedia('(display-mode: standalone)').matches,
  updateAvailable:false,
  offlineReady:false
};

function publish(patch:Partial<PwaLifecycleState>){
  state={...state,...patch};
  for(const listener of listeners)listener();
}

export function initializePwaLifecycle(){
  if(initialized||typeof window==='undefined')return;
  initialized=true;
  window.addEventListener('online',()=>publish({online:true}));
  window.addEventListener('offline',()=>publish({online:false}));
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    installPrompt=event as InstallPromptEvent;
    publish({canInstall:true});
  });
  window.addEventListener('appinstalled',()=>{
    installPrompt=null;
    publish({canInstall:false,installed:true});
  });
  const displayMode=window.matchMedia('(display-mode: standalone)');
  displayMode.addEventListener?.('change',event=>publish({installed:event.matches,canInstall:event.matches?false:state.canInstall}));
}

export function bindPwaUpdater(updater:UpdateServiceWorker){updateServiceWorker=updater;}
export function markPwaUpdateAvailable(){publish({updateAvailable:true});}
export function markPwaOfflineReady(){publish({offlineReady:true});}
export function subscribePwaLifecycle(listener:()=>void){listeners.add(listener);return()=>listeners.delete(listener);}
export function getPwaLifecycleSnapshot(){return state;}

export async function requestPwaInstall(){
  if(!installPrompt)return false;
  const prompt=installPrompt;
  await prompt.prompt();
  const choice=await prompt.userChoice;
  installPrompt=null;
  publish({canInstall:false,installed:choice.outcome==='accepted'||state.installed});
  return choice.outcome==='accepted';
}

export async function applyPwaUpdate(){
  if(updateServiceWorker){
    await updateServiceWorker(true);
    return;
  }
  if(typeof window!=='undefined')window.location.reload();
}
