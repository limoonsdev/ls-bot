const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder
} = require("discord.js");
const os = require("os");

const ADMIN_IDS = new Set([
  "1178305844698435625",
  "1523717252988403873"
]);

const API_BASE_URL = (
  process.env.API_BASE_URL ||
  process.env.API_URL ||
  "https://primegen.eu"
).replace(/\/$/, "");

const API_KEY = process.env.INTERNAL_API_KEY || "";

const command = new SlashCommandBuilder()
  .setName("announce")
  .setDescription("⚡ Ouvrir le panneau d'administration PrimeGen");

function isAdmin(userId) {
  return ADMIN_IDS.has(String(userId));
}

/*
|--------------------------------------------------------------------------
| UTILIDADES
|--------------------------------------------------------------------------
*/

function formatUptime(seconds) {
  seconds = Math.floor(seconds);

  const days = Math.floor(seconds / 86400);
  seconds %= 86400;

  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  const parts = [];

  if (days) parts.push(`${days}j`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (secs || !parts.length) parts.push(`${secs}s`);

  return parts.join(" ");
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 MB";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];

  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );

  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

function getCpuUsage() {
  const cpus = os.cpus();

  if (!cpus?.length) {
    return "N/A";
  }

  let idle = 0;
  let total = 0;

  for (const cpu of cpus) {
    for (const type in cpu.times) {
      total += cpu.times[type];
    }

    idle += cpu.times.idle;
  }

  if (!total) {
    return "N/A";
  }

  const usage = 100 - (idle / total) * 100;

  return `${Math.max(0, usage).toFixed(1)}%`;
}

async function apiFetch(path, options = {}) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 5000);

  try {
    const headers = {
      Accept: "application/json",
      ...(options.headers || {})
    };

    if (API_KEY) {
      headers["X-Internal-Key"] = API_KEY;
    }

    const response = await fetch(
      `${API_BASE_URL}${path}`,
      {
        ...options,
        headers,
        signal: controller.signal
      }
    );

    if (!response.ok) {
      throw new Error(`API ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/*
|--------------------------------------------------------------------------
| PANEL
|--------------------------------------------------------------------------
*/

function buildPanel(client) {
  const guildCount = client.guilds.cache.size;

  let memberCount = 0;

  for (const guild of client.guilds.cache.values()) {
    memberCount += guild.memberCount || 0;
  }

  const embed = new EmbedBuilder()
    .setColor(0xff1744)
    .setTitle("⚡ PrimeGen V2 — Admin Control Center")
    .setDescription(
      [
        "Bienvenue dans le centre de contrôle de PrimeGen.",
        "",
        "Toutes les informations affichées par le panneau sont récupérées",
        "depuis le bot, l'API et les services configurés.",
        "",
        "🔐 **Accès administrateur vérifié par ID Discord.**"
      ].join("\n")
    )
    .addFields(
      {
        name: "🤖 Bot",
        value: "🟢 En ligne",
        inline: true
      },
      {
        name: "⚡ Ping",
        value: `${client.ws.ping} ms`,
        inline: true
      },
      {
        name: "🌐 Serveurs",
        value: guildCount.toLocaleString(),
        inline: true
      },
      {
        name: "👥 Membres",
        value: memberCount.toLocaleString(),
        inline: true
      },
      {
        name: "⏱️ Uptime",
        value: formatUptime(process.uptime()),
        inline: true
      },
      {
        name: "🟢 Node.js",
        value: process.version,
        inline: true
      }
    )
    .setFooter({
      text: `PrimeGen V2 • ${new Date().toLocaleString("fr-FR")}`
    })
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("pg_admin_overview")
      .setLabel("Overview")
      .setEmoji("📊")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("pg_admin_stock")
      .setLabel("Stocks")
      .setEmoji("📦")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("pg_admin_users")
      .setLabel("Users")
      .setEmoji("👥")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("pg_admin_tickets")
      .setLabel("Tickets")
      .setEmoji("🎫")
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("pg_admin_config")
      .setLabel("Configuration")
      .setEmoji("⚙️")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("pg_admin_shop")
      .setLabel("Boutique")
      .setEmoji("🛍️")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("pg_admin_system")
      .setLabel("Système")
      .setEmoji("🖥️")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("pg_admin_announce")
      .setLabel("Annonce")
      .setEmoji("📢")
      .setStyle(ButtonStyle.Danger)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("pg_admin_refresh")
      .setLabel("Actualiser")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("pg_admin_close")
      .setLabel("Fermer")
      .setEmoji("✖️")
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [row1, row2, row3],
    ephemeral: true
  };
}

/*
|--------------------------------------------------------------------------
| /announce
|--------------------------------------------------------------------------
*/

async function execute(interaction) {
  // Vérification AVANT toute opération lente.
  if (!isAdmin(interaction.user.id)) {
    return interaction.reply({
      content:
        "❌ **No son administradores.**\n\n" +
        "No tienes autorización para utilizar este panel.",
      ephemeral: true
    });
  }

  // Réponse immédiate < 3 secondes.
  return interaction.reply(buildPanel(interaction.client));
}

/*
|--------------------------------------------------------------------------
| MODAL ANNONCE
|--------------------------------------------------------------------------
*/

function createAnnouncementModal() {
  const modal = new ModalBuilder()
    .setCustomId("pg_announce_modal")
    .setTitle("📢 Nouvelle annonce");

  const titleEn = new TextInputBuilder()
    .setCustomId("announce_title_en")
    .setLabel("Titre — English")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("New update!")
    .setRequired(true)
    .setMaxLength(100);

  const descEn = new TextInputBuilder()
    .setCustomId("announce_desc_en")
    .setLabel("Description — English")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Write the announcement...")
    .setRequired(true)
    .setMaxLength(1500);

  const titleFr = new TextInputBuilder()
    .setCustomId("announce_title_fr")
    .setLabel("Titre — Français")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Nouvelle mise à jour !")
    .setRequired(true)
    .setMaxLength(100);

  const descFr = new TextInputBuilder()
    .setCustomId("announce_desc_fr")
    .setLabel("Description — Français")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Écrivez l'annonce...")
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
| OVERVIEW
|--------------------------------------------------------------------------
*/

async function showOverview(interaction) {
  const client = interaction.client;

  let memberCount = 0;

  for (const guild of client.guilds.cache.values()) {
    memberCount += guild.memberCount || 0;
  }

  const memory = process.memoryUsage();

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📊 PrimeGen — Overview")
    .addFields(
      {
        name: "🤖 Bot",
        value: "🟢 Online",
        inline: true
      },
      {
        name: "📡 Discord Ping",
        value: `${client.ws.ping} ms`,
        inline: true
      },
      {
        name: "🌐 Serveurs",
        value: client.guilds.cache.size.toLocaleString(),
        inline: true
      },
      {
        name: "👥 Membres",
        value: memberCount.toLocaleString(),
        inline: true
      },
      {
        name: "⏱️ Uptime",
        value: formatUptime(process.uptime()),
        inline: true
      },
      {
        name: "🧠 RAM",
        value: formatBytes(memory.rss),
        inline: true
      },
      {
        name: "📦 Heap",
        value: formatBytes(memory.heapUsed),
        inline: true
      },
      {
        name: "🟢 Node",
        value: process.version,
        inline: true
      },
      {
        name: "💻 OS",
        value: `${os.platform()} ${os.arch()}`,
        inline: true
      }
    )
    .setTimestamp();

  await interaction.editReply({
    embeds: [embed],
    components: buildBackButton()
  });
}

/*
|--------------------------------------------------------------------------
| STOCKS RÉELS
|--------------------------------------------------------------------------
*/

async function showStock(interaction) {
  try {
    const data = await apiFetch("/api-bot/services/stock");

    const services = Array.isArray(data)
      ? data
      : Array.isArray(data?.services)
        ? data.services
        : [];

    const total = services.reduce(
      (sum, service) =>
        sum + Number(service.stock || 0),
      0
    );

    const active = services.filter(
      service => Number(service.stock || 0) > 0
    ).length;

    const top = [...services]
      .sort(
        (a, b) =>
          Number(b.stock || 0) -
          Number(a.stock || 0)
      )
      .slice(0, 15);

    const lines = top.length
      ? top.map(service => {
          const stock = Number(service.stock || 0);

          return `${stock > 0 ? "🟢" : "🔴"} **${service.label || service.id}** — ${stock.toLocaleString()}`;
        })
      : ["Aucun service disponible."];

    const embed = new EmbedBuilder()
      .setColor(0x00ff88)
      .setTitle("📦 PrimeGen — Stocks réels")
      .setDescription(lines.join("\n"))
      .addFields(
        {
          name: "📦 Stock total",
          value: total.toLocaleString(),
          inline: true
        },
        {
          name: "🟢 Services actifs",
          value: active.toString(),
          inline: true
        },
        {
          name: "🔧 Services",
          value: services.length.toString(),
          inline: true
        }
      )
      .setFooter({
        text: "Données récupérées depuis l'API PrimeGen"
      })
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed],
      components: buildBackButton()
    });

  } catch (error) {
    console.error("[ADMIN STOCK]", error);

    await interaction.editReply({
      content:
        "⚠️ **Impossible de récupérer les stocks réels.**\n\n" +
        `API: ${API_BASE_URL}`,
      embeds: [],
      components: buildBackButton()
    });
  }
}

/*
|--------------------------------------------------------------------------
| USERS RÉELS
|--------------------------------------------------------------------------
*/

async function showUsers(interaction) {
  try {
    const data = await apiFetch("/api-bot/leaderboard");

    const users = Array.isArray(data)
      ? data
      : [];

    const top = users
      .slice()
      .sort(
        (a, b) =>
          Number(b.total_combos_generated || 0) -
          Number(a.total_combos_generated || 0)
      )
      .slice(0, 15);

    const lines = top.length
      ? top.map((user, index) => {
          return (
            `**#${index + 1}** ` +
            `${user.username || "Utilisateur"} — ` +
            `**${Number(
              user.total_combos_generated || 0
            ).toLocaleString()}** générations`
          );
        })
      : ["Aucun utilisateur disponible."];

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("👥 PrimeGen — Utilisateurs")
      .setDescription(lines.join("\n"))
      .addFields({
        name: "👤 Utilisateurs enregistrés",
        value: users.length.toLocaleString(),
        inline: true
      })
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed],
      components: buildBackButton()
    });

  } catch (error) {
    console.error("[ADMIN USERS]", error);

    await interaction.editReply({
      content: "⚠️ Impossible de récupérer les utilisateurs.",
      embeds: [],
      components: buildBackButton()
    });
  }
}

