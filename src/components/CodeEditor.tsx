import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Compartment, EditorState, RangeSetBuilder } from '@codemirror/state';
import { Decoration, EditorView, GutterMarker, crosshairCursor, drawSelection, dropCursor, gutter, highlightActiveLine, hoverTooltip, keymap, lineNumbers, rectangularSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, defaultHighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap, snippetCompletion, type Completion, type CompletionContext } from '@codemirror/autocomplete';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { curriculum } from '../data/curriculumRuntime';
import { analyzeLatexContext, environmentSuggestions, insertPackageIntoPreamble, packageSuggestions, referenceSuggestions } from '../services/editorIntelligence';
import { EDITOR_DIAGNOSTIC_NAVIGATE, type EditorDiagnosticNavigateDetail } from '../services/editorNavigation';
import { ExpandIcon } from './Icons';
import type { Diagnostic, ReferenceEntry } from '../types';

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
  allowFormat?:boolean;
  filePath?:string;
};

const referenceEntries=curriculum.references;
const getReferenceEntry=(id?:string)=>id?curriculum.referenceById[id]:undefined;
const snippetCompletions:Completion[]=[
  snippetCompletion('\\section{${title}}',{label:'sec',type:'text',detail:'шаблон → \\section{}'}),
  snippetCompletion('\\subsection{${title}}',{label:'subsec',type:'text',detail:'шаблон → \\subsection{}'}),
  snippetCompletion('\\frac{${numerator}}{${denominator}}',{label:'frac',type:'text',detail:'шаблон → дробь'}),
  snippetCompletion('\\begin{equation}\n  ${formula}\n\\end{equation}',{label:'eq',type:'text',detail:'шаблон → equation'}),
  snippetCompletion('\\begin{align}\n  ${left} &= ${right} \\\\\n  ${next}\n\\end{align}',{label:'align',type:'text',detail:'шаблон → align · amsmath'}),
  snippetCompletion('\\begin{itemize}\n  \\item ${item}\n\\end{itemize}',{label:'itemize',type:'text',detail:'шаблон → itemize'}),
  snippetCompletion('\\begin{figure}\n  \\centering\n  \\includegraphics[width=\\linewidth]{${file}}\n  \\caption{${caption}}\n  \\label{fig:${key}}\n\\end{figure}',{label:'fig',type:'text',detail:'шаблон → figure · graphicx'})
];

const mobileAccessories=[
  {label:'\\',ariaLabel:'Вставить обратную косую черту',insert:'\\'},
  {label:'{ }',ariaLabel:'Вставить фигурные скобки',insert:'{}',cursorOffset:-1},
  {label:'$',ariaLabel:'Вставить математический режим',insert:'$$',cursorOffset:-1},
  {label:'_',ariaLabel:'Вставить нижний индекс',insert:'_'},
  {label:'^',ariaLabel:'Вставить верхний индекс',insert:'^'},
  {label:'&',ariaLabel:'Вставить точку выравнивания',insert:'&'},
  {label:'\\\\',ariaLabel:'Вставить перенос строки LaTeX',insert:'\\\\'},
  {label:'\\frac',ariaLabel:'Вставить дробь',insert:'\\frac{}{}',cursorOffset:-3},
  {label:'\\sqrt',ariaLabel:'Вставить квадратный корень',insert:'\\sqrt{}',cursorOffset:-1},
  {label:'\\begin',ariaLabel:'Вставить начало окружения',insert:'\\begin{}',cursorOffset:-1},
  {label:'\\end',ariaLabel:'Вставить конец окружения',insert:'\\end{}',cursorOffset:-1}
] as const;

