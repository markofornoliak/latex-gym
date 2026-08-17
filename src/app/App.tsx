import type { ReactNode } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { BookmarksPage } from '../pages/BookmarksPage';
import { CoursePage } from '../pages/CoursePage';
import { CoursesPage } from '../pages/CoursesPage';
import { HistoryPage } from '../pages/HistoryPage';
import { HomePage } from '../pages/HomePage';
import { LessonPage } from '../pages/LessonPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { PlaygroundPage } from '../pages/PlaygroundPage';
import { PracticeExercisePage } from '../pages/PracticeExercisePage';
import { PracticePage } from '../pages/PracticePage';
import { ProgressPage } from '../pages/ProgressPage';
import { ReferenceDetailPage } from '../pages/ReferenceDetailPage';
import { ReferencePage } from '../pages/ReferencePage';
import { SettingsPage } from '../pages/SettingsPage';

const Wrapped=({children}:{children:ReactNode})=><AppShell>{children}</AppShell>;
export function App(){return <HashRouter><Routes>
  <Route path="/" element={<AppShell plain><OnboardingPage/></AppShell>}/>
  <Route path="/home" element={<Wrapped><HomePage/></Wrapped>}/>
  <Route path="/courses" element={<Wrapped><CoursesPage/></Wrapped>}/>
  <Route path="/course/:courseId" element={<Wrapped><CoursePage/></Wrapped>}/>
  <Route path="/lesson/:lessonId" element={<Wrapped><LessonPage/></Wrapped>}/>
  <Route path="/practice" element={<Wrapped><PracticePage/></Wrapped>}/>
  <Route path="/practice/:exerciseId" element={<Wrapped><PracticeExercisePage/></Wrapped>}/>
  <Route path="/reference" element={<Wrapped><ReferencePage/></Wrapped>}/>
  <Route path="/reference/:command" element={<Wrapped><ReferenceDetailPage/></Wrapped>}/>
  <Route path="/playground" element={<Wrapped><PlaygroundPage/></Wrapped>}/>
  <Route path="/bookmarks" element={<Wrapped><BookmarksPage/></Wrapped>}/>
  <Route path="/progress" element={<Wrapped><ProgressPage/></Wrapped>}/>
  <Route path="/history" element={<Wrapped><HistoryPage/></Wrapped>}/>
  <Route path="/settings" element={<Wrapped><SettingsPage/></Wrapped>}/>
  <Route path="*" element={<Wrapped><div className="page empty-state"><h1>Страница не найдена</h1><a href="#/home">Вернуться на главную</a></div></Wrapped>}/>
</Routes></HashRouter>}
