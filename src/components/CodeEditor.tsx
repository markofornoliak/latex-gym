import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Compartment, EditorState } from '@codemirror/state';
import { Decoration, EditorView, crosshairCursor, drawSelection, dropCursor, highlightActiveLine, hoverTooltip, keymap, lineNumbers, rectangularSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, defaultHighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap, snippetCompletion, type Completion, type CompletionContext } from '@codemirror/autocomplete';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { ExpandIcon } from './Icons';
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

type CommandDoc={syntax:string;summary:string;package?:string};
const commandDocs:Record<string,CommandDoc>={
  section:{syntax:'\\section{title}',summary:'Создаёт нумеруемый раздел документа.'},
  subsection:{syntax:'\\subsection{title}',summary:'Создаёт подраздел внутри текущего раздела.'},
  emph:{syntax:'\\emph{text}',summary:'Смысловое выделение текста.'},
  textbf:{syntax:'\\textbf{text}',summary:'Набирает текст полужирным начертанием.'},
  frac:{syntax:'\\frac{numerator}{denominator}',summary:'Создаёт дробь в математическом режиме.',package:'amsmath для расширенной математики'},
  sqrt:{syntax:'\\sqrt[n]{expression}',summary:'Создаёт квадратный или n-й корень.'},
  label:{syntax:'\\label{key}',summary:'Назначает устойчивый ключ нумеруемому объекту.'},
  ref:{syntax:'\\ref{key}',summary:'Подставляет номер объекта по его label.'},
  cite:{syntax:'\\cite{key}',summary:'Создаёт ссылку на библиографическую запись.'},
  includegraphics:{syntax:'\\includegraphics[options]{file}',summary:'Вставляет графический файл.',package:'graphicx'},
  usepackage:{syntax:'\\usepackage[options]{package}',summary:'Подключает пакет в преамбуле.'},
  documentclass:{syntax:'\\documentclass[options]{class}',summary:'Выбирает базовый класс документа.'},
  begin:{syntax:'\\begin{name} … \\end{name}',summary:'Открывает структурное окружение.'},
  item:{syntax:'\\item text',summary:'Начинает элемент списка внутри list environment.'}
};

const commandCompletions:Completion[]=[
  ['\\documentclass{}','Класс документа'],['\\usepackage{}','Пакет'],['\\begin{}','Окружение'],['\\end{}','Окружение'],['\\section{}','Раздел'],['\\subsection{}','Подраздел'],['\\emph{}','Смысловой акцент'],['\\textbf{}','Полужирный'],['\\frac{}{}','Дробь · math'],['\\sqrt{}','Корень · math'],['\\label{}','Метка'],['\\ref{}','Ссылка'],['\\cite{}','Цитирование'],['\\item','Пункт списка'],['\\includegraphics{}','Изображение · graphicx'],['\\alpha','α · math'],['\\beta','β · math'],['\\leq','≤ · math'],['\\sin','sin · math'],['\\log','log · math']
].map(([label,detail])=>({label,type:'keyword',detail,apply:label}));

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
  const commandWord=context.matchBefore(/\\[a-zA-Z]*$/);
  if(commandWord){
    const preamble=context.state.doc.sliceString(0,Math.min(context.state.doc.length,context.state.doc.toString().indexOf('\\begin{document}')>=0?context.state.doc.toString().indexOf('\\begin{document}'):context.state.doc.length));
    const hasAmsmath=/\\usepackage(?:\[[^\]]*\])?\{[^}]*amsmath[^}]*\}/.test(preamble);
    const hasGraphicx=/\\usepackage(?:\[[^\]]*\])?\{[^}]*graphicx[^}]*\}/.test(preamble);
    const options=commandCompletions.map(item=>{
      const detail=item.detail??'';
      const unavailable=(detail.includes('amsmath')&&!hasAmsmath)||(detail.includes('graphicx')&&!hasGraphicx);
      return unavailable?{...item,detail:`${detail} · пакет не подключён`,boost:-1}:item;
    });
    return {from:commandWord.from,options,validFor:/^\\[a-zA-Z]*$/};
  }
  const snippetWord=context.matchBefore(/[a-zA-Z]+$/);
  if(snippetWord&&(context.explicit||snippetWord.text.length>=2))return {from:snippetWord.from,options:snippetCompletions,validFor:/^[a-zA-Z]+$/};
  return null;
}

const commandHover=hoverTooltip((view,pos)=>{
  const line=view.state.doc.lineAt(pos);
  const relative=pos-line.from;
  const matches=[...line.text.matchAll(/\\([a-zA-Z]+)\b/g)];
  const match=matches.find(candidate=>candidate.index!==undefined&&relative>=candidate.index&&relative<=candidate.index+candidate[0].length);
  if(!match||match.index===undefined)return null;
  const doc=commandDocs[match[1]];
  if(!doc)return null;
  return {
    pos:line.from+match.index,
    end:line.from+match.index+match[0].length,
    above:true,
    create(){
      const dom=document.createElement('div');
      dom.className='cm-command-doc';
      const syntax=document.createElement('code');syntax.textContent=doc.syntax;dom.append(syntax);
      const summary=document.createElement('p');summary.textContent=doc.summary;dom.append(summary);
      if(doc.package){const meta=document.createElement('span');meta.textContent=`Пакет: ${doc.package}`;dom.append(meta);}
      return {dom};
    }
  };
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