/*
|--------------------------------------------------------------------------
| TICKETS RÉELS
|--------------------------------------------------------------------------
*/

async function showTickets(interaction) {
  try {
    const data = await apiFetch("/api-bot/admin/tickets");

    const tickets = Array.isArray(data)
      ? data
      : [];

    const open = tickets.filter(
      t => t.status === "open"
    ).length;

    const closed = tickets.filter(
      t => t.status === "closed"
    ).length;

    const recent = tickets
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0) -
          new Date(a.createdAt || 0)
      )
      .slice(0, 10);

    const lines = recent.length
      ? recent.map(ticket => {
          const status =
            ticket.status === "open"
              ? "🟢"
              : "⚪";

          return (
            `${status} **${ticket.subject || "Sans sujet"}** ` +
            `— ${ticket.userId || "Unknown"}`
          );
        })
      : ["Aucun ticket."];

    const embed = new EmbedBuilder()
      .setColor(0xffa500)
      .setTitle("🎫 PrimeGen — Tickets")
      .setDescription(lines.join("\n"))
      .addFields(
        {
          name: "🟢 Ouverts",
          value: open.toString(),
          inline: true
        },
        {
          name: "⚪ Fermés",
          value: closed.toString(),
          inline: true
        },
        {
          name: "📊 Total",
          value: tickets.length.toString(),
          inline: true
        }
      )
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed],
      components: buildBackButton()
    });

  } catch (error) {
    console.error("[ADMIN TICKETS]", error);

    await interaction.editReply({
      content: "⚠️ Impossible de récupérer les tickets.",
      embeds: [],
      components: buildBackButton()
    });
  }
}

