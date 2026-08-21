import { migrateDocumentKey } from '../data/exerciseIdentity';

export type DocumentRecord={key:string;content:string;updatedAt:string};
export interface DocumentRepository{
  get(key:string):Promise<string|undefined>;
  set(key:string,content:string):Promise<void>;
  remove(key:string):Promise<void>;
  list(prefix?:string):Promise<Record<string,string>>;
  setMany(documents:Record<string,string>):Promise<void>;
  clear():Promise<void>;
}

const DB_NAME='latex-gym-documents';
const DB_VERSION=1;
const STORE='documents';
const FALLBACK_PREFIX='latex-gym-document:';
const FALLBACK_VERSION=2;
const OPEN_TIMEOUT_MS=800;
const OPERATION_TIMEOUT_MS=1800;

type FallbackEnvelope={version:2;content:string;updatedAt:string};

class BrowserDocumentRepository implements DocumentRepository{
  private database:Promise<IDBDatabase|null>|null=null;

  async get(key:string){
    const canonical=migrateDocumentKey(key);
    const db=await this.openSafe();
    if(!db)return fallbackGet(canonical)?.content;
    try{
      const indexed=await withTimeout(readRecord(db,canonical),OPERATION_TIMEOUT_MS,'IndexedDB read timed out');
      const fallback=fallbackGet(canonical);
      if(fallback&&isLater(fallback.updatedAt,indexed?.updatedAt)){
        await withTimeout(writeRecord(db,{key:canonical,...fallback}),OPERATION_TIMEOUT_MS,'IndexedDB recovery write timed out');
        fallbackRemove(canonical);
        return fallback.content;
      }
      if(indexed){if(fallback)fallbackRemove(canonical);return indexed.content;}
      if(fallback){await withTimeout(writeRecord(db,{key:canonical,...fallback}),OPERATION_TIMEOUT_MS,'IndexedDB recovery write timed out');fallbackRemove(canonical);return fallback.content;}
      return undefined;
    }catch{
      return fallbackGet(canonical)?.content;
    }
  }

  async set(key:string,content:string){
    const canonical=migrateDocumentKey(key);
    const updatedAt=new Date().toISOString();
    const db=await this.openSafe();
    if(!db){fallbackSet(canonical,content,updatedAt);return;}
    try{
      await withTimeout(writeRecord(db,{key:canonical,content,updatedAt}),OPERATION_TIMEOUT_MS,'IndexedDB write timed out');
      fallbackRemove(canonical);
    }catch(error){
      fallbackSet(canonical,content,updatedAt);
      if(!fallbackGet(canonical))throw error;
    }
  }

  async remove(key:string){
    const canonical=migrateDocumentKey(key);
    const db=await this.openSafe();
    if(!db){fallbackRemove(canonical);return;}
    try{
      await withTimeout(transactionDone(db,'readwrite',store=>store.delete(canonical)),OPERATION_TIMEOUT_MS,'IndexedDB delete timed out');
      fallbackRemove(canonical);
    }catch(error){
      fallbackRemove(canonical);
      throw error;
    }
  }

  async list(prefix=''){
    const canonicalPrefix=migrateDocumentKey(prefix);
    const db=await this.openSafe();
    if(!db)return fallbackContents(fallbackList(canonicalPrefix));
    try{
      const indexed=await withTimeout(readAll(db,canonicalPrefix),OPERATION_TIMEOUT_MS,'IndexedDB cursor timed out');
      const fallback=fallbackList(canonicalPrefix);
      const output:Record<string,string>={};
      const keys=new Set([...Object.keys(indexed),...Object.keys(fallback)]);
      for(const key of keys){
        const primary=indexed[key];const secondary=fallback[key];
        if(secondary&&(!primary||isLater(secondary.updatedAt,primary.updatedAt))){
          output[key]=secondary.content;
          await withTimeout(writeRecord(db,{key,...secondary}),OPERATION_TIMEOUT_MS,'IndexedDB recovery write timed out');
          fallbackRemove(key);
        }else if(primary){output[key]=primary.content;if(secondary)fallbackRemove(key);}
        else if(secondary)output[key]=secondary.content;
      }
      return output;
    }catch{return fallbackContents(fallbackList(canonicalPrefix));}
  }

