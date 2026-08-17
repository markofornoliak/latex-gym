import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Compartment, EditorState } from '@codemirror/state';
import { Decoration, EditorView, crosshairCursor, drawSelection, dropCursor, highlightActiveLine, hoverTooltip, keymap, lineNumbers, rectangularSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, defaultHighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap, snippetCompletion, type Completion, type CompletionContext } from '@codemirror/autocomplete';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { ExpandIcon } from './Icons';
import { commandKnowledge, commandPriority, environmentKnowledge, findLabels, getCommandKnowledge, getEnvironmentKnowledge, packageNames } from '../data/latexKnowledge';
import type { Diagnostic } from '../types';

type EditorProps={
  value:string;
  onChange:(value:string)=>void;
  wordWrap?:boolean;
  showLineNumbers?:boolean;
  autoClose?:boolean;
  minHeight?:number;
  onReset?:()=>void;
  onCompile?:()=>void;
  onSave?:()=>void;
  onShowShortcuts?:()=>void;
  diagnostics?:Diagnostic[];
};

const snippetCompletions:Completion[]=[
  snippetCompletion('\\section{${title}}',{label:'sec',type:'text',detail:'snippet → \\section{}'}),
  snippetCompletion('\\subsection{${title}}',{label:'subsec',type:'text',detail:'snippet → \\subsection{}'}),
  snippetCompletion('\\frac{${numerator}}{${denominator}}',{label:'frac',type:'text',detail:'snippet → fraction'}),
  snippetCompletion('\\begin{equation}\n  ${formula}\n\\end{equation}',{label:'eq',type:'text',detail:'snippet → equation'}),
  snippetCompletion('\\begin{align}\n  ${left} &= ${right} \\\\\n  ${next}\n\\end{align}',{label:'align',type:'text',detail:'snippet → align · amsmath'}),
  snippetCompletion('\\begin{itemize}\n  \\item ${item}\n\\end{itemize}',{label:'itemize',type:'text',detail:'snippet → itemize'}),
  snippetCompletion('\\begin{figure}\n  \\centering\n  \\includegraphics[width=\\linewidth]{${file}}\n  \\caption{${caption}}\n  \\label{fig:${key}}\n\\end{figure}',{label:'fig',type:'text',detail:'snippet → figure · graphicx'})
];

function latexCompletion(context:CompletionContext){
  const source=context.state.doc.toString();
  const before=source.slice(0,context.pos);

  const labelWord=context.matchBefore(/\\(?:ref|pageref|autoref|eqref)\{[^}]*$/);
  if(labelWord){
    const open=labelWord.text.lastIndexOf('{');
    return {from:labelWord.from+open+1,options:findLabels(source).map(label=>({label,type:'variable',detail:'label'})),validFor:/^[^}]*$/};
  }

  const environmentWord=context.matchBefore(/\\(?:begin|end)\{[A-Za-z*]*$/);
  if(environmentWord){
    const open=environmentWord.text.lastIndexOf('{');
    return {from:environmentWord.from+open+1,options:environmentKnowledge.map(item=>({label:item.name,type:'keyword',detail:item.entry.title,apply:item.name})),validFor:/^[A-Za-z*]*$/};
  }

  const commandWord=context.matchBefore(/\\[a-zA-Z@]*$/);
  if(commandWord){
    const documentStart=source.indexOf('\\begin{document}');
    const preamble=documentStart<0||context.pos<documentStart;
    const mathMode=isMathMode(before);
    const packages=packageNames(source);
    const options:Completion[]=commandKnowledge.map(item=>{
      const missingPackage=Boolean(item.entry.package&&!packages.has(item.entry.package));
      const detail=missingPackage?`${item.detail} · пакет не подключён`:item.detail;
      return {label:`\\${item.name}`,type:'keyword',detail,apply:item.insert,boost:commandPriority(item,{mathMode,preamble,packages})};
    });
    return {from:commandWord.from,options,validFor:/^\\[a-zA-Z@]*$/};
  }

  const snippetWord=context.matchBefore(/[a-zA-Z]+$/);
  if(snippetWord&&(context.explicit||snippetWord.text.length>=2))return {from:snippetWord.from,options:snippetCompletions,validFor:/^[a-zA-Z]+$/};
  return null;
}

