const fs = require('fs');
const path = require('path');

const serverJsPath = path.join(__dirname, 'src/api/server.js');
let content = fs.readFileSync(serverJsPath, 'utf8');

content = content.replace(
  "const MAIN_GUILD_ID = '1532343959722917979';",
  `const getGuildId = () => {
    const defaultId = '1532343959722917979';
    if (client.guilds.cache.has(defaultId)) return defaultId;
    const first = client.guilds.cache.first();
    return first ? first.id : defaultId;
  };`
);

content = content.replace(/MAIN_GUILD_ID/g, 'getGuildId()');

fs.writeFileSync(serverJsPath, content, 'utf8');

const indexJsPath = path.join(__dirname, 'src/index.js');
let indexContent = fs.readFileSync(indexJsPath, 'utf8');
indexContent = indexContent.replace(
  "const MAIN_GUILD_ID = '1178305844698435625';",
  "const MAIN_GUILD_ID = this.client.guilds.cache.first()?.id || '1532343959722917979';"
);
indexContent = indexContent.replace(
  "const guild = await this.client.guilds.fetch('1532343959722917979').catch(() => null);",
  "const guild = this.client.guilds.cache.first();"
);
fs.writeFileSync(indexJsPath, indexContent, 'utf8');

console.log('Guild IDs fixed dynamically.');
