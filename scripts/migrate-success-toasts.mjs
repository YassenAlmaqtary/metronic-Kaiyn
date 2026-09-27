import fs from 'fs';
import path from 'path';

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
      walk(p, out);
    } else if (name.endsWith('.ts') && !name.endsWith('.spec.ts')) {
      out.push(p);
    }
  }
  return out;
}

function addToastImport(src) {
  if (src.includes('ToastService')) return src;

  const langImport = src.match(/import\s*\{[^}]*LanguageService[^}]*\}\s*from\s*['"]([^'"]+)['"]/);
  if (langImport) {
    const toastPath = langImport[1].replace(/language\.service$/, 'toast.service');
    return src.replace(
      langImport[0],
      `${langImport[0]}\nimport { ToastService } from '${toastPath}';`,
    );
  }

  const svcImport = src.match(/import\s+.+\s+from\s+['"]([^'"]*core\/services\/[^'"]+)['"]/);
  if (svcImport) {
    const dir = svcImport[1].replace(/\/[^/]+$/, '');
    return src.replace(
      svcImport[0],
      `${svcImport[0]}\nimport { ToastService } from '${dir}/toast.service';`,
    );
  }
  return null;
}

function ensureInject(src) {
  if (/inject\(\s*ToastService\s*\)/.test(src)) return src;

  if (/private\s+language\s*=\s*inject\(\s*LanguageService\s*\)\s*;/.test(src)) {
    return src.replace(
      /private\s+language\s*=\s*inject\(\s*LanguageService\s*\)\s*;/,
      'private language = inject(LanguageService);\n  private toast = inject(ToastService);',
    );
  }
  if (/private\s+language\s*=\s*inject\(\s*LanguageService\s*\)/.test(src)) {
    return src.replace(
      /private\s+language\s*=\s*inject\(\s*LanguageService\s*\)/,
      'private language = inject(LanguageService); private toast = inject(ToastService)',
    );
  }
  return src.replace(/(export\s+class\s+\w+[^{]*\{)/, '$1\n  private toast = inject(ToastService);');
}

const root = 'D:/metronic-tailwind-angular/src/app';
const files = walk(root);
let changedFiles = 0;

for (const file of files) {
  if (file.includes(`${path.sep}toast.service.ts`) || file.includes(`${path.sep}toast-host${path.sep}`)) {
    continue;
  }

  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes('successMessage')) continue;
  if (!/this\.successMessage\.set\(/.test(src) && !/history\.state/.test(src)) continue;

  let next = addToastImport(src);
  if (next == null) continue;
  next = ensureInject(next);

  next = next.replace(/this\.successMessage\.set\(([^;]+)\);/g, (full, arg) => {
    const a = String(arg).trim();
    if (a === "''" || a === '""' || a === '``') return '';
    return `this.toast.success(${arg});`;
  });

  // Drop common history.state success bootstrap blocks
  next = next.replace(
    /\n\s*const\s+(?:navState|state)\s*=\s*history\.state\s+as\s*\{\s*successMessage\?:\s*string\s*\};\s*\n\s*if\s*\((?:navState|state)\??\.successMessage\)\s*\{[\s\S]*?history\.replaceState\(\{\},\s*''\);\s*\n\s*\}\s*\n/g,
    '\n',
  );

  // If successMessage signal unused, remove declaration
  const withoutDecl = next.replace(/successMessage\s*=\s*signal(?:<string>)?\(''\);?/, '');
  if (!withoutDecl.includes('successMessage')) {
    next = next.replace(/\n\s*successMessage\s*=\s*signal(?:<string>)?\(''\);?/, '');
  }

  if (next !== src) {
    fs.writeFileSync(file, next);
    changedFiles += 1;
    console.log('updated', path.relative(root, file));
  }
}

console.log('changed', changedFiles);
