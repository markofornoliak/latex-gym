import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SearchIcon, ChevronIcon } from '../components/Icons';
import { referenceCategories, searchReference } from '../data/reference';

export function ReferencePage(){
  const [query,setQuery]=useState('');const [category,setCategory]=useState('Все');const results=useMemo(()=>searchReference(query).filter(e=>category==='Все'||e.category===category),[query,category]);
  return <div className="page editorial-page"><header className="page-intro"><span className="eyebrow">СПРАВОЧНИК</span><h1>Команды LaTeX</h1><p>Поиск по синтаксису, русским описаниям и общепринятым английским терминам.</p></header>
    <div className="reference-search"><SearchIcon/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="frac, fraction, дробь…"/><kbd>⌘K</kbd></div>
    <div className="category-strip" role="list">{['Все',...referenceCategories].map(c=><button className={c===category?'active':''} onClick={()=>setCategory(c)} key={c}>{c}</button>)}</div>
    <div className="reference-list">{results.map(entry=><Link to={`/reference/${entry.id}`} className="reference-row" key={entry.id}><code>{entry.command}</code><span><strong>{entry.title}</strong><small>{entry.description}</small></span><ChevronIcon/></Link>)}</div>
    {!results.length&&<div className="empty-state">Ничего не найдено. Попробуйте синтаксис команды или русское название.</div>}
  </div>;
}
