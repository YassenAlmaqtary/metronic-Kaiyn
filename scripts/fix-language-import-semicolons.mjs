import fs from 'fs';
import path from 'path';

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      walk(p, out);
    } else if (name.endsWith('.ts') && !name.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}

const root = 'D:/metronic-tailwind-angular/src/app';
let changed = 0;
for (const file of walk(root)) {
  const src = fs.readFileSync(file, 'utf8');
  const next = src.replace(
    /from '([^']*language\.service)'\r?\nimport \{ ToastService \}/g,
    "from '$1';\nimport { ToastService }",
  );
  if (next !== src) {
    fs.writeFileSync(file, next);
    changed += 1;
  }
}
console.log('fixed imports', changed);
