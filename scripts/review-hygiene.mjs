import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true });
const patterns = {
  privateKey: /(?:private[_ -]?key|secret[_ -]?key)\s*[:=]\s*["']?(?:0x)?[a-f0-9]{64}/i,
  pem: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  providerCredential: /https?:\/\/[^\s"']*(?:alchemy\.com\/v2|infura\.io\/v3)\/[a-zA-Z0-9_-]{12,}/i,
  accessToken: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[A-Z0-9]{16})/,
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/,
};
const commits = git('rev-list', '--all').trim().split('\n');
const objects = new Map(); const envPaths = new Set();
for (const commit of commits) for (const line of git('ls-tree', '-r', commit).trim().split('\n')) {
  const [meta, path] = line.split('\t'); const [, type, id] = meta.split(' ');
  if (/^\.env(?:\.|$)/.test(path.split('/').at(-1)) && !path.endsWith('.env.example')) envPaths.add(path);
  if (type === 'blob') objects.set(id + ':' + path, { id, path });
}
const hits = Object.fromEntries(Object.keys(patterns).map(name => [name, new Set()]));
function scan(buffer, path) {
  if (buffer.includes(0)) return; // Binary matches need separate format-aware metadata review.
  const content = buffer.toString('utf8');
  for (const [name, pattern] of Object.entries(patterns)) if (pattern.test(content)) hits[name].add(path);
}
for (const { id, path } of objects.values()) scan(execFileSync('git', ['cat-file', 'blob', id], { windowsHide: true }), path);
for (const path of git('ls-files').trim().split('\n')) scan(readFileSync(path), path);
const domains = [...new Set(git('log', 'main', '--format=%ae%n%ce').split('\n').filter(x => x.includes('@')).map(x => x.split('@').at(-1)))];
console.log(JSON.stringify({ reachableCommits: commits.length, blobPaths: objects.size, trackedEnvironmentFiles: [...envPaths], textPatternHitPaths: Object.fromEntries(Object.entries(hits).map(([name, paths]) => [name, [...paths]])), mainAuthorCommitterEmailDomains: domains, mitLicense: readFileSync('LICENSE', 'utf8').startsWith('MIT License'), limitations: 'Pattern review only; ignored local files, binary pixel content, unreachable objects and remote copies excluded. Backup branch intentionally retains original metadata after authorized rewrite. No matched values printed.' }, null, 2));