  async setMany(documents:Record<string,string>){
    const entries=Object.entries(documents).filter(([,content])=>typeof content==='string').map(([key,content])=>[migrateDocumentKey(key),content] as const);
    if(!entries.length)return;
    const updatedAt=new Date().toISOString();
    const db=await this.openSafe();
    if(!db){fallbackSetManyAtomic(entries,updatedAt);return;}
    try{
      await withTimeout(new Promise<void>((resolve,reject)=>{
        const transaction=db.transaction(STORE,'readwrite');
        const store=transaction.objectStore(STORE);
        for(const [key,content] of entries)store.put({key,content,updatedAt} satisfies DocumentRecord);
        transaction.oncomplete=()=>resolve();
        transaction.onerror=()=>reject(transaction.error??new Error('IndexedDB write failed'));
        transaction.onabort=()=>reject(transaction.error??new Error('IndexedDB write aborted'));
      }),OPERATION_TIMEOUT_MS,'IndexedDB batch write timed out');
      for(const [key] of entries)fallbackRemove(key);
    }catch{
      fallbackSetManyAtomic(entries,updatedAt);
    }
  }

  async clear(){
    const db=await this.openSafe();
    if(db){
      try{await withTimeout(transactionDone(db,'readwrite',store=>store.clear()),OPERATION_TIMEOUT_MS,'IndexedDB clear timed out');}
      catch(error){fallbackClear();throw error;}
    }
    fallbackClear();
  }

  private openSafe(){
    if(!supportsIndexedDb())return Promise.resolve<IDBDatabase|null>(null);
    if(this.database)return this.database;
    this.database=new Promise<IDBDatabase|null>((resolve)=>{
      let settled=false;
      const finish=(value:IDBDatabase|null)=>{if(settled){value?.close();return;}settled=true;globalThis.clearTimeout(timer);resolve(value);};
      const timer=globalThis.setTimeout(()=>finish(null),OPEN_TIMEOUT_MS);
      try{
        const request=indexedDB.open(DB_NAME,DB_VERSION);
        request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'key'});};
        request.onsuccess=()=>finish(request.result);
        request.onerror=()=>finish(null);
        request.onblocked=()=>finish(null);
      }catch{finish(null);}
    }).then(db=>{if(!db)this.database=null;return db;});
    return this.database;
  }
}

export const documentRepository:DocumentRepository=new BrowserDocumentRepository();

export async function migrateLegacyDocuments(drafts:Record<string,string>){
  const migrated:Record<string,string>={};
  for(const [key,content] of Object.entries(drafts))if(typeof content==='string')migrated[migrateDocumentKey(key)]=content;
  await documentRepository.setMany(migrated);
  return Object.keys(migrated).length;
}

