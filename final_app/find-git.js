const fs = require('fs');
const { execSync } = require('child_process');

const paths = [
  'C:\\Program Files\\Git\\cmd\\git.exe',
  'C:\\Program Files\\Git\\bin\\git.exe',
  'C:\\Program Files (x86)\\Git\\cmd\\git.exe',
  'C:\\Users\\mahes\\AppData\\Local\\Programs\\Git\\cmd\\git.exe',
  'C:\\Users\\mahes\\AppData\\Local\\Programs\\Git\\bin\\git.exe',
  'C:\\Git\\cmd\\git.exe',
  'C:\\Git\\bin\\git.exe'
];

let found = null;
for (const p of paths) {
  if (fs.existsSync(p)) {
    console.log('FOUND: ' + p);
    found = p;
    try {
      console.log(execSync(`"${p}" --version`).toString());
    } catch (e) {
      console.error(e.message);
    }
  }
}

if (!found) {
  console.log('NOT_FOUND_IN_STANDARD_PATHS');
  // Check PATH environment variable
  console.log('PATH:', process.env.PATH);
}
