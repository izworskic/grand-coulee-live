import {rm,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

const sha='fe4176407a4c4edbd00642b7d30040dcb041239e';
const remove=['app','components','lib','scripts','tests','docs','e2e','next.config.mjs','next.config.ts','vitest.config.ts','tsconfig.json','vercel.json','next-env.d.ts'];
for(const p of remove) await rm(p,{recursive:true,force:true});
const url=`https://codeload.github.com/izworskic/platte-crane-live/tar.gz/${sha}`;
const res=await fetch(url,{headers:{'User-Agent':'platte-crane-live-vercel-preview-channel'}});
if(!res.ok) throw new Error(`Platte source download failed: ${res.status} ${res.statusText}`);
const archive='/tmp/platte-crane-live.tgz';
await writeFile(archive,Buffer.from(await res.arrayBuffer()));
execFileSync('tar',['-xzf',archive,'--strip-components=1','-C',process.cwd()],{stdio:'inherit'});
await rm(archive,{force:true});
console.log(`Loaded exact Platte Crane Live source ${sha}`);
