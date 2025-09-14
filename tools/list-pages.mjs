import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SRC  = path.join(ROOT, 'src', 'app');

const IGNORED_DIRS = new Set(['node_modules', 'dist', '.angular', '.git', 'api']);

function walk(dir, out=[]) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (!IGNORED_DIRS.has(name)) walk(p, out);
    } else {
      out.push(p);
    }
  }
  return out;
}

function read(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

function mdTable(rows, headers){
  const esc = s => String(s ?? '').replace(/\|/g, '\\|');
  let out = [];
  out.push(`| ${headers.map(esc).join(' | ')} |`);
  out.push(`| ${headers.map(()=>'---').join(' | ')} |`);
  for (const r of rows) out.push(`| ${r.map(esc).join(' | ')} |`);
  return out.join('\n');
}

// ===== Collect components =====
const files = walk(SRC);
const compFiles = files.filter(f => /\.component\.ts$/.test(f));
const components = [];

for (const f of compFiles) {
  const s = read(f);
  if (!/@Component\s*\(/.test(s)) continue;
  const className = (s.match(/export\s+class\s+([A-Za-z0-9_]+)/)?.[1]) || null;
  const selector  = (s.match(/selector\s*:\s*['"`]([^'"`]+)['"`]/)?.[1]) || null;
  const standalone = /standalone\s*:\s*true/.test(s);
  components.push({ file: path.relative(ROOT, f), className, selector, standalone });
}

// Index for quick lookup by class name
const compIndex = new Map(components.map(c => [c.className, c]));

// ===== Collect routes =====
const routeFiles = files.filter(f => /routing\.module\.ts$|app-routing\.module\.ts$|routes\.ts$/.test(f));
const routes = [];

function extractRoutes(f) {
  const s = read(f);
  // crude split by objects; we'll capture per route object
  // Find occurrences of "path: '...'"
  const regex = /path\s*:\s*['"`]([^'"`]+)['"`][\s\S]*?(?=[{,]\s*path\s*:|];?|\)\s*;?)/g;
  let m;
  while ((m = regex.exec(s)) !== null) {
    const chunk = m[0]; // text of one route-ish block
    const pathVal = m[1];

    // component:
    const comp = chunk.match(/component\s*:\s*([A-Za-z0-9_]+)/)?.[1] || null;

    // loadComponent: () => import('...').then(m => m.X)
    const lc = chunk.match(/loadComponent\s*:\s*\(\)\s*=>\s*import\(\s*['"`]([^'"`]+)['"`]\s*\)\.then$begin:math:text$\\s*m\\s*=>\\s*m\\.([A-Za-z0-9_]+)\\s*$end:math:text$/);
    const loadComponent = lc ? { importPath: lc[1], symbol: lc[2] } : null;

    // loadChildren
    const lch = chunk.match(/loadChildren\s*:\s*$begin:math:text$$end:math:text$\s*=>\s*import\(\s*['"`]([^'"`]+)['"`]\s*\)\.then\(\s*m\s*=>\s*m\.([A-Za-z0-9_]+)\s*\)/);
    const loadChildren = lch ? { importPath: lch[1], symbol: lch[2] } : null;

    // title (optional)
    const title = chunk.match(/title\s*:\s*['"`]([^'"`]+)['"`]/)?.[1] || '';

    let kind = 'unknown';
    let target = '';
    if (comp) { kind = 'component'; target = comp; }
    else if (loadComponent) { kind = 'loadComponent'; target = `${loadComponent.symbol} (from ${loadComponent.importPath})`; }
    else if (loadChildren) { kind = 'loadChildren';  target = `${loadChildren.symbol} (from ${loadChildren.importPath})`; }

    routes.push({
      file: path.relative(ROOT, f),
      path: pathVal || '',
      kind,
      target,
      title
    });
  }
}

for (const f of routeFiles) extractRoutes(f);

// Try to resolve files for targets referenced by name (component or loadComponent symbol)
function tryResolveTargetFile(route){
  if (route.kind === 'component') {
    const c = compIndex.get(route.target);
    return c?.file || '';
  }
  if (route.kind === 'loadComponent') {
    // try to resolve via importPath + symbol
    const f = path.resolve(ROOT, path.dirname(route.file), route.target.match(/$begin:math:text$from ([^)]+)$end:math:text$/)?.[1] ?? '');
    // search for a file containing "export .* <symbol> extends|export class <symbol>"
    const rel = path.relative(ROOT, f);
    // walk under folder f if it's a directory
    try {
      const stats = fs.statSync(f);
      if (stats.isDirectory()) {
        const sub = walk(f);
        const hit = sub.find(x => /\.ts$/.test(x) && read(x).includes(`class ${route.target.split(' ')[0]}`));
        return hit ? path.relative(ROOT, hit) : '';
      }
    } catch {}
  }
  return '';
}

const routeRows = routes.map(r => {
  const resolved = tryResolveTargetFile(r);
  return [ r.path || '(root)', r.kind, r.target, r.title, r.file, resolved ];
});

const compRows = components
  .sort((a,b)=>a.className.localeCompare(b.className))
  .map(c => [ c.className, c.selector || '', c.standalone ? 'yes' : 'no', c.file ]);

const outMd = [
  '# Pages (Routes)',
  mdTable(routeRows, ['Path', 'Type', 'Target', 'Title', 'Route File', 'Resolved Target File']),
  '',
  '# Components',
  mdTable(compRows, ['Class', 'Selector', 'Standalone', 'File'])
].join('\n\n');

console.log('\n==== ROUTES ====\n');
console.log(mdTable(routeRows, ['Path','Type','Target','Title','Route File','Resolved File']));
console.log('\n==== COMPONENTS ====\n');
console.log(mdTable(compRows, ['Class','Selector','Standalone','File']));

// write to file
const REPORT = path.join(ROOT, 'pages-report.md');
fs.writeFileSync(REPORT, outMd, 'utf8');
console.log(`\nSaved report -> ${path.relative(ROOT, REPORT)}`);
