const fs = require('fs');
const path = require('path');

function walk(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      if (file === 'node_modules' || file === '.git') return;
      walk(filepath, filelist);
    } else if (file.endsWith('.js')) {
      filelist.push(filepath);
    }
  });
  return filelist;
}

const root = path.resolve(__dirname, '..');
const files = walk(root);
let hadError = false;
for (const f of files) {
  try {
    const code = fs.readFileSync(f, 'utf8');
    // Try to create a function to compile the code
    new Function(code);
  } catch (err) {
    console.error('SYNTAX ERROR in', f);
    console.error(err && err.stack ? err.stack.split('\n')[0] : err);
    hadError = true;
  }
}
if (!hadError) {
  console.log('No syntax errors found.');
  process.exit(0);
} else {
  process.exit(2);
}
