import { useRef, type KeyboardEvent } from 'react';

export type AccessibleTabOption<T extends string>={
  id:T;
  label:string;
  tabId:string;
  panelId:string;
};

export function AccessibleTabs<T extends string>({label,options,active,onChange,className}:{
  label:string;
  options:readonly AccessibleTabOption<T>[];
  active:T;
  onChange:(value:T)=>void;
  className?:string;
}){
  const refs=useRef<Array<HTMLButtonElement|null>>([]);
  const activate=(index:number,focus=false)=>{
    const option=options[index];
    if(!option)return;
    onChange(option.id);
    if(focus)requestAnimationFrame(()=>refs.current[index]?.focus());
  };
  const onKeyDown=(event:KeyboardEvent<HTMLButtonElement>,index:number)=>{
    let next:number|null=null;
    if(event.key==='ArrowRight'||event.key==='ArrowDown')next=(index+1)%options.length;
    else if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=(index-1+options.length)%options.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=options.length-1;
    if(next===null)return;
    event.preventDefault();
    activate(next,true);
  };
  return <div className={className} role="tablist" aria-label={label}>
    {options.map((option,index)=><button
      key={option.id}
      ref={element=>{refs.current[index]=element;}}
      id={option.tabId}
      type="button"
      role="tab"
      aria-selected={active===option.id}
      aria-controls={option.panelId}
      tabIndex={active===option.id?0:-1}
      className={active===option.id?'active':''}
      onClick={()=>activate(index)}
      onKeyDown={event=>onKeyDown(event,index)}
    >{option.label}</button>)}
  </div>;
}
