import fs from 'fs';
import path from 'path';

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
      walk(p, out);
    } else if ((name.endsWith('.ts') || name.endsWith('.html')) && !name.endsWith('.spec.ts')) {
      out.push(p);
    }
  }
  return out;
}

const root = 'D:/metronic-tailwind-angular/src/app';
let changed = 0;

for (const file of walk(root)) {
  let src = fs.readFileSync(file, 'utf8');
  let next = src;

  next = next.replace(/toast\.service';+;/g, "toast.service';");
  next = next.replace(/@if\s*\(\s*successMessage\(\)\s*\)\s*\{[^}]*\}/g, '');

  if (next !== src) {
    fs.writeFileSync(file, next);
    changed += 1;
    console.log(path.relative(root, file));
  }
}

console.log('changed', changed);