/*
|--------------------------------------------------------------------------
| CONFIGURATION RÉELLE
|--------------------------------------------------------------------------
*/

async function showConfig(interaction) {
  try {
    const [
      maintenance,
      staff
    ] = await Promise.all([
      apiFetch("/api-bot/admin/maintenance"),
      apiFetch("/api-bot/admin/staff")
    ]);

    const maintenanceEnabled =
      Boolean(maintenance?.maintenance);

    const staffIds =
      Array.isArray(staff)
        ? staff
        : [];

    const embed = new EmbedBuilder()
      .setColor(
        maintenanceEnabled
          ? 0xff1744
          : 0x00ff88
      )
      .setTitle("⚙️ PrimeGen — Configuration")
      .addFields(
        {
          name: "🔧 Maintenance",
          value: maintenanceEnabled
            ? "🔴 ACTIVÉE"
            : "🟢 DÉSACTIVÉE",
          inline: true
        },
        {
          name: "👑 Staff",
          value: staffIds.length.toString(),
          inline: true
        },
        {
          name: "🔐 Administrateurs principaux",
          value: "2",
          inline: true
        },
        {
          name: "👑 Admin #1",
          value: "<@1178305844698435625>",
          inline: true
        },
        {
          name: "👑 Admin #2",
          value: "<@1523717252988403873>",
          inline: true
        },
        {
          name: "🌐 API",
          value: API_BASE_URL,
          inline: false
        }
      );

    if (maintenance?.message) {
      embed.addFields({
        name: "📝 Message maintenance",
        value: String(
          maintenance.message
        ).slice(0, 1000)
      });
    }

    await interaction.editReply({
      embeds: [embed],
      components: buildBackButton()
    });

  } catch (error) {
    console.error("[ADMIN CONFIG]", error);

    await interaction.editReply({
      content:
        "⚠️ Impossible de récupérer la configuration.",
      embeds: [],
      components: buildBackButton()
    });
  }
}

