const origin=process.argv[2]??'http://127.0.0.1:4173';
const appBase=`${origin}/latex-gym`;
const cdpBase=process.env.CDP_URL??'http://127.0.0.1:9222';
const targets=await fetch(`${cdpBase}/json`).then(response=>response.json());
const target=targets.find(item=>item.type==='page');
if(!target?.webSocketDebuggerUrl)throw new Error('No Chrome DevTools page target found.');
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',()=>reject(new Error('Cannot connect to Chrome DevTools.')),{once:true});});
let nextId=1;const pending=new Map();
socket.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(!message.id)return;const item=pending.get(message.id);if(!item)return;pending.delete(message.id);if(message.error)item.reject(new Error(message.error.message));else item.resolve(message.result);});
const command=(method,params={})=>new Promise((resolve,reject)=>{const id=nextId++;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const result=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text||'Runtime evaluation failed.');return result.result?.value;};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const waitFor=async(expression,label,timeout=30_000)=>{const deadline=Date.now()+timeout;while(Date.now()<deadline){if(await evaluate(expression))return;await delay(180);}throw new Error(`Timed out waiting for ${label}`);};
await command('Page.enable');await command('Runtime.enable');await command('Network.enable');
await command('Page.navigate',{url:`${appBase}/#/lesson/what-is-latex`});
await waitFor("document.readyState === 'complete'",'initial online page');
await waitFor("document.querySelector('h1')?.textContent?.includes('Что такое LaTeX')",'online lesson');
await waitFor("'serviceWorker' in navigator",'service worker API');
await evaluate("navigator.serviceWorker.ready.then(()=>true)");
if(!await evaluate('Boolean(navigator.serviceWorker.controller)')){
  await command('Page.reload',{ignoreCache:false});
  await waitFor("document.querySelector('h1')?.textContent?.includes('Что такое LaTeX')",'controlled lesson after reload');
  await waitFor('Boolean(navigator.serviceWorker.controller)','service worker controller');
}
await command('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0,connectionType:'none'});
try{
  await command('Page.navigate',{url:`${appBase}/#/practice`});
  await waitFor("document.readyState === 'complete'",'offline page load');
  await waitFor("document.body.textContent.includes('Тренировка исходника')",'offline practice route',20_000);
  if(await evaluate("document.body.textContent.includes('Страница не найдена')"))throw new Error('Offline navigation rendered route fallback instead of the application.');
  const resources=await evaluate("performance.getEntriesByType('resource').map(entry=>entry.name).filter(name=>name.includes('/full-tex/')).length");
  if(resources!==0)throw new Error('Beginner offline navigation unexpectedly attempted to load the heavy TeX engine.');
  console.log('E2E_PWA_OK install → control → offline navigation → cached app shell; no Full TeX fetch');
}finally{
  await command('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1,connectionType:'wifi'}).catch(()=>{});
  socket.close();
}
