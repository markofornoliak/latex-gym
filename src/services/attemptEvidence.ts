import type { MasteryEvidence } from '../types';

export function attemptIndependence(input:{solutionRevealed:boolean;hintLevelThisAttempt:number}):MasteryEvidence['independence']{
  if(input.solutionRevealed)return 'revealed';
  if(input.hintLevelThisAttempt>0)return 'hinted';
  return 'independent';
}

export function nextAttemptHintLevel(current:number,total:number){return Math.min(total,Math.max(0,current)+1);}
