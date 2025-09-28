#!/usr/bin/env node
/**
 * tools/fix-patches.mjs (no-deps)
 * يصلّح أخطاء الباتشات:
 * - جعل Router متاحًا في التمبلت (public) وإزالة التكرارات في بارامترات الكونستركتر
 * - دمج واستبعاد تكرار imports من @angular/core و @angular/router
 * - تصحيح @Inject(...) لتكون وسيطًا واحدًا فقط
 * - حذف أسطر __param(...) المولّدة بالغلط
 * - إزالة self-reference من تهيئات الخصائص
 * - توحيد onItemChecked لتستقبل (id, event) فقط
 */

import fs from "fs";
import path from "path";

const root = process.cwd();
const appDir = path.join(root, "src", "app");

// ---- helpers
function listTsFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listTsFiles(p));
    else if (e.isFile() && p.endsWith(".ts")) out.push(p);
  }
  return out;
}
function read(f) { return fs.readFileSync(f, "utf8"); }
function write(f, s) { fs.writeFileSync(f, s, "utf8"); }

// ---- merge imports utility
function mergeImports(src, modulePath, namesToEnsure = []) {
  // اجمع كل أسماء الاستيراد من نفس الموديول
  const re = new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*['"]${modulePath}['"];?`, "g");
  let m; const all = new Set();
  while ((m = re.exec(src))) {
    m[1].split(",").map(s => s.trim()).filter(Boolean).forEach(n => all.add(n));
  }
  namesToEnsure.forEach(n => all.add(n));

  // لو مفيش ولا import؛ سيب الكود زي ما هو
  if (all.size === 0) return src;

  // امسح الكل وحط واحد مدموج
  src = src.replace(re, "");
  // حط السطر الموحّد بعد أول import لو موجود وإلا في أول الملف
  const unified = `import { ${Array.from(all).join(", ")} } from '${modulePath}';\n`;
  if (/^import\s/m.test(src)) {
    src = src.replace(/(import[^\n]*\n)/, `$1${unified}`);
  } else {
    src = unified + src;
  }
  return src;
}

// ---- fix constructor params: ensure single "public router: Router"
function fixConstructorRouterParams(src) {
  return src.replace(/constructor\s*\(([^)]*)\)/g, (full, params) => {
    // split by commas but keep decorators like @Inject(...)
    const parts = params.split(",").map(s => s.trim()).filter(s => s.length);
    let seenRouter = false;
    const fixed = parts.map(p => {
      // normalize spaces
      let q = p.replace(/\s+/g, " ");
      // examples to match:
      // "private router: Router"
      // "@Inject(PLATFORM_ID) private router: Router"
      // "router: Router"
      // also duplicates
      const isRouterParam = /(^| )router\s*:\s*Router\b/.test(q);
      if (isRouterParam) {
        if (seenRouter) return null; // drop duplicates
        seenRouter = true;
        // اجعلها public router: Router مع الحفاظ على @Inject إن وُجد
        q = q
          .replace(/\bprivate\b/g, "public")
          .replace(/\bprotected\b/g, "public")
          .replace(/\breadonly\b/g, "public"); // لو فيه readonly
        if (!/\bpublic\b/.test(q)) q = q.replace(/\brouter\s*:\s*Router\b/, "public router: Router");
        // صحّح أي تباعد زائد
        q = q.replace(/\s+/g, " ").trim();
        return q;
      }
      return q;
    }).filter(Boolean);

    return `constructor(${fixed.join(", ")})`;
  });
}

// ---- main pass per file
const files = listTsFiles(appDir);
const changed = [];

for (const f of files) {
  let s = read(f);
  const orig = s;

  // 0) احذف أي أسطر __param(...) الغلط
  s = s.replace(/^\s*__param\(.*\);\s*$/gm, "");

  // 1) صحّح @Inject(.., ...) -> وسيط واحد فقط
  s = s.replace(/@Inject\(\s*(DATA_REPO|PLATFORM_ID)\s*,\s*[^)]+\)/g, '@Inject($1)');

  // 2) self-reference initializers (TS2729)
  s = s
    .replace(/:\s*any\[\]\s*=\s*this\.[A-Za-z0-9_]+\s*\|\|\s*\[\];/g, ": any[] = [];")
    .replace(/:\s*boolean\s*=\s*this\.[A-Za-z0-9_]+\s*\?\?\s*false;?/g, ": boolean = false;")
    .replace(/:\s*boolean\s*=\s*this\.[A-Za-z0-9_]+\s*\|\|\s*false;?/g, ": boolean = false;")
    .replace(/:\s*Set<\s*string\s*>\s*=\s*this\.[A-Za-z0-9_]+\s*\?\?\s*new Set<\s*string\s*>\(\);/g, ": Set<string> = new Set<string>();")
    .replace(/:\s*string\s*=\s*this\.[A-Za-z0-9_]+\s*\?\?\s*'';/g, ": string = '';")
    .replace(/:\s*(string\s*\|\s*null)\s*=\s*this\.[A-Za-z0-9_]+\s*\?\?\s*null;/g, ": $1 = null;");

  // 3) دمج imports من @angular/core وضمن Inject/PLATFORM_ID لو مستخدمين
  const usesInject = /Inject\(/.test(s);
  const usesPlatformId = /PLATFORM_ID/.test(s);
  s = mergeImports(s, "@angular/core", [
    ...(usesInject ? ["Inject"] : []),
    ...(usesPlatformId ? ["PLATFORM_ID"] : []),
  ]);

  // 4) دمج imports من @angular/router (Router, RouterModule)
  const usesRouter = /\bRouter\b/.test(s);
  const usesRouterModule = /\bRouterModule\b/.test(s);
  if (/from\s*['"]@angular\/router['"]/.test(s) || usesRouter || usesRouterModule) {
    s = mergeImports(s, "@angular/router", [
      ...(usesRouter ? ["Router"] : []),
      ...(usesRouterModule ? ["RouterModule"] : []),
    ]);
  }

  // 5) ثبّت بارامترات الكونستركتر: Router واحد وبـ public
  s = fixConstructorRouterParams(s);

  // 6) بعض الأدوات قد تكون سببت تكرار تعريف الخصائص:
  // عالج "public router: Router , public router: Router" بعد الدمج السابق إن وُجد
  s = s.replace(/public\s+router\s*:\s*Router\s*,\s*public\s+router\s*:\s*Router/g, "public router: Router");

  // 7) توحيد onItemChecked لتاخد (id, event) فقط — لتوافق الTemplates الحالية
  s = s.replace(
    /onItemChecked\s*\([^)]*\)\s*:/g,
    "onItemChecked(id: any, event: any):"
  ).replace(
    /onItemChecked\s*\([^)]*\)\s*\{/g,
    "onItemChecked(id: any, event: any) {"
  );

  if (s !== orig) {
    write(f, s);
    changed.push(path.relative(root, f));
  }
}

console.log("Patched files:");
changed.forEach(x => console.log(" -", x));
console.log(`\nDone. Fixed ${changed.length} file(s).`);