import { curriculumSource } from './curriculumSource';

/** Compatibility adapter. Project content is authored in curriculumSource.json. */
export const projects=curriculumSource.projects;
export const projectById=new Map(projects.map(project=>[project.id,project]));
export const getProject=(id?:string)=>id?projectById.get(id):undefined;
