import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import katex from 'katex';
import { BackIcon, BookmarkIcon, CopyIcon } from '../components/Icons';
import { CodeBlock } from '../components/CodeBlock';
import { getReferenceEntry } from '../data/reference';
import { useAppStore } from '../store/useAppStore';

export function ReferenceDetailPage(){
  const {command}=useParams();
  const entry=getReferenceEntry(command);
  const bookmarks=useAppStore(state=>state.bookmarks);
  const toggle=useAppStore(state=>state.toggleBookmark);
  const touch=useAppStore(state=>state.touchReference);
  useEffect(()=>{if(entry)touch(entry.command);},[entry?.id,touch]);
  if(!entry)return <div className="page empty-state">Команда не найдена.</div>;
  const saved=bookmarks.some(bookmark=>bookmark.id===`reference:${entry.id}`);
  return <div className="page editorial-page reference-detail reference-detail--deep">
    <div className="detail-actions"><Link className="back-link" to="/reference"><BackIcon/> Справочник</Link><button className={saved?'icon-button active':'icon-button'} onClick={()=>toggle('reference',entry.id)} aria-label={saved?'Удалить из закладок':'Добавить в закладки'}><BookmarkIcon/></button></div>
    <header><span className="eyebrow">{entry.category}</span><h1><code>{entry.command}</code></h1><p>{entry.description}</p></header>

    <section className="reference-section"><h2>Синтаксис</h2><div className="syntax-box"><code>{entry.syntax}</code><button className="icon-button" aria-label="Скопировать синтаксис" onClick={()=>navigator.clipboard?.writeText(entry.syntax)}><CopyIcon/></button></div></section>

    {(entry.arguments?.length||entry.package||entry.mathMode)&&<section className="reference-section reference-contract"><h2>Контракт</h2><dl>
      {entry.package&&<div><dt>Пакет</dt><dd><code>{entry.package}</code></dd></div>}
      {entry.mathMode&&<div><dt>Math mode</dt><dd>{entry.mathMode==='required'?'Требуется':entry.mathMode==='optional'?'Допустим':'Не требуется'}</dd></div>}
      {entry.arguments?.map(argument=><div key={argument.name}><dt><code>{argument.name}</code><span>{argument.required?'обязательный':'необязательный'}</span></dt><dd>{argument.description}</dd></div>)}
    </dl></section>}

    <section className="reference-section"><h2>Минимальный пример</h2><CodeBlock code={entry.example}/></section>
    {entry.resultLatex&&<section className="reference-section"><h2>Результат</h2><div className="math-result" dangerouslySetInnerHTML={{__html:katex.renderToString(entry.resultLatex,{displayMode:true,throwOnError:false})}}/></section>}
    {entry.commonMistake&&<section className="reference-section reference-mistake"><span className="eyebrow">ТИПИЧНАЯ ОШИБКА</span><p>{entry.commonMistake}</p></section>}
    {entry.related.length>0&&<section className="reference-section"><h2>Связанные команды</h2><div className="related-links">{entry.related.map(id=><Link to={`/reference/${id}`} key={id}>{getReferenceEntry(id)?.command??id}</Link>)}</div></section>}
  </div>;
}