function latexCompletion(context:CompletionContext){
  const source=context.state.doc.toString();
  const packageWord=context.matchBefore(/\\usepackage(?:\[[^\]]*\])?\{[A-Za-z0-9_-]*$/);
  if(packageWord){
    const brace=packageWord.text.lastIndexOf('{');
    return {from:packageWord.from+brace+1,options:packageSuggestions().map(item=>({label:item.label,apply:item.apply,detail:item.detail,type:'namespace'})),validFor:/^[A-Za-z0-9_-]*$/};
  }

  const environmentWord=context.matchBefore(/\\begin\{[A-Za-z*]*$/);
  if(environmentWord){
    const brace=environmentWord.text.lastIndexOf('{');
    return {from:environmentWord.from+brace+1,options:environmentSuggestions(source,context.pos).map(item=>({label:item.label,apply:item.apply,detail:item.detail,boost:item.boost,type:'class',info:()=>completionInfo(item.referenceId)})),validFor:/^[A-Za-z*]*$/};
  }

  const commandWord=context.matchBefore(/\\[a-zA-Z@]*$/);
  if(commandWord){
    const options=referenceSuggestions(source,context.pos).map(item=>({
      label:item.label,apply:item.apply,detail:item.detail,boost:item.boost,type:'function',info:()=>completionInfo(item.referenceId)
    }));
    return {from:commandWord.from,options,validFor:/^\\[a-zA-Z@]*$/};
  }

  const snippetWord=context.matchBefore(/[a-zA-Z]+$/);
  if(snippetWord&&(context.explicit||snippetWord.text.length>=2))return {from:snippetWord.from,options:snippetCompletions,validFor:/^[a-zA-Z]+$/};
  return null;
}

function completionInfo(referenceId:string){
  const entry=getReferenceEntry(referenceId);
  const dom=document.createElement('div');dom.className='cm-reference-info';
  if(!entry)return dom;
  const title=document.createElement('strong');title.textContent=entry.title;dom.append(title);
  const syntax=document.createElement('code');syntax.textContent=entry.syntax;dom.append(syntax);
  const description=document.createElement('p');description.textContent=entry.description;dom.append(description);
  if(entry.package){const meta=document.createElement('span');meta.textContent=`Пакет: ${entry.package}`;dom.append(meta);}
  return dom;
}

function referenceHover(openReference:(id:string)=>void){
  return hoverTooltip((view,pos)=>{
    const found=referenceAtPosition(view,pos);
    if(!found)return null;
    const {entry,from,to}=found;
    const source=view.state.doc.toString();
    const packageMissing=Boolean(entry.package&&!analyzeLatexContext(source,pos).packages.has(entry.package));
    return {pos:from,end:to,above:true,create(){
      const dom=document.createElement('div');dom.className='cm-command-doc';
      const syntax=document.createElement('code');syntax.textContent=entry.syntax;dom.append(syntax);
      const summary=document.createElement('p');summary.textContent=entry.description;dom.append(summary);
      if(entry.package){const meta=document.createElement('span');meta.className=packageMissing?'cm-package-missing':'';meta.textContent=packageMissing?`Требуется пакет ${entry.package}`:`Пакет: ${entry.package}`;dom.append(meta);}
      const actions=document.createElement('div');actions.className='cm-command-actions';
      const referenceButton=document.createElement('button');referenceButton.type='button';referenceButton.textContent='Открыть справочник';
      referenceButton.addEventListener('mousedown',event=>{event.preventDefault();event.stopPropagation();openReference(entry.id);});actions.append(referenceButton);
      if(packageMissing&&entry.package){
        const packageName=entry.package;
        const addButton=document.createElement('button');addButton.type='button';addButton.textContent=`Добавить ${packageName}`;
        addButton.addEventListener('mousedown',event=>{event.preventDefault();event.stopPropagation();applyPackageQuickFix(view,packageName);});actions.append(addButton);
      }
      dom.append(actions);
      return {dom};
    }};
  });
}

function referenceAtPosition(view:EditorView,pos:number){
  const line=view.state.doc.lineAt(pos);
  const relative=pos-line.from;
  for(const match of line.text.matchAll(/\\([a-zA-Z@]+)\b/g)){
    if(match.index===undefined)continue;
    const from=match.index,to=from+match[0].length;
    if(relative<from||relative>to)continue;
    const entry=referenceEntries.find(item=>item.command===match[0]);
    if(entry)return {entry,from:line.from+from,to:line.from+to};
  }
  for(const match of line.text.matchAll(/\\(?:begin|end)\{([^}]+)\}/g)){
    if(match.index===undefined)continue;
    const name=match[1];
    const nameOffset=match[0].indexOf(name);
    const from=match.index+nameOffset,to=from+name.length;
    if(relative<from||relative>to)continue;
    const entry=referenceEntries.find(item=>item.syntax.includes(`\\begin{${name}}`));
    if(entry)return {entry,from:line.from+from,to:line.from+to};
  }
  return null;
}

class DiagnosticMarker extends GutterMarker {
  constructor(readonly severity:Diagnostic['severity']){super();}
  eq(other:GutterMarker){return other instanceof DiagnosticMarker&&other.severity===this.severity;}
  toDOM(){const marker=document.createElement('span');marker.className=`cm-diagnostic-marker cm-diagnostic-marker--${this.severity}`;marker.setAttribute('aria-hidden','true');marker.title=this.severity==='error'?'Ошибка TeX':this.severity==='warning'?'Предупреждение TeX':'Информация';return marker;}
}

