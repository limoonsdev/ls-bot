const express = require('express');
const cors = require('cors');
const { getLogger } = require('../utils/logger');
const { getAllServices, getServiceById } = require('../config/services');
const { query } = require('../database/hybridPool');
const { addUserHistory, getUserHistory, getOrCreateUser, updateUserStats } = require('../database/models');

const logger = getLogger();

function startApiServer(client, port) {
  const app = express();
  const PORT = port || process.env.API_PORT || 3001;
  const MAIN_GUILD_ID = '1532343959722917979';

  // Rate limit map for /api/generate: userId -> { lastGen: timestamp, count: number, resetAt: timestamp }
  const genRateLimit = new Map();
  const GEN_COOLDOWN_MS = 30000; // 30 seconds between generations per user
  const GEN_MAX_PER_HOUR = 15;   // Max 15 generations per hour per user

  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.use(express.json());

  // Middleware: attach discord client + request logging (only POST/PUT/DELETE to reduce spam)
  app.use((req, res, next) => {
    req.client = client;
    if (req.method !== 'GET') {
      logger.info('API', `${req.method} ${req.path}`);
    }
    next();
  });

  // =====================================================
  // GLOBAL SECURITY (API KEY)
  // =====================================================
  app.use('/api', (req, res, next) => {
    if (req.path === '/api/health') return next(); // allow health check

    const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
    if (apiKey !== (process.env.API_KEY || 'PRIMEGEN_MASTER_SECRET_2026')) {
      logger.warn('API', `Unauthorized access attempt to ${req.path}`);
      return res.status(403).json({ error: 'Unauthorized: Invalid API Key' });
    }
    next();
  });

  // Get patchnotes from Discord channel
  app.get('/api/patchnotes', async (req, res) => {
    try {
      const guild = client.guilds.cache.get(MAIN_GUILD_ID);
      if (!guild) return res.json([]);
      const channel = guild.channels.cache.find(c => c.name.toLowerCase().includes('patchnote'));
      if (!channel) return res.json([]);
      
      const messages = await channel.messages.fetch({ limit: 10 });
      const notes = messages.map(m => ({
        id: m.id,
        content: m.content,
        timestamp: m.createdTimestamp,
        authorName: m.author.username,
        authorAvatar: m.author.displayAvatarURL()
      }));
      res.json(notes);
    } catch(err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Post an Avis (Review) to Discord channel
  app.post('/api/avis', async (req, res) => {
    const { note, commentaire, userId } = req.body;
    if (!note || !commentaire) return res.status(400).json({ error: "Missing fields" });
    
    try {
      const guild = client.guilds.cache.get(MAIN_GUILD_ID);
      if (!guild) return res.status(500).json({ error: "Unknown Guild" });
      const channel = guild.channels.cache.find(c => c.name.toLowerCase().includes('avis'));
      if (!channel) return res.status(500).json({ error: "Avis channel not found" });

      const webhooks = await channel.fetchWebhooks();
      let webhook = webhooks.find(wh => wh.token);
      if (!webhook) {
        webhook = await channel.createWebhook({
          name: 'PrimeGen Avis',
          avatar: client.user.displayAvatarURL(),
        });
      }

      let authorName = "Web User";
      let authorAvatar = client.user.displayAvatarURL();
      
      if (userId) {
        try {
          const user = await client.users.fetch(userId);
          if (user) {
            authorName = user.username;
            authorAvatar = user.displayAvatarURL({ dynamic: true, size: 256 });
          }
        } catch(e) {}
      }

      const stars = '⭐'.repeat(note) + '☆'.repeat(5 - note);
      await webhook.send({
        content: `**Note :** ${stars}\n\n${commentaire}`,
        username: authorName,
        avatarURL: authorAvatar
      });

      res.json({ success: true });
    } catch(err) {
      res.status(500).json({ error: err.message });
    }
  });

  // =====================================================
  // ADMIN SECURITY (STAFF CHECK)
  // =====================================================
  app.use('/api/admin', async (req, res, next) => {
    try {
      const { getOrCreateGuildConfig } = require('../database/models');
      const config = await getOrCreateGuildConfig(MAIN_GUILD_ID);
      const staffIds = config.config_data?.staff_ids || ["1178305844698435625", "1532343959722917979"];
      
      const userId = req.headers['x-user-id'];
      if (!userId || !staffIds.includes(userId)) {
        logger.warn('API', `Forbidden Admin Access attempt by ${userId} to ${req.path}`);
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }
      next();
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // =====================================================
  // HEALTH & STATS
  // =====================================================

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', bot: req.client.user?.tag, uptime: process.uptime() });
  });

  // Global stats for landing page
  app.get('/api/stats', async (req, res) => {
    try {
      const guild = await req.client.guilds.fetch(MAIN_GUILD_ID).catch(() => null);
      const memberCount = guild?.memberCount || 0;

      const services = getAllServices();

      const genResult = await query('SELECT COUNT(*) as count FROM user_history WHERE action = $1', ['GENERATION']).catch(() => ({ rows: [{ count: 0 }] }));
      const totalGenerated = parseInt(genResult.rows[0]?.count || 0);

      res.json({
        users: memberCount.toLocaleString(),
        services: services.length.toString(),
        generated: totalGenerated.toLocaleString()
      });
    } catch (err) {
      logger.error('API', `Stats error: ${err.message}`);
      res.json({ users: '2,400+', services: '40', generated: '50,000+' });
    }
  });

  // =====================================================
  // AUTH
  // =====================================================

  const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '111111111111111111';
  const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/callback';

  app.get('/api/auth/login', (req, res) => {
    const authUrl = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&scope=identify`;
    res.redirect(authUrl);
  });

  // =====================================================
  // SERVICES & STOCK
  // =====================================================

  app.get('/api/services', (req, res) => {
    res.json(getAllServices());
  });

  // Services with real-time stock count
  app.get('/api/services/stock', async (req, res) => {
    try {
      const services = getAllServices();
      const stockPromises = services.map(async (service) => {
        const result = await query('SELECT COUNT(*) as count FROM combos WHERE service_id = $1', [service.id]).catch(() => ({ rows: [{ count: 0 }] }));
        return {
          ...service,
          stock: parseInt(result.rows[0]?.count || 0)
        };
      });

      const servicesWithStock = await Promise.all(stockPromises);
      res.json(servicesWithStock);
    } catch (err) {
      logger.error('API', `Services stock error: ${err.message}`);
      res.status(500).json({ error: 'Failed to fetch stock' });
    }
  });

  // =====================================================
  // USER
  // =====================================================

  app.get('/api/user/:id', async (req, res) => {
    try {
      const guild = await req.client.guilds.fetch(MAIN_GUILD_ID);
      const member = await guild.members.fetch(req.params.id).catch(() => null);
      if (!member) return res.status(404).json({ error: 'User not found in main guild' });

      const roles = member.roles.cache.map(r => r.id);
      res.json({
        id: member.id,
        tag: member.user.tag,
        username: member.user.username,
        avatar: member.user.displayAvatarURL({ size: 64 }),
        roles
      });
    } catch (err) {
      logger.error('API', `User fetch error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  // =====================================================
  // GENERATE (with rate limiting)
  // =====================================================

  app.post('/api/generate', async (req, res) => {
    // ── SECURITY: Require API Key ──
    const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
    if (apiKey !== (process.env.API_KEY || 'PRIMEGEN_MASTER_SECRET_2026')) {
      return res.status(403).json({ error: 'Unauthorized: Invalid API Key' });
    }

    const { userId, serviceId } = req.body || {};
    if (!userId || !serviceId) {
      return res.status(400).json({ error: 'Missing userId or serviceId' });
    }

    // ── RATE LIMIT CHECK ──
    const now = Date.now();
    let userRL = genRateLimit.get(userId);
    if (!userRL) {
      userRL = { lastGen: 0, count: 0, resetAt: now + 3600000 };
      genRateLimit.set(userId, userRL);
    }

    // Reset hourly counter
    if (now > userRL.resetAt) {
      userRL.count = 0;
      userRL.resetAt = now + 3600000;
    }

    // Check cooldown (30s between each gen)
    const timeSinceLast = now - userRL.lastGen;
    if (timeSinceLast < GEN_COOLDOWN_MS) {
      const waitSec = Math.ceil((GEN_COOLDOWN_MS - timeSinceLast) / 1000);
      logger.warn('API', `Rate limited ${userId} - cooldown (${waitSec}s remaining)`);
      return res.status(429).json({ error: `Cooldown: please wait ${waitSec} seconds` });
    }

    // Check hourly limit
    if (userRL.count >= GEN_MAX_PER_HOUR) {
      logger.warn('API', `Rate limited ${userId} - hourly limit reached (${GEN_MAX_PER_HOUR})`);
      return res.status(429).json({ error: `Hourly limit reached (${GEN_MAX_PER_HOUR} per hour). Try again later.` });
    }

    try {
      const guild = await req.client.guilds.fetch(MAIN_GUILD_ID);
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) return res.status(403).json({ error: 'User must be in the Discord server' });

      const service = getServiceById(serviceId);
      if (!service) return res.status(400).json({ error: 'Invalid service' });

      // Check roles
      const hasFree = member.roles.cache.has('1532347064623698010');
      const hasPremium = member.roles.cache.has('1532346926425444474');
      const customStatus = member.presence?.activities?.find(a => a.type === 4);
      const hasVanity = customStatus && customStatus.state && customStatus.state.toLowerCase().includes('.gg/primegen');

      if (!hasVanity && !hasFree && !hasPremium) {
        return res.status(403).json({ error: 'Access Denied: Missing role or .gg/primegen in status' });
      }

      const tier = service.tier;

      if ((tier === 'premium' || tier === 'prime') && !hasPremium) {
        return res.status(403).json({ error: 'Requires VIP role' });
      }

      // Retrieve account
      const comboResult = await query(
        'SELECT id, combo FROM combos WHERE service_id = $1 ORDER BY id ASC LIMIT 1',
        [serviceId]
      );

      if (!comboResult.rows.length) return res.status(400).json({ error: 'Out of stock' });
      const account = comboResult.rows[0];

      await query('DELETE FROM combos WHERE id = $1', [account.id]);

      // ── UPDATE RATE LIMIT after successful generation ──
      userRL.lastGen = now;
      userRL.count += 1;
      genRateLimit.set(userId, userRL);

      // Save history
      await addUserHistory(userId, serviceId, 'GENERATION', {
        combo: account.combo,
        tier,
        serviceLabel: service.label,
        accountInfo: null
      });

      // Update user stats
      await getOrCreateUser(userId, member.user.username);
      await updateUserStats(userId, 0, 1);

      // Log in discord
      try {
        const { sendGenLog } = require('../utils/discordLogger');
        await sendGenLog(guild, member.user, service, account.combo, tier);
      } catch (logErr) {
        logger.warn('API', `Discord log failed (non-critical): ${logErr.message}`);
      }

      logger.info('API', `Generation success: ${member.user.tag} -> ${service.label} (${userRL.count}/${GEN_MAX_PER_HOUR} this hour)`);

      res.json({
        success: true,
        service: service.label,
        combo: account.combo,
        accountInfo: null
      });

    } catch (err) {
      logger.error('API', `Generation error: ${err.message}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // =====================================================
  // LEADERBOARD
  // =====================================================

  app.get('/api/leaderboard', async (req, res) => {
    try {
      const result = await query(
        `SELECT user_id, username, total_combos_generated, last_activity
         FROM users
         WHERE total_combos_generated > 0
         ORDER BY total_combos_generated DESC
         LIMIT 50`
      );

      // Enrich with Discord avatars
      const guild = await req.client.guilds.fetch(MAIN_GUILD_ID).catch(() => null);
      const enriched = await Promise.all(
        result.rows.map(async (row) => {
          let avatar = null;
          let displayName = row.username || 'Unknown';
          if (req.client) {
            try {
              const user = await req.client.users.fetch(row.user_id);
              avatar = user.displayAvatarURL({ size: 64 });
              displayName = user.username;
            } catch (e) { /* user may not exist */ }
          }
          return {
            userId: row.user_id,
            username: displayName,
            avatar,
            generations: parseInt(row.total_combos_generated),
            lastActive: row.last_activity
          };
        })
      );

      res.json(enriched);
    } catch (err) {
      logger.error('API', `Leaderboard error: ${err.message}`);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });

  // =====================================================
  // HISTORY
  // =====================================================

  app.get('/api/history/:userId', async (req, res) => {
    // ── SECURITY: Require API Key ──
    const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
    if (apiKey !== (process.env.API_KEY || 'PRIMEGEN_MASTER_SECRET_2026')) {
      return res.status(403).json({ error: 'Unauthorized: Invalid API Key' });
    }

    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit) || 100;
      const serviceFilter = req.query.service || null;
      const tierFilter = req.query.tier || null;

      let sql = `SELECT * FROM user_history WHERE user_id = $1 AND action = 'GENERATION'`;
      const params = [userId];
      let paramIdx = 2;

      if (serviceFilter) {
        sql += ` AND service_id = $${paramIdx}`;
        params.push(serviceFilter);
        paramIdx++;
      }

      sql += ` ORDER BY created_at DESC LIMIT $${paramIdx}`;
      params.push(limit);

      const result = await query(sql, params);

      // Parse details and optionally filter by tier
      let history = result.rows.map(row => {
        const details = typeof row.details === 'string' ? JSON.parse(row.details) : (row.details || {});
        return {
          id: row.id,
          serviceId: row.service_id,
          serviceLabel: details.serviceLabel || row.service_id,
          tier: details.tier || 'free',
          combo: details.combo || '***',
          date: row.created_at,
        };
      });

      if (tierFilter) {
        history = history.filter(h => h.tier === tierFilter);
      }

      res.json(history);
    } catch (err) {
      logger.error('API', `History error: ${err.message}`);
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  });

  // =====================================================
  // TOOLS
  // =====================================================

  app.post('/api/tools/:id', async (req, res) => {
    const { id } = req.params;
    const { userId, input } = req.body || {};

    try {
      const guild = await req.client.guilds.fetch(MAIN_GUILD_ID);
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member || !member.roles.cache.has('1532346926425444474')) {
        return res.status(403).json({ error: 'Requires VIP role' });
      }

      if (id === 'discord_token') {
        let extractedUserId = 'Unknown';
        try { extractedUserId = Buffer.from(input.split('.')[0], 'base64').toString(); } catch(e){}
        return res.json({ result: `Token extracted User ID: ${extractedUserId}` });
      } else if (id === 'discord_age') {
        try {
          const timestamp = Number((BigInt(input) >> 22n) + 1420070400000n);
          const date = new Date(timestamp);
          return res.json({ result: `Created At: ${date.toUTCString()}` });
        } catch(e) { return res.status(400).json({ error: 'Invalid ID' }); }
      } else if (id === 'tempmail') {
        const email = `${Math.random().toString(36).substring(2, 12)}@1secmail.com`;
        return res.json({ result: email, link: `https://www.1secmail.com/mailbox/?email=${email}` });
      }

      return res.status(400).json({ error: 'Unknown tool' });
    } catch(err) {
      logger.error('API', `Tool error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  // =====================================================
  // TICKETS
  // =====================================================

  // Create ticket
  app.post('/api/tickets', async (req, res) => {
    // ── SECURITY: Require API Key ──
    const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
    if (apiKey !== (process.env.API_KEY || 'PRIMEGEN_MASTER_SECRET_2026')) {
      return res.status(403).json({ error: 'Unauthorized: Invalid API Key' });
    }

    const { userId, username, subject, message, category } = req.body || {};
    if (!userId || !subject || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const guild = await req.client.guilds.fetch(MAIN_GUILD_ID);

      const category_channel = guild.channels.cache.find(c => c.name.toLowerCase().includes('ticket') && c.type === 4);
      const ticketChannel = await guild.channels.create({
        name: `web-${username || 'user'}-${Date.now().toString(36)}`,
        type: 0,
        parent: category_channel?.id,
        topic: `Web Ticket | User: ${username} (${userId}) | Category: ${category || 'General'}`
      });

      await ticketChannel.send({
        content: `**🎫 New Web Ticket**\n**From:** ${username} (${userId})\n**Category:** ${category || 'General'}\n**Subject:** ${subject}\n\n**Message:**\n${message}\n\n_Reply in this channel to respond to the user on the web dashboard._`
      });

      // Save ticket to DB
      try {
        await query(
          `INSERT INTO tickets (user_id, channel_id, subject, category, status) VALUES ($1, $2, $3, $4, 'open')`,
          [userId, ticketChannel.id, subject, category || 'General']
        );
      } catch (dbErr) {
        logger.warn('API', `Ticket DB save failed (non-critical): ${dbErr.message}`);
      }

      logger.info('API', `Ticket created: ${ticketChannel.name} by ${username}`);
      res.json({ success: true, channelId: ticketChannel.id });
    } catch(err) {
      logger.error('API', `Ticket creation error: ${err.message}`);
      res.status(500).json({ error: 'Failed to create ticket' });
    }
  });

  // List user tickets
  app.get('/api/tickets/:userId', async (req, res) => {
    // ── SECURITY: Require API Key ──
    const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
    if (apiKey !== (process.env.API_KEY || 'PRIMEGEN_MASTER_SECRET_2026')) {
      return res.status(403).json({ error: 'Unauthorized: Invalid API Key' });
    }

    try {
      const { userId } = req.params;

      const result = await query(
        `SELECT * FROM tickets WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      );

      // Enrich with last message from Discord
      const guild = await req.client.guilds.fetch(MAIN_GUILD_ID).catch(() => null);
      const tickets = await Promise.all(
        result.rows.map(async (ticket) => {
          let lastMessage = null;
          if (guild) {
            try {
              const channel = await guild.channels.fetch(ticket.channel_id);
              const messages = await channel.messages.fetch({ limit: 1 });
              const msg = messages.first();
              if (msg) {
                lastMessage = {
                  content: msg.content.substring(0, 100),
                  author: msg.author.username,
                  timestamp: msg.createdAt
                };
              }
            } catch (e) { /* channel may be deleted */ }
          }
          return {
            id: ticket.id,
            channelId: ticket.channel_id,
            subject: ticket.subject,
            category: ticket.category || 'General',
            status: ticket.status,
            createdAt: ticket.created_at,
            closedAt: ticket.closed_at,
            lastMessage
          };
        })
      );

      res.json(tickets);
    } catch (err) {
      logger.error('API', `Tickets list error: ${err.message}`);
      res.status(500).json({ error: 'Failed to fetch tickets' });
    }
  });

  // Get ticket messages (read Discord channel messages)
  app.get('/api/tickets/:userId/:channelId', async (req, res) => {
    // ── SECURITY: Require API Key ──
    const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
    if (apiKey !== (process.env.API_KEY || 'PRIMEGEN_MASTER_SECRET_2026')) {
      return res.status(403).json({ error: 'Unauthorized: Invalid API Key' });
    }

    try {
      const { channelId } = req.params;
      const guild = await req.client.guilds.fetch(MAIN_GUILD_ID);
      const channel = await guild.channels.fetch(channelId);

      if (!channel) return res.status(404).json({ error: 'Ticket channel not found' });

      const messages = await channel.messages.fetch({ limit: 50 });
      const formatted = messages
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
        .map(msg => ({
          id: msg.id,
          content: msg.content,
          author: msg.author.username,
          authorId: msg.author.id,
          isBot: msg.author.bot,
          isStaff: !msg.content.startsWith('[WEB]') && !msg.author.bot,
          avatar: msg.author.displayAvatarURL({ size: 32 }),
          timestamp: msg.createdAt
        }));

      res.json(formatted);
    } catch (err) {
      logger.error('API', `Ticket messages error: ${err.message}`);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  // Reply to ticket from web
  app.post('/api/tickets/:channelId/reply', async (req, res) => {
    const { channelId } = req.params;
    const { userId, username, message } = req.body || {};

    if (!message) return res.status(400).json({ error: 'Message is required' });

    try {
      const guild = await req.client.guilds.fetch(MAIN_GUILD_ID);
      const channel = await guild.channels.fetch(channelId);

      if (!channel) return res.status(404).json({ error: 'Ticket channel not found' });

      await channel.send({
        content: `[WEB] **${username || 'User'}:** ${message}`
      });

      logger.info('API', `Web reply sent to ticket ${channelId} by ${username}`);
      res.json({ success: true });
    } catch (err) {
      logger.error('API', `Ticket reply error: ${err.message}`);
      res.status(500).json({ error: 'Failed to send reply' });
    }
  });

  // Close ticket
  app.post('/api/tickets/:channelId/close', async (req, res) => {
    const { channelId } = req.params;

    try {
      await query(
        `UPDATE tickets SET status = 'closed', closed_at = CURRENT_TIMESTAMP WHERE channel_id = $1`,
        [channelId]
      );

      const guild = await req.client.guilds.fetch(MAIN_GUILD_ID);
      const channel = await guild.channels.fetch(channelId).catch(() => null);
      if (channel) {
        await channel.send({ content: '🔒 **This ticket has been closed from the web dashboard.**' });
      }

      logger.info('API', `Ticket ${channelId} closed`);
      res.json({ success: true });
    } catch (err) {
      logger.error('API', `Ticket close error: ${err.message}`);
      res.status(500).json({ error: 'Failed to close ticket' });
    }
  });

  // =====================================================
  // MAINTENANCE & ADMIN
  // =====================================================

  app.get('/api/admin/maintenance', async (req, res) => {
    try {
      const { getOrCreateGuildConfig } = require('../database/models');
      const config = await getOrCreateGuildConfig(MAIN_GUILD_ID);
      const maintenance = config.config_data?.maintenance || false;
      const maintenanceMsg = config.config_data?.maintenanceMsg || 'Le site est actuellement en maintenance pour une mise à jour globale. Revenez plus tard.';
      res.json({ maintenance, message: maintenanceMsg });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/maintenance', async (req, res) => {
    const { maintenance, message } = req.body || {};
    try {
      const { updateGuildConfig } = require('../database/models');
      await updateGuildConfig(MAIN_GUILD_ID, { maintenance, maintenanceMsg: message });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/staff', async (req, res) => {
    try {
      const { getOrCreateGuildConfig } = require('../database/models');
      const config = await getOrCreateGuildConfig(MAIN_GUILD_ID);
      const staffIds = config.config_data?.staff_ids || ["1178305844698435625"];
      res.json(staffIds);
    } catch(err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get all tickets for admin
  app.get('/api/admin/tickets', async (req, res) => {
    try {
      const { query } = require('../database/hybridPool');
      const result = await query(
        `SELECT * FROM tickets ORDER BY CASE WHEN status = 'open' THEN 0 ELSE 1 END, created_at DESC LIMIT 100`
      );
      const guild = client.guilds.cache.get(MAIN_GUILD_ID);
      const tickets = await Promise.all(
        result.rows.map(async (ticket) => {
          let hasChannel = false;
          if (guild) {
            try {
              const channel = await guild.channels.fetch(ticket.channel_id);
              if (channel) hasChannel = true;
            } catch(e) {}
          }
          return {
            id: ticket.id,
            userId: ticket.user_id,
            channelId: ticket.channel_id,
            subject: ticket.subject,
            category: ticket.category || 'General',
            status: hasChannel ? ticket.status : 'closed',
            createdAt: ticket.created_at,
            closedAt: ticket.closed_at,
          };
        })
      );
      res.json(tickets);
    } catch(err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/staff', async (req, res) => {
    const { staffIds } = req.body || {};
    try {
      const { updateGuildConfig } = require('../database/models');
      await updateGuildConfig(MAIN_GUILD_ID, { staff_ids: staffIds });
      res.json({ success: true, staffIds });
    } catch(err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Restock a service (add combos)
  app.post('/api/admin/restock', async (req, res) => {
    const { serviceId, combos } = req.body || {};
    if (!serviceId || !combos) {
      return res.status(400).json({ error: 'Missing serviceId or combos' });
    }

    try {
      // Split combos text by newlines, filter empty lines
      const lines = combos.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) {
        return res.status(400).json({ error: 'No valid combos provided' });
      }

      let added = 0;
      let skipped = 0;

      // Batch insert with ON CONFLICT DO NOTHING to avoid duplicates
      for (const combo of lines) {
        try {
          const email = combo.split(':')[0] || '';
          await query(
            'INSERT INTO combos (service_id, combo, email) VALUES ($1, $2, $3) ON CONFLICT (combo) DO NOTHING',
            [serviceId, combo, email]
          );
          added++;
        } catch (e) {
          // If ON CONFLICT isn't set up, try without it
          try {
            const email = combo.split(':')[0] || '';
            await query(
              'INSERT INTO combos (service_id, combo, email) VALUES ($1, $2, $3)',
              [serviceId, combo, email]
            );
            added++;
          } catch (e2) {
            skipped++;
          }
        }
      }

      logger.info('API', `Restock: ${added} combos added to ${serviceId} (${skipped} skipped)`);
      res.json({ success: true, added, skipped, total: lines.length });
    } catch (err) {
      logger.error('API', `Restock error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  // Reset Leaderboard
  app.post('/api/admin/reset-leaderboard', async (req, res) => {
    try {
      await query('UPDATE users SET total_combos_generated = 0');
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Clear all stock for a service
  app.post('/api/admin/clear-stock', async (req, res) => {
    const { serviceId } = req.body || {};
    if (!serviceId) return res.status(400).json({ error: 'Missing serviceId' });

    try {
      const result = await query('DELETE FROM combos WHERE service_id = $1', [serviceId]);
      const deleted = result.rowCount || 0;
      logger.info('API', `Cleared stock for ${serviceId}: ${deleted} combos removed`);
      res.json({ success: true, deleted });
    } catch (err) {
      logger.error('API', `Clear stock error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  // Get Shop Items
  app.get('/api/shop', async (req, res) => {
    try {
      const { getOrCreateGuildConfig } = require('../database/models');
      const config = await getOrCreateGuildConfig(MAIN_GUILD_ID);
      const defaultShop = [
        { id: "premium", name: "Premium (Abonnement)", price: "4.99", features: ["Générateur Premium", "Support Prioritaire", "Accès outils VIP"], style: "premium" },
        { id: "prime", name: "Prime (Abonnement)", price: "9.99", features: ["Tout Premium", "Générateur Prime", "Pas de cooldown"], style: "prime", badge: "Best Seller" },
        { id: "nitro_1m", name: "Nitro 1 Month (Gift Link)", price: "3.00", features: ["Lien Cadeau", "Pas de carte requise", "Livraison Rapide"], style: "premium" },
        { id: "val_nfa_eu", name: "Val NFA EU (Ranked Ready 20+)", price: "2.00", features: ["NFA", "EU", "Niveau 20+", "Ranked Ready"], style: "prime" },
        { id: "val_nfa_na", name: "Val NFA NA (Ranked Ready 20+)", price: "2.00", features: ["NFA", "NA", "Niveau 20+", "Ranked Ready"], style: "prime" },
        { id: "val_nfa_eu_70", name: "Val NFA EU (70-120 Skins)", price: "7.00", features: ["NFA", "EU", "Niveau 20+", "70-120 Skins"], style: "premium" },
        { id: "val_nfa_eu_150", name: "Val NFA EU (150+ Skins)", price: "12.00", features: ["NFA", "EU", "Niveau 20+", "150+ Skins"], style: "premium" },
        { id: "val_fa_eu", name: "Val FA EU (Ranked Ready 25+)", price: "13.50", features: ["Full Access", "EU", "Niveau 25+", "Ranked Ready"], style: "prime" },
        { id: "val_fa_na", name: "Val FA NA (Ranked Ready 17+)", price: "8.00", features: ["Full Access", "NA", "Niveau 17+", "Ranked Ready"], style: "prime" },
        { id: "val_fa_eu_10", name: "Val FA EU (10 Skins)", price: "20.00", features: ["Full Access", "EU", "Niveau 35+", "10 Skins"], style: "premium" }
      ];
      // Force default shop if empty
      let shopItems = config.config_data?.shop_items;
      if (!shopItems || shopItems.length === 0) shopItems = defaultShop;
      res.json(shopItems);
    } catch(err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update Shop Items (Admin)
  app.post('/api/admin/shop', async (req, res) => {
    const { shopItems } = req.body || {};
    try {
      const { updateGuildConfig } = require('../database/models');
      await updateGuildConfig(MAIN_GUILD_ID, { shop_items: shopItems });
      res.json({ success: true, shopItems });
    } catch(err) {
      res.status(500).json({ error: err.message });
    }
  });

  // =====================================================
  // ERROR HANDLING
  // =====================================================

  // =====================================================
  // ERROR HANDLING
  // =====================================================

  app.use((err, req, res, next) => {
    logger.error('API', `Unhandled error: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
  });

  app.listen(PORT, () => {
    logger.info('API', `🚀 API Server listening on port ${PORT}`);
  });
}

module.exports = { startApiServer };
