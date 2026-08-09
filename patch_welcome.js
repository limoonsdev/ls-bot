const fs = require('fs');
let content = fs.readFileSync('src/handlers/buttonHandlers.js', 'utf-8');

const welcomeFunc = `
async function sendWelcomeMessage(guild, member) {
  try {
    const chatChannelId = '1535002094539505684';
    const chatChannel = guild.channels.cache.get(chatChannelId);
    if (!chatChannel) return;

    const { EmbedBuilder } = require('discord.js');
    const embedFr = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(\`🇫🇷 Bienvenue \${member.user.username} !\`)
      .setDescription(\`Hey \${member}, bienvenue sur **PrimeGen** !\\n\\nN'hésite pas à visiter notre **Shop** pour découvrir nos offres exclusives, et jette un œil aux **générateurs** pour obtenir tes comptes !\\n\\n*Si tu as une question, n'hésite pas à me mentionner ici pour parler avec l'IA !*\`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();
      
    const embedEn = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(\`🇬🇧 Welcome \${member.user.username}!\`)
      .setDescription(\`Hey \${member}, welcome to **PrimeGen**!\\n\\nDon't hesitate to check out our **Shop** for exclusive offers, and take a look at the **generators** to get your accounts!\\n\\n*If you have a question, feel free to mention me here to chat with the AI!*\`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();
      
    await chatChannel.send({ content: \`\${member}\`, embeds: [embedFr, embedEn] });
  } catch (err) {
    // Ignore
  }
}
`;

// Insert after imports or at the end
content += '\n' + welcomeFunc;

content = content.replace(
  /logger\.info\('Verify', `User verified: \$\{member\.user\.tag\}`[\s\S]*?\}\);/,
  `logger.info('Verify', \`User verified: \${member.user.tag}\`, { guild: interaction.guild.id, user: member.id });\n    await sendWelcomeMessage(interaction.guild, member);`
);

content = content.replace(
  "await member.send('✅ You have been manually verified by staff. Welcome!').catch(() => {});",
  "await member.send('✅ You have been manually verified by staff. Welcome!').catch(() => {});\n    await sendWelcomeMessage(interaction.guild, member);"
);

fs.writeFileSync('src/handlers/buttonHandlers.js', content);
