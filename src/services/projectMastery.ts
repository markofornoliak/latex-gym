import { updateConceptMastery, useAppStore } from '../store/useAppStore';

export function recordProjectStageEvidence(concepts:string[],ok:boolean,realCompile:boolean){
  if(concepts.length===0)return;
  const now=new Date();
  useAppStore.setState(state=>{
    const conceptScores={...state.conceptScores};
    const conceptMastery={...state.conceptMastery};
    for(const conceptId of concepts){
      conceptScores[conceptId]=(conceptScores[conceptId]??0)+(ok?1:-1);
      conceptMastery[conceptId]=updateConceptMastery(conceptMastery[conceptId],ok,now,{
        independence:'independent',context:'project',realCompile
      });
    }
    return {conceptScores,conceptMastery};
  });
}
