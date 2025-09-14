import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SRC  = path.join(ROOT, 'src', 'app');

function die(msg){ console.error(msg); process.exit(1); }

const targetArg = process.argv[2];
if (!targetArg) die('Usage: node tools/patch-page.mjs <ComponentClassName or file.ts>');

function walk(dir, out=[]){
  for (const name of fs.readdirSync(dir)){
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(SRC).filter(f => f.endsWith('.component.ts'));
let file;

if (targetArg.endsWith('.ts')) {
  file = path.resolve(ROOT, targetArg);
  if (!fs.existsSync(file)) die(`File not found: ${file}`);
} else {
  // search by class name
  const cand = [];
  for (const f of files){
    const s = fs.readFileSync(f, 'utf8');
    if (new RegExp(`export\\s+class\\s+${targetArg}\\b`).test(s)) cand.push(f);
  }
  if (cand.length === 0) die(`Component class not found: ${targetArg}`);
  if (cand.length > 1) console.warn('Multiple matches, using first:\n' + cand.map(x=>' - '+path.relative(ROOT,x)).join('\n'));
  file = cand[0];
}

const rel = path.relative(ROOT, file);
let src = fs.readFileSync(file, 'utf8');

function ensureImport(line){
  if (!src.includes(line)) {
    // insert after first import
    const idx = src.indexOf('import ');
    if (idx >= 0){
      // find end of import block
      const allImports = [...src.matchAll(/^import .*;$/mg)].map(m=>m[0]);
      const last = allImports.length ? src.lastIndexOf(allImports[allImports.length-1]) + allImports[allImports.length-1].length : idx;
      src = src.slice(0,last) + '\n' + line + '\n' + src.slice(last);
    } else {
      src = line + '\n' + src;
    }
  }
}

// 1) core imports
ensureImport(`import { Inject } from '@angular/core';`);
ensureImport(`import { DATA_REPO, IDataRepo } from '../Core/data-repo';`.replace('../Core','./../Core').replace('/app/','/')); // naive fix for relative

// try smarter relative for DATA_REPO:
(function fixDataRepoImport(){
  const here = path.dirname(file);
  const possible = path.relative(here, path.join(SRC, 'Core', 'data-repo')).replace(/\\/g,'/');
  const fixed = `import { DATA_REPO, IDataRepo } from '${possible.startsWith('.')?possible:'./'+possible}';`;
  src = src.replace(/import\s+\{\s*DATA_REPO[\s\S]*?data-repo'\s*;?/g, ''); // remove old if any
  ensureImport(fixed);
})();

// 2) ensure rxjs firstValueFrom
ensureImport(`import { firstValueFrom } from 'rxjs';`);

// 3) add repo param to constructor
if (/constructor\s*\(([\s\S]*?)\)\s*\{/.test(src)) {
  // has constructor -> inject if missing
  if (!/DATA_REPO/.test(src) && !/repo:\s*IDataRepo/.test(src)) {
    src = src.replace(/constructor\s*\(([\s\S]*?)\)\s*\{/m, (m, params) => {
      const trimmed = params.trim();
      const add = `@Inject(DATA_REPO) private repo: IDataRepo`;
      const newParams = trimmed.length ? `${trimmed}, ${add}` : add;
      return `constructor(${newParams}){`;
    });
  }
} else {
  // no constructor -> add a basic one
  src = src.replace(/export\s+class\s+([A-Za-z0-9_]+)\s*\{/, (m, cls) => {
    return `export class ${cls} {\n  constructor(@Inject(DATA_REPO) private repo: IDataRepo){}\n`;
  });
}

// 4) ensure records field
if (!/^\s*(public|private|protected)?\s*records\s*:\s*any\[\]\s*=\s*\[\]\s*;/m.test(src)) {
  // insert after class start
  src = src.replace(/export\s+class\s+[A-Za-z0-9_]+\s*\{\s*/, (m) => {
    return m + `  records: any[] = [];\n`;
  });
}

// 5) add load() method
if (!/\basync\s+load\s*\(\)\s*:\s*Promise<void>/.test(src)) {
  const loadFn =
`\n  async load(): Promise<void> {
    try {
      const list$ = (this.repo as any).list ? (this.repo as any).list() : null;
      if (list$) {
        const data = await firstValueFrom(list$ as any);
        if (Array.isArray(data)) this.records = data;
      }
    } catch (e) {
      console.error('[patch-page] load() error', e);
    }
  }\n`;
  // append before last }
  src = src.replace(/\}\s*$/, loadFn + '}\n');
}

// 6) call load() in ngOnInit
if (/ngOnInit\s*\(\)\s*\{/.test(src)) {
  if (!/this\.load\s*\(\s*\)\s*;/.test(src)) {
    src = src.replace(/ngOnInit\s*\(\)\s*\{\s*/, (m)=> m + '    this.load();\n');
  }
} else {
  // add OnInit import & implements if not exists
  if (!/OnInit\b/.test(src)) {
    src = src.replace(/import\s+\{\s*([^}]+)\}\s+from\s+'@angular\/core';/, (m, names) => {
      const list = names.split(',').map(s=>s.trim());
      if (!list.includes('OnInit')) list.push('OnInit');
      return `import { ${list.join(', ')} } from '@angular/core';`;
    });
    src = src.replace(/export\s+class\s+([A-Za-z0-9_]+)\s*\{/, (m, cls) => {
      if (!/\bimplements\s+OnInit\b/.test(src)) {
        return `export class ${cls} implements OnInit {`;
      }
      return m;
    });
  }
  // add ngOnInit
  src = src.replace(/load\(\)[\s\S]*?\}\n\}\s*$/, (m) => m.replace(/\}\s*$/, '') );
  src = src.replace(/\}\s*$/, `  ngOnInit(): void { this.load(); }\n}\n`);
}

// 7) backup then write
const backup = file + '.bak-patch';
fs.writeFileSync(backup, src, 'utf8'); // first write to backup path content (we’ll overwrite below)
fs.writeFileSync(file, src, 'utf8');
console.log(`Patched: ${rel}`);