const commandHover=hoverTooltip((view,pos)=>{
  const line=view.state.doc.lineAt(pos);
  const relative=pos-line.from;
  const commandMatches=[...line.text.matchAll(/\\([a-zA-Z@]+)\b/g)];
  const commandMatch=commandMatches.find(candidate=>candidate.index!==undefined&&relative>=candidate.index&&relative<=candidate.index+candidate[0].length);
  if(commandMatch&&commandMatch.index!==undefined){
    const knowledge=getCommandKnowledge(commandMatch[1]);
    if(knowledge)return tooltip(line.from+commandMatch.index,line.from+commandMatch.index+commandMatch[0].length,knowledge.entry.syntax,knowledge.entry.description,knowledge.entry.package);
  }

  const environmentMatches=[...line.text.matchAll(/\\(?:begin|end)\{([A-Za-z*]+)\}/g)];
  const environmentMatch=environmentMatches.find(candidate=>candidate.index!==undefined&&relative>=candidate.index&&relative<=candidate.index+candidate[0].length);
  if(environmentMatch&&environmentMatch.index!==undefined){
    const knowledge=getEnvironmentKnowledge(environmentMatch[1]);
    if(knowledge)return tooltip(line.from+environmentMatch.index,line.from+environmentMatch.index+environmentMatch[0].length,knowledge.entry.syntax,knowledge.entry.description,knowledge.entry.package);
  }
  return null;
});

export function CodeEditor({value,onChange,wordWrap=true,showLineNumbers=true,autoClose=true,minHeight=290,onReset,onCompile,onSave,onShowShortcuts,diagnostics=[]}:EditorProps){
  const host=useRef<HTMLDivElement>(null);
  const viewRef=useRef<EditorView|null>(null);
  const callbacks=useRef({onChange,onCompile,onSave,onShowShortcuts});
  const [fullscreen,setFullscreen]=useState(false);
  const settingsCompartment=useMemo(()=>new Compartment(),[]);
  const diagnosticsCompartment=useMemo(()=>new Compartment(),[]);
  callbacks.current={onChange,onCompile,onSave,onShowShortcuts};

  useEffect(()=>{
    if(!host.current)return;
    const state=EditorState.create({doc:value,extensions:[
      history(),drawSelection(),dropCursor(),rectangularSelection(),crosshairCursor(),highlightActiveLine(),bracketMatching(),StreamLanguage.define(stex),syntaxHighlighting(defaultHighlightStyle),commandHover,
      autocompletion({override:[latexCompletion],activateOnTyping:true}),
      keymap.of([
        {key:'Mod-Enter',run:()=>{callbacks.current.onCompile?.();return Boolean(callbacks.current.onCompile);}},
        {key:'Mod-s',run:()=>{callbacks.current.onSave?.();return Boolean(callbacks.current.onSave);}},
        {key:'Mod-/',run:()=>{callbacks.current.onShowShortcuts?.();return Boolean(callbacks.current.onShowShortcuts);}},
        {key:'Enter',run:completeEnvironment},
        ...closeBracketsKeymap,...completionKeymap,...historyKeymap,...defaultKeymap,indentWithTab
      ]),
      EditorView.updateListener.of(update=>{if(update.docChanged)callbacks.current.onChange(update.state.doc.toString());}),
      settingsCompartment.of(editorSettings(wordWrap,showLineNumbers,autoClose)),
      diagnosticsCompartment.of([]),
      EditorView.theme({'&':{fontSize:'13px',height:'100%'},'.cm-content':{fontFamily:'var(--font-mono)',lineHeight:'1.72',padding:'14px 0'},'.cm-gutters':{background:'transparent',borderRight:'1px solid var(--soft-border)',color:'var(--muted)'},'.cm-activeLine,.cm-activeLineGutter':{backgroundColor:'rgba(6,26,58,.035)'},'&.cm-focused':{outline:'none'}})
    ]});
    const view=new EditorView({state,parent:host.current});viewRef.current=view;
    return()=>{view.destroy();viewRef.current=null;};
  },[]);

  useEffect(()=>{
    const view=viewRef.current;if(!view)return;
    view.dispatch({effects:settingsCompartment.reconfigure(editorSettings(wordWrap,showLineNumbers,autoClose))});
  },[wordWrap,showLineNumbers,autoClose,settingsCompartment]);

  useEffect(()=>{
    const view=viewRef.current;if(!view)return;
    const current=view.state.doc.toString();
    if(value!==current)view.dispatch({changes:{from:0,to:current.length,insert:value}});
  },[value]);

  useEffect(()=>{
    const view=viewRef.current;if(!view)return;
    const ranges=diagnostics.filter(item=>item.line>0&&item.line<=view.state.doc.lines).map(item=>Decoration.line({class:`cm-diagnostic-line cm-diagnostic-line--${item.severity}`}).range(view.state.doc.line(item.line).from));
    view.dispatch({effects:diagnosticsCompartment.reconfigure(EditorView.decorations.of(Decoration.set(ranges,true)))});
  },[diagnostics,diagnosticsCompartment,value]);

  return <div className={`editor-frame ${fullscreen?'editor-frame--fullscreen':''}`} style={{'--editor-min-height':`${minHeight}px`} as CSSProperties}>
    <div className="editor-toolbar">
      <div className="editor-tools-left"><button type="button" onClick={()=>formatEditor(viewRef.current)} className="text-tool">Форматировать</button>{onReset&&<button type="button" onClick={onReset} className="text-tool">Сбросить</button>}</div>
      <button className="icon-button" type="button" onClick={()=>setFullscreen(value=>!value)} aria-label={fullscreen?'Выйти из полноэкранного редактора':'Открыть редактор на весь экран'}><ExpandIcon/></button>
    </div>
    <div ref={host} className="editor-host" />
  </div>;
}

