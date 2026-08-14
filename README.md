# 🚀 Discord Generation Bot

<div align="center">

![Discord Bot Banner](https://placehold.co/1200x300/0d1117/5865F2?text=DISCORD+GENERATION+BOT)

### ⚡ A powerful, modern & fully customizable Discord bot template

**Built for generation servers • Fast • Secure • Modular • Easy to customize**

<br>

[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge\&logo=discord\&logoColor=white)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge\&logo=node.js\&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-white?style=for-the-badge)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)]()
[![GitHub Stars](https://img.shields.io/github/stars/USERNAME/REPOSITORY?style=for-the-badge\&logo=github)]()

</div>

---

## ✨ Overview

**Discord Generation Bot** is a modern and extensible template designed for **Discord generation servers**.

The project provides a clean foundation for building a professional generation system with commands, stock management, cooldowns, logging, permissions and a highly customizable configuration.

> 💡 **This repository is a template.**
> Customize it, add your own generation system and adapt it to your community.

---

## 🌌 Features

| Feature                      | Description                                         |
| ---------------------------- | --------------------------------------------------- |
| ⚡ **Generation System**      | Generate services/accounts directly through Discord |
| 📦 **Stock System**          | Manage and display available stock                  |
| ⏱️ **Cooldowns**             | Prevent spam and abuse                              |
| 🛡️ **Permissions**          | Admin & staff permission management                 |
| 📊 **Logging**               | Track generations and important actions             |
| 🔄 **Auto Refresh**          | Automatically update stock information              |
| 🎨 **Embeds**                | Beautiful and customizable Discord embeds           |
| ⚙️ **Configuration**         | Easily configure the entire bot                     |
| 🧩 **Modular Commands**      | Add or remove commands easily                       |
| 🚀 **Slash Commands**        | Full Discord slash-command support                  |
| 🔐 **Environment Variables** | Keep sensitive information outside the source code  |

---

## 🖥️ Preview

<div align="center">

### Generation Panel

```text
╭──────────────────────────────────────────────╮
│              ⚡ GENERATION PANEL              │
├──────────────────────────────────────────────┤
│                                              │
│  📦 Available Services                       │
│                                              │
│  ├─ 🎮 Service #1 .............. 128 stock  │
│  ├─ 💎 Service #2 ..............  74 stock  │
│  ├─ 🔥 Service #3 ..............  42 stock  │
│  └─ ⭐ Service #4 ..............  19 stock  │
│                                              │
│  /gen <service>                              │
│                                              │
╰──────────────────────────────────────────────╯
```

</div>

---

## 🧰 Requirements

Before starting, make sure you have:

* **Node.js 18+**
* **npm / pnpm / yarn**
* A **Discord Bot**
* Your bot's **Token**
* Discord Developer Portal access

---

## 📥 Installation

### 1. Clone the repository

```bash
git clone https://github.com/USERNAME/REPOSITORY.git
cd REPOSITORY
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file:

```env
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id
GUILD_ID=your_guild_id
```

> ⚠️ **Never publish your Discord bot token.**

### 4. Start the bot

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

---

## ⚙️ Configuration

The project is designed to keep configuration simple.

Example:

```js
module.exports = {
    prefix: "/",
    
    generation: {
        enabled: true,
        cooldown: 30,
        deleteMessage: true
    },

    logging: {
        enabled: true,
        channel: "YOUR_LOG_CHANNEL_ID"
    },

    permissions: {
        administrator: true,
        staffRole: "YOUR_STAFF_ROLE_ID"
    }
};
```

Customize the configuration according to your server.

---

## 🤖 Commands

### 👤 User Commands

| Command     | Description             |
| ----------- | ----------------------- |
| `/gen`      | Generate a service      |
| `/stock`    | Display available stock |
| `/services` | List available services |
| `/help`     | Display bot commands    |

### 🛠️ Staff Commands

| Command        | Description                |
| -------------- | -------------------------- |
| `/addstock`    | Add stock                  |
| `/removestock` | Remove stock               |
| `/clearstock`  | Clear a service            |
| `/setcooldown` | Change generation cooldown |
| `/reload`      | Reload bot configuration   |

### 🔐 Administration

| Command        | Description                     |
| -------------- | ------------------------------- |
| `/setup`       | Configure the generation system |
| `/config`      | Manage bot configuration        |
| `/logs`        | Configure logging               |
| `/permissions` | Manage permissions              |

---

## 📁 Project Structure

```text
📦 discord-generation-bot
│
├── 📁 src
│   ├── 📁 commands
│   │   ├── gen.js
│   │   ├── stock.js
│   │   ├── services.js
│   │   └── help.js
│   │
│   ├── 📁 events
│   │   ├── ready.js
│   │   └── interactionCreate.js
│   │
│   ├── 📁 handlers
│   │   ├── commandHandler.js
│   │   └── eventHandler.js
│   │
│   ├── 📁 config
│   │   └── config.js
│   │
│   ├── 📁 database
│   │   └── database.js
│   │
│   └── index.js
│
├── 📁 stock
│   ├── service-1.txt
│   ├── service-2.txt
│   └── service-3.txt
│
├── .env.example
├── .gitignore
├── package.json
├── LICENSE
└── README.md
```

---

## 🎨 Customization

Everything is designed to be customizable.

You can modify:

* 🖌️ Embed colors
* 📝 Embed messages
* 🎯 Commands
* 📦 Services
* ⏱️ Cooldowns
* 🛡️ Permissions
* 📊 Logs
* 🗃️ Database
* 🔔 Notifications
* 🤖 Bot presence
* 🌐 Server-specific settings

Make the bot match your server's identity.

---

## 🔐 Security

Security should always be a priority.

### Never commit:

```text
.env
config/secrets.js
bot tokens
API keys
database credentials
private credentials
```

Your `.gitignore` should contain:

```gitignore
node_modules/
.env
*.log
database/
```

If your Discord token is accidentally leaked, **immediately regenerate it through the Discord Developer Portal**.

---

## 🧠 Recommended Architecture

The template follows a modular architecture:

```text
Discord
   │
   ▼
Interaction Handler
   │
   ├───────────────┐
   ▼               ▼
Commands         Events
   │               │
   ▼               ▼
Generation       Logging
System
   │
   ▼
Stock Manager
   │
   ▼
Database
```

This makes the project easier to maintain and expand.

---

## 🚀 Roadmap

* [x] Slash command system
* [x] Modular architecture
* [x] Stock management
* [x] Generation system
* [x] Cooldown system
* [x] Permission system
* [x] Logging system
* [ ] Web dashboard
* [ ] Advanced analytics
* [ ] Multi-server configuration
* [ ] Premium system
* [ ] Automatic stock synchronization
* [ ] Web-based administration panel

---

## 🤝 Contributing

Contributions are welcome!

### 1. Fork the repository

```bash
git clone https://github.com/USERNAME/REPOSITORY.git
```

### 2. Create a branch

```bash
git checkout -b feature/my-feature
```

### 3. Commit your changes

```bash
git commit -m "feat: add my feature"
```

### 4. Push your branch

```bash
git push origin feature/my-feature
```

### 5. Open a Pull Request

Please make sure your code is clean, documented and tested before submitting a PR.

---

## ⭐ Support

If this project helped you, consider giving the repository a ⭐.

It helps the project grow and motivates further development.

<div align="center">

### 💙 Built with passion for the Discord community.

**Discord Generation Bot Template**

</div>

---

## 📜 License

This project is licensed under the **MIT License**.

You are free to:

* ✅ Use the project
* ✅ Modify the source code
* ✅ Fork the repository
* ✅ Use it for personal projects
* ✅ Use it for commercial projects

See the [`LICENSE`](LICENSE) file for more information.

---

<div align="center">

## 💫 Made with Discord.js

![Discord](https://img.shields.io/badge/Discord-5865F2?style=for-the-badge\&logo=discord\&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge\&logo=javascript\&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge\&logo=node.js\&logoColor=white)

<br>

<img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbW5mN2V6Z2Z4dHc2c2J4dW9mY2F3d3d0Y3R6N3J4d3F4c3F5eCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/26tn33aiTi1jkl6H6/giphy.gif" width="700">

<br><br>

**Thanks for checking out the project! ⭐**

</div>
