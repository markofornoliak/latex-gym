import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import katex from 'katex';
import { BackIcon, BookmarkIcon, CopyIcon } from '../components/Icons';
import { CodeBlock } from '../components/CodeBlock';
import { getReferenceEntry } from '../data/reference';
import { useAppStore } from '../store/useAppStore';

export function ReferenceDetailPage(){
  const {command}=useParams();const entry=getReferenceEntry(command);const bookmarks=useAppStore(s=>s.bookmarks);const toggle=useAppStore(s=>s.toggleBookmark);const touch=useAppStore(s=>s.touchReference);
  useEffect(()=>{if(entry)touch(entry.command);},[entry?.id]);
  if(!entry)return <div className="page empty-state">Команда не найдена.</div>;
  const saved=bookmarks.some(b=>b.id===`reference:${entry.id}`);
  return <div className="page editorial-page reference-detail"><div className="detail-actions"><Link className="back-link" to="/reference"><BackIcon/> Справочник</Link><button className={saved?'icon-button active':'icon-button'} onClick={()=>toggle('reference',entry.id)} aria-label={saved?'Удалить из закладок':'Добавить в закладки'}><BookmarkIcon/></button></div>
    <header><span className="eyebrow">{entry.category}</span><h1><code>{entry.command}</code></h1><p>{entry.description}</p></header>
    <section><h2>Синтаксис</h2><div className="syntax-box"><code>{entry.syntax}</code><button className="icon-button" aria-label="Скопировать синтаксис" onClick={()=>navigator.clipboard?.writeText(entry.syntax)}><CopyIcon/></button></div></section>
    <section><h2>Пример</h2><CodeBlock code={entry.example}/></section>
    {entry.resultLatex&&<section><h2>Результат</h2><div className="math-result" dangerouslySetInnerHTML={{__html:katex.renderToString(entry.resultLatex,{displayMode:true,throwOnError:false})}}/></section>}
    <section><h2>Связанные команды</h2><div className="related-links">{entry.related.map(id=><Link to={`/reference/${id}`} key={id}>{id}</Link>)}</div></section>
  </div>;
}
