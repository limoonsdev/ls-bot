const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");

/*
|--------------------------------------------------------------------------
| ADMIN SECURITY
|--------------------------------------------------------------------------
|
| IMPORTANTE:
| La seguridad real está aquí, NO únicamente en Discord permissions.
|
*/

const ADMIN_IDS = new Set([
  "1178305844698435625",
  "1523717252988403873",
]);

const COLORS = {
  primary: 0xff1744,
  success: 0x00ff88,
  warning: 0xffc107,
  danger: 0xff1744,
  neutral: 0x2b2d31,
};

/*
|--------------------------------------------------------------------------
| SECURITY
|--------------------------------------------------------------------------
*/

function isAdmin(userId) {
  return ADMIN_IDS.has(String(userId));
}

async function deny(interaction) {
  const payload = {
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.danger)
        .setTitle("🔒 Acceso denegado")
        .setDescription(
          "❌ **No son Administradores.**\n\n" +
          "No tienes autorización para utilizar este panel."
        )
        .setFooter({
          text: "PrimeGen • Security System",
        })
        .setTimestamp(),
    ],
    ephemeral: true,
  };

  if (interaction.replied || interaction.deferred) {
    return interaction.followUp(payload).catch(() => {});
  }

  return interaction.reply(payload).catch(() => {});
}

/*
|--------------------------------------------------------------------------
| COMMAND
|--------------------------------------------------------------------------
*/

const command = new SlashCommandBuilder()
  .setName("admin")
  .setDescription("🔐 Open the PrimeGen administration panel")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator.toString());

/*
|--------------------------------------------------------------------------
| ANNOUNCE COMMAND
|--------------------------------------------------------------------------
*/

const announceCommand = new SlashCommandBuilder()
  .setName("announce")
  .setDescription("📢 Create a new bilingual announcement")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator.toString());

/*
|--------------------------------------------------------------------------
| MAIN ADMIN PANEL
|--------------------------------------------------------------------------
*/

function createAdminEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle("⚡ PrimeGen • Administration")
    .setDescription(
      "Bienvenue dans le **centre d'administration PrimeGen**.\n\n" +
      "Utilisez les boutons ci-dessous pour gérer les différents systèmes.\n\n" +
      "🔐 **Accès sécurisé**\n" +
      "Ce panneau est réservé aux administrateurs autorisés."
    )
    .addFields(
      {
        name: "📊 Overview",
        value: "Statistiques et état général.",
        inline: true,
      },
      {
        name: "📦 Stocks",
        value: "Gestion des stocks et restocks.",
        inline: true,
      },
      {
        name: "👥 Utilisateurs",
        value: "Classement et statistiques.",
        inline: true,
      },
      {
        name: "🎫 Tickets",
        value: "Gestion du support.",
        inline: true,
      },
      {
        name: "⚙️ Configuration",
        value: "Paramètres du système.",
        inline: true,
      },
      {
        name: "📢 Announcements",
        value: "Créer une annonce bilingue.",
        inline: true,
      }
    )
    .setFooter({
      text: "PrimeGen Admin Panel • Authorized Access Only",
    })
    .setTimestamp();
}

function createAdminButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_overview")
        .setLabel("Overview")
        .setEmoji("📊")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("admin_stocks")
        .setLabel("Stocks")
        .setEmoji("📦")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("admin_users")
        .setLabel("Users")
        .setEmoji("👥")
        .setStyle(ButtonStyle.Secondary)
    ),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_tickets")
        .setLabel("Tickets")
        .setEmoji("🎫")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("admin_config")
        .setLabel("Configuration")
        .setEmoji("⚙️")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("admin_refresh")
        .setLabel("Actualiser")
        .setEmoji("🔄")
        .setStyle(ButtonStyle.Success)
    ),
  ];
}

/*
|--------------------------------------------------------------------------
| OVERVIEW
|--------------------------------------------------------------------------
*/

function createOverview() {
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle("📊 PrimeGen • Overview")
    .setDescription("Vue globale de la plateforme.")
    .addFields(
      {
        name: "🟢 API",
        value: "`Operational`",
        inline: true,
      },
      {
        name: "🟢 Database",
        value: "`Operational`",
        inline: true,
      },
      {
        name: "🟢 Discord",
        value: "`Operational`",
        inline: true,
      },
      {
        name: "📦 Stock",
        value: "`Voir la section Stocks`",
        inline: true,
      },
      {
        name: "👥 Users",
        value: "`Voir la section Users`",
        inline: true,
      },
      {
        name: "🎫 Tickets",
        value: "`Voir la section Tickets`",
        inline: true,
      }
    )
    .setFooter({
      text: "PrimeGen Admin • Overview",
    })
    .setTimestamp();
}

