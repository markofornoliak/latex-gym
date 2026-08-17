import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SearchIcon, ChevronIcon } from '../components/Icons';
import { referenceCategories, searchReference } from '../data/reference';

export function ReferencePage(){
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('Все');
  const results=useMemo(()=>searchReference(query).filter(entry=>category==='Все'||entry.category===category),[query,category]);
  return <div className="page editorial-page reference-page">
    <header className="page-intro"><span className="eyebrow">СПРАВОЧНИК</span><h1>Команды и конструкции</h1><p>Один запрос может быть синтаксисом, русским термином или английским названием: <code>\frac</code>, <code>frac</code>, <code>fraction</code> и «дробь» ведут к одной записи.</p></header>
    <label className="reference-search"><SearchIcon/><span className="sr-only">Поиск по справочнику</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="дробь, frac, \frac…" autoComplete="off"/><kbd>⌘K</kbd></label>
    <div className="category-strip" role="list" aria-label="Категории справочника">{['Все',...referenceCategories].map(item=><button aria-pressed={item===category} className={item===category?'active':''} onClick={()=>setCategory(item)} key={item}>{item}</button>)}</div>
    <div className="reference-list">{results.map(entry=><Link to={`/reference/${entry.id}`} className="reference-row" key={entry.id}><code>{entry.command}</code><span><strong>{entry.title}</strong><small>{entry.description}{entry.package?` · ${entry.package}`:''}</small></span><ChevronIcon/></Link>)}</div>
    {!results.length&&<div className="empty-state reference-empty"><p>Такой команды или термина в справочнике пока нет.</p><button className="text-tool" onClick={()=>{setQuery('');setCategory('Все');}}>Сбросить поиск</button></div>}
  </div>;
}
