export type MasteryEvidence = {
  outcome:'success'|'failure';
  independence:'independent'|'hinted'|'revealed';
  context:'practice'|'transfer'|'project'|'placement';
  realCompile:boolean;
};
export type ConceptMastery = {
  score:number;attempts:number;successes:number;mistakeCount:number;lastPracticed:string|null;stability:number;nextReview:string|null;
  independentSuccesses:number;hintedSuccesses:number;transferSuccesses:number;projectSuccesses:number;solutionReveals:number;lastEvidence:MasteryEvidence|null;
};
export type Bookmark = {id:string;type:'lesson'|'exercise'|'reference';targetId:string;createdAt:string};
export type HistoryEntry = {id:string;at:string;text:string;kind:'lesson'|'exercise'|'reference'};