/*
|--------------------------------------------------------------------------
| SHOP RÉELLE
|--------------------------------------------------------------------------
*/

async function showShop(interaction) {
  try {
    const data = await apiFetch("/api-bot/shop");

    const items = Array.isArray(data)
      ? data
      : [];

    const lines = items
      .slice(0, 20)
      .map(item => {
        return (
          `🛍️ **${item.name || "Article"}** — ` +
          `${item.price ?? "?"}€`
        );
      });

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle("🛍️ PrimeGen — Boutique")
      .setDescription(
        lines.length
          ? lines.join("\n")
          : "Aucun article."
      )
      .addFields({
        name: "📦 Articles",
        value: items.length.toString(),
        inline: true
      })
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed],
      components: buildBackButton()
    });

  } catch (error) {
    console.error("[ADMIN SHOP]", error);

    await interaction.editReply({
      content: "⚠️ Impossible de récupérer la boutique.",
      embeds: [],
      components: buildBackButton()
    });
  }
}

/*
|--------------------------------------------------------------------------
| SYSTEME RÉEL
|--------------------------------------------------------------------------
*/

async function showSystem(interaction) {
  const memory = process.memoryUsage();

  const embed = new EmbedBuilder()
    .setColor(0x00bfff)
    .setTitle("🖥️ PrimeGen — Informations système")
    .addFields(
      {
        name: "⚡ Discord Ping",
        value: `${interaction.client.ws.ping} ms`,
        inline: true
      },
      {
        name: "⏱️ Uptime",
        value: formatUptime(process.uptime()),
        inline: true
      },
      {
        name: "🧠 RSS",
        value: formatBytes(memory.rss),
        inline: true
      },
      {
        name: "📦 Heap utilisé",
        value: formatBytes(memory.heapUsed),
        inline: true
      },
      {
        name: "📦 Heap total",
        value: formatBytes(memory.heapTotal),
        inline: true
      },
      {
        name: "💾 RAM système",
        value: formatBytes(os.totalmem()),
        inline: true
      },
      {
        name: "💾 RAM disponible",
        value: formatBytes(os.freemem()),
        inline: true
      },
      {
        name: "🖥️ CPU",
        value: getCpuUsage(),
        inline: true
      },
      {
        name: "🧮 CPU cores",
        value: os.cpus().length.toString(),
        inline: true
      },
      {
        name: "🟢 Node.js",
        value: process.version,
        inline: true
      },
      {
        name: "📦 Discord.js",
        value: require("discord.js").version,
        inline: true
      },
      {
        name: "💻 Platform",
        value: `${os.platform()} ${os.arch()}`,
        inline: true
      }
    )
    .setTimestamp();

  await interaction.editReply({
    embeds: [embed],
    components: buildBackButton()
  });
}

/*
|--------------------------------------------------------------------------
| BACK
|--------------------------------------------------------------------------
*/

function buildBackButton() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("pg_admin_back")
        .setLabel("Retour au panneau")
        .setEmoji("↩️")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("pg_admin_refresh")
        .setLabel("Actualiser")
        .setEmoji("🔄")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("pg_admin_close")
        .setLabel("Fermer")
        .setEmoji("✖️")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

