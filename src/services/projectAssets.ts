import type { CompilerProject } from '../types';
import { toCompilerProject, type ProjectWorkspace } from './projectWorkspace';

const PREFIX='__LATEX_GYM_BINARY_V1__:';
export const PROJECT_ASSET_MAX_BYTES=5*1024*1024;
const allowedExtensions=new Set(['pdf','png','jpg','jpeg']);

export function isSupportedProjectAsset(path:string){
  const extension=path.toLowerCase().split('.').pop()??'';
  return allowedExtensions.has(extension);
}

export function encodeProjectAsset(bytes:Uint8Array){
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
  const binary=atob(value.slice(PREFIX.length));
  const bytes=new Uint8Array(binary.length);
  for(let index=0;index<binary.length;index+=1)bytes[index]=binary.charCodeAt(index);
  return bytes;
}

export function encodedProjectAssetSize(value:string){return decodeProjectAsset(value)?.length??0;}

export function toBinaryAwareCompilerProject(workspace:ProjectWorkspace):CompilerProject{
  const project=toCompilerProject(workspace);
  return {...project,files:project.files.map(file=>{
    if(typeof file.content!=='string')return file;
    const decoded=decodeProjectAsset(file.content);
    return decoded?{...file,content:decoded}:file;
  })};
}
