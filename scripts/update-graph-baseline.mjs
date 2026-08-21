import fs from 'node:fs';

const path='src/data/curriculumBaseline.json';
const baseline=JSON.parse(fs.readFileSync(path,'utf8'));
if(baseline.semanticFingerprint!=='b0fe0ef3'&&baseline.semanticFingerprint!=='b2053edc')throw new Error('Unexpected curriculum baseline fingerprint: '+baseline.semanticFingerprint);
baseline.semanticFingerprint='b2053edc';
fs.writeFileSync(path,JSON.stringify(baseline,null,2)+'\n');
console.log('Updated curriculum semantic fingerprint to b2053edc without changing stable ID locks.');
