const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");

/* =========================================================
   CONFIGURACIÓN
========================================================= */

const AUTHORIZED_ADMIN_ID = "1523717252988403873";

/*
 * API DE TU WEB
 *
 * Ejemplo:
 * API_BASE_URL=https://api.primegen.eu
 *
 * Si no la configuras, Overview sigue funcionando con
 * información real de Discord y Stocks/Tickets mostrarán
 * que la API no está configurada.
 */
const API_BASE_URL = (process.env.API_BASE_URL || "").replace(/\/+$/, "");

/*
 * Si tu API necesita una clave:
 *
 * API_ADMIN_KEY=PRIMEGEN_MASTER_SECRET_2026
 *
 * El bot la enviará como Bearer token.
 */
const API_ADMIN_KEY = process.env.API_ADMIN_KEY || "";


/* =========================================================
   COMANDO
========================================================= */

const command = new SlashCommandBuilder()
  .setName("announce")
  .setDescription("🛡️ Abrir el panel de administración")
  .setDMPermission(false);


/* =========================================================
   UTILIDADES
========================================================= */

function isAuthorized(interaction) {
  return interaction.user?.id === AUTHORIZED_ADMIN_ID;
}

function formatNumber(number) {
  return Number(number || 0).toLocaleString("es-ES");
}

function truncate(text, max = 1000) {
  if (!text) return "";
  text = String(text);

  if (text.length <= max) return text;

  return `${text.slice(0, max - 3)}...`;
}

function safeDate(date) {
  try {
    return new Date(date).toLocaleString("es-ES");
  } catch {
    return "Desconocida";
  }
}

function getTierEmoji(tier) {
  const value = String(tier || "").toLowerCase();

  if (value === "prime") return "👑";
  if (value === "premium") return "💎";
  if (value === "gold") return "🥇";
  if (value === "silver") return "🥈";
  if (value === "bronze") return "🥉";

  return "📦";
}


/* =========================================================
   API
========================================================= */

async function apiRequest(path, options = {}) {
  if (!API_BASE_URL) {
    return {
      ok: false,
      configured: false,
      data: null,
      error: "API_BASE_URL no está configurada.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const headers = {
      Accept: "application/json",
      ...(options.headers || {}),
    };

    if (API_ADMIN_KEY) {
      headers.Authorization = `Bearer ${API_ADMIN_KEY}`;
    }

    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const text = await response.text();

    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    return {
      ok: response.ok,
      configured: true,
      status: response.status,
      data,
      error: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      data: null,
      error:
        error.name === "AbortError"
          ? "La API tardó demasiado en responder."
          : error.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}


/* =========================================================
   EMBED BASE
========================================================= */

function createBaseEmbed(title, description = "") {
  return new EmbedBuilder()
    .setColor(0xff1744)
    .setTitle(title)
    .setDescription(description)
    .setFooter({
      text: "PrimeGen • Panel administrativo",
    })
    .setTimestamp();
}


/* =========================================================
   BOTONES PRINCIPALES
========================================================= */

function createMainButtons() {
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
        .setCustomId("admin_announce")
        .setLabel("Announce")
        .setEmoji("📢")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("admin_refresh")
        .setLabel("Actualizar")
        .setEmoji("🔄")
        .setStyle(ButtonStyle.Success)
    ),
  ];
}


/* =========================================================
   OVERVIEW
   INFORMACIÓN REAL DE DISCORD
========================================================= */

