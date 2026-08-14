const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  PermissionsBitField
} = require("discord.js");

/*
|--------------------------------------------------------------------------
| ADMINISTRADORES
|--------------------------------------------------------------------------
| IMPORTANTE:
| La autorización se comprueba por ID en el servidor.
| No dependemos únicamente de permisos de Discord.
|--------------------------------------------------------------------------
*/

const ADMIN_IDS = new Set([
  "1178305844698435625",
  "1523717252988403873"
]);

function isAdmin(userId) {
  return ADMIN_IDS.has(String(userId));
}

const command = new SlashCommandBuilder()
  .setName("announce")
  .setDescription("📢 Ouvrir le panneau d'administration")
  // Evita que Discord muestre el comando como restringido únicamente
  // por permiso Administrator. La comprobación real está abajo.
  .setDefaultMemberPermissions(null);

/*
|--------------------------------------------------------------------------
| PANEL PRINCIPAL
|--------------------------------------------------------------------------
*/

function createAdminPanel() {
  const embed = new EmbedBuilder()
    .setColor(0xff1744)
    .setTitle("⚡ PrimeGen — Administration")
    .setDescription(
      [
        "Bienvenue dans le panneau d'administration.",
        "",
        "Sélectionnez une action ci-dessous.",
        "",
        "🔐 **Accès sécurisé**",
        "Seuls les administrateurs autorisés peuvent utiliser ce panneau."
      ].join("\n")
    )
    .addFields(
      {
        name: "📢 Annonces",
        value: "Créer et publier une annonce multilingue.",
        inline: true
      },
      {
        name: "🛠️ Système",
        value: "Consulter l'état du système.",
        inline: true
      },
      {
        name: "👥 Administration",
        value: "Gestion des administrateurs autorisés.",
        inline: true
      }
    )
    .setFooter({
      text: "PrimeGen • Admin Panel"
    })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("admin_announce")
      .setLabel("Créer une annonce")
      .setEmoji("📢")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("admin_status")
      .setLabel("Status")
      .setEmoji("📊")
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("admin_info")
      .setLabel("Administrateurs")
      .setEmoji("👑")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("admin_close")
      .setLabel("Fermer")
      .setEmoji("✖️")
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [row1, row2],
    ephemeral: true
  };
}

/*
|--------------------------------------------------------------------------
| MODAL ANNOUNCE
|--------------------------------------------------------------------------
*/

function createAnnouncementModal() {
  const modal = new ModalBuilder()
    .setCustomId("announce_modal")
    .setTitle("📢 Create Announcement");

  const titleEn = new TextInputBuilder()
    .setCustomId("announce_title_en")
    .setLabel("Title (English)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Ex: New Update!")
    .setRequired(true)
    .setMaxLength(100);

  const descEn = new TextInputBuilder()
    .setCustomId("announce_desc_en")
    .setLabel("Description (English)")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("English announcement text...")
    .setRequired(true)
    .setMaxLength(1500);

  const titleFr = new TextInputBuilder()
    .setCustomId("announce_title_fr")
    .setLabel("Title (French)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Ex: Nouvelle mise à jour !")
    .setRequired(true)
    .setMaxLength(100);

  const descFr = new TextInputBuilder()
    .setCustomId("announce_desc_fr")
    .setLabel("Description (French)")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Texte de l'annonce en français...")
    .setRequired(true)
    .setMaxLength(1500);

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleEn),
    new ActionRowBuilder().addComponents(descEn),
    new ActionRowBuilder().addComponents(titleFr),
    new ActionRowBuilder().addComponents(descFr)
  );

  return modal;
}

/*
|--------------------------------------------------------------------------
| /announce
|--------------------------------------------------------------------------
*/

async function execute(interaction) {
  /*
   * SECURITY CHECK
   * 
   * Cette vérification se fait côté bot.
   * Même si quelqu'un essaie de contourner les permissions
   * de Discord, il ne pourra pas utiliser le panneau.
   */

  if (!isAdmin(interaction.user.id)) {
    return interaction.reply({
      content:
        "❌ **Vous n'êtes pas administrateur.**\n\n" +
        "Vous n'avez pas l'autorisation d'utiliser ce panneau.",
      ephemeral: true
    });
  }

  return interaction.reply(createAdminPanel());
}

/*
|--------------------------------------------------------------------------
| INTERACTIONS DU PANEL
|--------------------------------------------------------------------------
*/

