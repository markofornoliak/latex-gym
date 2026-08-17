import { lazy, Suspense, type ReactNode } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/AppShell';

const BookmarksPage = lazy(() => import('../pages/BookmarksPage').then((m) => ({ default: m.BookmarksPage })));
const CoursePage = lazy(() => import('../pages/CoursePage').then((m) => ({ default: m.CoursePage })));
const CoursesPage = lazy(() => import('../pages/CoursesPage').then((m) => ({ default: m.CoursesPage })));
const HistoryPage = lazy(() => import('../pages/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const HomePage = lazy(() => import('../pages/HomePage').then((m) => ({ default: m.HomePage })));
const LessonPage = lazy(() => import('../pages/LessonPage').then((m) => ({ default: m.LessonPage })));
const OnboardingPage = lazy(() => import('../pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })));
const PlaygroundPage = lazy(() => import('../pages/PlaygroundPage').then((m) => ({ default: m.PlaygroundPage })));
const PracticeExercisePage = lazy(() => import('../pages/PracticeExercisePage').then((m) => ({ default: m.PracticeExercisePage })));
const PracticePage = lazy(() => import('../pages/PracticePage').then((m) => ({ default: m.PracticePage })));
const ProgressPage = lazy(() => import('../pages/ProgressPage').then((m) => ({ default: m.ProgressPage })));
const ReferenceDetailPage = lazy(() => import('../pages/ReferenceDetailPage').then((m) => ({ default: m.ReferenceDetailPage })));
const ReferencePage = lazy(() => import('../pages/ReferencePage').then((m) => ({ default: m.ReferencePage })));
const SettingsPage = lazy(() => import('../pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

function RouteFallback() {
  return <div className="route-loading" role="status" aria-live="polite">Загрузка…</div>;
}

function Wrapped({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

export function App() {
  return (
    <HashRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<AppShell plain><OnboardingPage /></AppShell>} />
          <Route path="/home" element={<Wrapped><HomePage /></Wrapped>} />
          <Route path="/courses" element={<Wrapped><CoursesPage /></Wrapped>} />
          <Route path="/course/:courseId" element={<Wrapped><CoursePage /></Wrapped>} />
          <Route path="/lesson/:lessonId" element={<Wrapped><LessonPage /></Wrapped>} />
          <Route path="/practice" element={<Wrapped><PracticePage /></Wrapped>} />
          <Route path="/practice/:exerciseId" element={<Wrapped><PracticeExercisePage /></Wrapped>} />
          <Route path="/reference" element={<Wrapped><ReferencePage /></Wrapped>} />
          <Route path="/reference/:command" element={<Wrapped><ReferenceDetailPage /></Wrapped>} />
          <Route path="/playground" element={<Wrapped><PlaygroundPage /></Wrapped>} />
          <Route path="/bookmarks" element={<Wrapped><BookmarksPage /></Wrapped>} />
          <Route path="/progress" element={<Wrapped><ProgressPage /></Wrapped>} />
          <Route path="/history" element={<Wrapped><HistoryPage /></Wrapped>} />
          <Route path="/settings" element={<Wrapped><SettingsPage /></Wrapped>} />
          <Route path="*" element={<Wrapped><div className="page empty-state"><h1>Страница не найдена</h1><a href="#/home">Вернуться на главную</a></div></Wrapped>} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
