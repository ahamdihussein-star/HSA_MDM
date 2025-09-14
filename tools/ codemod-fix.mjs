#!/usr/bin/env node
// tools/codemod-fix.mjs
import { Project, SyntaxKind, QuoteKind } from "ts-morph";
import fg from "fast-glob";
import fs from "fs";
import path from "path";
import * as parse5 from "parse5";

const SRC_DIR = "src";
const APP_DIR = path.join(SRC_DIR, "app");
const REPORT = { tsChanged: [], htmlChanged: [], notes: [] };

const BRACKET_FIELDS = ["status","firstName","name","createdAt","requestType","Status","RequestType","CreatedAt"];

function readFile(p){ return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : ""; }
function writeIfChanged(file, before, after, bucket){
  if (before !== after) {
    fs.writeFileSync(file, after, "utf8");
    bucket.push(file);
  }
}

function uniqueBy(arr, keyFn){
  const seen = new Set(); const out=[];
  for (const x of arr) { const k=keyFn(x); if(!seen.has(k)){ seen.add(k); out.push(x); } }
  return out;
}

function toBracket(expr){
  // data.status -> data['status'] (للقيم المعرّفة كـ index signature غالبًا)
  return expr.replace(
    new RegExp(`\\bdata\\.(${BRACKET_FIELDS.map(f=>f.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')).join("|")})\\b`, "g"),
    (_,key)=>`data['${key}']`
  );
}

function fixHtmlFile(file){
  let html = readFile(file);
  let before = html;

  // 1) bracket notation
  html = toBracket(html);

  // 2) onItemChecked calls: تقبّل 2 أو 3 باراميتر. نسيبها كما هي، لكن نضمن تمرير $event للثاني إن ظهر نمط قديم
  // لو لقينا onItemChecked(id, $event) فقط — تمام. لو لقينا onItemChecked(id, $event, sth) — تمام.
  // لو لقينا onItemChecked(id) بس: نضيف $event (نادرًا)
  html = html.replace(
    /(onItemChecked\(\s*([^)]+?)\s*\))/g,
    (m, full, inner) => {
      const args = inner.split(",").map(s=>s.trim());
      if (args.length === 1) {
        return `onItemChecked(${args[0]}, $event)`;
      }
      return m;
    }
  );

  // 3) استعمال router في التمبلت: إضافة ? اختياريًا (مش دايمًا لازم)
  html = html.replace(/\brouter\.url\b/g, "router?.url");

  writeIfChanged(file, before, html, REPORT.htmlChanged);
}

function ensureSingleImport(source, what, from){
  const imports = source.getImportDeclarations().filter(d=>d.getModuleSpecifierValue()===from);
  if (imports.length <= 1) return;
  // دمج أسماء المستوردات
  const named = uniqueBy(imports.flatMap(d=>d.getNamedImports().map(n=>n.getName())), s=>s);
  imports.forEach((d,i)=>{ if (i>0) d.remove(); });
  const first = imports[0];
  const newNamed = uniqueBy([ ...first.getNamedImports().map(n=>n.getName()), ...named ], s=>s);
  first.removeNamedImports();
  if (newNamed.length) first.addNamedImports(newNamed.map(n=>({ name:n })));
}

function fixImports(source){
  // إزالة/دمج المكررات
  ensureSingleImport(source, "Router", "@angular/router");
  ensureSingleImport(source, "Inject", "@angular/core");
  ensureSingleImport(source, "PLATFORM_ID", "@angular/core");

  // إزالة تكرار لنفس الرمز داخل نفس السطر (TsMorph يهندل الدمج أعلاه)
}

function defaultForType(tText){
  const t = (tText||"").toLowerCase();
  if (t.includes("boolean")) return "false";
  if (t.includes("string")) return "''";
  if (t.includes("number")) return "0";
  if (t.includes("set<")) return "new Set<string>()";
  if (t.includes("array") || t.includes("[]")) return "[]";
  return "undefined";
}

function fixSelfReferencingProps(cls){
  // يزيل foo = this.foo ?? default; -> foo = default;
  const props = cls.getMembers().filter(m => m.getKind() === SyntaxKind.PropertyDeclaration);
  props.forEach(p=>{
    const init = p.getInitializer();
    if (!init) return;
    const text = init.getText();
    const name = p.getName();
    const m = new RegExp(`\\bthis\\.${name}\\b`).test(text);
    if (m) {
      // حاول التقاط default من "?? value" أو "|| value"
      let val = text;
      let picked = null;
      const coalesce = text.split("??");
      const orSplit = text.split("||");
      if (coalesce.length>1) picked = coalesce[1].trim();
      else if (orSplit.length>1) picked = orSplit[1].trim();
      if (!picked || picked === "this."+name) {
        const t = p.getType().getText();
        picked = defaultForType(t);
      }
      p.setInitializer(picked);
    }
  });
}

