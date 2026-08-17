import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection, dropCursor, rectangularSelection, crosshairCursor } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, defaultHighlightStyle, syntaxHighlighting, StreamLanguage } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap, type Completion, type CompletionContext } from '@codemirror/autocomplete';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { ExpandIcon } from './Icons';

const completions:Completion[] = [
  ['\\begin{}','Окружение'],['\\end{}','Окружение'],['\\section{}','Раздел'],['\\subsection{}','Подраздел'],['\\textbf{}','Полужирный'],['\\emph{}','Акцент'],['\\frac{}{}','Дробь'],['\\sqrt{}','Корень'],['\\label{}','Метка'],['\\ref{}','Ссылка'],['\\cite{}','Цитирование'],['\\item','Пункт списка'],['\\includegraphics{}','Изображение']
].map(([label,detail])=>({label,type:'keyword',detail,apply:label}));

function latexCompletion(context:CompletionContext) {
  const word=context.matchBefore(/\\[a-zA-Z]*$/);
  if(!word && !context.explicit) return null;
  return {from:word?.from ?? 0,options:completions,validFor:/^\\[a-zA-Z]*$/};
}

export function CodeEditor({value,onChange,wordWrap=true,showLineNumbers=true,autoClose=true,minHeight=290,onReset}:{value:string;onChange:(v:string)=>void;wordWrap?:boolean;showLineNumbers?:boolean;autoClose?:boolean;minHeight?:number;onReset?:()=>void}) {
  const host=useRef<HTMLDivElement>(null); const viewRef=useRef<EditorView|null>(null); const [fullscreen,setFullscreen]=useState(false);
  const settingsCompartment=useMemo(()=>new Compartment(),[]);
  useEffect(()=>{
    if(!host.current) return;
    const state=EditorState.create({doc:value,extensions:[
      history(),drawSelection(),dropCursor(),rectangularSelection(),crosshairCursor(),highlightActiveLine(),bracketMatching(),StreamLanguage.define(stex),syntaxHighlighting(defaultHighlightStyle),
      autocompletion({override:[latexCompletion]}),
      keymap.of([...closeBracketsKeymap,...completionKeymap,...historyKeymap,...defaultKeymap,indentWithTab]),
      EditorView.updateListener.of(update=>{if(update.docChanged) onChange(update.state.doc.toString());}),
      settingsCompartment.of(editorSettings(wordWrap,showLineNumbers,autoClose)),
      EditorView.theme({ '&':{fontSize:'13px',height:'100%'}, '.cm-content':{fontFamily:'var(--font-mono)',lineHeight:'1.72',padding:'14px 0'}, '.cm-gutters':{background:'transparent',borderRight:'1px solid var(--soft-border)',color:'var(--muted)'}, '.cm-activeLine,.cm-activeLineGutter':{backgroundColor:'rgba(6,26,58,.035)'}, '&.cm-focused':{outline:'none'} })
    ]});
    const view=new EditorView({state,parent:host.current}); viewRef.current=view;
    return ()=>{view.destroy();viewRef.current=null;};
  // Initial editor is intentionally created once; updates below reconfigure it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  useEffect(()=>{const view=viewRef.current;if(!view)return;view.dispatch({effects:settingsCompartment.reconfigure(editorSettings(wordWrap,showLineNumbers,autoClose))});},[wordWrap,showLineNumbers,autoClose,settingsCompartment]);
  useEffect(()=>{const view=viewRef.current;if(!view)return;const current=view.state.doc.toString();if(value!==current)view.dispatch({changes:{from:0,to:current.length,insert:value}});},[value]);
  return <div className={`editor-frame ${fullscreen?'editor-frame--fullscreen':''}`} style={{'--editor-min-height':`${minHeight}px`} as CSSProperties}>
    <div className="editor-toolbar">
      <div className="editor-tools-left"><button type="button" onClick={()=>formatEditor(viewRef.current)} className="text-tool">Форматировать</button>{onReset&&<button type="button" onClick={onReset} className="text-tool">Сбросить</button>}</div>
      <button className="icon-button" type="button" onClick={()=>setFullscreen(v=>!v)} aria-label={fullscreen?'Выйти из полноэкранного редактора':'Открыть редактор на весь экран'}><ExpandIcon/></button>
    </div>
    <div ref={host} className="editor-host" />
  </div>;
}
function editorSettings(wordWrap:boolean,showLineNumbers:boolean,autoClose:boolean) {
  return [showLineNumbers?lineNumbers():[],wordWrap?EditorView.lineWrapping:[],autoClose?closeBrackets():[]];
}
function formatEditor(view:EditorView|null) {
  if(!view)return;const src=view.state.doc.toString();let indent=0;const formatted=src.split('\n').map(raw=>{const t=raw.trim();if(/^\\end\{/.test(t))indent=Math.max(0,indent-1);const line=`  `.repeat(indent)+t;if(/^\\begin\{/.test(t)&&!/^\\begin\{document\}.*\\end/.test(t))indent++;return line;}).join('\n');view.dispatch({changes:{from:0,to:view.state.doc.length,insert:formatted}});
}
