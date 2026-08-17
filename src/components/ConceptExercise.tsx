import type { ExerciseInteraction } from '../data/exerciseInteractions';

type Props={
  interaction:Exclude<ExerciseInteraction,{kind:'code'}>;
  value:string;
  onChange:(value:string)=>void;
  disabled?:boolean;
};

export function ConceptExercise({interaction,value,onChange,disabled=false}:Props){
  if(interaction.kind==='selection'){
    return <fieldset className="concept-exercise" disabled={disabled}>
      <legend className="sr-only">Выберите один ответ</legend>
      {interaction.options.map(option=><label className={`concept-choice ${value===option?'selected':''}`} key={option}>
        <input type="radio" name="concept-answer" checked={value===option} onChange={()=>onChange(option)}/>
        <span>{option}</span>
      </label>)}
    </fieldset>;
  }

  if(interaction.kind==='identification'){
    return <div className="concept-exercise concept-identification" role="group" aria-label="Выберите фрагмент">
      {interaction.options.map(option=><button type="button" key={option} disabled={disabled} className={value===option?'selected':''} aria-pressed={value===option} onClick={()=>onChange(option)}><code>{option}</code></button>)}
    </div>;
  }

  if(interaction.kind==='ordering'){
    const order=parseOrder(value,interaction.items,interaction.separator);
    const move=(index:number,direction:-1|1)=>{
      const target=index+direction;
      if(target<0||target>=order.length)return;
      const next=[...order];
      [next[index],next[target]]=[next[target],next[index]];
      onChange(next.join(interaction.separator));
    };
    return <div className="concept-exercise concept-ordering" aria-label="Расположите стадии по порядку">
      {order.map((item,index)=><div className="concept-order-item" key={item}>
        <span className="concept-order-number">{index+1}</span>
        <code>{item}</code>
        <span className="concept-order-controls">
          <button type="button" disabled={disabled||index===0} onClick={()=>move(index,-1)} aria-label={`Переместить ${item} выше`}>↑</button>
          <button type="button" disabled={disabled||index===order.length-1} onClick={()=>move(index,1)} aria-label={`Переместить ${item} ниже`}>↓</button>
        </span>
      </div>)}
    </div>;
  }

  const prefix=interaction.prefix??'';
  const suffix=interaction.suffix??'';
  const answer=extractCompletion(value,prefix,suffix);
  return <label className="concept-exercise concept-completion">
    <span className="sr-only">Введите недостающий фрагмент</span>
    <div className="concept-completion-line">
      {prefix&&<code>{prefix}</code>}
      <input value={answer} disabled={disabled} placeholder={interaction.placeholder} onChange={event=>onChange(`${prefix}${event.target.value}${suffix}`)} autoComplete="off" spellCheck={false}/>
      {suffix&&<code>{suffix}</code>}
    </div>
  </label>;
}

function parseOrder(value:string,items:string[],separator:string){
  const parsed=value.split(separator).map(item=>item.trim()).filter(Boolean);
  if(parsed.length===items.length&&items.every(item=>parsed.includes(item)))return parsed;
  return items;
}

function extractCompletion(value:string,prefix:string,suffix:string){
  let answer=value;
  if(prefix&&answer.startsWith(prefix))answer=answer.slice(prefix.length);
  if(suffix&&answer.endsWith(suffix))answer=answer.slice(0,-suffix.length);
  return answer;
}
