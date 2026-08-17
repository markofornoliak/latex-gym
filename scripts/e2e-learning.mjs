import { mkdir, writeFile } from 'node:fs/promises';

const origin=process.argv[2]??'http://127.0.0.1:4173';
const appBase=`${origin}/latex-gym`;
const cdpBase=process.env.CDP_URL??'http://127.0.0.1:9222';
const screenshots='qa-screenshots';
await mkdir(screenshots,{recursive:true});

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
const command=(method,params={})=>new Promise((resolve,reject)=>{const id=nextId++;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
const evaluate=async(expression)=>{
  const result=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if(result.exceptionDetails)throw new Error(result.exceptionDetails.text||'Runtime evaluation failed.');
  return result.result?.value;
};
const delay=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
const waitFor=async(expression,label,timeout=20_000)=>{
  const deadline=Date.now()+timeout;
  while(Date.now()<deadline){if(await evaluate(expression))return;await delay(150);}
  throw new Error(`Timed out waiting for ${label}`);
};
const navigate=async(route)=>{
  await command('Page.navigate',{url:`${appBase}/#${route}`});
  await waitFor("document.readyState === 'complete'",`page load ${route}`);
  await waitFor("Boolean(document.querySelector('#root')?.textContent?.trim())",`app render ${route}`);
  if(await evaluate("document.body.textContent.includes('Страница не найдена')"))throw new Error(`Route not found: ${route}`);
};
const clickText=async(selector,text)=>{
  const source=JSON.stringify(text);
  const selectorJson=JSON.stringify(selector);
  const clicked=await evaluate(`(()=>{const target=[...document.querySelectorAll(${selectorJson})].find(el=>el.textContent?.trim().includes(${source}));if(!target)return false;target.click();return true;})()`);
  if(!clicked)throw new Error(`Cannot find ${selector} containing ${text}`);
};
const screenshot=async(name,width=1280,height=800)=>{
  await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  const capture=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
  await writeFile(`${screenshots}/${name}.png`,Buffer.from(capture.data,'base64'));
};
const focusAndReplace=async(selector,text)=>{
  const found=await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return false;el.focus();return true;})()`);
  if(!found)throw new Error(`Cannot focus ${selector}`);
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Control',code:'ControlLeft',modifiers:2});
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:2});
  await command('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:2});
  await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Control',code:'ControlLeft'});
  await command('Input.insertText',{text});
  await delay(200);
};

await command('Page.enable');
await command('Runtime.enable');
await command('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});

await navigate('/lesson/what-is-latex');
await evaluate("localStorage.removeItem('latex-gym-state'); sessionStorage.clear(); true");
await navigate('/lesson/what-is-latex');
await waitFor("document.querySelector('h1')?.textContent?.includes('Что такое LaTeX')",'foundation lesson');

await navigate('/practice/deep-001');
await waitFor("document.body.textContent.includes('Ответ без компиляции')",'conceptual exercise mode');
const conceptualSelected=await evaluate(`(()=>{const label=[...document.querySelectorAll('.concept-choice')].find(el=>el.textContent?.includes('source.tex'));if(!label)return false;label.click();return true;})()`);
if(!conceptualSelected)throw new Error('Conceptual exercise did not expose source.tex selection.');
await clickText('button','Проверить ответ');
await waitFor("document.body.textContent.includes('Решение принято')",'conceptual exercise acceptance');
await screenshot('e2e-conceptual-pass',1280,800);

await navigate('/practice/e01');
await waitFor("Boolean(document.querySelector('.cm-content'))",'CodeMirror editor');
const broken='\\documentclass{article}\n\\begin{document}\nТекст без закрытия окружения.';
await focusAndReplace('.cm-content',broken);
await clickText('button','Скомпилировать');
await waitFor("document.body.textContent.includes('Компиляция остановлена')",'compiler error state');
await screenshot('e2e-compile-error',1280,800);

const fixed='\\documentclass{article}\n\\begin{document}\nДругой допустимый абзац.\n\\end{document}';
await focusAndReplace('.cm-content',fixed);
await clickText('button','Скомпилировать');
await waitFor("document.body.textContent.includes('Документ собирается')",'successful compile');
await clickText('button','Проверить решение');
await waitFor("document.body.textContent.includes('Решение принято')",'solution acceptance');
await screenshot('e2e-solution-pass',1280,800);

const persistedBefore=await evaluate(`(()=>{const raw=localStorage.getItem('latex-gym-state');if(!raw)return false;const parsed=JSON.parse(raw);return Boolean(parsed.state?.completedExercises?.includes('e01'));})()`);
if(!persistedBefore)throw new Error('Successful exercise did not persist progress.');
await command('Page.reload',{ignoreCache:true});
await waitFor("Boolean(document.querySelector('.practice-screen'))",'practice page after reload');
const persistedAfter=await evaluate(`(()=>{const raw=localStorage.getItem('latex-gym-state');if(!raw)return false;const parsed=JSON.parse(raw);return Boolean(parsed.state?.completedExercises?.includes('e01'));})()`);
if(!persistedAfter)throw new Error('Exercise progress was lost after reload.');

await navigate('/lesson/compilation-model');
await waitFor("Boolean(document.querySelector('.lesson-page h1'))",'direct-linked next lesson');

await navigate('/practice/e01');
await waitFor("Boolean(document.querySelector('.cm-content'))",'editor before fullscreen');
const fullscreen=await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(el=>el.getAttribute('aria-label')==='Открыть редактор на весь экран');if(!button)return false;button.click();return true;})()`);
if(!fullscreen)throw new Error('Fullscreen editor control not found.');
await waitFor("Boolean(document.querySelector('.editor-frame--fullscreen'))",'fullscreen editor state');
await screenshot('e2e-editor-fullscreen',1280,800);
await evaluate(`document.querySelector('.editor-frame--fullscreen button[aria-label="Выйти из полноэкранного редактора"]')?.click(); true`);

const openedSearch=await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(el=>el.textContent?.includes('Поиск'));if(!button)return false;button.click();return true;})()`);
if(!openedSearch)throw new Error('Global search control not found.');
await waitFor("Boolean(document.querySelector('.command-palette input'))",'global search dialog');
await focusAndReplace('.command-palette input','bibliography');
await waitFor("document.body.textContent.includes('Пакет') || document.body.textContent.includes('Команда')",'grouped search result');
await screenshot('e2e-global-search',1280,800);

console.log('E2E_LEARNING_OK conceptual → compile error → repair → submit → persistence → deep link → fullscreen → search');
socket.close();
