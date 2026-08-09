const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { buildPrimeToolsPanel } = require('./deploy');

const command = new SlashCommandBuilder()
  .setName('primetools')
  .setDescription('Deploy the PrimeTools VIP panel to a specific channel.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption(option =>
    option.setName('channel')
      .setDescription('The channel where the PrimeTools panel will be deployed')
      .setRequired(true)
  );

async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.options.getChannel('channel');

  if (!channel.isTextBased()) {
    return interaction.editReply('❌ The selected channel must be a text channel.');
  }

  try {
    const panel = await buildPrimeToolsPanel(interaction.guild);
    await channel.send(panel);

    await interaction.editReply(`✅ PrimeTools panel successfully deployed in ${channel}!`);
  } catch (error) {
    console.error('Error deploying primetools panel:', error);
    await interaction.editReply('❌ An error occurred while deploying the PrimeTools panel.');
  }
}

module.exports = { command, execute };
