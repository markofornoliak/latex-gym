import '../data/curriculumRuntime';
import { lazy, Suspense, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { RouteErrorBoundary } from '../components/RouteErrorBoundary';
import { useAppStore } from '../store/useAppStore';

const BookmarksPage=lazy(()=>import('../pages/BookmarksPage').then(module=>({default:module.BookmarksPage})));
const CoursePage=lazy(()=>import('../pages/CoursePage').then(module=>({default:module.CoursePage})));
const CoursesPage=lazy(()=>import('../pages/CoursesPage').then(module=>({default:module.CoursesPage})));
const HistoryPage=lazy(()=>import('../pages/HistoryPage').then(module=>({default:module.HistoryPage})));
const HomePage=lazy(()=>import('../pages/HomePage').then(module=>({default:module.HomePage})));
const LessonPage=lazy(()=>import('../pages/LessonPage').then(module=>({default:module.LessonPage})));
const OnboardingPage=lazy(()=>import('../pages/OnboardingPage').then(module=>({default:module.OnboardingPage})));
const PlaygroundPage=lazy(()=>import('../pages/PlaygroundPage').then(module=>({default:module.PlaygroundPage})));
const PracticeExercisePage=lazy(()=>import('../pages/PracticeExercisePage').then(module=>({default:module.PracticeExercisePage})));
const PracticePage=lazy(()=>import('../pages/PracticePage').then(module=>({default:module.PracticePage})));
const ProgressPage=lazy(()=>import('../pages/ProgressPage').then(module=>({default:module.ProgressPage})));
const ProjectPage=lazy(()=>import('../pages/ProjectPage').then(module=>({default:module.ProjectPage})));
const ProjectsPage=lazy(()=>import('../pages/ProjectsPage').then(module=>({default:module.ProjectsPage})));
const ReferenceDetailPage=lazy(()=>import('../pages/ReferenceDetailPage').then(module=>({default:module.ReferenceDetailPage})));
const ReferencePage=lazy(()=>import('../pages/ReferencePage').then(module=>({default:module.ReferencePage})));
const SettingsPage=lazy(()=>import('../pages/SettingsPage').then(module=>({default:module.SettingsPage})));

function RouteFallback(){return <div className="route-loading" role="status" aria-live="polite">Загрузка…</div>;}
function Wrapped({children}:{children:ReactNode}){return <AppShell>{children}</AppShell>;}
function RootRoute(){const onboarded=useAppStore(state=>state.onboarded);return onboarded?<Navigate to="/home" replace/>:<AppShell plain><OnboardingPage/></AppShell>;}
function PracticeExerciseRoute(){const {exerciseId}=useParams();return <PracticeExercisePage key={exerciseId}/>;}

export function App(){
  return <RouteErrorBoundary><HashRouter><Suspense fallback={<RouteFallback/>}><Routes>
    <Route path="/" element={<RootRoute/>}/>
    <Route path="/home" element={<Wrapped><HomePage/></Wrapped>}/>
    <Route path="/courses" element={<Wrapped><CoursesPage/></Wrapped>}/>
    <Route path="/course/:courseId" element={<Wrapped><CoursePage/></Wrapped>}/>
    <Route path="/lesson/:lessonId" element={<Wrapped><LessonPage/></Wrapped>}/>
    <Route path="/practice" element={<Wrapped><PracticePage/></Wrapped>}/>
    <Route path="/practice/:exerciseId" element={<Wrapped><PracticeExerciseRoute/></Wrapped>}/>
    <Route path="/projects" element={<Wrapped><ProjectsPage/></Wrapped>}/>
    <Route path="/project/:projectId" element={<Wrapped><ProjectPage/></Wrapped>}/>
    <Route path="/project/:projectId/:stageId" element={<Wrapped><ProjectPage/></Wrapped>}/>
    <Route path="/reference" element={<Wrapped><ReferencePage/></Wrapped>}/>
    <Route path="/reference/:command" element={<Wrapped><ReferenceDetailPage/></Wrapped>}/>
    <Route path="/playground" element={<Wrapped><PlaygroundPage/></Wrapped>}/>
    <Route path="/bookmarks" element={<Wrapped><BookmarksPage/></Wrapped>}/>
    <Route path="/progress" element={<Wrapped><ProgressPage/></Wrapped>}/>
    <Route path="/history" element={<Wrapped><HistoryPage/></Wrapped>}/>
    <Route path="/settings" element={<Wrapped><SettingsPage/></Wrapped>}/>
    <Route path="*" element={<Wrapped><div className="page empty-state"><h1>Страница не найдена</h1><a href="#/home">Вернуться на главную</a></div></Wrapped>}/>
  </Routes></Suspense></HashRouter></RouteErrorBoundary>;
}
