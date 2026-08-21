import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [chrome,targetUrl,passMarker,failMarker,timeoutArg='300000']=process.argv.slice(2);
if(!chrome||!targetUrl||!passMarker||!failMarker){
  console.error('Usage: node wait-browser-text.mjs <chrome> <url> <pass-marker> <fail-marker> [timeout-ms]');
  process.exit(2);
}
const timeoutMs=Number(timeoutArg);
if(!Number.isFinite(timeoutMs)||timeoutMs<=0)throw new Error(`Invalid timeout: ${timeoutArg}`);
const startupTimeoutMs=Math.min(30000,timeoutMs);

const userDataDir=await mkdtemp(join(tmpdir(),'latex-gym-chrome-'));
const stderr=[];
const browser=spawn(chrome,[
  '--headless',
  '--no-sandbox',
  '--disable-gpu',
  '--remote-debugging-address=127.0.0.1',
  '--remote-debugging-port=0',
  `--user-data-dir=${userDataDir}`,
  targetUrl
],{stdio:['ignore','ignore','pipe']});
browser.stderr.setEncoding('utf8');
browser.stderr.on('data',chunk=>{stderr.push(chunk);if(stderr.join('').length>120000)stderr.shift();});

let socket;
try{
  const port=await waitForDevToolsPort(userDataDir,startupTimeoutMs);
  const target=await waitForPage(port,targetUrl,startupTimeoutMs);
  socket=await connect(target.webSocketDebuggerUrl);
  const cdp=createCdp(socket);
  await cdp.send('Runtime.enable');
  const started=Date.now();
  let lastText='';
  while(Date.now()-started<timeoutMs){
    const textResult=await cdp.send('Runtime.evaluate',{expression:"document.getElementById('root')?.textContent ?? document.body?.innerText ?? ''",returnByValue:true});
    lastText=String(textResult?.result?.value??'');
    if(lastText.includes(passMarker)){
      const html=await cdp.send('Runtime.evaluate',{expression:'document.documentElement.outerHTML',returnByValue:true});
      process.stdout.write(String(html?.result?.value??lastText));
      process.exitCode=0;
      break;
    }
    if(lastText.includes(failMarker))throw new Error(lastText);
    await delay(250);
  }
  if(process.exitCode!==0){
    const html=await cdp.send('Runtime.evaluate',{expression:'document.documentElement.outerHTML',returnByValue:true}).catch(()=>null);
    throw new Error(`Timed out after ${timeoutMs}ms waiting for ${passMarker}. Last page state: ${lastText}\n${String(html?.result?.value??'')}`);
  }
}catch(error){
  console.error(error instanceof Error?error.stack??error.message:String(error));
  const browserLog=stderr.join('');
  if(browserLog)console.error(browserLog);
  process.exitCode=1;
}finally{
  try{socket?.close();}catch{}
  browser.kill('SIGTERM');
  await delay(100);
  if(browser.exitCode===null)browser.kill('SIGKILL');
  await rm(userDataDir,{recursive:true,force:true}).catch(()=>{});
}

async function waitForDevToolsPort(directory,timeout){
  const path=join(directory,'DevToolsActivePort');
  const started=Date.now();
  while(Date.now()-started<timeout){
    try{
      const [port]=String(await readFile(path,'utf8')).trim().split(/\r?\n/);
      if(port&&Number(port)>0)return Number(port);
    }catch{}
    if(browser.exitCode!==null)throw new Error(`Chrome exited before DevTools became available (code ${browser.exitCode})`);
    await delay(100);
  }
  throw new Error(`Timed out after ${timeout}ms waiting for Chrome DevTools port`);
}

async function waitForPage(port,url,timeout){
  const started=Date.now();
  while(Date.now()-started<timeout){
    try{
      const response=await fetch(`http://127.0.0.1:${port}/json/list`);
      const pages=await response.json();
      const page=pages.find(item=>item.type==='page'&&item.url===url)??pages.find(item=>item.type==='page');
      if(page?.webSocketDebuggerUrl)return page;
    }catch{}
    if(browser.exitCode!==null)throw new Error(`Chrome exited before a page target became available (code ${browser.exitCode})`);
    await delay(100);
  }
  throw new Error(`Timed out after ${timeout}ms waiting for browser page target`);
}

async function connect(url){
  const ws=new WebSocket(url);
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Timed out opening DevTools WebSocket')),10000);
    ws.onopen=()=>{clearTimeout(timer);resolve();};
    ws.onerror=()=>{clearTimeout(timer);reject(new Error('Failed to open DevTools WebSocket'));};
  });
  return ws;
}

function createCdp(ws){
  let id=0;
  const pending=new Map();
  ws.onmessage=event=>{
    const message=JSON.parse(String(event.data));
    if(!message.id)return;
    const item=pending.get(message.id);
    if(!item)return;
    pending.delete(message.id);
    if(message.error)item.reject(new Error(message.error.message??'CDP error'));
    else item.resolve(message.result);
  };
  ws.onclose=()=>{
    for(const item of pending.values())item.reject(new Error('DevTools WebSocket closed'));
    pending.clear();
  };
  return {send(method,params={}){
    const requestId=++id;
    return new Promise((resolve,reject)=>{
      pending.set(requestId,{resolve,reject});
      ws.send(JSON.stringify({id:requestId,method,params}));
    });
  }};
}

function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