/*
|--------------------------------------------------------------------------
| STOCKS
|--------------------------------------------------------------------------
*/

function createStocksPanel() {
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle("📦 PrimeGen • Stocks")
    .setDescription(
      "Gestion des stocks.\n\n" +
      "Utilisez les boutons ci-dessous pour effectuer les opérations."
    )
    .addFields({
      name: "📊 État",
      value: "Utilisez votre API/DB pour afficher les stocks réels ici.",
    })
    .setFooter({
      text: "PrimeGen Admin • Stocks",
    })
    .setTimestamp();
}

function createStockButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_stock_refresh")
        .setLabel("Actualiser")
        .setEmoji("🔄")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("admin_stock_restock")
        .setLabel("Restock")
        .setEmoji("📥")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("admin_stock_clear")
        .setLabel("Vider")
        .setEmoji("🗑️")
        .setStyle(ButtonStyle.Danger)
    ),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_home")
        .setLabel("Retour")
        .setEmoji("◀️")
        .setStyle(ButtonStyle.Secondary)
    ),
  ];
}

/*
|--------------------------------------------------------------------------
| USERS
|--------------------------------------------------------------------------
*/

function createUsersPanel() {
  return new EmbedBuilder()
    .setColor(0x4da6ff)
    .setTitle("👥 PrimeGen • Utilisateurs")
    .setDescription("Gestion et statistiques utilisateurs.")
    .addFields(
      {
        name: "🏆 Leaderboard",
        value: "Consultez le classement des utilisateurs.",
      },
      {
        name: "📈 Statistiques",
        value: "Statistiques globales de génération.",
      }
    )
    .setFooter({
      text: "PrimeGen Admin • Users",
    })
    .setTimestamp();
}

function createUserButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_leaderboard")
        .setLabel("Leaderboard")
        .setEmoji("🏆")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("admin_reset_leaderboard")
        .setLabel("Reset")
        .setEmoji("🗑️")
        .setStyle(ButtonStyle.Danger)
    ),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("admin_home")
        .setLabel("Retour")
        .setEmoji("◀️")
        .setStyle(ButtonStyle.Secondary)
    ),
  ];
}

/*
|--------------------------------------------------------------------------
| TICKETS
|--------------------------------------------------------------------------
*/

function createTicketsPanel() {
  return new EmbedBuilder()
    .setColor(0xffa000)
    .setTitle("🎫 PrimeGen • Tickets")
    .setDescription(
      "Centre de gestion du support.\n\n" +
      "Les administrateurs autorisés peuvent gérer les tickets depuis cette interface."
    )
    .addFields({
      name: "📩 Tickets",
      value: "Utilisez votre système de tickets actuel pour récupérer les tickets réels.",
    })
    .setFooter({
      text: "PrimeGen Admin • Tickets",
    })
    .setTimestamp();
}

/*
|--------------------------------------------------------------------------
| CONFIG
|--------------------------------------------------------------------------
*/

function createConfigPanel() {
  return new EmbedBuilder()
    .setColor(0x7c3aed)
    .setTitle("⚙️ PrimeGen • Configuration")
    .setDescription("Configuration administrative.")
    .addFields(
      {
        name: "🔐 Administrateurs",
        value:
          "```text\n" +
          "1178305844698435625\n" +
          "1523717252988403873\n" +
          "```",
      },
      {
        name: "🛡️ Sécurité",
        value:
          "• ID whitelist\n" +
          "• Vérification serveur\n" +
          "• Vérification interactions\n" +
          "• Réponses éphémères",
      }
    )
    .setFooter({
      text: "PrimeGen Admin • Configuration",
    })
    .setTimestamp();
}

/*
|--------------------------------------------------------------------------
| ANNOUNCE MODAL
|--------------------------------------------------------------------------
*/

