const fs = require('fs');
let content = fs.readFileSync('src/handlers/selectHandlers.js', 'utf-8');

const selectHandler = `
  // Server List Select Handler
  client.selectHandlers.set('server_list_select', async (interaction) => {
    try {
      const guildId = interaction.values[0];
      const guild = interaction.client.guilds.cache.get(guildId);
      
      if (!guild) {
        return interaction.reply({ content: '❌ Ce serveur est introuvable (le bot l\\'a peut-être déjà quitté).', ephemeral: true });
      }

      const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(\`🛠️ Gestion: \${guild.name}\`)
        .setDescription(\`**ID:** \${guild.id}\\n**Membres:** \${guild.memberCount}\\n**Propriétaire ID:** \${guild.ownerId}\`)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setTimestamp();

      const btnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(\`server_leave_\${guild.id}\`)
          .setLabel('Faire quitter le bot de ce serveur')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🚪')
      );

      await interaction.reply({ embeds: [embed], components: [btnRow], ephemeral: true });
    } catch (err) {
      logger.error('SelectHandlers', 'Server list select failed', { error: err.message });
    }
  });
`;

content = content.replace("client.selectHandlers.set('config_select_category',", selectHandler + "\n  client.selectHandlers.set('config_select_category',");

fs.writeFileSync('src/handlers/selectHandlers.js', content);

let btnContent = fs.readFileSync('src/handlers/buttonHandlers.js', 'utf-8');
const btnHandler = `
    } else if (customId.startsWith('server_leave_')) {
      await handleServerLeave(interaction);
`;

btnContent = btnContent.replace("} else if (customId === 'verify_user') {", btnHandler + "    } else if (customId === 'verify_user') {");

const handleServerLeaveFunc = `
async function handleServerLeave(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const guildId = interaction.customId.replace('server_leave_', '');
  const guildToLeave = interaction.client.guilds.cache.get(guildId);
  
  if (!guildToLeave) {
    return interaction.editReply({ content: '❌ Impossible de trouver ce serveur. Le bot l\\'a peut-être déjà quitté.' });
  }

  try {
    const name = guildToLeave.name;
    await guildToLeave.leave();
    await interaction.editReply({ content: \`✅ Le bot a quitté le serveur **\${name}** avec succès !\` });
  } catch (err) {
    await interaction.editReply({ content: \`❌ Erreur lors de la tentative de quitter le serveur : \${err.message}\` });
  }
}
`;

btnContent += '\n' + handleServerLeaveFunc;

fs.writeFileSync('src/handlers/buttonHandlers.js', btnContent);