function tooltip(pos:number,end:number,syntax:string,summary:string,packageName?:string){
  return {
    pos,end,above:true,
    create(){
      const dom=document.createElement('div');
      dom.className='cm-command-doc';
      const code=document.createElement('code');code.textContent=syntax;dom.append(code);
      const description=document.createElement('p');description.textContent=summary;dom.append(description);
      if(packageName){const meta=document.createElement('span');meta.textContent=`Пакет: ${packageName}`;dom.append(meta);}
      return {dom};
    }
  };
}

function isMathMode(sourceBeforeCursor:string){
  const clean=sourceBeforeCursor.replace(/(^|[^\\])%.*$/gm,'$1');
  const displayOpen=clean.lastIndexOf('\\[')>clean.lastIndexOf('\\]');
  const environmentOpen=Math.max(clean.lastIndexOf('\\begin{equation}'),clean.lastIndexOf('\\begin{equation*}'),clean.lastIndexOf('\\begin{align}'),clean.lastIndexOf('\\begin{align*}'));
  const environmentClose=Math.max(clean.lastIndexOf('\\end{equation}'),clean.lastIndexOf('\\end{equation*}'),clean.lastIndexOf('\\end{align}'),clean.lastIndexOf('\\end{align*}'));
  if(displayOpen||environmentOpen>environmentClose)return true;
  return (clean.match(/(?<!\\)\$/g)?.length??0)%2===1;
}

function editorSettings(wordWrap:boolean,showLineNumbers:boolean,autoClose:boolean){return [showLineNumbers?lineNumbers():[],wordWrap?EditorView.lineWrapping:[],autoClose?closeBrackets():[]];}

function completeEnvironment(view:EditorView){
  const pos=view.state.selection.main.head;
  const before=view.state.doc.sliceString(0,pos);
  const match=before.match(/(?:^|\n)([ \t]*)\\begin\{([A-Za-z*]+)\}[ \t]*$/);
  if(!match)return false;
  const indent=match[1];const name=match[2];const after=view.state.doc.sliceString(pos,Math.min(view.state.doc.length,pos+300));
  if(new RegExp(`^\\s*\\\\end\\{${name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\}`).test(after))return false;
  const inner=`${indent}  `;
  const insert=`\n${inner}\n${indent}\\end{${name}}`;
  view.dispatch({changes:{from:pos,insert},selection:{anchor:pos+1+inner.length},scrollIntoView:true});
  return true;
}

function formatEditor(view:EditorView|null){
  if(!view)return;
  const source=view.state.doc.toString();let indent=0;
  const formatted=source.split('\n').map(raw=>{
    const trimmed=raw.trim();
    if(/^\\end\{/.test(trimmed))indent=Math.max(0,indent-1);
    const line='  '.repeat(indent)+trimmed;
    if(/^\\begin\{/.test(trimmed)&&!/^\\begin\{document\}.*\\end/.test(trimmed))indent++;
    return line;
  }).join('\n');
  view.dispatch({changes:{from:0,to:view.state.doc.length,insert:formatted}});
}
