import type { PreviewBlock } from '../types';

export type CausalTarget={
  id:string;
  label:string;
  blockIndex:number;
  part?:'fraction'|'numerator'|'denominator';
  fractionIndex?:number;
};

export type SourceLink={
  id:string;
  label:string;
  from:number;
  to:number;
  target:CausalTarget;
};

export type SourceOutputMap={links:SourceLink[];targets:CausalTarget[]};

type Group={open:number;close:number;content:string};

export function buildSourceOutputMap(source:string,blocks:PreviewBlock[]):SourceOutputMap{
  const links:SourceLink[]=[];
  const headingOwners:Array<{sourceIndex:number;blockIndex:number;id:string;label:string}>=[];
  let serial=0;

  for(const match of source.matchAll(/\\(section|subsection|subsubsection)\*?\{([^}]*)\}/g)){
    const from=match.index??0;
    const text=match[2];
    const blockIndex=findHeadingBlock(blocks,text);
    if(blockIndex<0)continue;
    const id=`source-heading-${serial++}`;
    const label=`Заголовок «${text}»`;
    const target={id,label,blockIndex} satisfies CausalTarget;
    links.push({id,label,from,to:from+match[0].length,target});
    headingOwners.push({sourceIndex:from,blockIndex,id,label});
  }

  const fractions=findFractions(source);
  for(const fraction of fractions){
    const location=findMathBlockForFraction(blocks,fraction.full);
    if(location.blockIndex<0)continue;
    const parts:Array<{label:string;from:number;to:number;part:CausalTarget['part']}>= [
      {label:'Команда дроби',from:fraction.from,to:fraction.commandEnd,part:'fraction'},
      {label:'Числитель',from:fraction.numerator.open+1,to:fraction.numerator.close,part:'numerator'},
      {label:'Знаменатель',from:fraction.denominator.open+1,to:fraction.denominator.close,part:'denominator'}
    ];
    for(const part of parts){
      if(part.to<=part.from)continue;
      const id=`source-fraction-${serial++}`;
      const target={id,label:part.label,blockIndex:location.blockIndex,part:part.part,fractionIndex:location.fractionIndex} satisfies CausalTarget;
      links.push({id,label:part.label,from:part.from,to:part.to,target});
    }
  }

  for(const match of source.matchAll(/\\label\{([^}]+)\}/g)){
    const from=match.index??0;
    const owner=[...headingOwners].reverse().find(item=>item.sourceIndex<from)??findNearestMathOwner(source,blocks,from);
    if(!owner)continue;
    const id=`source-label-${serial++}`;
    const label=`Метка ${match[1]} — идентичность объекта`;
    const target={id,label,blockIndex:owner.blockIndex} satisfies CausalTarget;
    links.push({id,label,from,to:from+match[0].length,target});
  }

  addSimpleMathLinks(source,blocks,links,serial);
  const nonOverlapping=preferSpecificNonOverlapping(links);
  return {links:nonOverlapping,targets:nonOverlapping.map(link=>link.target)};
}

function findFractions(source:string){
  const result:Array<{from:number;commandEnd:number;numerator:Group;denominator:Group;full:string}>=[];
  let cursor=0;
  while(cursor<source.length){
    const relative=source.slice(cursor).search(/\\frac\s*\{/);
    if(relative<0)break;
    const from=cursor+relative;
    const commandEnd=source.indexOf('{',from);
    if(commandEnd<0)break;
    const numerator=readGroup(source,commandEnd);
    if(!numerator){cursor=commandEnd+1;continue;}
    let next=numerator.close+1;
    while(/\s/.test(source[next]??''))next++;
    if(source[next]!=='{'){cursor=numerator.close+1;continue;}
    const denominator=readGroup(source,next);
    if(!denominator){cursor=next+1;continue;}
    result.push({from,commandEnd,numerator,denominator,full:source.slice(from,denominator.close+1)});
    cursor=denominator.close+1;
  }
  return result;
}

function readGroup(source:string,open:number):Group|undefined{
  if(source[open]!=='{')return undefined;
  let depth=0;
  for(let index=open;index<source.length;index++){
    if(source[index]==='{'&&source[index-1]!=='\\')depth++;
    if(source[index]==='}'&&source[index-1]!=='\\'){
      depth--;
      if(depth===0)return {open,close:index,content:source.slice(open+1,index)};
    }
  }
  return undefined;
}

function findHeadingBlock(blocks:PreviewBlock[],text:string){
  return blocks.findIndex(block=>block.type==='heading'&&block.text.trim()===text.trim());
}

function findMathBlockForFraction(blocks:PreviewBlock[],fraction:string){
  const needle=normalizeMath(fraction);
  for(let blockIndex=0;blockIndex<blocks.length;blockIndex++){
    const block=blocks[blockIndex];
    if(block.type!=='math')continue;
    const normalized=normalizeMath(block.latex);
    const offset=normalized.indexOf(needle);
    if(offset<0)continue;
    const before=normalized.slice(0,offset);
    return {blockIndex,fractionIndex:(before.match(/\\frac/g)??[]).length};
  }
  return {blockIndex:-1,fractionIndex:0};
}

function findNearestMathOwner(source:string,blocks:PreviewBlock[],before:number){
  const prefix=source.slice(0,before);
  const equationStart=Math.max(prefix.lastIndexOf('\\begin{equation}'),prefix.lastIndexOf('\\begin{equation*}'),prefix.lastIndexOf('\\begin{align}'),prefix.lastIndexOf('\\begin{align*}'));
  if(equationStart<0)return undefined;
  const mathBlocks=blocks.map((block,index)=>({block,index})).filter(item=>item.block.type==='math');
  if(!mathBlocks.length)return undefined;
  return {sourceIndex:equationStart,blockIndex:mathBlocks.at(-1)!.index,id:'math-owner',label:'Математический объект'};
}

function addSimpleMathLinks(source:string,blocks:PreviewBlock[],links:SourceLink[],serialStart:number){
  let serial=serialStart;
  const ranges=[
    ...[...source.matchAll(/\\\[([\s\S]*?)\\\]/g)].map(match=>({from:(match.index??0)+2,to:(match.index??0)+match[0].length-2,latex:match[1]})),
    ...[...source.matchAll(/(?<!\\)\$([^$\n]+)(?<!\\)\$/g)].map(match=>({from:(match.index??0)+1,to:(match.index??0)+match[0].length-1,latex:match[1]}))
  ];
  for(const range of ranges){
    if(/\\frac\b/.test(range.latex))continue;
    const blockIndex=blocks.findIndex(block=>block.type==='math'&&normalizeMath(block.latex)===normalizeMath(range.latex));
    if(blockIndex<0)continue;
    const id=`source-math-${serial++}`;
    const label='Математический фрагмент';
    links.push({id,label,from:range.from,to:range.to,target:{id,label,blockIndex}});
  }
}

function preferSpecificNonOverlapping(links:SourceLink[]){
  const sorted=[...links].sort((a,b)=>a.from-b.from||(a.to-a.from)-(b.to-b.from));
  const result:SourceLink[]=[];
  for(const link of sorted){
    if(result.some(existing=>link.from<existing.to&&link.to>existing.from))continue;
    result.push(link);
  }
  return result.sort((a,b)=>a.from-b.from);
}

function normalizeMath(value:string){return value.replace(/\s+/g,'').replace(/&/g,'');}
