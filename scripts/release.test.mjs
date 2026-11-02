import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCandidate, assertCI, deploymentRequest } from './release.mjs';
const sha='a'.repeat(40), project={id:'p',name:'app',stagingId:'stage'};
const good={projectId:'p',readyState:'READY',customEnvironment:{id:'stage'},meta:{releaseSha:sha}};
test('only the exact ready staging deployment is releasable',()=>{
 assert.doesNotThrow(()=>assertCandidate(good,project,sha));
 for(const d of [{...good,projectId:'other'},{...good,readyState:'BUILDING'},{...good,customEnvironment:null},{...good,meta:{releaseSha:'b'.repeat(40)}}]) assert.throws(()=>assertCandidate(d,project,sha));
});
test('CI must pass on main push at the exact commit, including reruns',()=>{
 const r={id:1,head_sha:sha,event:'push',head_branch:'main',status:'completed',conclusion:'success'};
 assert.equal(assertCI([r],sha,'ci'),true);
 assert.equal(assertCI([{...r,event:'pull_request'}],sha,'ci'),false);
 assert.equal(assertCI([{...r,head_sha:'b'.repeat(40)}],sha,'ci'),false);
 assert.equal(assertCI([{...r,status:'in_progress'}],sha,'ci'),false);
 assert.throws(()=>assertCI([r,{...r,id:2,conclusion:'failure'}],sha,'ci'));
});
test('production builds are explicitly approved and never auto-promoted',()=>{
 const request=deploymentRequest('production',sha,'123',project,'org/repo');
 assert.equal(request.autoAssignCustomDomains,false);assert.equal(request.build.env.RELEASE_APPROVED,'true');
 assert.equal(request.gitSource.sha,sha);assert.equal(request.target,'production');
 const staging=deploymentRequest('staging',sha,'123',project,'org/repo');
 assert.equal(staging.customEnvironmentSlugOrId,project.stagingId);assert.equal(staging.build,undefined);
 assert.throws(()=>deploymentRequest('preview','main','123',project,'org/repo'));
});

import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main } from './release.mjs';

async function simulate({ failure, wrongSHA = false, autoPromote = false, mode = 'production' } = {}) {
 const old = { cwd: process.cwd(), env: {...process.env}, argv: [...process.argv], fetch: global.fetch, log:console.log, error:console.error, exit:process.exitCode };
 const dir=mkdtempSync(join(tmpdir(),'release-test-'));
 const projects=['one','two'].map(name=>({name,id:name,token:'TEST_TOKEN',stagingId:'stage',stagingDomain:`${name}-stage.example.test`,productionDomain:`${name}.example.test`,healthPath:'/health',healthText:'healthy'}));
 const live={one:'old-one',two:'old-two'}, mutations=[];
 try {
  process.chdir(dir);mkdirSync('.github');writeFileSync('.github/release.json',JSON.stringify({repository:'org/repo',teamId:'team',workflows:['ci.yml'],projects}));
  Object.assign(process.env,{GITHUB_REF:'refs/heads/main',GITHUB_SHA:sha,GITHUB_REPOSITORY:'org/repo',GH_TOKEN:'fixture',TEST_TOKEN:'fixture',GITHUB_RUN_ID:'1'});delete process.env.GITHUB_STEP_SUMMARY;
  process.argv[2]=mode;console.log=()=>{};console.error=()=>{};
  global.fetch=async (url,options={})=>{
   const u=new URL(url),path=u.pathname;
   const json=data=>new Response(JSON.stringify(data),{status:200});
   if(u.hostname==='api.github.com')return json({workflow_runs:[{id:1,head_sha:sha,event:'push',head_branch:'main',status:'completed',conclusion:'success'}]});
   if(u.hostname!=='api.vercel.com') {
    if(failure==='health'&&u.hostname==='two.example.test')return new Response('unhealthy',{status:503});
    return new Response('healthy');
   }
   if(path.startsWith('/v9/projects/'))return json({autoAssignCustomDomains:autoPromote});
   if(path.startsWith('/v4/aliases/')) {
    const domain=path.split('/').at(-1),name=domain.split(/[.-]/)[0];
    return json({deployment:{id:domain.includes('-stage')?`stage-${name}`:live[name]}});
   }
   if(path==='/v13/deployments') {
    const body=JSON.parse(options.body);mutations.push({type:'build',project:body.project,body});
    return json({id:`new-${body.project}`,url:`${body.project}-candidate.vercel.app`});
   }
   if(path.startsWith('/v13/deployments/')) {
    const id=path.split('/').at(-1),name=id.split('-')[1];
    return json({id,projectId:name,readyState:'READY',target:id.startsWith('new-')?'production':undefined,customEnvironment:id.startsWith('stage-')?{id:'stage'}:null,meta:{releaseSha:wrongSHA?'b'.repeat(40):sha}});
   }
   if(path.includes('/promote/')) {
    const [, , ,name,,id]=path.split('/');mutations.push({type:'promote',project:name,id});live[name]=id;
    if(failure==='ambiguous'&&name==='two'&&id==='new-two')throw Error('Transport failed after activation');
    if(failure==='concurrent'&&name==='two'&&id==='new-two'){live.one='external-one';throw Error('Concurrent change');}
    return json({});
   }
   throw Error('Unexpected mock API '+path);
  };
  await main();
  return {live,mutations,report:JSON.parse(readFileSync('release-artifacts/release.json','utf8')),exit:process.exitCode};
 } finally {
  global.fetch=old.fetch;console.log=old.log;console.error=old.error;process.argv=old.argv;process.env=old.env;process.exitCode=old.exit;process.chdir(old.cwd);rmSync(dir,{recursive:true,force:true});
 }
}
test('builds every candidate before promoting, recording previous deployments',async()=>{
 const r=await simulate();assert.equal(r.report.result,'success');
 assert.deepEqual(r.mutations.map(x=>x.type),['build','build','promote','promote']);
 assert.equal(r.report.projects[0].previous,'old-one');
});
test('failed live health restores both apps in reverse order',async()=>{
 const r=await simulate({failure:'health'});assert.equal(r.exit,1);
 assert.deepEqual(r.live,{one:'old-one',two:'old-two'});
 assert.deepEqual(r.mutations.filter(x=>x.type==='promote').slice(-2).map(x=>x.project),['two','one']);
});
test('ambiguous promotion failure still restores an activated deployment',async()=>{
 const r=await simulate({failure:'ambiguous'});assert.deepEqual(r.live,{one:'old-one',two:'old-two'});
});
test('recovery never overwrites a concurrent production change',async()=>{
 const r=await simulate({failure:'concurrent'});assert.equal(r.live.one,'external-one');
 assert.equal(r.report.projects[0].rollback,'manual-review-concurrent-change');
});
test('wrong staging SHA and automatic production promotion both block before writes',async()=>{
 for(const options of [{wrongSHA:true},{autoPromote:true}]){
  const r=await simulate(options);assert.equal(r.exit,1);assert.deepEqual(r.mutations,[]);
 }
});
test('verify-only performs no production builds or promotions',async()=>{
 const r=await simulate({mode:'verify'});assert.deepEqual(r.mutations,[]);assert.equal(r.report.result,'verified-without-production-changes');
});
