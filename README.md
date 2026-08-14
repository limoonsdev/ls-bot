<div align="center">

# ⚡ ls-bot

### PrimeGen Discord Bot & Backend

**A powerful Discord automation backend built for generation communities.**

<br>

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge\&logo=node.js\&logoColor=white)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge\&logo=discord\&logoColor=white)](https://discord.js.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge\&logo=express\&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supported-4169E1?style=for-the-badge\&logo=postgresql\&logoColor=white)](https://www.postgresql.org/)
[![SQLite](https://img.shields.io/badge/SQLite-Supported-003B57?style=for-the-badge\&logo=sqlite\&logoColor=white)](https://www.sqlite.org/)
[![License](https://img.shields.io/badge/License-MIT-success?style=for-the-badge)](LICENSE)

<br>

[**Features**](#-features) •
[**Installation**](#-installation) •
[**Configuration**](#-configuration) •
[**Architecture**](#-architecture) •
[**Commands**](#-commands) •
[**Development**](#-development)

</div>

---

## 🌌 About

**ls-bot** is the backend powering a feature-rich Discord generation ecosystem.

It combines a **Discord.js bot**, a lightweight **Express API**, database abstractions, generation services, file parsers and community-management systems into a modular Node.js application.

The project is designed around the needs of modern generation communities, where reliability, automation and an extensible architecture are essential.

### What it provides

* ⚡ Discord automation
* 📦 Stock & generation management
* 🧩 Modular command architecture
* 🎫 Ticket & access systems
* 🎁 Giveaways
* 💬 Suggestions & community interactions
* ⭐ Reviews / feedback
* 🔐 Verification workflows
* 📢 Announcements & patch notes
* 🌐 Server-list management
* 💳 Payment-related integrations
* 📁 File / GoFile integrations
* 🗄️ Database persistence
* 🌍 HTTP API
* ⏱️ Scheduled tasks
* 📝 Structured logging

---

## ✨ Features

### 🤖 Discord Core

Built around **Discord.js v14**, the bot uses a modular handler architecture for interactions, buttons, selects, modals, messages, invites and presence management.

| System                       | Status |
| ---------------------------- | :----: |
| Discord.js v14               |    ✅   |
| Slash / interaction handling |    ✅   |
| Buttons                      |    ✅   |
| Select menus                 |    ✅   |
| Modals                       |    ✅   |
| Message handlers             |    ✅   |
| Invite handling              |    ✅   |
| Presence management          |    ✅   |
| Automated ready lifecycle    |    ✅   |

---

### 📦 Generation & Stock

The core of the project is built around generation-oriented workflows.

The repository includes dedicated commands and services for:

* Stock management
* Service management
* File checking
* Account / service checking
* Parsing
* Generation-related workflows
* Automated service processing

The codebase separates generation logic from Discord interaction handling, making it easier to extend or replace individual components.

---

### 🎫 Community Systems

ls-bot isn't limited to generation.

It also contains dedicated community-management functionality:

* 🎫 Ticket access
* 💬 Suggestions
* ⭐ Reviews
* 🎁 Giveaways
* 📢 Announcements
* 📰 Patch notes
* 🔐 Verification
* 🌐 Server lists
* 📋 Help / information systems

This allows the bot to act as the central automation layer for an entire Discord community.

---

### 💾 Database Layer

The project includes a dedicated database layer with support for both **PostgreSQL** and **SQLite**.

The architecture contains:

```text
src/database/
├── hybridPool.js
├── migrations.js
├── models.js
├── pool.js
└── migrations/
```

This keeps persistence isolated from Discord-specific logic and allows database-related code to evolve independently.

---

### 🌐 Backend API

Alongside Discord, ls-bot exposes an HTTP backend through Express.

```text
src/api/
└── server.js
```

This makes it possible to connect external services, dashboards or internal tooling to the bot without coupling everything directly to Discord interactions.

---

### 📁 External Services

The project contains dedicated service modules for integrations such as:

```text
src/services/
├── alphaChecker.js
├── checker.js
├── emojiManager.js
├── gofile.js
├── gofileService.js
├── panelManager.js
├── parser.js
└── paypal.js
```

These services isolate external integrations and reusable business logic from the rest of the application.

---

## 🧠 Architecture

The project follows a modular backend architecture.

```text
                         ┌─────────────────────┐
                         │      Discord         │
                         │     Discord.js       │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    Interaction     │
                         │      Handlers      │
                         └──────────┬──────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 ▼                  ▼                  ▼
          ┌────────────┐     ┌────────────┐     ┌────────────┐
          │  Commands  │     │  Handlers  │     │  Services  │
          └─────┬──────┘     └─────┬──────┘     └─────┬──────┘
                │                  │                  │
                └──────────────────┼──────────────────┘
                                   ▼
                         ┌─────────────────────┐
                         │   Business Logic    │
                         └──────────┬──────────┘
                                    │
                   ┌────────────────┼────────────────┐
                   ▼                ▼                ▼
             ┌──────────┐     ┌──────────┐     ┌──────────┐
             │ Database │     │   API    │     │ Parsers  │
             └──────────┘     └──────────┘     └──────────┘
```

The source tree is divided into clear responsibilities:

```text
src/
├── api/          → HTTP API
├── commands/     → Discord commands
├── config/       → Application configuration
├── database/     → Persistence & models
├── handlers/     → Discord interaction handlers
├── parsers/      → Data/file parsing
├── services/     → External & business services
├── utils/        → Shared utilities
└── index.js      → Application entry point
```

---

## 🤖 Commands

The repository currently contains the following command modules:

| Command         | Purpose                            |
| --------------- | ---------------------------------- |
| `addstock`      | Stock management                   |
| `announce`      | Server announcements               |
| `avis`          | Reviews / feedback                 |
| `check`         | Checking workflow                  |
| `checkFiles`    | File validation                    |
| `config`        | Configuration                      |
| `deploy`        | Deployment / registration          |
| `drop`          | Drop / generation-related workflow |
| `giveaway`      | Giveaway management                |
| `help`          | Help system                        |
| `patchnotes`    | Patch notes                        |
| `serverlist`    | Server-list management             |
| `services`      | Service management                 |
| `suggestion`    | Suggestions                        |
| `ticket-access` | Ticket access management           |
| `verified`      | Verification                       |

> The command list above reflects the command modules currently present in `src/commands/`.

---

## 🛠️ Tech Stack

### Runtime

**Node.js 20.x**

The repository explicitly targets Node.js `20.x`.

### Core

* [Discord.js](https://discord.js.org/) `14.27.x`
* [Express](https://expressjs.com/) `4.x`
* [Axios](https://axios-http.com/)
* [dotenv](https://github.com/motdotla/dotenv)
* [Winston](https://github.com/winstonjs/winston)

### Database

* PostgreSQL
* SQLite
* `pg`
* `sqlite3`

### Utilities & Integrations

* 7-Zip
* GoFile
* HTTP proxy support
* node-cron
* OTP / authentication utilities
* Steam User
* p-limit
* PayPal-related services

The current `package.json` defines these dependencies directly.

---

## 📋 Requirements

Before running the project, make sure you have:

* **Node.js 20.x**
* **npm**
* A Discord application
* A Discord bot token
* Required database configuration
* Any external-service credentials required by the features you enable

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/limoonsdev/ls-bot.git
cd ls-bot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the environment

Create your environment configuration according to the variables expected by the project.

> **Never commit secrets, bot tokens, API keys or database credentials.**

### 4. Start the application

Production:

```bash
npm start
```

Development:

```bash
npm run dev
```

The development script uses Node's native watch mode.

---

## 🪟 Windows

The repository also provides Windows helper scripts:

```text
install.bat
start.bat
```

These can be used as convenient entry points for Windows-based deployments.

---

## ⚙️ Configuration

Configuration is organized under:

```text
src/config/
```

Keep environment-specific values and secrets outside the source code whenever possible.

A typical deployment should separate:

```text
Application configuration
        │
        ├── Discord credentials
        ├── Database credentials
        ├── External APIs
        ├── Service configuration
        └── Environment-specific settings
```

---

## 🗄️ Database

ls-bot uses a dedicated persistence layer rather than embedding database logic throughout the bot.

```text
src/database/
│
├── hybridPool.js
├── pool.js
├── models.js
├── migrations.js
└── migrations/
```

This structure provides a clean separation between:

* Database connections
* Models
* Migrations
* Application logic

---

## 🔌 API

The backend includes an Express server:

```text
src/api/server.js
```

The API layer is intended to provide a bridge between the Discord backend and external applications or services.

This architecture makes it possible to add a future:

* 🌐 Web dashboard
* 📊 Administration panel
* 📈 Statistics interface
* 🛠️ External management tools

without rewriting the Discord core.

---

## 🧩 Services

Business and external integrations are isolated inside:

```text
src/services/
```

Current service modules include:

```text
alphaChecker.js
checker.js
emojiManager.js
gofile.js
gofileService.js
panelManager.js
parser.js
paypal.js
```

This separation makes integrations easier to maintain and replace independently.

---

## 🧱 Project Structure

```text
ls-bot/
│
├── assets/
│
├── src/
│   │
│   ├── api/
│   │   └── server.js
│   │
│   ├── commands/
│   │   ├── addstock.js
│   │   ├── announce.js
│   │   ├── avis.js
│   │   ├── check.js
│   │   ├── checkFiles.js
│   │   ├── config.js
│   │   ├── deploy.js
│   │   ├── drop.js
│   │   ├── giveaway.js
│   │   ├── help.js
│   │   ├── patchnotes.js
│   │   ├── serverlist.js
│   │   ├── services.js
│   │   ├── suggestion.js
│   │   ├── ticket-access.js
│   │   └── verified.js
│   │
│   ├── config/
│   │
│   ├── database/
│   │   ├── migrations/
│   │   ├── hybridPool.js
│   │   ├── migrations.js
│   │   ├── models.js
│   │   └── pool.js
│   │
│   ├── handlers/
│   │   ├── buttonHandlers.js
│   │   ├── interaction.js
│   │   ├── inviteHandlers.js
│   │   ├── messageHandlers.js
│   │   ├── modalHandlers.js
│   │   ├── presenceHandlers.js
│   │   ├── primeMail.js
│   │   ├── ready.js
│   │   └── selectHandlers.js
│   │
│   ├── parsers/
│   │
│   ├── services/
│   │   ├── alphaChecker.js
│   │   ├── checker.js
│   │   ├── emojiManager.js
│   │   ├── gofile.js
│   │   ├── gofileService.js
│   │   ├── panelManager.js
│   │   ├── parser.js
│   │   └── paypal.js
│   │
│   ├── utils/
│   │
│   └── index.js
│
├── .eslintrc.json
├── .gitignore
├── DNS_Coolify_Tutorial.md
├── Idees_VIP_PrimeGen.md
├── install.bat
├── package.json
├── start.bat
└── README.md
```

---

## 🧪 Development

The project includes development and maintenance utilities alongside the main application.

Examples include:

```text
fix_deprecation.js
fix_guild_id.js
fix_models.py
patch_config.js
patch_events.js
patch_models.js
patch_serverlist.js
patch_welcome.js
test_db.js
test_shop.js
```

These scripts are kept outside `src/` and are intended for project maintenance, migrations, fixes and testing.

---

## 🧹 Code Quality

The project includes ESLint and Jest as development dependencies.

```bash
npm install
```

For local development, keep changes isolated and test affected functionality before deployment.

---

## 🔐 Security

### Never expose

```text
Discord bot tokens
Database passwords
API keys
Payment credentials
External service credentials
Private configuration
```

### Recommended

```text
.env
.env.*
secrets/
credentials/
*.log
```

should remain outside version control where appropriate.

If a Discord bot token is ever exposed, regenerate it immediately through the Discord Developer Portal.

---

## 📈 Roadmap

The architecture leaves room for further expansion.

### Platform

* [ ] Web administration dashboard
* [ ] Advanced analytics
* [ ] Multi-server management
* [ ] Centralized configuration panel
* [ ] Public API documentation

### Generation

* [ ] Advanced stock analytics
* [ ] Automated stock synchronization
* [ ] Improved service monitoring
* [ ] Generation statistics
* [ ] Advanced anti-abuse systems

### Community

* [ ] Advanced ticket automation
* [ ] Reputation system
* [ ] Advanced giveaway controls
* [ ] Community analytics

### Infrastructure

* [ ] Docker deployment
* [ ] CI/CD pipeline
* [ ] Automated database migrations
* [ ] Production monitoring
* [ ] Health-check endpoints

---

## 🤝 Contributing

Contributions are welcome.

### Fork

```bash
git clone https://github.com/limoonsdev/ls-bot.git
cd ls-bot
```

### Create a branch

```bash
git checkout -b feature/my-feature
```

### Make your changes

Keep the existing modular architecture in mind.

### Commit

```bash
git commit -m "feat: add my feature"
```

### Push

```bash
git push origin feature/my-feature
```

Then open a Pull Request.

---

## 📜 License

This project is distributed under the **MIT License**.

See [`LICENSE`](LICENSE) for the complete license text.

---

## 👤 Author

<div align="center">

### limoonsdev

Developer & maintainer of **ls-bot / PrimeGen Backend**

[![GitHub](https://img.shields.io/badge/GitHub-limoonsdev-181717?style=for-the-badge\&logo=github\&logoColor=white)](https://github.com/limoonsdev)

</div>

---

## ⭐ Support the Project

If **ls-bot** helped you or you find the architecture useful:

**Give the repository a ⭐**

It helps the project gain visibility and motivates further development.

<div align="center">

### ⚡ ls-bot

**Discord • Generation • Automation • Backend**

<br>

[![Star](https://img.shields.io/github/stars/limoonsdev/ls-bot?style=for-the-badge\&logo=github)](https://github.com/limoonsdev/ls-bot)
[![Forks](https://img.shields.io/github/forks/limoonsdev/ls-bot?style=for-the-badge\&logo=github)](https://github.com/limoonsdev/ls-bot/forks)
[![Issues](https://img.shields.io/github/issues/limoonsdev/ls-bot?style=for-the-badge\&logo=github)](https://github.com/limoonsdev/ls-bot/issues)

</div>

---

<div align="center">

<img src="https://raw.githubusercontent.com/limoonsdev/ls-bot/main/assets/banner.gif" width="900">

<br><br>

**Built with ⚡ by limoonsdev**

</div>
