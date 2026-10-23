const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const GIT = 'C:\\Users\\mahes\\AppData\\Local\\Programs\\Git\\cmd\\git.exe';
const ROOT = 'D:/AntiGravity';

console.log('1. Cleaning up nested .git directories...');
['admin1/.git', 'admin2/.git'].forEach(subGit => {
  const full = path.join(ROOT, subGit);
  if (fs.existsSync(full)) {
    console.log('Removing nested git dir: ' + full);
    fs.rmSync(full, { recursive: true, force: true });
  }
});

console.log('2. Writing root .gitignore...');
const gitignore = `# Dependencies
node_modules/
.pnp
.pnp.js

# Next.js & Build Outputs
.next/
dist/
build/
out/

# SQLite & Runtime Databases
*.db
*.db-journal
*.db-shm
*.db-wal
*.sqlite
*.sqlite3

# Environment variables & secrets (keep .example files)
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
!.env.example
!.env.production.example

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Runtime / Tools / Cache
.turbo/
.cache/
tools/
coverage/

# OS & Editor files
.DS_Store
Thumbs.db
desktop.ini
.vscode/
.idea/
`;
fs.writeFileSync(path.join(ROOT, '.gitignore'), gitignore, 'utf8');
console.log('✓ Root .gitignore created');

console.log('3. Initializing Git repository in ' + ROOT + '...');
function runGit(cmd) {
  return execSync(`"${GIT}" -C "${ROOT}" ${cmd}`).toString();
}

try {
  runGit('init');
  console.log('✓ Git initialized');
  runGit('config user.name "Mahesh"');
  runGit('config user.email "mahesh@stylesync.local"');
  runGit('branch -M main');
  console.log('✓ Branch set to main');

  // Check remote
  let remotes = '';
  try { remotes = runGit('remote -v'); } catch(e) {}
  if (remotes.includes('origin')) {
    runGit('remote set-url origin https://github.com/maheshk87865-ui/sytlesync.git');
    console.log('✓ Remote origin updated');
  } else {
    runGit('remote add origin https://github.com/maheshk87865-ui/sytlesync.git');
    console.log('✓ Remote origin added');
  }

  console.log('4. Staging files with .gitignore applied...');
  runGit('add .');
  console.log('✓ Files staged');

  const status = runGit('status --short');
  const lines = status.trim().split('\n');
  console.log(`✓ Staged ${lines.length} files`);

  runGit('commit -m "feat: complete StyleSync platform (Customer App, Salon Partner App, Super Admin, Authoritative Express Backend, and Cloud PaaS deployment specs)"');
  console.log('✓ Commit created successfully');
} catch (err) {
  console.error('Git error:', err.message);
}
