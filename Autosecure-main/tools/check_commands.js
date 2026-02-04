const path = require('path');
const getLocalCmds = require('../mainbot/utils/getLocalCmds');

const cmds = getLocalCmds(path.join(__dirname, '..', 'mainbot', 'commands'));

function checkOptions(options, prefix) {
  const problems = [];
  if (!Array.isArray(options)) return problems;
  options.forEach((opt, i) => {
    const p = `${prefix}.options[${i}]`;
    if (!opt) {
      problems.push(`${p} is falsy`);
      return;
    }
    if (opt.type === undefined) {
      // still ok, but note
    }
    if (opt.options) {
      // ensure each inner option has description
      opt.options.forEach((inner, j) => {
        if (!inner || typeof inner.description !== 'string' || inner.description.trim() === '') {
          problems.push(`${p}.options[${j}] missing description (name=${inner?.name})`);
        }
      });
    }
  });
  return problems;
}

let totalProblems = 0;
for (const cmd of cmds) {
  const name = cmd.name || '(no-name)';
  const problems = checkOptions(cmd.options, `command ${name}`);
  if (problems.length) {
    console.log(`Command '${name}' has problems:`);
    problems.forEach(p => console.log('  -', p));
    totalProblems += problems.length;
  }
}
if (totalProblems === 0) console.log('No missing descriptions detected.');
else console.log(`Total problems: ${totalProblems}`);
