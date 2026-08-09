const express = require('express');
const cors = require('cors');
const { getLogger } = require('../utils/logger');
const { getAllServices, getServiceById } = require('../config/services');
const { query } = require('../database/hybridPool');
const { getOrCreateGuildConfig } = require('../database/models');
const { buildEnglishGenEmbed } = require('../services/panelManager');

const logger = getLogger();

function startApiServer(client) {
  const app = express();
  const PORT = process.env.API_PORT || 3001;
  const MAIN_GUILD_ID = '1532343959722917979';

  app.use(cors());
  app.use(express.json());

  // Middleware to attach discord client
  app.use((req, res, next) => {
    req.client = client;
    next();
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', bot: req.client.user?.tag });
  });

  // Get all services/generators
  app.get('/api/services', (req, res) => {
    res.json(getAllServices());
  });

  // Get specific user info (roles, etc.)
  app.get('/api/user/:id', async (req, res) => {
    try {
      const guild = await req.client.guilds.fetch(MAIN_GUILD_ID);
      const member = await guild.members.fetch(req.params.id).catch(() => null);
      if (!member) return res.status(404).json({ error: 'User not found in main guild' });

      const roles = member.roles.cache.map(r => r.id);
      res.json({ id: member.id, tag: member.user.tag, roles });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Execute a generator
  app.post('/api/generate', async (req, res) => {
    const { userId, serviceId } = req.body;
    if (!userId || !serviceId) return res.status(400).json({ error: 'Missing parameters' });

    try {
      const guild = await req.client.guilds.fetch(MAIN_GUILD_ID);
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) return res.status(403).json({ error: 'User must be in the Discord server' });

      const service = getServiceById(serviceId);
      if (!service) return res.status(404).json({ error: 'Service not found' });

      const tier = service.tier;

      // Removed verification system for free generators
      const hasVipRole = member.roles.cache.has('1532346926425444474');

      if ((tier === 'premium' || tier === 'prime') && !hasVipRole) {
        return res.status(403).json({ error: 'Requires VIP role' });
      }

      // Stock check
      const stockResult = await query('SELECT COUNT(*) as count FROM combos WHERE service_id = $1', [serviceId]);
      const stock = stockResult.rows[0]?.count || 0;
      if (stock === 0) return res.status(400).json({ error: 'Out of stock' });

      // Retrieve account
      const comboResult = await query(
        'SELECT id, combo, account_info FROM combos WHERE service_id = $1 ORDER BY id ASC LIMIT 1',
        [serviceId]
      );

      if (!comboResult.rows.length) return res.status(400).json({ error: 'Out of stock' });
      const account = comboResult.rows[0];

      await query('DELETE FROM combos WHERE id = $1', [account.id]);

      // Save history
      const { addUserHistory } = require('../database/models');
      await addUserHistory(userId, serviceId, 'GENERATION', { combo: account.combo, tier });

      // Log in discord
      const { sendGenLog } = require('../utils/discordLogger');
      await sendGenLog(guild, member.user, service, account.combo, tier);

      res.json({
        success: true,
        service: service.label,
        combo: account.combo,
        accountInfo: account.account_info
      });

    } catch (err) {
      logger.error('API', `Generation error: ${err.message}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Tools API
  app.post('/api/tools/:id', async (req, res) => {
    const { id } = req.params;
    const { userId, input } = req.body;

    // We assume the user has access since next-auth & frontend should gate it, 
    // but a robust backend checks VIP status again:
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
      res.status(500).json({ error: err.message });
    }
  });

  // Create Ticket via Web
  app.post('/api/tickets', async (req, res) => {
    const { userId, username, subject, message } = req.body;
    try {
      const guild = await req.client.guilds.fetch(MAIN_GUILD_ID);
      
      const category = guild.channels.cache.find(c => c.name === 'Tickets' && c.type === 4);
      const ticketChannel = await guild.channels.create({
        name: `web-ticket-${username}`,
        type: 0,
        parent: category?.id
      });

      await ticketChannel.send({
        content: `**New Web Ticket** from ${username} (${userId})\n**Subject:** ${subject}\n**Message:** ${message}`
      });

      res.json({ success: true, channelId: ticketChannel.id });
    } catch(err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(PORT, () => {
    logger.info('API', `🚀 API Server listening on port ${PORT}`);
  });
}

module.exports = { startApiServer };