async function renderOverview(interaction) {
  const guild = interaction.guild;

  if (!guild) {
    return {
      embeds: [
        createBaseEmbed(
          "📊 Overview",
          "Este panel solo funciona dentro de un servidor."
        ),
      ],
      components: createMainButtons(),
    };
  }

  try {
    await guild.members.fetch();

    const members = guild.members.cache;

    const totalMembers = members.size;
    const humans = members.filter(
      member => !member.user.bot
    ).size;

    const bots = members.filter(
      member => member.user.bot
    ).size;

    const online = members.filter(
      member =>
        member.presence?.status &&
        member.presence.status !== "offline"
    ).size;

    const textChannels = guild.channels.cache.filter(
      channel => channel.type === ChannelType.GuildText
    ).size;

    const voiceChannels = guild.channels.cache.filter(
      channel => channel.type === ChannelType.GuildVoice
    ).size;

    const categories = guild.channels.cache.filter(
      channel => channel.type === ChannelType.GuildCategory
    ).size;

    const roles = guild.roles.cache.size - 1;

    const owner = await guild.fetchOwner().catch(() => null);

    const embed = createBaseEmbed(
      "📊 Panel de Administración",
      `Información real de **${guild.name}**`
    );

    embed.addFields(
      {
        name: "👥 Miembros",
        value:
          `**Total:** ${formatNumber(totalMembers)}\n` +
          `**Usuarios:** ${formatNumber(humans)}\n` +
          `**Bots:** ${formatNumber(bots)}\n` +
          `**Activos:** ${formatNumber(online)}`,
        inline: true,
      },
      {
        name: "📁 Canales",
        value:
          `**Texto:** ${formatNumber(textChannels)}\n` +
          `**Voz:** ${formatNumber(voiceChannels)}\n` +
          `**Categorías:** ${formatNumber(categories)}`,
        inline: true,
      },
      {
        name: "🛡️ Servidor",
        value:
          `**ID:** \`${guild.id}\`\n` +
          `**Owner:** ${owner ? `<@${owner.id}>` : "Desconocido"}\n` +
          `**Roles:** ${formatNumber(roles)}`,
        inline: true,
      },
      {
        name: "🤖 Bot",
        value:
          `**Estado:** 🟢 Online\n` +
          `**Ping:** ${interaction.client.ws.ping}ms`,
        inline: true,
      },
      {
        name: "🔐 Seguridad",
        value:
          `**Administrador:** <@${AUTHORIZED_ADMIN_ID}>\n` +
          `**Tu ID:** \`${interaction.user.id}\`\n` +
          `**Autorizado:** ✅`,
        inline: true,
      }
    );

    if (guild.iconURL()) {
      embed.setThumbnail(guild.iconURL({ size: 256 }));
    }

    return {
      embeds: [embed],
      components: createMainButtons(),
    };
  } catch (error) {
    console.error("Overview error:", error);

    return {
      embeds: [
        createBaseEmbed(
          "❌ Error",
          "No se pudo obtener la información del servidor."
        ),
      ],
      components: createMainButtons(),
    };
  }
}


/* =========================================================
   STOCKS
   DATOS REALES DE LA API
========================================================= */

async function renderStocks(interaction) {
  const result = await apiRequest("/api-bot/services/stock");

  if (!result.ok) {
    const reason = result.configured
      ? result.error
      : "Configura API_BASE_URL en el .env.";

    return {
      embeds: [
        createBaseEmbed(
          "📦 Stocks",
          `No puedo mostrar stocks falsos. La fuente de datos real no está disponible.\n\n**Motivo:** ${reason}`
        ),
      ],
      components: createMainButtons(),
    };
  }

  const services = Array.isArray(result.data)
    ? result.data
    : Array.isArray(result.data?.services)
      ? result.data.services
      : [];

  const totalStock = services.reduce(
    (sum, service) => sum + Number(service.stock || 0),
    0
  );

  const activeServices = services.filter(
    service => Number(service.stock || 0) > 0
  ).length;

  const embed = createBaseEmbed(
    "📦 Stocks",
    `Información obtenida directamente de la API.\n\n` +
    `**Servicios:** ${formatNumber(services.length)}\n` +
    `**Servicios activos:** ${formatNumber(activeServices)}\n` +
    `**Stock total:** ${formatNumber(totalStock)}`
  );

  if (services.length === 0) {
    embed.addFields({
      name: "Información",
      value: "No hay servicios disponibles.",
    });
  } else {
    const lines = services
      .slice(0, 15)
      .map(service => {
        const stock = Number(service.stock || 0);
        const status = stock > 0 ? "🟢" : "🔴";

        return (
          `${status} ${getTierEmoji(service.tier)} ` +
          `**${truncate(service.label || service.id || "Servicio", 35)}** — ` +
          `\`${formatNumber(stock)}\``
        );
      });

    embed.addFields({
      name: "Servicios",
      value: lines.join("\n"),
    });

    if (services.length > 15) {
      embed.addFields({
        name: "Más servicios",
        value: `Hay ${formatNumber(services.length - 15)} servicios adicionales.`,
      });
    }
  }

  return {
    embeds: [embed],
    components: createMainButtons(),
  };
}


/* =========================================================
   USERS
   INFORMACIÓN REAL DEL LEADERBOARD
========================================================= */