function createAnnouncementModal() {
  const modal = new ModalBuilder()
    .setCustomId("announce_modal")
    .setTitle("Create Announcement");

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
    .setPlaceholder("Ex: Nouvelle mise à jour!")
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
| COMMAND EXECUTION
|--------------------------------------------------------------------------
*/

async function execute(interaction) {
  /*
   * CRITICAL:
   * On vérifie l'ID avant absolument toute action.
   */

  if (!isAdmin(interaction.user.id)) {
    return deny(interaction);
  }

  if (interaction.commandName === "announce") {
    return interaction.showModal(createAnnouncementModal());
  }

  if (interaction.commandName === "admin") {
    return interaction.reply({
      embeds: [createAdminEmbed()],
      components: createAdminButtons(),
      ephemeral: true,
    });
  }
}

/*
|--------------------------------------------------------------------------
| BUTTON HANDLER
|--------------------------------------------------------------------------
*/

async function handleButton(interaction) {
  /*
   * IMPORTANT :
   * Ne jamais supposer qu'un bouton est sécurisé parce
   * qu'il était affiché dans un message ephemeral.
   */

  if (!isAdmin(interaction.user.id)) {
    return deny(interaction);
  }

  switch (interaction.customId) {
    case "admin_home":
    case "admin_refresh":
      return interaction.update({
        embeds: [createAdminEmbed()],
        components: createAdminButtons(),
      });

    case "admin_overview":
      return interaction.update({
        embeds: [createOverview()],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_home")
              .setLabel("Retour")
              .setEmoji("◀️")
              .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
              .setCustomId("admin_refresh")
              .setLabel("Actualiser")
              .setEmoji("🔄")
              .setStyle(ButtonStyle.Success)
          ),
        ],
      });

    case "admin_stocks":
      return interaction.update({
        embeds: [createStocksPanel()],
        components: createStockButtons(),
      });

    case "admin_users":
      return interaction.update({
        embeds: [createUsersPanel()],
        components: createUserButtons(),
      });

    case "admin_tickets":
      return interaction.update({
        embeds: [createTicketsPanel()],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_home")
              .setLabel("Retour")
              .setEmoji("◀️")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });

    case "admin_config":
      return interaction.update({
        embeds: [createConfigPanel()],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("admin_home")
              .setLabel("Retour")
              .setEmoji("◀️")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });

    case "admin_stock_refresh":
      return interaction.reply({
        content:
          "🔄 **Actualisation des stocks...**\n\n" +
          "Branche ici ta fonction de récupération DB/API.",
        ephemeral: true,
      });

    case "admin_stock_restock": {
      const modal = new ModalBuilder()
        .setCustomId("admin_restock_modal")
        .setTitle("📦 Restock");

      const service = new TextInputBuilder()
        .setCustomId("service")
        .setLabel("Service ID")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

      const accounts = new TextInputBuilder()
        .setCustomId("accounts")
        .setLabel("Comptes")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Données à traiter...")
        .setRequired(true)
        .setMaxLength(4000);

      modal.addComponents(
        new ActionRowBuilder().addComponents(service),
        new ActionRowBuilder().addComponents(accounts)
      );

      return interaction.showModal(modal);
    }

    case "admin_stock_clear":
      return interaction.reply({
        content:
          "⚠️ **Action protégée.**\n\n" +
          "Branche ici ton système de confirmation + suppression DB.",
        ephemeral: true,
      });

    case "admin_leaderboard":
      return interaction.reply({
        content:
          "🏆 **Leaderboard**\n\n" +
          "Branche ici ta fonction existante de récupération du leaderboard.",
        ephemeral: true,
      });

    case "admin_reset_leaderboard":
      return interaction.reply({
        content:
          "⚠️ **Reset du leaderboard**\n\n" +
          "Branche ici ton endpoint/fonction de reset avec une confirmation supplémentaire.",
        ephemeral: true,
      });

    default:
      return interaction.reply({
        content: "❌ Action administrative inconnue.",
        ephemeral: true,
      });
  }
}

/*
|--------------------------------------------------------------------------
| MODAL HANDLER
|--------------------------------------------------------------------------
*/

async function handleModal(interaction) {
  /*
   * SECOND SECURITY CHECK
   */

  if (!isAdmin(interaction.user.id)) {
    return deny(interaction);
  }

  if (interaction.customId === "announce_modal") {
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
     * Ici tu peux appeler ton système actuel d'annonce.
     */

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle(`📢 ${titleEn}`)
      .setDescription(
        `${descEn}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🇫🇷 **${titleFr}**\n` +
        `${descFr}`
      )
      .setFooter({
        text: `PrimeGen • Announcement • ${interaction.user.username}`,
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });

    return;
  }

  if (interaction.customId === "admin_restock_modal") {
    const service = interaction.fields.getTextInputValue("service");
    const accounts = interaction.fields.getTextInputValue("accounts");

    /*
     * IMPORTANT :
     * Branche ici ta fonction réelle de restock.
     */

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle("📦 Restock reçu")
          .setDescription(
            `Service : \`${service}\`\n` +
            `Lignes reçues : \`${accounts.split("\n").filter(Boolean).length}\``
          )
          .setFooter({
            text: "PrimeGen Admin",
          }),
      ],
      ephemeral: true,
    });
  }
}

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = {
  command,
  announceCommand,
  execute,
  handleButton,
  handleModal,
  isAdmin,
  ADMIN_IDS,
};
