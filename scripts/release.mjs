import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function assertCandidate(deployment, project, sha) {
  if (deployment.projectId !== project.id || deployment.readyState !== 'READY' ||
      deployment.customEnvironment?.id !== project.stagingId ||
      deployment.meta?.releaseSha !== sha) {
    throw new Error(`${project.name}: staging is not ready at the selected commit ${sha}. Wait for Deploy staging.`);
  }
}
export function assertCI(runs, sha, workflow) {
  const latest = runs.filter(r => r.head_sha === sha && r.event === 'push' && r.head_branch === 'main')
    .sort((a, b) => b.id - a.id)[0];
  if (!latest || latest.status !== 'completed') return false;
  if (latest.conclusion !== 'success') throw new Error(`${workflow}: CI did not pass for ${sha}`);
  return true;
}
export function deploymentRequest(mode, sha, runId, project, repository) {
  if (!['staging', 'production'].includes(mode) || !/^[a-f0-9]{40}$/.test(sha)) throw new Error('Invalid deployment request');
  return { name: project.name, project: project.id,
    gitSource: { type: 'github', org: repository.split('/')[0], repo: repository.split('/')[1], ref: 'main', sha },
    meta: { releaseSha: sha, releaseRunId: runId },
    ...(mode === 'production'
      ? { target: 'production', autoAssignCustomDomains: false, build: { env: { RELEASE_APPROVED: 'true' } } }
      : { customEnvironmentSlugOrId: project.stagingId }),
  };
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function main() {
  const mode = process.argv[2];
  if (!['staging', 'production', 'verify'].includes(mode)) throw new Error('Expected staging, production or verify');
  if (process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Only main can run deployments');
  const sha = process.env.GITHUB_SHA;
  if (!/^[a-f0-9]{40}$/.test(sha ?? '')) throw new Error('Missing exact commit');
  const config = JSON.parse(readFileSync('.github/release.json', 'utf8'));
  if (process.env.GITHUB_REPOSITORY !== config.repository) throw new Error('Unexpected repository');
  const report = { sha, mode, projects: [], result: 'started' };
  mkdirSync('release-artifacts', { recursive: true });
  const save = () => writeFileSync('release-artifacts/release.json', JSON.stringify(report, null, 2));
  const summary = line => { console.log(line); if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, line + '\n'); };
  async function request(url, token, method = 'GET', body) {
    if (!token) throw new Error('Missing deployment credential');
    const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(30000) });
    // Never log API response bodies: project metadata can include credentials.
    if (!response.ok) throw new Error(`API ${method} ${new URL(url).pathname} returned ${response.status}`);
    const text = await response.text(); return text ? JSON.parse(text) : {};
  }
  const gh = path => request(`https://api.github.com/repos/${config.repository}/${path}`, process.env.GH_TOKEN);
  const vc = (p, path, method, body) => request(`https://api.vercel.com${path}${path.includes('?') ? '&' : '?'}teamId=${config.teamId}`, process.env[p.token], method, body);
  async function ci() {
    for (const workflow of config.workflows) {
      let ready = false;
      for (let i = 0; i < 180; i++) {
        const { workflow_runs } = await gh(`actions/workflows/${workflow}/runs?head_sha=${sha}&event=push&per_page=100`);
        if (assertCI(workflow_runs, sha, workflow)) { ready = true; break; }
        await sleep(10000);
      }
      if (!ready) throw new Error(`${workflow}: timed out waiting for CI`);
    }
  }
  async function deployment(p, id) { return vc(p, `/v13/deployments/${id}`); }
  async function current(p, domain) { return (await vc(p, `/v4/aliases/${domain}`)).deployment.id; }
  async function waitReady(p, id) {
    for (let i = 0; i < 180; i++) {
      const d = await deployment(p, id);
      if (d.readyState === 'READY') return d;
      if (['ERROR', 'CANCELED'].includes(d.readyState)) throw new Error(`${p.name}: deployment ${id} ${d.readyState}`);
      await sleep(10000);
    }
    throw new Error(`${p.name}: deployment timed out (${id}); inspect before retrying`);
  }
  async function smoke(p, url) {
    const project = await vc(p, `/v9/projects/${p.id}`);
    const bypass = Object.keys(project.protectionBypass ?? {}).find(key => project.protectionBypass[key].scope === 'automation-bypass');
    // Reuse existing automation access; never create bypasses or disable protection.
    const response = await fetch(`${url}${p.healthPath}`, { headers: bypass ? { 'x-vercel-protection-bypass': bypass } : {}, redirect: 'manual', signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`${p.name}: smoke check returned ${response.status}`);
    const body = await response.text();
    if (p.healthJSON) {
      const data = JSON.parse(body);
      if (data.ok !== true || data.schemaReady !== true) throw new Error(`${p.name}: unhealthy database/application`);
    } else if (!body.includes(p.healthText)) throw new Error(`${p.name}: unexpected smoke response`);
  }
  async function promote(p, id) {
    await vc(p, `/v10/projects/${p.id}/promote/${id}`, 'POST');
    for (let i = 0; i < 60; i++) {
      if (await current(p, p.productionDomain) === id) return;
      await sleep(5000);
    }
    throw new Error(`${p.name}: promotion not confirmed; inspect aliases`);
  }
  try {
    await ci();
    if (mode === 'staging' && (await gh('git/ref/heads/main')).object.sha !== sha) {
      summary(`Skipped superseded staging commit ${sha}. A newer main commit will deploy.`); return;
    }
    for (const p of config.projects) {
      const project = await vc(p, `/v9/projects/${p.id}`);
      if (project.autoAssignCustomDomains !== false) throw new Error(`${p.name}: automatic production promotion must be disabled`);
      const entry = { project: p.name, previous: await current(p, p.productionDomain) }; report.projects.push(entry); save();
      if (mode !== 'staging') {
        entry.staging = await current(p, p.stagingDomain);
        assertCandidate(await deployment(p, entry.staging), p, sha);
        await smoke(p, `https://${p.stagingDomain}`);
      }
    }
    if (mode === 'verify') { report.result = 'verified-without-production-changes'; summary(`Release checks passed for ${sha}. No production build or promotion requested.`); return; }
    summary(`Selected commit: ${sha}. Mode: ${mode}.`);
    // Prepare all candidates before activating any production domains.
    for (const [index, p] of config.projects.entries()) {
      const created = await vc(p, '/v13/deployments?forceNew=1', 'POST', deploymentRequest(mode, sha, process.env.GITHUB_RUN_ID, p, config.repository));
      const url = `https://${created.url}`;
      if (!/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(url)) throw new Error(`${p.name}: unexpected deployment URL`);
      report.projects[index].candidate = created.id; save();
      const ready = await waitReady(p, created.id);
      if (ready.projectId !== p.id || ready.meta?.releaseSha !== sha) throw new Error('Deployment identity mismatch');
      if (mode === 'staging') assertCandidate(ready, p, sha);
      else if (ready.target !== 'production' || ready.customEnvironment) throw new Error('Candidate lacks production configuration');
      await smoke(p, url);
      if (mode === 'production' && await current(p, p.productionDomain) !== report.projects[index].previous) throw new Error('Production changed while building; refusing activation');
      summary(`${p.name}: ready ${created.id}`);
    }
    if (mode === 'production') {
      for (const [index, p] of config.projects.entries()) {
        const entry = report.projects[index];
        if (await current(p, p.productionDomain) !== entry.previous) throw new Error('Concurrent production change; refusing activation');
        entry.activationAttempted = true; save();
        await promote(p, entry.candidate); entry.promoted = true; save();
        await smoke(p, `https://${p.productionDomain}`);
      }
    } else {
      for (const [index, p] of config.projects.entries()) {
        if (await current(p, p.stagingDomain) !== report.projects[index].candidate) throw new Error(`${p.name}: staging domain not assigned`);
      }
      summary('Staging is ready. Test it, then use Actions → Release production → Run workflow on main.');
    }
    report.result = 'success';
  } catch (error) {
    report.result = 'failed';
    // Only restore deployments this run may have activated. Never reverse migrations.
    if (mode === 'production') for (let index = config.projects.length - 1; index >= 0; index--) {
      const p = config.projects[index], entry = report.projects[index];
      if (!entry?.activationAttempted) continue;
      try {
        const live = await current(p, p.productionDomain);
        if (live === entry.candidate) { await promote(p, entry.previous); entry.rollback = 'restored'; }
        else entry.rollback = live === entry.previous ? 'already-restored' : 'manual-review-concurrent-change';
      } catch { entry.rollback = 'manual-review-required'; }
      save();
    }
    summary('Deployment failed. See release-artifacts/release.json and the Vercel deployment logs. Database migrations were not rolled back.');
    console.error(error.message);
    process.exitCode = 1;
  } finally { save(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