async function renderUsers(interaction) {
  const result = await apiRequest("/api-bot/leaderboard");

  if (!result.ok) {
    return {
      embeds: [
        createBaseEmbed(
          "👥 Usuarios",
          `No se pudo consultar el leaderboard real.\n\n**Motivo:** ${
            result.configured
              ? result.error
              : "API_BASE_URL no configurada."
          }`
        ),
      ],
      components: createMainButtons(),
    };
  }

  const users = Array.isArray(result.data)
    ? result.data
    : Array.isArray(result.data?.users)
      ? result.data.users
      : [];

  const embed = createBaseEmbed(
    "👥 Usuarios",
    `Leaderboard real obtenido desde la API.\n\n` +
    `**Usuarios registrados en leaderboard:** ${formatNumber(users.length)}`
  );

  if (!users.length) {
    embed.addFields({
      name: "Resultado",
      value: "No hay usuarios en el leaderboard.",
    });
  } else {
    const lines = users.slice(0, 15).map((user, index) => {
      const name =
        user.username ||
        user.name ||
        user.userId ||
        "Usuario desconocido";

      const generated =
        user.total_combos_generated ??
        user.generations ??
        user.total ??
        0;

      return (
        `**#${index + 1}** ` +
        `${truncate(name, 30)} — ` +
        `\`${formatNumber(generated)}\` generaciones`
      );
    });

    embed.addFields({
      name: "🏆 Ranking",
      value: lines.join("\n"),
    });
  }

  return {
    embeds: [embed],
    components: createMainButtons(),
  };
}


/* =========================================================
   TICKETS
   DATOS REALES
========================================================= */

async function renderTickets(interaction) {
  const result = await apiRequest("/api-bot/admin/tickets");

  if (!result.ok) {
    return {
      embeds: [
        createBaseEmbed(
          "🎫 Tickets",
          `No se pudieron obtener los tickets reales.\n\n**Motivo:** ${
            result.configured
              ? result.error
              : "API_BASE_URL no configurada."
          }`
        ),
      ],
      components: createMainButtons(),
    };
  }

  const tickets = Array.isArray(result.data)
    ? result.data
    : Array.isArray(result.data?.tickets)
      ? result.data.tickets
      : [];

  const open = tickets.filter(
    ticket => String(ticket.status).toLowerCase() === "open"
  ).length;

  const closed = tickets.filter(
    ticket => String(ticket.status).toLowerCase() === "closed"
  ).length;

  const embed = createBaseEmbed(
    "🎫 Tickets",
    `Información real del sistema de soporte.\n\n` +
    `**Total:** ${formatNumber(tickets.length)}\n` +
    `**Abiertos:** ${formatNumber(open)}\n` +
    `**Cerrados:** ${formatNumber(closed)}`
  );

  if (!tickets.length) {
    embed.addFields({
      name: "Tickets",
      value: "No existen tickets.",
    });
  } else {
    const lines = tickets.slice(0, 10).map(ticket => {
      const status =
        String(ticket.status).toLowerCase() === "open"
          ? "🟢"
          : "⚪";

      return (
        `${status} **${truncate(
          ticket.subject || "Ticket",
          35
        )}**\n` +
        `Usuario: \`${ticket.userId || "N/A"}\`\n` +
        `Creado: ${safeDate(ticket.createdAt)}`
      );
    });

    embed.addFields({
      name: "Últimos tickets",
      value: lines.join("\n\n"),
    });
  }

  return {
    embeds: [embed],
    components: createMainButtons(),
  };
}


/* =========================================================
   CONFIGURACIÓN
========================================================= */

async function renderConfig(interaction) {
  const guild = interaction.guild;

  const embed = createBaseEmbed(
    "⚙️ Configuration",
    "Configuración y estado del sistema."
  );

  embed.addFields(
    {
      name: "🔐 Administrador autorizado",
      value:
        `<@${AUTHORIZED_ADMIN_ID}>\n` +
        `ID: \`${AUTHORIZED_ADMIN_ID}\``,
      inline: true,
    },
    {
      name: "🌐 API",
      value: API_BASE_URL
        ? `🟢 Configurada\n\`${API_BASE_URL}\``
        : "🔴 No configurada",
      inline: true,
    },
    {
      name: "🤖 Discord",
      value:
        `Guild: \`${guild?.id || "N/A"}\`\n` +
        `Ping: \`${interaction.client.ws.ping}ms\``,
      inline: true,
    },
    {
      name: "🛡️ Permisos",
      value:
        "Acceso controlado mediante ID de Discord.\n" +
        "No depende únicamente del permiso Administrator.",
    }
  );

  return {
    embeds: [embed],
    components: createMainButtons(),
  };
}


