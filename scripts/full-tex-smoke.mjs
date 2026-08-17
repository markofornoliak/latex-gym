const targetUrl=process.argv[2];
if(!targetUrl)throw new Error('Usage: node scripts/full-tex-smoke.mjs <url>');
const cdpBase=process.env.CDP_URL??'http://127.0.0.1:9222';
const deadline=Date.now()+120_000;

const targets=await fetch(`${cdpBase}/json`).then(response=>response.json());
const target=targets.find(item=>item.type==='page');
if(!target?.webSocketDebuggerUrl)throw new Error('No Chrome DevTools page target found.');

const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',()=>reject(new Error('Cannot connect to Chrome DevTools.')),{once:true});});
let nextId=1;
const pending=new Map();
socket.addEventListener('message',event=>{
  const message=JSON.parse(String(event.data));
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

let last='';
while(Date.now()<deadline){
  const result=await command('Runtime.evaluate',{expression:'document.body ? document.body.textContent : ""',returnByValue:true});
  last=String(result?.result?.value??'').trim();
  if(last.includes('FULL_TEX_OK')){
    console.log(last);
    socket.close();
    process.exit(0);
  }
  if(last.includes('FULL_TEX_FAILED')){
    socket.close();
    throw new Error(last);
  }
  await new Promise(resolve=>setTimeout(resolve,500));
}

socket.close();
throw new Error(`Full TeX smoke timed out after 120s. Last page state: ${last}`);
