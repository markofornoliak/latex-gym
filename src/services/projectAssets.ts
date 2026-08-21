import type { CompilerProject } from '../types';
import { toCompilerProject, type ProjectWorkspace } from './projectWorkspace';

const PREFIX='__LATEX_GYM_BINARY_V1__:';
export const PROJECT_ASSET_MAX_BYTES=1024*1024;
export const PROJECT_ASSET_TOTAL_BYTES=Math.floor(1.5*1024*1024);
const allowedExtensions=new Set(['pdf','png','jpg','jpeg']);
const base64Pattern=/^[A-Za-z0-9+/]*={0,2}$/;

export function isSupportedProjectAsset(path:string){
  const extension=path.toLowerCase().split('.').pop()??'';
  return allowedExtensions.has(extension);
}

export function encodeProjectAsset(bytes:Uint8Array){
  if(bytes.length>PROJECT_ASSET_MAX_BYTES)throw new Error('Project asset exceeds the per-file size limit.');
  let binary='';
  const chunk=0x8000;
  for(let offset=0;offset<bytes.length;offset+=chunk){
    binary+=String.fromCharCode(...bytes.subarray(offset,Math.min(offset+chunk,bytes.length)));
  }
  return `${PREFIX}${btoa(binary)}`;
}

export function isEncodedProjectAsset(value:string){return value.startsWith(PREFIX);}

export function decodeProjectAsset(value:string){
  if(!isEncodedProjectAsset(value))return null;
  const encoded=value.slice(PREFIX.length);
  if(encoded.length===0||encoded.length%4===1||!base64Pattern.test(encoded))return null;
  try{
    const binary=atob(encoded);
    if(binary.length>PROJECT_ASSET_MAX_BYTES)return null;
    const bytes=new Uint8Array(binary.length);
    for(let index=0;index<binary.length;index+=1)bytes[index]=binary.charCodeAt(index);
    return bytes;
  }catch{return null;}
}

export function encodedProjectAssetSize(value:string){return decodeProjectAsset(value)?.length??0;}
export function workspaceAssetBytes(workspace:ProjectWorkspace){return Object.values(workspace.files).reduce((total,value)=>total+encodedProjectAssetSize(value),0);}

export function projectAssetProblem(workspace:ProjectWorkspace){
  let total=0;
  for(const [path,value] of Object.entries(workspace.files)){
    if(!isEncodedProjectAsset(value))continue;
    if(!isSupportedProjectAsset(path))return `Бинарный файл ${path} имеет неподдерживаемое расширение.`;
    const decoded=decodeProjectAsset(value);
    if(!decoded)return `Бинарный файл ${path} повреждён или превышает безопасный лимит 1 МБ.`;
    total+=decoded.length;
    if(total>PROJECT_ASSET_TOTAL_BYTES)return 'Суммарный объём бинарных файлов проекта превышает безопасный лимит 1,5 МБ.';
  }
  return null;
}

export function toBinaryAwareCompilerProject(workspace:ProjectWorkspace):CompilerProject{
  const problem=projectAssetProblem(workspace);
  if(problem)throw new Error(problem);
  const project=toCompilerProject(workspace);
  return {...project,files:project.files.map(file=>{
    if(typeof file.content!=='string')return file;
    const decoded=decodeProjectAsset(file.content);
    return decoded?{...file,content:decoded}:file;
  })};
}