/*
|--------------------------------------------------------------------------
| INTERACTIONS
|--------------------------------------------------------------------------
*/

async function handleInteraction(interaction) {
  const id = interaction.customId;

  if (
    !id ||
    (
      !id.startsWith("pg_admin_") &&
      id !== "pg_announce_modal"
    )
  ) {
    return false;
  }

  /*
   * SECURITY CHECK SUR CHAQUE INTERACTION
   */

  if (!isAdmin(interaction.user.id)) {
    if (interaction.isRepliable()) {
      if (
        interaction.replied ||
        interaction.deferred
      ) {
        await interaction.followUp({
          content: "❌ **No son administradores.**",
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: "❌ **No son administradores.**",
          ephemeral: true
        });
      }
    }

    return true;
  }

  /*
  |--------------------------------------------------------------------------
  | ANNOUNCE MODAL
  |--------------------------------------------------------------------------
  */

  if (id === "pg_admin_announce") {
    await interaction.showModal(
      createAnnouncementModal()
    );

    return true;
  }

  /*
  |--------------------------------------------------------------------------
  | MODAL SUBMIT
  |--------------------------------------------------------------------------
  */

  if (id === "pg_announce_modal") {
    const titleEn =
      interaction.fields.getTextInputValue(
        "announce_title_en"
      );

    const descEn =
      interaction.fields.getTextInputValue(
        "announce_desc_en"
      );

    const titleFr =
      interaction.fields.getTextInputValue(
        "announce_title_fr"
      );

    const descFr =
      interaction.fields.getTextInputValue(
        "announce_desc_fr"
      );

    if (
      !titleEn.trim() ||
      !descEn.trim() ||
      !titleFr.trim() ||
      !descFr.trim()
    ) {
      await interaction.reply({
        content:
          "❌ Tous les champs sont obligatoires.",
        ephemeral: true
      });

      return true;
    }

    const embed = new EmbedBuilder()
      .setColor(0xff1744)
      .setTitle("📢 Aperçu de l'annonce")
      .addFields(
        {
          name: `🇬🇧 ${titleEn}`,
          value: descEn
        },
        {
          name: `🇫🇷 ${titleFr}`,
          value: descFr
        }
      )
      .setFooter({
        text: `Créée par ${interaction.user.tag}`
      })
      .setTimestamp();

    await interaction.reply({
      content:
        "✅ **Annonce créée.**\n\n" +
        "⚠️ Elle est actuellement affichée en aperçu privé. " +
        "Connecte ici ton canal/API d'annonces pour la publication.",
      embeds: [embed],
      ephemeral: true
    });

    return true;
  }

  /*
  |--------------------------------------------------------------------------
  | ACTIONS
  |--------------------------------------------------------------------------
  */

  if (id === "pg_admin_overview") {
    await interaction.deferReply({
      ephemeral: true
    });

    await showOverview(interaction);
    return true;
  }

  if (id === "pg_admin_stock") {
    await interaction.deferReply({
      ephemeral: true
    });

    await showStock(interaction);
    return true;
  }

  if (id === "pg_admin_users") {
    await interaction.deferReply({
      ephemeral: true
    });

    await showUsers(interaction);
    return true;
  }

  if (id === "pg_admin_tickets") {
    await interaction.deferReply({
      ephemeral: true
    });

    await showTickets(interaction);
    return true;
  }

  if (id === "pg_admin_config") {
    await interaction.deferReply({
      ephemeral: true
    });

    await showConfig(interaction);
    return true;
  }

  if (id === "pg_admin_shop") {
    await interaction.deferReply({
      ephemeral: true
    });

    await showShop(interaction);
    return true;
  }

  if (id === "pg_admin_system") {
    await interaction.deferReply({
      ephemeral: true
    });

    await showSystem(interaction);
    return true;
  }

  if (id === "pg_admin_back") {
    await interaction.update(
      buildPanel(interaction.client)
    );

    return true;
  }

  if (id === "pg_admin_refresh") {
    await interaction.update(
      buildPanel(interaction.client)
    );

    return true;
  }

  if (id === "pg_admin_close") {
    await interaction.update({
      content:
        "🔒 **Panneau d'administration fermé.**",
      embeds: [],
      components: []
    });

    return true;
  }

  return true;
}

module.exports = {
  command,
  execute,
  handleInteraction,
  isAdmin,
  ADMIN_IDS
};
