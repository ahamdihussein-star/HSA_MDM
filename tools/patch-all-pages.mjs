#!/usr/bin/env node
/**
 * Bulk fixer for pages (TS + HTML).
 * - Fix invalid self-referencing initializations
 * - Remove duplicate Router imports
 * - Repair SidebarComponent constructor w/ @Inject(PLATFORM_ID)
 * - Ensure bracket-safe event handlers:
 *    * onItemChecked(..., ..., $event) -> onItemChecked(..., $event)
 *    * viewOrEditRequest(id, status)   -> viewOrEditRequest(id, status, false)
 * - Creates .bak backups on first write
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");
const SRC  = path.join(ROOT, "src", "app");

const globby = async (dir, exts) => {
  const out = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (exts.some((e) => entry.name.endsWith(e))) out.push(full);
    }
  };
  walk(dir);
  return out;
};

function backupOnce(file) {
  const bak = file + ".bak";
  if (!fs.existsSync(bak)) {
    fs.copyFileSync(file, bak);
  }
}

function replaceAll(str, pairs) {
  let changed = false;
  let out = str;
  for (const { re, to } of pairs) {
    const next = out.replace(re, to);
    if (next !== out) changed = true;
    out = next;
  }
  return { text: out, changed };
}

function patchTsContent(file, text) {
  let changed = false;

  // 1) Fix invalid self-referencing initializations
  const initPairs = [
    // arrays
    { re: /(\btaskList\s*:\s*any\[\]\s*=\s*)this\.taskList\s*\|\|\s*\[\s*\]\s*;/g, to: "$1[];" },
    // booleans
    { re: /(\bchecked\s*:\s*boolean\s*=\s*)this\.checked\s*\?\?\s*false\s*;/g, to: "$1false;" },
    { re: /(\bindeterminate\s*:\s*boolean\s*=\s*)this\.indeterminate\s*\?\?\s*false\s*;/g, to: "$1false;" },
    { re: /(\bisApprovedVisible\s*:\s*boolean\s*=\s*)this\.isApprovedVisible\s*\?\?\s*false\s*;/g, to: "$1false;" },
    { re: /(\bisRejectedConfirmVisible\s*:\s*boolean\s*=\s*)this\.isRejectedConfirmVisible\s*\?\?\s*false\s*;/g, to: "$1false;" },
    { re: /(\bisRejectedVisible\s*:\s*boolean\s*=\s*)this\.isRejectedVisible\s*\?\?\s*false\s*;/g, to: "$1false;" },
    { re: /(\bisAssignVisible\s*:\s*boolean\s*=\s*)this\.isAssignVisible\s*\?\?\s*false\s*;/g, to: "$1false;" },
    // strings
    { re: /(\binputValue\s*:\s*string\s*=\s*)this\.inputValue\s*\?\?\s*''\s*;/g, to: "$1'';" },
    // nullable strings
    { re: /(\bselectedDepartment\s*:\s*string\s*\|\s*null\s*=\s*)this\.selectedDepartment\s*\?\?\s*null\s*;/g, to: "$1null;" },
    // sets
    { re: /(\bsetOfCheckedId\s*:\s*Set<\s*string\s*>\s*=\s*)this\.setOfCheckedId\s*\?\?\s*new\s+Set<\s*string\s*>\(\s*\)\s*;/g, to: "$1new Set<string>();" },
  ];
  let r = replaceAll(text, initPairs);
  text = r.text; changed ||= r.changed;

  // 2) De-duplicate Router import lines
  // normalize quotes, then keep single import
  const routerImportRe = /import\s*\{\s*Router\s*\}\s*from\s*['"]@angular\/router['"]\s*;\s*/g;
  const imports = text.match(routerImportRe);
  if (imports && imports.length > 1) {
    text = text.replace(routerImportRe, ""); // remove all
    // put back exactly one (after the last import line or at top)
    const lastImportIdx = text.lastIndexOf("import ");
    if (lastImportIdx >= 0) {
      // insert after last import semicolon
      const insertPos = text.indexOf(";", lastImportIdx);
      if (insertPos >= 0) {
        text = text.slice(0, insertPos + 1) + `\nimport { Router } from '@angular/router';` + text.slice(insertPos + 1);
      } else {
        text = `import { Router } from '@angular/router';\n` + text;
      }
    } else {
      text = `import { Router } from '@angular/router';\n` + text;
    }
    changed = true;
  }

  // 3) SidebarComponent constructor repair
  if (file.endsWith(path.normalize("src/app/sidebar/sidebar.component.ts"))) {
    // Fix broken @Inject signature
    // Any weird form like: @Inject(PLATFORM_ID, private router: Router) private platformId ...
    // Replace whole constructor line with a clean version
    // Keep body as-is.
    text = text.replace(
      /constructor\s*\([^)]*PLATFORM_ID[^)]*\)\s*\{/m,
      `constructor(@Inject(PLATFORM_ID) private platformId: Object, private router: Router) {`
    );

    // Ensure needed imports exist
    const needsInject = !/import\s*\{\s*Inject\s*,\s*PLATFORM_ID\s*\}\s*from\s*['"]@angular\/core['"]/.test(text);
    if (needsInject) {
      // Add or augment existing @angular/core import
      if (/from\s*['"]@angular\/core['"]/.test(text)) {
        text = text.replace(
          /import\s*\{([^}]*)\}\s*from\s*['"]@angular\/core['"]\s*;/,
          (m, g1) => {
            const names = new Set(
              g1.split(",").map(s => s.trim()).filter(Boolean)
            );
            names.add("Inject");
            names.add("PLATFORM_ID");
            return `import { ${Array.from(names).join(", ")} } from '@angular/core';`;
          }
        );
      } else {
        // no core import at all
        const firstImportIdx = text.indexOf("import ");
        if (firstImportIdx >= 0) {
          text = text.slice(0, firstImportIdx) +
            `import { Inject, PLATFORM_ID } from '@angular/core';\n` +
            text.slice(firstImportIdx);
        } else {
          text = `import { Inject, PLATFORM_ID } from '@angular/core';\n` + text;
        }
      }
    }
    changed = true;
  }

  return { text, changed };
}

