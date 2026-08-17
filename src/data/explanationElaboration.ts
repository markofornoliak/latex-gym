import { lessons } from './courses';
import type { LearningBlock, Lesson } from '../types';

const withoutTerminal=(value:string)=>value.trim().replace(/[.!?]+$/,'');
const lowerFirst=(value:string)=>value?value[0].toLocaleLowerCase('ru-RU')+value.slice(1):value;
const sentence=(value:string)=>{
  const trimmed=value.trim();
  if(!trimmed)return '';
  return /[.!?]$/.test(trimmed)?trimmed:`${trimmed}.`;
};
const appendOnce=(base:string|undefined,addition:string)=>{
  const clean=(base??'').trim();
  if(!addition||clean.includes(addition))return clean;
  return clean?`${clean} ${addition}`:addition;
};

function lessonDetail(lesson:Lesson,index:number){
  const pedagogy=lesson.pedagogy;
  if(pedagogy){
    const misconception=pedagogy.misconceptions[index%Math.max(1,pedagogy.misconceptions.length)];
    const mastery=pedagogy.masteryCriteria[index%Math.max(1,pedagogy.masteryCriteria.length)];
    const variants=[
      `Практически здесь важно ${lowerFirst(withoutTerminal(pedagogy.practiceObjective))}.`,
      misconception?`Типичная ошибка на этом месте: ${sentence(misconception)}`:`Общая цель этого шага — ${lowerFirst(withoutTerminal(pedagogy.objective))}.`,
      `В общей логике урока этот шаг нужен, чтобы ${lowerFirst(withoutTerminal(pedagogy.objective))}.`,
      mastery?`Критерий понимания после этого шага: ${sentence(mastery)}`:`Связывайте этот принцип с задачей урока, а не запоминайте его как отдельный синтаксический факт.`
    ];
    return variants[index%variants.length];
  }

  const fallback=[
    `Практически этот принцип помогает применять тему «${lesson.title}» без ручных обходных приёмов.`,
    `Смотрите не только на синтаксис, но и на то, какую смысловую роль эта конструкция выполняет в документе.`,
    `При самостоятельной работе полезно сначала предсказать результат, а уже затем проверять его компиляцией.`,
    `Связывайте этот шаг с общей задачей урока: ${lowerFirst(withoutTerminal(lesson.subtitle))}.`
  ];
  return fallback[index%fallback.length];
}

function elaborateBlock(block:LearningBlock,lesson:Lesson,index:number):LearningBlock{
  const contextual=lessonDetail(lesson,index);
  if(block.type==='concept'||block.type==='explanation')return {...block,body:appendOnce(block.body,contextual)};
  if(block.type==='syntax')return {...block,body:appendOnce(block.body,'Читайте конструкцию целиком: имя команды задаёт действие, обязательные аргументы передают данные, а опции уточняют способ выполнения.')};
  if(block.type==='anatomy')return {...block,body:appendOnce(block.body,'Читайте конструкцию слева направо: каждый следующий фрагмент либо задаёт действие, либо уточняет данные для уже выбранного действия.')};
  if(block.type==='flow')return {...block,body:appendOnce(block.body,'Не пропускайте промежуточные стадии: именно они объясняют, откуда берётся следующий результат, номер объекта или диагностическое сообщение.')};
  if(block.type==='example')return {...block,body:appendOnce(block.body,'Сопоставьте каждую команду с её ролью и попробуйте мысленно предсказать результат до компиляции — так синтаксис быстрее превращается в рабочую модель.')};
  if(block.type==='source-output')return {...block,body:appendOnce(block.body,'Сопоставляйте каждую смысловую часть исходника с конкретным изменением результата: это формирует причинную связь между кодом и типографикой.')};
  if(block.type==='comparison')return {...block,body:appendOnce(block.body,'Сравнивайте варианты по смыслу, устойчивости к изменениям и читаемости исходника, а не только по внешнему совпадению результата.')};
  if(block.type==='mistake'||block.type==='warning')return {...block,body:appendOnce(block.body,'При отладке сначала локализуйте минимальный фрагмент, который воспроизводит проблему, и только затем меняйте исходник — так проще отличить причину от каскада последствий.')};
  return block;
}

for(const lesson of lessons){
  lesson.theory=lesson.theory.map((block,index)=>({...block,body:appendOnce(block.body,lessonDetail(lesson,index))}));
  if(lesson.content)lesson.content=lesson.content.map((block,index)=>elaborateBlock(block,lesson,index));
}
