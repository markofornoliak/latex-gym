export type LearningTrackId='beginner'|'mathematics'|'scientific-papers'|'thesis'|'engineering'|'advanced';

export type LearningTrack={id:LearningTrackId;title:string;lessonIds:readonly string[];projectIds:readonly string[]};

/** Track metadata references canonical stable IDs; it never duplicates lesson content. */
export const learningTracks:Record<LearningTrackId,LearningTrack>={
  beginner:{id:'beginner',title:'Основы LaTeX',lessonIds:['what-is-latex','compilation-model','tex-source','commands-foundation','arguments-foundation','environments-foundation','document-structure-foundation','preamble-body-foundation','packages-foundation','errors-foundation','first-document-foundation','document-structure','sections-paragraphs','text-formatting'],projectIds:['mathematical-notes']},
  mathematics:{id:'mathematics',title:'Математика',lessonIds:['math-modes','fractions-powers','equations-theorems','matrices-cases','math-operators','math-symbols-deep','indices-groups','roots-deep','functions-deep','equation-model','math-line-breaks','alignment-points','delimiters-deep'],projectIds:['mathematical-notes']},
  'scientific-papers':{id:'scientific-papers',title:'Научные статьи',lessonIds:['academic-paper','labels-refs','figures-captions','advanced-tables','bibliography-basics','biblatex-workflow','typography-microtype'],projectIds:['academic-paper']},
  thesis:{id:'thesis',title:'Диплом / диссертация',lessonIds:['large-documents','multi-file-deep','appendices-deep','headers-footers-deep','bibliography-basics','biblatex-workflow','glossaries-index','custom-commands'],projectIds:['academic-paper','technical-report']},
  engineering:{id:'engineering',title:'Инженерные документы',lessonIds:['document-classes-layout','figures-captions','advanced-tables','float-control','multi-file-deep','build-automation','debugging'],projectIds:['laboratory-report','technical-report']},
  advanced:{id:'advanced',title:'Продвинутый LaTeX',lessonIds:['debugging','unicode-engines','build-automation','custom-environments-deep','counters-lengths','debug-undefined-control','debug-missing-brace','debug-alignment-tab','debug-missing-math','debug-undefined-environment','debug-file-not-found'],projectIds:['beamer-presentation','technical-report']}
};

const goalTracks:Record<string,LearningTrackId>={
  general:'beginner',assignments:'beginner',mathematics:'mathematics','scientific-papers':'scientific-papers',thesis:'thesis',engineering:'engineering'
};

export function tracksForProfile(goals:readonly string[],experience?:string|null){
  const ordered:LearningTrackId[]=[];
  for(const goal of goals){
    const track=goalTracks[goal];if(track&&!ordered.includes(track))ordered.push(track);
  }
  if(goals.includes('presentations')&&!ordered.includes('advanced'))ordered.push('advanced');
  if(experience==='advanced'&&!ordered.includes('advanced'))ordered.push('advanced');
  if(!ordered.length)ordered.push('beginner');
  return ordered;
}

export function preferredLessonIds(goals:readonly string[],experience?:string|null){
  return [...new Set(tracksForProfile(goals,experience).flatMap(id=>learningTracks[id].lessonIds))];
}

export function preferredProjectIds(goals:readonly string[],experience?:string|null){
  const fromTracks=tracksForProfile(goals,experience).flatMap(id=>learningTracks[id].projectIds);
  if(goals.includes('presentations'))fromTracks.unshift('beamer-presentation');
  return [...new Set(fromTracks)];
}

export function learningRouteLabel(goals:readonly string[],experience?:string|null){
  if(goals.includes('presentations'))return 'Основы LaTeX → Beamer';
  const track=learningTracks[tracksForProfile(goals,experience)[0]];
  return `Основы LaTeX → ${track.title}`;
}
