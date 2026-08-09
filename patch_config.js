const fs = require('fs');
let content = fs.readFileSync('src/commands/config.js', 'utf-8');

// 1. Update showCooldownsConfig
content = content.replace(/async function showCooldownsConfig\(interaction\) {[\s\S]*?await interaction\.update\(\{ embeds: \[embed\], components: \[row\] \}\);\n}/, `async function showCooldownsConfig(interaction) {
  const { getOrCreateGuildConfig } = require('../database/models');
  const { formatTime } = require('../utils/timeParser');
  
  const config = await getOrCreateGuildConfig(interaction.guild.id);
  const confData = config.config_data || {};
  
  let rolesText = '';
  if (confData.cooldown_roles && Object.keys(confData.cooldown_roles).length > 0) {
    for (const [roleId, time] of Object.entries(confData.cooldown_roles)) {
      rolesText += \`• <@&\${roleId}> : **\${formatTime(time)}**\\n\`;
    }
  } else {
    rolesText = 'No custom rules.\\nSelect a role below to add one.';
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('⏱️ Cooldown Configuration')
    .setDescription(
      'Configure how long users must wait between generations.\\n\\n' +
      '**Format examples:**\\n' +
      '• \`30s\` or \`30\` = 30 seconds\\n' +
      '• \`1m\` or \`60s\` = 1 minute\\n' +
      '• \`1h\` or \`60m\` = 1 hour\\n' +
      '• \`2h 30m\` = 2.5 hours'
    )
    .addFields(
      {
        name: 'Current Settings',
        value: \`Free: **\${formatTime(confData.cooldown_free ?? 600000)}**\\nPremium: **\${formatTime(confData.cooldown_premium ?? 60000)}**\`,
        inline: false
      },
      {
        name: 'Custom Roles',
        value: rolesText,
        inline: false
      }
    );

  const { RoleSelectMenuBuilder } = require('discord.js');
  const roleRow = new ActionRowBuilder()
    .addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('config_cooldown_role_select')
        .setPlaceholder('Select a role to add/edit a custom cooldown')
    );

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('config_cooldown_free')
        .setLabel('Free')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🆓'),
      new ButtonBuilder()
        .setCustomId('config_cooldown_premium')
        .setLabel('Premium')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('👑'),
      new ButtonBuilder()
        .setCustomId('config_cooldown_clear')
        .setLabel('Clear Rules')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🗑️'),
      new ButtonBuilder()
        .setCustomId('config_back')
        .setLabel('Back')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('◀️')
    );

  if (interaction.isMessageComponent()) {
    await interaction.update({ embeds: [embed], components: [roleRow, row] });
  } else {
    await interaction.editReply({ embeds: [embed], components: [roleRow, row] });
  }
}`);

// 2. Add showCustomRoleCooldownModal
const modalFunc = `
async function showCustomRoleCooldownModal(interaction, roleId) {
  const modal = new ModalBuilder()
    .setCustomId(\`config_modal_cd_role_\${roleId}\`)
    .setTitle('Custom Cooldown (Role)');

  const input = new TextInputBuilder()
    .setCustomId('cooldown_value')
    .setLabel('Cooldown Duration (e.g. 5m, 0 for none)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('5m')
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}
`;
content = content.replace('module.exports = {', modalFunc + '\nmodule.exports = {');

// 3. Add handleModalSubmit logic for role cd
const roleCdSubmit = `
  if (customId.startsWith('config_modal_cd_role_')) {
    const roleId = customId.replace('config_modal_cd_role_', '');
    const value = interaction.fields.getTextInputValue('cooldown_value');
    const { parseTime, formatTime } = require('../utils/timeParser');
    const ms = parseTime(value);

    if (ms === null || ms < 0) {
      return await interaction.reply({ content: '❌ Invalid time format.', ephemeral: true });
    }

    const { getOrCreateGuildConfig, updateGuildConfig } = require('../database/models');
    const config = await getOrCreateGuildConfig(interaction.guild.id);
    const confData = config.config_data || {};
    if (!confData.cooldown_roles) confData.cooldown_roles = {};
    confData.cooldown_roles[roleId] = ms;

    await updateGuildConfig(interaction.guild.id, { cooldown_roles: confData.cooldown_roles });

    await interaction.reply({
      content: \`✅ Custom cooldown for <@&\${roleId}> set to **\${formatTime(ms)}**\`,
      ephemeral: true
    });
    return;
  }
`;
content = content.replace('async function handleModalSubmit(interaction) {\n  const customId = interaction.customId;', 'async function handleModalSubmit(interaction) {\n  const customId = interaction.customId;\n' + roleCdSubmit);

// 4. Add handleConfigButton logic for clear roles
content = content.replace("if (customId === 'config_cooldown_premium') return await showCooldownModal(interaction, 'premium');", "if (customId === 'config_cooldown_premium') return await showCooldownModal(interaction, 'premium');\n  if (customId === 'config_cooldown_clear') {\n    const { updateGuildConfig } = require('../database/models');\n    await updateGuildConfig(interaction.guild.id, { cooldown_roles: {} });\n    await interaction.reply({ content: '✅ All custom role cooldowns cleared.', ephemeral: true });\n    return;\n  }");

// 5. Add showCustomRoleCooldownModal to exports
content = content.replace('showCooldownModal,', 'showCooldownModal,\n  showCustomRoleCooldownModal,');

fs.writeFileSync('src/commands/config.js', content);