function fixConstructorAndRouter(source, cls, tplUsesRouter){
  const ctor = cls.getConstructors()[0] || cls.addConstructor({ parameters:[], statements:[] });

  // إجمع باراميترات الـ ctor
  const params = ctor.getParameters();

  // 1) dedupe Router params + اجعلها public لو التمبلت يستخدم router
  const routerParams = params.filter(p => p.getType().getText().includes("Router"));
  if (routerParams.length === 0) {
    // أضف Router إن كان مستخدم في القالب
    if (tplUsesRouter) ctor.addParameter({ name: "router", type: "Router", scope: "public" });
  } else {
    // خلّي واحد بس
    routerParams.slice(1).forEach(p => p.remove());
    const r = routerParams[0];
    if (tplUsesRouter) r.setScope("public");
    if (!tplUsesRouter && !r.getScope()) r.setScope("private");
    r.getDecorators().forEach(d=>{
      if (d.getName()==="Inject") d.remove(); // Router لا يحتاج Inject
    });
  }

  // 2) @Inject(TOKEN x 1 arg فقط) + منع بناء سيء
  params.forEach(p=>{
    p.getDecorators().forEach(d=>{
      if (d.getName() === "Inject") {
        const args = d.getArguments();
        if (args.length > 1) {
          d.setArguments([args[0].getText()]);
        }
      }
    });
  });

  // 3) import Router لو ناقص
  const hasRouterImport = source.getImportDeclarations().some(d => d.getModuleSpecifierValue()==='@angular/router' && d.getNamedImports().some(n=>n.getName()==='Router'));
  if (!hasRouterImport) {
    source.addImportDeclaration({ moduleSpecifier: "@angular/router", namedImports: [{ name:"Router" }]});
  }
}

function fixOnItemChecked(cls){
  // وحِّد التوقيع: onItemChecked(id: string, checked: boolean, status?: string)
  const method = cls.getInstanceMethods().find(m => m.getName() === "onItemChecked");
  if (!method) return;
  method.set({
    parameters: [
      { name: "id", type: "string" },
      { name: "checkedOrEvent", type: "any" },
      { name: "status", type: "string", hasQuestionToken: true },
    ]
  });
  // جسم الدالة: حوّل checkedOrEvent لو كان event إلى boolean
  const body = `
    const checked = typeof checkedOrEvent === 'boolean' ? checkedOrEvent : !!(checkedOrEvent?.target?.checked ?? checkedOrEvent);
    try {
      if (typeof (this as any).updateCheckedSet === 'function') {
        (this as any).updateCheckedSet(id, checked, status);
      } else if (typeof (this as any).onItemCheckedCore === 'function') {
        (this as any).onItemCheckedCore(id, checked, status);
      }
    } catch {}
  `;
  method.setBodyText(body);
}

function getTemplatePath(source, cls){
  const dec = cls.getDecorator("Component");
  if (!dec) return null;
  const arg = dec.getArguments()[0];
  if (!arg) return null;
  const obj = arg.asKind(SyntaxKind.ObjectLiteralExpression);
  if (!obj) return null;
  const prop = obj.getProperty("templateUrl");
  if (!prop) return null;
  const init = prop.getFirstDescendantByKind(SyntaxKind.StringLiteral);
  if (!init) return null;
  return path.join(path.dirname(source.getFilePath()), init.getLiteralValue());
}

function htmlMentionsRouter(html){
  return /\brouter\.url\b/.test(html);
}

async function run(){
  const project = new Project({
    tsConfigFilePath: "tsconfig.json",
    manipulationSettings: { quoteKind: QuoteKind.Double }
  });

  // ضم كل ملفات TS
  const tsFiles = await fg([`${SRC_DIR}/**/*.ts`], { dot: false, ignore: ["**/*.spec.ts", "**/node_modules/**"] });
  tsFiles.forEach(f => project.addSourceFileAtPathIfExists(f));
  const sourceFiles = project.getSourceFiles();

  // 1) HTML pass
  const htmlFiles = await fg([`${SRC_DIR}/**/*.html`], { dot:false, ignore:["**/node_modules/**"] });
  htmlFiles.forEach(f => fixHtmlFile(f));

  // 2) TS pass (لكل Component/Module/Service)
  for (const source of sourceFiles){
    try{
      fixImports(source);

      const classes = source.getClasses();
      for (const cls of classes) {
        const tplPath = getTemplatePath(source, cls);
        const tpl = tplPath ? readFile(tplPath) : "";
        const usesRouter = tpl ? htmlMentionsRouter(tpl) : false;

        fixSelfReferencingProps(cls);
        fixOnItemChecked(cls);
        fixConstructorAndRouter(source, cls, usesRouter);
      }

      const before = readFile(source.getFilePath());
      const after = source.getFullText();
      writeIfChanged(source.getFilePath(), before, after, REPORT.tsChanged);
    } catch (e){
      REPORT.notes.push({ file: source.getFilePath(), error: String(e?.message || e) });
    }
  }

  // تقارير
  const out = {
    tsChanged: REPORT.tsChanged.length,
    htmlChanged: REPORT.htmlChanged.length,
    notes: REPORT.notes
  };
  fs.writeFileSync("codemod-report.json", JSON.stringify(out, null, 2));
  console.log(`Codemod done. TS changed: ${REPORT.tsChanged.length}, HTML changed: ${REPORT.htmlChanged.length}`);
  if (REPORT.notes.length) console.log("Notes:", REPORT.notes);
}

run().catch(e=>{ console.error(e); process.exit(1); });