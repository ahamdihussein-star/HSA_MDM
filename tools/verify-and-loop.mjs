#!/usr/bin/env node
// tools/verify-and-loop.mjs
import { spawnSync } from "node:child_process";
import fs from "fs";

function run(cmd, args, opts={}){
  const r = spawnSync(cmd, args, { stdio: "pipe", encoding: "utf8", ...opts });
  return { code: r.status ?? r.code, out: (r.stdout||"") + (r.stderr||"") };
}

function parseFilesFromErrors(out){
  const files = new Set();
  const re = /src\/app\/[^\s:]+\.ts|src\/app\/[^\s:]+\.html/g;
  let m; while((m=re.exec(out))){ files.add(m[0]); }
  return [...files];
}

function hasProgress(prevErrors, newErrors){ return newErrors.length < prevErrors.length; }

async function main(){
  let iteration = 0;
  let prevOut = "";

  while (iteration < 5) {
    console.log(`\n=== Iteration ${iteration+1} ===`);
    // 1) Run codemod fix (شامل)
    const codemod = run("node", ["tools/codemod-fix.mjs"]);
    console.log(codemod.out);

    // 2) Try build
    const build = run("pnpm", ["ng", "build"]);
    fs.writeFileSync(`compiler-out-${iteration+1}.log`, build.out, "utf8");
    const files = parseFilesFromErrors(build.out);
    console.log(`Affected files from errors: ${files.length}`);

    if (build.code === 0) {
      console.log("Build OK ✅");
      break;
    }

    if (!hasProgress(prevOut, build.out)) {
      console.log("No further progress. Stopping loop.");
      break;
    }
    prevOut = build.out;
    iteration++;
  }
}

main().catch(e=>{ console.error(e); process.exit(1); });