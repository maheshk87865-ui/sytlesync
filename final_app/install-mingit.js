const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');
const path = require('path');

const targetDir = 'C:\\Users\\mahes\\AppData\\Local\\Programs\\Git';
const zipPath = path.join(targetDir, 'mingit.zip');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

console.log('Downloading MinGit...');
const file = fs.createWriteStream(zipPath);
const url = 'https://github.com/git-for-windows/git/releases/download/v2.56.0.windows.3/MinGit-2.56.0.3-64-bit.zip';

function download(curUrl) {
  https.get(curUrl, { headers: { 'User-Agent': 'node' } }, res => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      download(res.headers.location);
      return;
    }
    res.pipe(file);
    file.on('finish', () => {
      file.close(() => {
        console.log('File stream closed. Extracting with powershell Expand-Archive...');
        try {
          execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${targetDir}' -Force"`);
          console.log('Extracted successfully!');
          try { fs.unlinkSync(zipPath); } catch (e) {}
          const gitExe = path.join(targetDir, 'cmd', 'git.exe');
          console.log('Git binary exists:', fs.existsSync(gitExe));
          console.log('Git version:', execSync(`"${gitExe}" --version`).toString());
        } catch (err) {
          console.error('Extract error:', err.message);
        }
      });
    });
  }).on('error', err => {
    console.error('Download error:', err.message);
  });
}

download(url);
