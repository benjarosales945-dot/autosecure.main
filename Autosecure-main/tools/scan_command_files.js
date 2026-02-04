const fs = require('fs');
const path = require('path');

function findMatchingBracket(str, startIndex, openChar, closeChar) {
  let depth = 0;
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === openChar) depth++;
    else if (str[i] === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const problems = [];
  const regex = /options\s*:\s*\[/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const start = match.index + match[0].indexOf('[');
    const end = findMatchingBracket(content, start, '[', ']');
    if (end === -1) continue;
    const arrContent = content.slice(start + 1, end);
    // find objects inside arrContent
    for (let i = 0; i < arrContent.length; i++) {
      if (arrContent[i] === '{') {
        const objStart = i;
        const objEndRel = findMatchingBracket(arrContent, i, '{', '}');
        if (objEndRel === -1) break;
        const objContent = arrContent.slice(objStart + 1, objEndRel);
        const hasDescription = /description\s*:/g.test(objContent);
        if (!hasDescription) {
          // try to get name
          const nameMatch = objContent.match(/name\s*:\s*['\"]([^'\"]+)['\"]/);
          const name = nameMatch ? nameMatch[1] : '(unknown)';
          problems.push({ name, snippet: objContent.trim().slice(0, 120) });
        }
        i = objEndRel;
      }
    }
  }
  return problems;
}

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const p = path.join(dir, file);
    const stat = fs.statSync(p);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(p));
    } else if (file.endsWith('.js')) {
      results.push(p);
    }
  });
  return results;
}

const cmdsDir = path.join(__dirname, '..', 'mainbot', 'commands');
const files = walkDir(cmdsDir);
let total = 0;
for (const f of files) {
  const probs = analyzeFile(f);
  if (probs.length) {
    console.log(`File: ${path.relative(process.cwd(), f)}`);
    probs.forEach(p => console.log(`  - Option object missing description (name=${p.name}) snippet="${p.snippet.replace(/\n/g,' ')}"`));
    total += probs.length;
  }
}
if (total === 0) console.log('No missing descriptions found.');
else console.log(`Total missing descriptions: ${total}`);