function supportsIndexedDb(){return typeof indexedDB!=='undefined';}
function transactionDone(db:IDBDatabase,mode:IDBTransactionMode,operation:(store:IDBObjectStore)=>IDBRequest){
  return new Promise<void>((resolve,reject)=>{
    const transaction=db.transaction(STORE,mode);
    try{operation(transaction.objectStore(STORE));}catch(error){reject(error);return;}
    transaction.oncomplete=()=>resolve();
    transaction.onerror=()=>reject(transaction.error??new Error('IndexedDB transaction failed'));
    transaction.onabort=()=>reject(transaction.error??new Error('IndexedDB transaction aborted'));
  });
}
function readRecord(db:IDBDatabase,key:string){
  return new Promise<DocumentRecord|undefined>((resolve,reject)=>{
    const request=db.transaction(STORE,'readonly').objectStore(STORE).get(key);
    request.onsuccess=()=>resolve(isDocumentRecord(request.result)?request.result:undefined);
    request.onerror=()=>reject(request.error??new Error('IndexedDB read failed'));
  });
}
function writeRecord(db:IDBDatabase,record:DocumentRecord){return transactionDone(db,'readwrite',store=>store.put(record));}
function readAll(db:IDBDatabase,prefix:string){
  return new Promise<Record<string,DocumentRecord>>((resolve,reject)=>{
    const output:Record<string,DocumentRecord>={};
    const request=db.transaction(STORE,'readonly').objectStore(STORE).openCursor();
    request.onsuccess=()=>{
      try{
        const cursor=request.result;
        if(!cursor){resolve(output);return;}
        const record=cursor.value;
        if(isDocumentRecord(record)&&record.key.startsWith(prefix))output[record.key]=record;
        cursor.continue();
      }catch(error){reject(error);}
    };
    request.onerror=()=>reject(request.error??new Error('IndexedDB cursor failed'));
  });
}
function isDocumentRecord(value:unknown):value is DocumentRecord{
  if(value===null||typeof value!=='object')return false;
  const record=value as Partial<DocumentRecord>;
  return typeof record.key==='string'&&typeof record.content==='string'&&typeof record.updatedAt==='string'&&Number.isFinite(Date.parse(record.updatedAt));
}
function withTimeout<T>(promise:Promise<T>,milliseconds:number,message:string){
  return new Promise<T>((resolve,reject)=>{const timer=globalThis.setTimeout(()=>reject(new Error(message)),milliseconds);promise.then(value=>{globalThis.clearTimeout(timer);resolve(value);},error=>{globalThis.clearTimeout(timer);reject(error);});});
}
function isLater(left:string|undefined,right:string|undefined){const a=left?Date.parse(left):0,b=right?Date.parse(right):0;return Number.isFinite(a)&&a>Math.max(0,Number.isFinite(b)?b:0);}
function fallbackKey(key:string){return `${FALLBACK_PREFIX}${key}`;}
function fallbackGet(key:string){if(typeof localStorage==='undefined')return undefined;return parseFallbackValue(localStorage.getItem(fallbackKey(key)));}
function fallbackSet(key:string,value:string,updatedAt=new Date().toISOString()){if(typeof localStorage==='undefined')throw new Error('Local storage is unavailable');const envelope:FallbackEnvelope={version:FALLBACK_VERSION,content:value,updatedAt};localStorage.setItem(fallbackKey(key),JSON.stringify(envelope));}
function fallbackRemove(key:string){if(typeof localStorage!=='undefined')localStorage.removeItem(fallbackKey(key));}
function fallbackList(prefix:string){
  const output:Record<string,FallbackEnvelope>={};
  if(typeof localStorage==='undefined')return output;
  for(let index=0;index<localStorage.length;index++){
    const key=localStorage.key(index);if(!key?.startsWith(FALLBACK_PREFIX))continue;
    const documentKey=key.slice(FALLBACK_PREFIX.length);if(!documentKey.startsWith(prefix))continue;
    const record=parseFallbackValue(localStorage.getItem(key));if(record)output[documentKey]=record;
  }
  return output;
}
function fallbackSetManyAtomic(entries:readonly (readonly [string,string])[],updatedAt:string){
  if(typeof localStorage==='undefined')throw new Error('Local storage is unavailable');
  const previous=new Map(entries.map(([key])=>[key,localStorage.getItem(fallbackKey(key))]));
  try{for(const [key,content] of entries)fallbackSet(key,content,updatedAt);}
  catch(error){for(const [key,value] of previous){try{if(value===null)localStorage.removeItem(fallbackKey(key));else localStorage.setItem(fallbackKey(key),value);}catch{/* preserve original failure */}}throw error;}
}
function fallbackClear(){
  if(typeof localStorage==='undefined')return;
  const keys:string[]=[];for(let index=0;index<localStorage.length;index++){const key=localStorage.key(index);if(key?.startsWith(FALLBACK_PREFIX))keys.push(key);}keys.forEach(key=>localStorage.removeItem(key));
}
function parseFallbackValue(raw:string|null):FallbackEnvelope|undefined{
  if(raw===null)return undefined;
  try{
    const value=JSON.parse(raw) as Partial<FallbackEnvelope>;
    if(value.version===FALLBACK_VERSION&&typeof value.content==='string'&&typeof value.updatedAt==='string'&&Number.isFinite(Date.parse(value.updatedAt)))return value as FallbackEnvelope;
  }catch{/* legacy raw string below */}
  return {version:FALLBACK_VERSION,content:raw,updatedAt:'1970-01-01T00:00:00.000Z'};
}
function fallbackContents(records:Record<string,FallbackEnvelope>){return Object.fromEntries(Object.entries(records).map(([key,record])=>[key,record.content]));}

export const documentRepositoryInternals={isDocumentRecord,parseFallbackValue,isLater};