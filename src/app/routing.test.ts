import { describe, expect, it } from 'vitest';
import { createMemoryRouter, matchRoutes, type RouteObject } from 'react-router-dom';

const routes:RouteObject[]=[
  {path:'/'},{path:'/home'},{path:'/courses'},{path:'/course/:courseId'},{path:'/lesson/:lessonId'},
  {path:'/practice'},{path:'/practice/:exerciseId'},{path:'/projects'},{path:'/project/:projectId'},{path:'/project/:projectId/:stageId'},
  {path:'/reference'},{path:'/reference/:command'},{path:'/playground'},{path:'/bookmarks'},{path:'/progress'},{path:'/history'},{path:'/settings'}
];

describe('static SPA routes',()=>{
  it.each(['/lesson/what-is-latex','/practice/deep-001','/project/academic-paper/stage-4','/reference/frac'])('matches deep route %s directly',(pathname)=>{
    expect(matchRoutes(routes,{pathname})?.length).toBeGreaterThan(0);
  });

  it('preserves back and forward navigation semantics',async()=>{
    const router=createMemoryRouter(routes,{initialEntries:['/home','/lesson/what-is-latex'],initialIndex:1});
    await router.navigate('/practice/deep-001');
    expect(router.state.location.pathname).toBe('/practice/deep-001');
    await router.navigate(-1);
    expect(router.state.location.pathname).toBe('/lesson/what-is-latex');
    await router.navigate(-1);
    expect(router.state.location.pathname).toBe('/home');
    await router.navigate(1);
    expect(router.state.location.pathname).toBe('/lesson/what-is-latex');
    router.dispose();
  });
});