export function CodeEditor({value,onChange,wordWrap=true,showLineNumbers=true,autoClose=true,minHeight=290,onReset,onCompile,onSave,onShowShortcuts,diagnostics=[],allowFormat=true,filePath}:EditorProps){
  const host=useRef<HTMLDivElement>(null);
  const viewRef=useRef<EditorView|null>(null);
  const callbacks=useRef({onChange,onCompile,onSave,onShowShortcuts});
  const [fullscreen,setFullscreen]=useState(false);
  const [referenceId,setReferenceId]=useState<string|null>(null);
  const [cursorReferenceId,setCursorReferenceId]=useState<string|null>(null);
  const settingsCompartment=useMemo(()=>new Compartment(),[]);
  const diagnosticsCompartment=useMemo(()=>new Compartment(),[]);
  const referenceEntry=getReferenceEntry(referenceId??undefined);
  const sourceLineCount=Math.max(1,value.split('\n').length);
  const navigableDiagnostics=diagnostics.filter(item=>item.line>=1&&item.line<=sourceLineCount);
  callbacks.current={onChange,onCompile,onSave,onShowShortcuts};

  useEffect(()=>{
    if(!host.current)return;
    const state=EditorState.create({doc:value,extensions:[
      history(),drawSelection(),dropCursor(),rectangularSelection(),crosshairCursor(),highlightActiveLine(),bracketMatching(),StreamLanguage.define(stex),syntaxHighlighting(defaultHighlightStyle),referenceHover(setReferenceId),
      autocompletion({override:[latexCompletion],activateOnTyping:true}),
      keymap.of([
        {key:'Mod-Enter',run:()=>{callbacks.current.onCompile?.();return Boolean(callbacks.current.onCompile);}},
        {key:'Mod-s',run:()=>{callbacks.current.onSave?.();return Boolean(callbacks.current.onSave);}},
        {key:'Mod-/',run:()=>{callbacks.current.onShowShortcuts?.();return Boolean(callbacks.current.onShowShortcuts);}},
        {key:'Enter',run:completeEnvironment},
        ...closeBracketsKeymap,...completionKeymap,...historyKeymap,...defaultKeymap,indentWithTab
      ]),
      EditorView.updateListener.of(update=>{
        if(update.docChanged)callbacks.current.onChange(update.state.doc.toString());
        if(update.docChanged||update.selectionSet)setCursorReferenceId(referenceAtPosition(update.view,update.state.selection.main.head)?.entry.id??null);
      }),
      settingsCompartment.of(editorSettings(wordWrap,showLineNumbers,autoClose)),
      diagnosticsCompartment.of([]),
      EditorView.theme({'&':{fontSize:'13px',height:'100%'},'.cm-content':{fontFamily:'var(--font-mono)',lineHeight:'1.72',padding:'14px 0'},'.cm-gutters':{background:'transparent',borderRight:'1px solid var(--soft-border)',color:'var(--muted)'},'.cm-activeLine,.cm-activeLineGutter':{backgroundColor:'rgba(6,26,58,.035)'},'&.cm-focused':{outline:'none'}})
    ]});
    const view=new EditorView({state,parent:host.current});viewRef.current=view;
    setCursorReferenceId(referenceAtPosition(view,view.state.selection.main.head)?.entry.id??null);
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

  useEffect(()=>{
    const onNavigate=(event:Event)=>{
      const detail=(event as CustomEvent<EditorDiagnosticNavigateDetail>).detail;
      if(!detail?.diagnostic)return;
      if(detail.diagnostic.file&&filePath&&detail.diagnostic.file!==filePath)return;
      jumpToDiagnostic(viewRef.current,detail.diagnostic);
    };
    window.addEventListener(EDITOR_DIAGNOSTIC_NAVIGATE,onNavigate);
    return()=>window.removeEventListener(EDITOR_DIAGNOSTIC_NAVIGATE,onNavigate);
  },[filePath]);

  return <div className={`editor-frame ${fullscreen?'editor-frame--fullscreen':''}`} style={{'--editor-min-height':`${minHeight}px`} as CSSProperties}>
    <div className="editor-toolbar">
      <div className="editor-tools-left">{allowFormat&&<button type="button" onClick={()=>formatEditor(viewRef.current)} className="text-tool">Форматировать</button>}{onReset&&<button type="button" onClick={onReset} className="text-tool">Сбросить</button>}<button type="button" onClick={()=>cursorReferenceId&&setReferenceId(cursorReferenceId)} className="text-tool" disabled={!cursorReferenceId} aria-label="Открыть справку для команды под курсором">Справка</button></div>
      <div className="editor-tools-right">{diagnostics.length>0&&(navigableDiagnostics.length>0?<div className="editor-diagnostic-nav" aria-label="Навигация по диагностике"><span>{diagnostics.filter(item=>item.severity==='error').length} ошибок · {diagnostics.filter(item=>item.severity==='warning').length} предупреждений</span><button type="button" className="text-tool" onClick={()=>jumpDiagnostic(viewRef.current,navigableDiagnostics,-1)} aria-label="Предыдущая диагностика">↑</button><button type="button" className="text-tool" onClick={()=>jumpDiagnostic(viewRef.current,navigableDiagnostics,1)} aria-label="Следующая диагностика">↓</button></div>:<span className="editor-diagnostic-nav--unlocated" role="status">Позиция диагностики не определена</span>)}<button className="icon-button" type="button" onClick={()=>setFullscreen(value=>!value)} aria-label={fullscreen?'Выйти из полноэкранного редактора':'Открыть редактор на весь экран'}><ExpandIcon/></button></div>
    </div>
    <div className="latex-mobile-accessory" aria-label="Быстрые LaTeX-вставки">{mobileAccessories.map(item=><button type="button" key={item.label} aria-label={item.ariaLabel} onPointerDown={event=>event.preventDefault()} onClick={()=>insertEditorText(viewRef.current,item.insert,'cursorOffset' in item?item.cursorOffset:0)}>{item.label}</button>)}</div>
    <div className="editor-reference-layout">
      <div ref={host} className="editor-host" />
      {referenceEntry&&<EditorReferencePanel entry={referenceEntry} onClose={()=>{setReferenceId(null);requestAnimationFrame(()=>viewRef.current?.focus());}} onAddPackage={referenceEntry.package&&!analyzeLatexContext(value).packages.has(referenceEntry.package)?()=>applyPackageQuickFix(viewRef.current,referenceEntry.package!):undefined}/>} 
    </div>
  </div>;
}

function EditorReferencePanel({entry,onClose,onAddPackage}:{entry:ReferenceEntry;onClose:()=>void;onAddPackage?:()=>void}){
  return <aside className="editor-reference-panel" aria-label={`Справка: ${entry.title}`}>
    <header><div><span className="eyebrow">СПРАВОЧНИК</span><h3>{entry.title}</h3></div><button type="button" onClick={onClose} aria-label="Закрыть справку">×</button></header>
    <code>{entry.syntax}</code><p>{entry.description}</p>
    <dl>{entry.package&&<div><dt>Пакет</dt><dd>{entry.package}</dd></div>}{entry.mathMode==='required'&&<div><dt>Контекст</dt><dd>Математический режим</dd></div>}</dl>
    {entry.commonMistake&&<div className="editor-reference-warning"><strong>Частая ошибка</strong><p>{entry.commonMistake}</p></div>}
    <div className="editor-reference-actions">{onAddPackage&&entry.package&&<button type="button" className="secondary-button" onClick={onAddPackage}>Добавить {entry.package}</button>}<a href={`#/reference/${entry.id}`}>Полная справка</a></div>
  </aside>;
}

function applyPackageQuickFix(view:EditorView|null,packageName:string){
  if(!view)return;
  const current=view.state.doc.toString();
  const next=insertPackageIntoPreamble(current,packageName);
  if(next===current)return;
  let from=0;
  while(from<current.length&&from<next.length&&current[from]===next[from])from+=1;
  let oldTo=current.length,newTo=next.length;
  while(oldTo>from&&newTo>from&&current[oldTo-1]===next[newTo-1]){oldTo-=1;newTo-=1;}
  view.dispatch({changes:{from,to:oldTo,insert:next.slice(from,newTo)},scrollIntoView:true});
  view.focus();
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
  const target=direction>0?(ordered.find(item=>item.line>currentLine)??ordered[0]):([...ordered].reverse().find(item=>item.line<currentLine)??ordered.at(-1)!);
  jumpToDiagnostic(view,target);
}
function jumpToDiagnostic(view:EditorView|null,diagnostic:Diagnostic){
  if(!view)return false;
  const range=normalizeDiagnosticRange(view,diagnostic);
  if(!range)return false;
  view.dispatch({selection:{anchor:range.from},scrollIntoView:true});view.focus();
  return true;
}
function insertEditorText(view:EditorView|null,text:string,cursorOffset=0){
  if(!view)return;
  const selection=view.state.selection.main;
  const anchor=selection.from+text.length+cursorOffset;
  view.dispatch({changes:{from:selection.from,to:selection.to,insert:text},selection:{anchor:Math.max(selection.from,anchor)},scrollIntoView:true});
  view.focus();
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
