import { spawnSync } from 'node:child_process';

const executable=process.platform==='win32'?'npx.cmd':'npx';
const result=spawnSync(executable,['vitest','run','src/data/curriculumSnapshot.generate.test.ts'],{
  cwd:process.cwd(),
  env:{...process.env,LATEX_GYM_WRITE_CURRICULUM_SNAPSHOT:'1'},
  stdio:'inherit'
});
if(result.error)throw result.error;
if(result.status!==0)process.exit(result.status??1);