async function handleInteraction(interaction) {
  /*
   * On ignore les interactions qui ne viennent pas
   * de notre système.
   */

  const customId = interaction.customId;

  if (
    !customId ||
    (
      !customId.startsWith("admin_") &&
      customId !== "announce_modal"
    )
  ) {
    return false;
  }

  /*
   * SECURITY CHECK
   *
   * Très important :
   * on vérifie également l'ID ici.
   *
   * Il ne suffit PAS de sécuriser uniquement /announce.
   */

  if (!isAdmin(interaction.user.id)) {
    if (interaction.isRepliable()) {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "❌ Vous n'êtes pas administrateur.",
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: "❌ Vous n'êtes pas administrateur.",
          ephemeral: true
        });
      }
    }

    return true;
  }

  /*
  |--------------------------------------------------------------------------
  | BOUTON : ANNOUNCE
  |--------------------------------------------------------------------------
  */

  if (customId === "admin_announce") {
    await interaction.showModal(createAnnouncementModal());
    return true;
  }

  /*
  |--------------------------------------------------------------------------
  | BOUTON : STATUS
  |--------------------------------------------------------------------------
  */

  if (customId === "admin_status") {
    const uptime = process.uptime();

    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    const embed = new EmbedBuilder()
      .setColor(0x00ff88)
      .setTitle("📊 PrimeGen — System Status")
      .addFields(
        {
          name: "🤖 Bot",
          value: "🟢 Opérationnel",
          inline: true
        },
        {
          name: "⚡ Latence",
          value: `${interaction.client.ws.ping} ms`,
          inline: true
        },
        {
          name: "⏱️ Uptime",
          value: `${days}j ${hours}h ${minutes}m`,
          inline: true
        },
        {
          name: "👑 Administrateur",
          value: `<@${interaction.user.id}>`,
          inline: true
        },
        {
          name: "🧠 Node.js",
          value: process.version,
          inline: true
        }
      )
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });

    return true;
  }

  /*
  |--------------------------------------------------------------------------
  | BOUTON : INFOS ADMIN
  |--------------------------------------------------------------------------
  */

  if (customId === "admin_info") {
    const embed = new EmbedBuilder()
      .setColor(0xff1744)
      .setTitle("👑 Administrateurs autorisés")
      .setDescription(
        [
          `<@1178305844698435625>`,
          `<@1523717252988403873>`
        ].join("\n")
      )
      .addFields({
        name: "🔐 Autorisation",
        value:
          "L'accès est contrôlé directement par l'ID Discord du compte."
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });

    return true;
  }

  /*
  |--------------------------------------------------------------------------
  | BOUTON : FERMER
  |--------------------------------------------------------------------------
  */

  if (customId === "admin_close") {
    await interaction.update({
      content: "🔒 **Panneau d'administration fermé.**",
      embeds: [],
      components: []
    });

    return true;
  }

  /*
  |--------------------------------------------------------------------------
  | MODAL ANNOUNCE
  |--------------------------------------------------------------------------
  */

  if (customId === "announce_modal") {
    const titleEn = interaction.fields.getTextInputValue(
      "announce_title_en"
    );

    const descEn = interaction.fields.getTextInputValue(
      "announce_desc_en"
    );

    const titleFr = interaction.fields.getTextInputValue(
      "announce_title_fr"
    );

    const descFr = interaction.fields.getTextInputValue(
      "announce_desc_fr"
    );

    /*
     * Validation serveur
     */

    if (
      !titleEn.trim() ||
      !descEn.trim() ||
      !titleFr.trim() ||
      !descFr.trim()
    ) {
      await interaction.reply({
        content: "❌ Tous les champs sont obligatoires.",
        ephemeral: true
      });

      return true;
    }

    /*
     * Pour l'instant on affiche un aperçu.
     *
     * Ici tu peux ensuite envoyer l'annonce
     * vers ton canal Discord / API / base de données.
     */

    const preview = new EmbedBuilder()
      .setColor(0xff1744)
      .setTitle("📢 Nouvelle annonce")
      .addFields(
        {
          name: "🇬🇧 " + titleEn,
          value: descEn
        },
        {
          name: "🇫🇷 " + titleFr,
          value: descFr
        }
      )
      .setFooter({
        text: `Publié par ${interaction.user.username}`
      })
      .setTimestamp();

    await interaction.reply({
      content: "✅ **Annonce créée avec succès.**",
      embeds: [preview],
      ephemeral: true
    });

    return true;
  }

  return false;
}

module.exports = {
  command,
  execute,
  handleInteraction,
  ADMIN_IDS,
  isAdmin
};
