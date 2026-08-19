import type { ConceptDefinition, CourseModule, Exercise, LearningProject, Lesson, ReferenceEntry } from './curriculum';

export type CurriculumConceptNodeSnapshot={
  id:string;
  title:string;
  description:string;
  requires:readonly string[];
  requiredBy:readonly string[];
  introducedBy:readonly string[];
  reinforcedBy:readonly string[];
  practicedBy:readonly string[];
  referenceIds:readonly string[];
  projectIds:readonly string[];
};

export type CurriculumGraphSnapshot={
  nodes:Readonly<Record<string,CurriculumConceptNodeSnapshot>>;
  conceptIds:readonly string[];
  topologicalOrder:readonly string[];
};

export type CurriculumNormalizationChangeSnapshot={
  kind:'exercise-concept'|'exercise-prerequisite'|'lesson-prerequisite'|'lesson-introduces'|'lesson-reinforces';
  sourceId:string;
  from:string;
  to:string;
};

export type CurriculumNormalizationReportSnapshot={
  changes:readonly CurriculumNormalizationChangeSnapshot[];
  unresolved:readonly {sourceId:string;conceptId:string;kind:CurriculumNormalizationChangeSnapshot['kind']}[];
};

export type CurriculumIssueSnapshot={
  severity:'error'|'warning';
  code:string;
  message:string;
  moduleId?:string;
  lessonId?:string;
  exerciseId?:string;
  projectId?:string;
  conceptId?:string;
  referenceId?:string;
};

export type CurriculumSnapshot={
  snapshotVersion:number;
  semanticFingerprint:string;
  modules:CourseModule[];
  lessons:Lesson[];
  exercises:Exercise[];
  concepts:ConceptDefinition[];
  references:ReferenceEntry[];
  projects:LearningProject[];
  graph:CurriculumGraphSnapshot;
  normalization:CurriculumNormalizationReportSnapshot;
  issues:CurriculumIssueSnapshot[];
  build:{
    moduleCount:number;
    lessonCount:number;
    exerciseCount:number;
    conceptCount:number;
    referenceCount:number;
    projectCount:number;
    normalizedConceptTags:number;
  };
};
