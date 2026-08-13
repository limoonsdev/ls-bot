const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // Fix ephemeral: true -> flags: 64
      if (content.includes('ephemeral: true')) {
        content = content.replace(/ephemeral:\s*true/g, 'flags: 64');
        changed = true;
      }
      
      // Fix fetchReply: true -> withResponse: true
      if (content.includes('fetchReply: true')) {
        content = content.replace(/fetchReply:\s*true/g, 'withResponse: true');
        changed = true;
      }

      // Fix .on('ready' -> .on('clientReady'
      if (content.includes(".on('ready'")) {
        content = content.replace(/\.on\('ready'/g, ".on('clientReady'");
        changed = true;
      }
      if (content.includes(".once('ready'")) {
        content = content.replace(/\.once\('ready'/g, ".once('clientReady'");
        changed = true;
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Fixed', fullPath);
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
