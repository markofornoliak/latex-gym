import { describe, expect, it } from 'vitest';
import { curriculum } from './curriculumRuntime';
import { CURRICULUM_EXERCISE_COUNT, CURRICULUM_LESSON_COUNT, CURRICULUM_MODULE_COUNT, CURRICULUM_PROJECT_COUNT } from './curriculumMeta';

describe('bootstrap curriculum metadata',()=>{
  it('matches the canonical curriculum exactly',()=>{
    expect(CURRICULUM_MODULE_COUNT).toBe(curriculum.modules.length);
    expect(CURRICULUM_LESSON_COUNT).toBe(curriculum.lessons.length);
    expect(CURRICULUM_EXERCISE_COUNT).toBe(curriculum.exercises.length);
    expect(CURRICULUM_PROJECT_COUNT).toBe(curriculum.projects.length);
  });
});
