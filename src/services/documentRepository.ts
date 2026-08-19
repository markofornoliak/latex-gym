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
const OPEN_TIMEOUT_MS=800;

class BrowserDocumentRepository implements DocumentRepository{
  private database:Promise<IDBDatabase|null>|null=null;

  async get(key:string){
    const canonical=migrateDocumentKey(key);
    const db=await this.openSafe();
    if(!db)return fallbackGet(canonical);
    try{
      return await new Promise<string|undefined>((resolve,reject)=>{
        const request=db.transaction(STORE,'readonly').objectStore(STORE).get(canonical);
        request.onsuccess=()=>resolve((request.result as DocumentRecord|undefined)?.content);
        request.onerror=()=>reject(request.error??new Error('IndexedDB read failed'));
      });
    }catch{return fallbackGet(canonical);}
  }

  async set(key:string,content:string){
    const canonical=migrateDocumentKey(key);
    const db=await this.openSafe();
    if(!db){fallbackSet(canonical,content);return;}
    try{await transactionDone(db,'readwrite',store=>store.put({key:canonical,content,updatedAt:new Date().toISOString()} satisfies DocumentRecord));}
    catch{fallbackSet(canonical,content);}
  }

  async remove(key:string){
    const canonical=migrateDocumentKey(key);
    const db=await this.openSafe();
    if(!db){fallbackRemove(canonical);return;}
    try{await transactionDone(db,'readwrite',store=>store.delete(canonical));}
    catch{fallbackRemove(canonical);}
  }

  async list(prefix=''){
    const canonicalPrefix=migrateDocumentKey(prefix);
    const db=await this.openSafe();
    if(!db)return fallbackList(canonicalPrefix);
    try{
      const indexed=await new Promise<Record<string,string>>((resolve,reject)=>{
        const output:Record<string,string>={};
        const request=db.transaction(STORE,'readonly').objectStore(STORE).openCursor();
        request.onsuccess=()=>{
          const cursor=request.result;
          if(!cursor){resolve(output);return;}
          const record=cursor.value as DocumentRecord;
          if(record.key.startsWith(canonicalPrefix))output[record.key]=record.content;
          cursor.continue();
        };
        request.onerror=()=>reject(request.error??new Error('IndexedDB cursor failed'));
      });
      return {...fallbackList(canonicalPrefix),...indexed};
    }catch{return fallbackList(canonicalPrefix);}
  }

  async setMany(documents:Record<string,string>){
    const entries=Object.entries(documents).filter(([,content])=>typeof content==='string');
    if(!entries.length)return;
    const db=await this.openSafe();
    if(!db){for(const [key,content] of entries)fallbackSet(migrateDocumentKey(key),content);return;}
    try{
      await new Promise<void>((resolve,reject)=>{
        const transaction=db.transaction(STORE,'readwrite');
        const store=transaction.objectStore(STORE);
        for(const [key,content] of entries)store.put({key:migrateDocumentKey(key),content,updatedAt:new Date().toISOString()} satisfies DocumentRecord);
        transaction.oncomplete=()=>resolve();
        transaction.onerror=()=>reject(transaction.error??new Error('IndexedDB write failed'));
        transaction.onabort=()=>reject(transaction.error??new Error('IndexedDB write aborted'));
      });
    }catch{for(const [key,content] of entries)fallbackSet(migrateDocumentKey(key),content);}
  }

  async clear(){
    const db=await this.openSafe();
    if(db){try{await transactionDone(db,'readwrite',store=>store.clear());}catch{/* fallback is cleared below */}}
    fallbackClear();
  }

  private openSafe(){
    if(!supportsIndexedDb())return Promise.resolve<IDBDatabase|null>(null);
    if(this.database)return this.database;
    this.database=new Promise<IDBDatabase|null>((resolve)=>{
      let settled=false;
      const finish=(value:IDBDatabase|null)=>{if(settled)return;settled=true;globalThis.clearTimeout(timer);resolve(value);};
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
    operation(transaction.objectStore(STORE));
    transaction.oncomplete=()=>resolve();
    transaction.onerror=()=>reject(transaction.error??new Error('IndexedDB transaction failed'));
    transaction.onabort=()=>reject(transaction.error??new Error('IndexedDB transaction aborted'));
  });
}
function fallbackKey(key:string){return `${FALLBACK_PREFIX}${key}`;}
function fallbackGet(key:string){if(typeof localStorage==='undefined')return undefined;return localStorage.getItem(fallbackKey(key))??undefined;}
function fallbackSet(key:string,value:string){if(typeof localStorage!=='undefined')localStorage.setItem(fallbackKey(key),value);}
function fallbackRemove(key:string){if(typeof localStorage!=='undefined')localStorage.removeItem(fallbackKey(key));}
function fallbackList(prefix:string){
  const output:Record<string,string>={};
  if(typeof localStorage==='undefined')return output;
  for(let index=0;index<localStorage.length;index++){
    const key=localStorage.key(index);if(!key?.startsWith(FALLBACK_PREFIX))continue;
    const documentKey=key.slice(FALLBACK_PREFIX.length);if(!documentKey.startsWith(prefix))continue;
    const content=localStorage.getItem(key);if(content!==null)output[documentKey]=content;
  }
  return output;
}
function fallbackClear(){
  if(typeof localStorage==='undefined')return;
  const keys:string[]=[];for(let index=0;index<localStorage.length;index++){const key=localStorage.key(index);if(key?.startsWith(FALLBACK_PREFIX))keys.push(key);}keys.forEach(key=>localStorage.removeItem(key));
}
