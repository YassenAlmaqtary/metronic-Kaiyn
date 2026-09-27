import fs from 'fs';
import path from 'path';

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
      walk(p, out);
    } else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

const root = 'D:/metronic-tailwind-angular/src/app';
let changed = 0;

for (const file of walk(root)) {
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes('successMessage()')) continue;

  // Remove @if (successMessage()) { ... } blocks (single and multiline)
  const next = src.replace(
    /@if\s*\(\s*successMessage\(\)\s*\)\s*\{[\s\S]*?\n\t*\}\s*\n/g,
    '',
  );

  if (next !== src) {
    fs.writeFileSync(file, next);
    changed += 1;
    console.log('cleaned', path.relative(root, file));
  }
}

console.log('changed', changed);
