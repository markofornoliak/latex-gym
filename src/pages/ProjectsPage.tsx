import { Link } from 'react-router-dom';
import { ChevronIcon } from '../components/Icons';
import { curriculum } from '../data/curriculumRuntime';
import { useAppStore } from '../store/useAppStore';

const {projects}=curriculum;

export function ProjectsPage(){
  const progress=useAppStore(state=>state.completedProjectStages);
  return <div className="page editorial-page project-index">
    <header className="page-intro"><span className="eyebrow">ПРОЕКТЫ</span><h1>Документы, которые растут вместе с навыком</h1><p>Каждый проект соединяет несколько уже изученных понятий. Здесь нет отдельной «проектной магии»: используются те же команды, окружения и связи, но в масштабе реального документа.</p></header>
    <section className="project-list" aria-label="Учебные проекты">{projects.map((project,index)=>{
      const done=progress[project.id]?.length??0;
      const percent=Math.round((done/project.stages.length)*100);
      return <Link className="project-row" key={project.id} to={`/project/${project.id}`}><span className="project-number">{String(index+1).padStart(2,'0')}</span><span className="project-copy"><strong>{project.title}</strong><small>{project.subtitle}</small><span>{project.difficulty} · {project.stages.length} этапов{done>0?` · ${percent}% завершено`:''}</span></span><ChevronIcon/></Link>;
    })}</section>
  </div>;
}
