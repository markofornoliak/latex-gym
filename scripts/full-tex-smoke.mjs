const targetUrl=process.argv[2];
if(!targetUrl)throw new Error('Usage: node scripts/full-tex-smoke.mjs <url>');
const cdpBase=process.env.CDP_URL??'http://127.0.0.1:9222';
const timeoutMs=Number(process.env.SMOKE_TIMEOUT_MS??300_000);
const deadline=Date.now()+timeoutMs;

const targets=await fetch(`${cdpBase}/json`).then(response=>response.json());
const target=targets.find(item=>item.type==='page');
if(!target?.webSocketDebuggerUrl)throw new Error('No Chrome DevTools page target found.');

const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',()=>reject(new Error('Cannot connect to Chrome DevTools.')),{once:true});});
let nextId=1;
const pending=new Map();
const runtimeEvents=[];
socket.addEventListener('message',event=>{
  const message=JSON.parse(String(event.data));
  if(message.method==='Runtime.exceptionThrown')runtimeEvents.push(`exception: ${message.params?.exceptionDetails?.text??'unknown'}`);
  if(message.method==='Runtime.consoleAPICalled')runtimeEvents.push(`console: ${(message.params?.args??[]).map(arg=>arg.value??arg.description??'').join(' ')}`);
  if(!message.id)return;
  const entry=pending.get(message.id);
  if(!entry)return;
  pending.delete(message.id);
  if(message.error)entry.reject(new Error(message.error.message));else entry.resolve(message.result);
});

const command=(method,params={})=>new Promise((resolve,reject)=>{
  const id=nextId++;
  pending.set(id,{resolve,reject});
  socket.send(JSON.stringify({id,method,params}));
});

await command('Page.enable');
await command('Runtime.enable');
await command('Page.navigate',{url:targetUrl});

let last={status:'',text:''};
let previousStatus='';
while(Date.now()<deadline){
  const result=await command('Runtime.evaluate',{
    expression:`(()=>({status:document.body?.dataset?.status??'',text:document.body?.innerText?.trim()??''}))()`,
    returnByValue:true
  });
  const value=result?.result?.value??{};
  last={status:String(value.status??''),text:String(value.text??'')};
  if(last.status!==previousStatus){console.log(`FULL_TEX_PHASE ${last.status||'unset'} ${last.text.slice(0,300)}`);previousStatus=last.status;}
  if(last.status==='success'){
    console.log(last.text||'FULL_TEX_OK');
    socket.close();
    process.exit(0);
  }
  if(last.status==='failed'){
    socket.close();
    throw new Error(`${last.text||'Full TeX smoke failed.'}${runtimeEvents.length?`\nRuntime events:\n${runtimeEvents.slice(-20).join('\n')}`:''}`);
  }
  await new Promise(resolve=>setTimeout(resolve,500));
}

socket.close();
throw new Error(`Full TeX smoke timed out after ${Math.round(timeoutMs/1000)}s. Last page status=${last.status||'unset'} text=${last.text.slice(0,2000)}${runtimeEvents.length?`\nRuntime events:\n${runtimeEvents.slice(-20).join('\n')}`:''}`);
