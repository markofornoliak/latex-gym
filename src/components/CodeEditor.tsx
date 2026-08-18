import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Compartment, EditorState, RangeSetBuilder } from '@codemirror/state';
import { Decoration, EditorView, GutterMarker, crosshairCursor, drawSelection, dropCursor, gutter, highlightActiveLine, hoverTooltip, keymap, lineNumbers, rectangularSelection } from '@codemirror/view';
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
    const source=context.state.doc.toString();
    const documentStart=source.indexOf('\\begin{document}');
    const preamble=context.state.doc.sliceString(0,Math.min(context.state.doc.length,documentStart>=0?documentStart:context.state.doc.length));
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

class DiagnosticMarker extends GutterMarker {
  constructor(readonly severity:Diagnostic['severity']){super();}
  eq(other:DiagnosticMarker){return other.severity===this.severity;}
  toDOM(){const marker=document.createElement('span');marker.className=`cm-diagnostic-marker cm-diagnostic-marker--${this.severity}`;marker.setAttribute('aria-hidden','true');marker.title=this.severity==='error'?'Ошибка TeX':this.severity==='warning'?'Предупреждение TeX':'Информация';return marker;}
}

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
    view.dispatch({effects:diagnosticsCompartment.reconfigure(diagnosticExtensions(view,diagnostics))});
  },[diagnostics,diagnosticsCompartment,value]);

  return <div className={`editor-frame ${fullscreen?'editor-frame--fullscreen':''}`} style={{'--editor-min-height':`${minHeight}px`} as CSSProperties}>
    <div className="editor-toolbar">
      <div className="editor-tools-left"><button type="button" onClick={()=>formatEditor(viewRef.current)} className="text-tool">Форматировать</button>{onReset&&<button type="button" onClick={onReset} className="text-tool">Сбросить</button>}</div>
      <div className="editor-tools-right">{diagnostics.length>0&&<div className="editor-diagnostic-nav" aria-label="Навигация по диагностике"><span>{diagnostics.filter(item=>item.severity==='error').length} ошибок · {diagnostics.filter(item=>item.severity==='warning').length} предупреждений</span><button type="button" className="text-tool" onClick={()=>jumpDiagnostic(viewRef.current,diagnostics,-1)} aria-label="Предыдущая диагностика">↑</button><button type="button" className="text-tool" onClick={()=>jumpDiagnostic(viewRef.current,diagnostics,1)} aria-label="Следующая диагностика">↓</button></div>}<button className="icon-button" type="button" onClick={()=>setFullscreen(value=>!value)} aria-label={fullscreen?'Выйти из полноэкранного редактора':'Открыть редактор на весь экран'}><ExpandIcon/></button></div>
    </div>
    <div ref={host} className="editor-host" />
  </div>;
}

function editorSettings(wordWrap:boolean,showLineNumbers:boolean,autoClose:boolean){return [showLineNumbers?lineNumbers():[],wordWrap?EditorView.lineWrapping:[],autoClose?closeBrackets():[]];}

function diagnosticExtensions(view:EditorView,diagnostics:Diagnostic[]){
  const normalized=diagnostics.map(item=>normalizeDiagnosticRange(view,item)).filter(Boolean) as Array<{item:Diagnostic;from:number;to:number}>;
  normalized.sort((left,right)=>left.from-right.from||left.to-right.to);
  const decorations=normalized.map(({item,from,to})=>to>from?Decoration.mark({class:`cm-diagnostic-range cm-diagnostic-range--${item.severity}`}).range(from,to):Decoration.line({class:`cm-diagnostic-line cm-diagnostic-line--${item.severity}`}).range(view.state.doc.line(item.line).from));
  const diagnosticGutter=gutter({
    class:'cm-diagnostic-gutter',
    markers(currentView){
      const builder=new RangeSetBuilder<GutterMarker>();
      const usedLines=new Set<number>();
      for(const diagnostic of [...diagnostics].sort((left,right)=>left.line-right.line)){
        if(diagnostic.line<1||diagnostic.line>currentView.state.doc.lines||usedLines.has(diagnostic.line))continue;
        usedLines.add(diagnostic.line);
        builder.add(currentView.state.doc.line(diagnostic.line).from,currentView.state.doc.line(diagnostic.line).from,new DiagnosticMarker(diagnostic.severity));
      }
      return builder.finish();
    }
  });
  const diagnosticHover=hoverTooltip((currentView,pos)=>{
    const diagnostic=diagnosticAt(currentView,diagnostics,pos);
    if(!diagnostic)return null;
    const range=normalizeDiagnosticRange(currentView,diagnostic);
    if(!range)return null;
    return {pos:range.from,end:Math.max(range.from+1,range.to),above:true,create(){
      const dom=document.createElement('div');dom.className=`cm-diagnostic-tooltip cm-diagnostic-tooltip--${diagnostic.severity}`;
      const title=document.createElement('strong');title.textContent=diagnostic.message;dom.append(title);
      const explanation=document.createElement('p');explanation.textContent=diagnostic.explanation;dom.append(explanation);
      if(diagnostic.suggestion){const suggestion=document.createElement('span');suggestion.textContent=diagnostic.suggestion;dom.append(suggestion);}
      return {dom};
    }};
  });
  return [EditorView.decorations.of(Decoration.set(decorations,true)),diagnosticGutter,diagnosticHover];
}

function normalizeDiagnosticRange(view:EditorView,item:Diagnostic){
  if(item.line<1||item.line>view.state.doc.lines)return null;
  const line=view.state.doc.line(item.line);
  const from=item.from===undefined?line.from:Math.max(line.from,Math.min(view.state.doc.length,item.from));
  const requestedTo=item.to===undefined?line.to:Math.max(from,Math.min(view.state.doc.length,item.to));
  const to=requestedTo===from&&line.to>line.from?line.to:requestedTo;
  return {item,from,to};
}
function diagnosticAt(view:EditorView,diagnostics:Diagnostic[],pos:number){
  const line=view.state.doc.lineAt(pos).number;
  return diagnostics.find(item=>{const range=normalizeDiagnosticRange(view,item);return Boolean(range&&pos>=range.from&&pos<=Math.max(range.from+1,range.to));})??diagnostics.find(item=>item.line===line);
}
function jumpDiagnostic(view:EditorView|null,diagnostics:Diagnostic[],direction:1|-1){
  if(!view||!diagnostics.length)return;
  const ordered=diagnostics.filter(item=>item.line>=1&&item.line<=view.state.doc.lines).sort((left,right)=>left.line-right.line);
  if(!ordered.length)return;
  const currentLine=view.state.doc.lineAt(view.state.selection.main.head).number;
  const target=direction>0?(ordered.find(item=>item.line>currentLine)??ordered[0]):([...[...ordered].reverse()].find(item=>item.line<currentLine)??ordered.at(-1)!);
  const range=normalizeDiagnosticRange(view,target);if(!range)return;
  view.dispatch({selection:{anchor:range.from},scrollIntoView:true});view.focus();
}

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