/* =========================================================
   ANNOUNCEMENT MODAL
========================================================= */

async function showAnnouncementModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("admin_announcement_modal")
    .setTitle("📢 Crear anuncio");

  const titleEn = new TextInputBuilder()
    .setCustomId("announce_title_en")
    .setLabel("Título en inglés")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("New Update!")
    .setRequired(true)
    .setMaxLength(100);

  const descEn = new TextInputBuilder()
    .setCustomId("announce_desc_en")
    .setLabel("Descripción en inglés")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Write the announcement...")
    .setRequired(true)
    .setMaxLength(1500);

  const titleFr = new TextInputBuilder()
    .setCustomId("announce_title_fr")
    .setLabel("Titre en français")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Nouvelle mise à jour !")
    .setRequired(true)
    .setMaxLength(100);

  const descFr = new TextInputBuilder()
    .setCustomId("announce_desc_fr")
    .setLabel("Description en français")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Écrivez votre annonce...")
    .setRequired(true)
    .setMaxLength(1500);

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleEn),
    new ActionRowBuilder().addComponents(descEn),
    new ActionRowBuilder().addComponents(titleFr),
    new ActionRowBuilder().addComponents(descFr)
  );

  await interaction.showModal(modal);
}


/* =========================================================
   PUBLICAR ANUNCIO
========================================================= */

