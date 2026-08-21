export type PlacementAssessmentEvidence={concept:string;difficulty:number;correct:boolean};
export type PlacementExperience='new'|'basic'|'regular'|'advanced'|null;

export type PlacementAssessment={
  weightedAccuracy:number;
  demonstratedDifficulty:number;
  recommendedLessonId:string;
};

const lessonByLevel=['what-is-latex','document-structure','sections-paragraphs','math-modes','fractions-powers','equations-theorems'] as const;

/**
 * Placement questions are adaptively selected, so raw correct/total discards
 * information. Weight evidence by the difficulty that was actually attempted,
 * then keep the recommendation conservative when foundational items failed.
 */
export function assessPlacement(evidence:readonly PlacementAssessmentEvidence[],experience:PlacementExperience):PlacementAssessment{
  if(!evidence.length)return {weightedAccuracy:0,demonstratedDifficulty:0,recommendedLessonId:'what-is-latex'};
  const weight=(difficulty:number)=>1+Math.max(0,Math.min(3,difficulty))*.5;
  const totalWeight=evidence.reduce((sum,item)=>sum+weight(item.difficulty),0);
  const correctWeight=evidence.reduce((sum,item)=>sum+(item.correct?weight(item.difficulty):0),0);
  const weightedAccuracy=totalWeight?correctWeight/totalWeight:0;
  const correctByDifficulty=[0,1,2,3].map(level=>evidence.filter(item=>item.correct&&item.difficulty===level).length);
  let demonstratedDifficulty=0;
  for(let level=0;level<=3;level+=1)if(correctByDifficulty[level]>0)demonstratedDifficulty=level;

  const foundationalFailures=evidence.filter(item=>!item.correct&&item.difficulty===0).length;
  // Conservative boundaries keep a learner with mixed evidence at the last clearly
  // demonstrated layer instead of promoting on a narrow weighted majority.
  let level=weightedAccuracy<.30?0:weightedAccuracy<.44?1:weightedAccuracy<.62?2:weightedAccuracy<.75?3:weightedAccuracy<.86?4:5;
  if(foundationalFailures>0)level=Math.min(level,1);
  if(demonstratedDifficulty<2)level=Math.min(level,2);
  if(demonstratedDifficulty<3)level=Math.min(level,4);

  // Experience is only a tie-breaker at the top end; evidence remains primary.
  if(level===4&&experience==='advanced'&&weightedAccuracy>=.78&&demonstratedDifficulty===3)level=5;
  return {weightedAccuracy,demonstratedDifficulty,recommendedLessonId:lessonByLevel[level]};
}