function patchHtmlContent(file, text) {
  let changed = false;

  // 1) viewOrEditRequest with only 2 args -> add third arg ", false)"
  // Matches e.g. viewOrEditRequest(someId, someStatus)
  // Avoid touching lines already with 3 args.
  const twoArgViewCall = /viewOrEditRequest\s*\(\s*([^,()]+)\s*,\s*([^,()]+)\s*\)/g;
  text = text.replace(twoArgViewCall, (m, a1, a2) => {
    // if already followed by a third arg, don't change (safety)
    if (/\btrue\b|\bfalse\b/.test(m)) return m;
    changed = true;
    return `viewOrEditRequest(${a1}, ${a2}, false)`;
  });

  // 2) onItemChecked with 3 args (id, status, $event) -> 2 args (id, $event)
  // Common case we saw: (..., ..., $event)
  const threeArgOnItemChecked = /onItemChecked\s*\(\s*([^,()]+)\s*,\s*([^,()]+)\s*,\s*\$event\s*\)/g;
  text = text.replace(threeArgOnItemChecked, (m, idExpr /*, statusExpr*/) => {
    changed = true;
    return `onItemChecked(${idExpr}, $event)`;
  });

  return { text, changed };
}

(async () => {
  const tsFiles = await globby(SRC, [".ts"]);
  const htmlFiles = await globby(SRC, [".html"]);

  let tsPatched = 0, htmlPatched = 0;

  // TS
  for (const file of tsFiles) {
    const orig = fs.readFileSync(file, "utf8");
    const { text, changed } = patchTsContent(file, orig);
    if (changed) {
      backupOnce(file);
      fs.writeFileSync(file, text, "utf8");
      tsPatched++;
      console.log(`Patched TS: ${path.relative(ROOT, file)}`);
    }
  }

  // HTML
  for (const file of htmlFiles) {
    const orig = fs.readFileSync(file, "utf8");
    const { text, changed } = patchHtmlContent(file, orig);
    if (changed) {
      backupOnce(file);
      fs.writeFileSync(file, text, "utf8");
      htmlPatched++;
      console.log(`Patched HTML: ${path.relative(ROOT, file)}`);
    }
  }

  console.log("\nDone.");
  console.log(`TS patched: ${tsPatched} file(s)`);
  console.log(`HTML patched: ${htmlPatched} file(s)`);
  console.log("Backups created as *.bak when needed.");
})();