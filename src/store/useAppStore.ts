import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Bookmark, HistoryEntry } from '../types';

type Settings = {
  textSize: 'small' | 'medium' | 'large';
  wordWrap: boolean;
  autoClose: boolean;
  lineNumbers: boolean;
};

type AppState = {
  version: number;
  onboarded: boolean;
  completedLessons: string[];
  completedExercises: string[];
  currentLessonId: string;
  bookmarks: Bookmark[];
  attempts: Record<string,number>;
  successfulAttempts: Record<string,number>;
  hintsUsed: Record<string,number>;
  drafts: Record<string,string>;
  conceptScores: Record<string,number>;
  history: HistoryEntry[];
  streak: { count:number; lastActive:string | null };
  settings: Settings;
  setOnboarded: () => void;
  setCurrentLesson: (id:string) => void;
  completeLesson: (id:string,title:string) => void;
  recordExerciseAttempt: (exerciseId:string,ok:boolean,concepts:string[],title:string) => void;
  recordHint: (exerciseId:string,level:number) => void;
  setDraft: (key:string,source:string) => void;
  toggleBookmark: (type:Bookmark['type'],targetId:string) => void;
  touchReference: (title:string) => void;
  updateSettings: (patch:Partial<Settings>) => void;
  importProgress: (raw:string) => {ok:boolean; message:string};
  resetProgress: () => void;
};

const defaultSettings:Settings = { textSize:'medium', wordWrap:true, autoClose:true, lineNumbers:true };
const today = () => new Date().toISOString().slice(0,10);

function nextStreak(streak:AppState['streak']) {
  const current=today();
  if (streak.lastActive===current) return streak;
  if (!streak.lastActive) return {count:1,lastActive:current};
  const prev=new Date(`${streak.lastActive}T12:00:00Z`);
  const now=new Date(`${current}T12:00:00Z`);
  const diff=Math.round((now.getTime()-prev.getTime())/86400000);
  return {count:diff===1?streak.count+1:1,lastActive:current};
}

const unique = (arr:string[],value:string) => arr.includes(value)?arr:[...arr,value];
const historyItem = (text:string,kind:HistoryEntry['kind']):HistoryEntry => ({id:crypto.randomUUID(),at:new Date().toISOString(),text,kind});

export const useAppStore=create<AppState>()(persist((set)=>({
  version:1,
  onboarded:false,
  completedLessons:[], completedExercises:[], currentLessonId:'document-structure', bookmarks:[], attempts:{}, successfulAttempts:{}, hintsUsed:{}, drafts:{}, conceptScores:{}, history:[], streak:{count:0,lastActive:null}, settings:defaultSettings,
  setOnboarded:()=>set({onboarded:true}),
  setCurrentLesson:(id)=>set({currentLessonId:id}),
  completeLesson:(id,title)=>set(s=>({
    completedLessons:unique(s.completedLessons,id), currentLessonId:id,
    history:[historyItem(`Пройден урок «${title}»`,'lesson'),...s.history].slice(0,100), streak:nextStreak(s.streak)
  })),
  recordExerciseAttempt:(exerciseId,ok,concepts,title)=>set(s=>{
    const attempts={...s.attempts,[exerciseId]:(s.attempts[exerciseId]??0)+1};
    const successfulAttempts={...s.successfulAttempts};
    if(ok) successfulAttempts[exerciseId]=(successfulAttempts[exerciseId]??0)+1;
    const conceptScores={...s.conceptScores};
    for(const concept of concepts) conceptScores[concept]=(conceptScores[concept]??0)+(ok?1:-1);
    return {
      attempts,successfulAttempts,conceptScores,
      completedExercises:ok?unique(s.completedExercises,exerciseId):s.completedExercises,
      history:ok?[historyItem(`Решена задача «${title}»`,'exercise'),...s.history].slice(0,100):s.history,
      streak:nextStreak(s.streak)
    };
  }),
  recordHint:(exerciseId,level)=>set(s=>({hintsUsed:{...s.hintsUsed,[exerciseId]:Math.max(level,s.hintsUsed[exerciseId]??0)}})),
  setDraft:(key,source)=>set(s=>({drafts:{...s.drafts,[key]:source}})),
  toggleBookmark:(type,targetId)=>set(s=>{
    const id=`${type}:${targetId}`;
    const exists=s.bookmarks.some(b=>b.id===id);
    return {bookmarks:exists?s.bookmarks.filter(b=>b.id!==id):[...s.bookmarks,{id,type,targetId,createdAt:new Date().toISOString()}]};
  }),
  touchReference:(title)=>set(s=>({history:[historyItem(`Изучена команда ${title}`,'reference'),...s.history].slice(0,100),streak:nextStreak(s.streak)})),
  updateSettings:(patch)=>set(s=>({settings:{...s.settings,...patch}})),
  importProgress:(raw)=>{
    try {
      const parsed=JSON.parse(raw) as Partial<AppState>;
      if(!parsed || typeof parsed!=='object') throw new Error('bad');
      set(s=>({
        onboarded:parsed.onboarded??s.onboarded,
        completedLessons:Array.isArray(parsed.completedLessons)?parsed.completedLessons:s.completedLessons,
        completedExercises:Array.isArray(parsed.completedExercises)?parsed.completedExercises:s.completedExercises,
        currentLessonId:typeof parsed.currentLessonId==='string'?parsed.currentLessonId:s.currentLessonId,
        bookmarks:Array.isArray(parsed.bookmarks)?parsed.bookmarks:s.bookmarks,
        attempts:parsed.attempts??s.attempts, successfulAttempts:parsed.successfulAttempts??s.successfulAttempts,
        hintsUsed:parsed.hintsUsed??s.hintsUsed,drafts:parsed.drafts??s.drafts,conceptScores:parsed.conceptScores??s.conceptScores,
        history:Array.isArray(parsed.history)?parsed.history:s.history,streak:parsed.streak??s.streak,settings:{...s.settings,...parsed.settings}
      }));
      return {ok:true,message:'Прогресс импортирован.'};
    } catch { return {ok:false,message:'Файл прогресса имеет неверный формат.'}; }
  },
  resetProgress:()=>set({completedLessons:[],completedExercises:[],currentLessonId:'document-structure',bookmarks:[],attempts:{},successfulAttempts:{},hintsUsed:{},drafts:{},conceptScores:{},history:[],streak:{count:0,lastActive:null}})
}),{
  name:'latex-gym-state', version:1, storage:createJSONStorage(()=>localStorage),
  migrate:(persisted,version)=>{
    const p=(persisted??{}) as Record<string,unknown>;
    if(version<1) return {...p,version:1} as unknown as AppState;
    return p as unknown as AppState;
  }
}));

export function exportProgress() {
  const state=useAppStore.getState();
  const data={
    version:1,onboarded:state.onboarded,completedLessons:state.completedLessons,completedExercises:state.completedExercises,currentLessonId:state.currentLessonId,
    bookmarks:state.bookmarks,attempts:state.attempts,successfulAttempts:state.successfulAttempts,hintsUsed:state.hintsUsed,drafts:state.drafts,conceptScores:state.conceptScores,history:state.history,streak:state.streak,settings:state.settings
  };
  return JSON.stringify(data,null,2);
}