async function processAnnouncement(interaction) {
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

  const embed = new EmbedBuilder()
    .setColor(0xff1744)
    .setTitle("📢 Announcement")
    .setDescription(
      `## 🇬🇧 ${titleEn}\n` +
      `${descEn}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `## 🇫🇷 ${titleFr}\n` +
      `${descFr}`
    )
    .setFooter({
      text: `Publié par ${interaction.user.username}`,
    })
    .setTimestamp();

  /*
   * Por seguridad el bot NO publica automáticamente en un canal
   * desconocido. Te pide elegir un canal.
   */

  const channels = interaction.guild.channels.cache
    .filter(
      channel =>
        channel.type === ChannelType.GuildText &&
        channel
          .permissionsFor(interaction.guild.members.me)
          ?.has(PermissionsBitField.Flags.SendMessages)
    )
    .first(25);

  if (!channels.size) {
    return interaction.reply({
      content:
        "❌ No encuentro ningún canal de texto donde pueda publicar.",
      ephemeral: true,
    });
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId("admin_announce_channel")
    .setPlaceholder("Selecciona dónde publicar el anuncio")
    .addOptions(
      channels.map(channel => ({
        label: truncate(channel.name, 100),
        value: channel.id,
        description: `#${channel.name}`,
      }))
    );

  /*
   * Guardamos temporalmente el anuncio en memoria.
   * Se asocia al usuario para impedir que otra persona
   * aproveche el selector.
   */
  pendingAnnouncements.set(interaction.user.id, {
    embed,
    createdAt: Date.now(),
  });

  return interaction.reply({
    content: "📢 Selecciona el canal donde quieres publicar:",
    components: [
      new ActionRowBuilder().addComponents(menu),
    ],
    ephemeral: true,
  });
}


/* =========================================================
   ALMACENAMIENTO TEMPORAL
========================================================= */

const pendingAnnouncements = new Map();


/* =========================================================
   PUBLICAR EN CANAL
========================================================= */

async function publishAnnouncement(interaction) {
  const pending = pendingAnnouncements.get(interaction.user.id);

  if (!pending) {
    return interaction.update({
      content:
        "❌ Este anuncio ya expiró. Crea uno nuevo.",
      embeds: [],
      components: [],
    });
  }

  /*
   * Expiración de seguridad.
   */
  if (Date.now() - pending.createdAt > 5 * 60 * 1000) {
    pendingAnnouncements.delete(interaction.user.id);

    return interaction.update({
      content:
        "❌ El anuncio expiró. Crea uno nuevo.",
      embeds: [],
      components: [],
    });
  }

  const channelId = interaction.values[0];

  const channel = interaction.guild.channels.cache.get(
    channelId
  );

  if (!channel || channel.type !== ChannelType.GuildText) {
    return interaction.update({
      content: "❌ Canal inválido.",
      embeds: [],
      components: [],
    });
  }

  const permissions = channel.permissionsFor(
    interaction.guild.members.me
  );

  if (
    !permissions?.has(
      PermissionsBitField.Flags.SendMessages
    )
  ) {
    return interaction.update({
      content:
        "❌ El bot no tiene permiso para enviar mensajes en ese canal.",
      embeds: [],
      components: [],
    });
  }

  try {
    await channel.send({
      embeds: [pending.embed],
    });

    pendingAnnouncements.delete(interaction.user.id);

    await interaction.update({
      content:
        `✅ Anuncio publicado correctamente en ${channel}.`,
      embeds: [],
      components: [],
    });
  } catch (error) {
    console.error("Announcement publish error:", error);

    await interaction.update({
      content:
        "❌ No se pudo publicar el anuncio.",
      embeds: [],
      components: [],
    });
  }
}


/* =========================================================
   MANEJADOR PRINCIPAL
========================================================= */

async function execute(interaction) {
  /*
   * PRIMERA BARRERA DE SEGURIDAD.
   *
   * Solamente esta ID puede utilizar /announce.
   */
  if (!isAuthorized(interaction)) {
    return interaction.reply({
      content:
        "🚫 **No eres administrador.**\n\n" +
        "No tienes autorización para utilizar este panel.",
      ephemeral: true,
    });
  }

  /*
   * Evita el famoso:
   *
   * "Application did not respond"
   *
   * porque Discord tiene un límite de respuesta.
   */
  await interaction.deferReply({
    ephemeral: true,
  });

  const panel = await renderOverview(interaction);

  return interaction.editReply(panel);
}


/* =========================================================
   MANEJADOR DE INTERACCIONES DEL PANEL
========================================================= */

async function handleInteraction(interaction) {
  /*
   * Solo procesamos interacciones del panel.
   */
  const id = interaction.customId || "";

  if (
    !id.startsWith("admin_")
  ) {
    return false;
  }

  /*
   * SEGUNDA BARRERA DE SEGURIDAD.
   *
   * Aunque alguien copie un customId o intente interactuar
   * manualmente, sigue necesitando la ID autorizada.
   */
  if (!isAuthorized(interaction)) {
    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          content: "🚫 No eres administrador.",
          ephemeral: true,
        }).catch(() => {});
      } else {
        await interaction.reply({
          content: "🚫 No eres administrador.",
          ephemeral: true,
        }).catch(() => {});
      }
    }

    return true;
  }

  try {
    /* ===============================================
       BOTONES
    =============================================== */

    if (interaction.isButton()) {
      if (id === "admin_announce") {
        await showAnnouncementModal(interaction);
        return true;
      }

      await interaction.deferUpdate();

      let panel;

      switch (id) {
        case "admin_overview":
          panel = await renderOverview(interaction);
          break;

        case "admin_stocks":
          panel = await renderStocks(interaction);
          break;

        case "admin_users":
          panel = await renderUsers(interaction);
          break;

        case "admin_tickets":
          panel = await renderTickets(interaction);
          break;

        case "admin_config":
          panel = await renderConfig(interaction);
          break;

        case "admin_refresh":
          panel = await renderOverview(interaction);
          break;

        default:
          panel = await renderOverview(interaction);
          break;
      }

      await interaction.editReply(panel);

      return true;
    }


    /* ===============================================
       MODAL
    =============================================== */

    if (interaction.isModalSubmit()) {
      if (id === "admin_announcement_modal") {
        await processAnnouncement(interaction);
        return true;
      }
    }


    /* ===============================================
       SELECT MENU
    =============================================== */

    if (interaction.isStringSelectMenu()) {
      if (id === "admin_announce_channel") {
        await publishAnnouncement(interaction);
        return true;
      }
    }

    return false;

  } catch (error) {
    console.error(
      "ADMIN PANEL INTERACTION ERROR:",
      error
    );

    try {
      if (interaction.deferred) {
        await interaction.editReply({
          content:
            "❌ Se produjo un error interno en el panel.",
          embeds: [],
          components: [],
        });
      } else if (interaction.replied) {
        await interaction.followUp({
          content:
            "❌ Se produjo un error interno en el panel.",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content:
            "❌ Se produjo un error interno en el panel.",
          ephemeral: true,
        });
      }
    } catch {}

    return true;
  }
}


/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  command,
  execute,
  handleInteraction,
};
