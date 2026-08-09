# Tutoriel de Déploiement : Ionos & Coolify 🚀

Puisque tu héberges ton VPS chez **Ionos** et que tu utilises **Coolify** pour gérer tes applications (le bot Discord et le site Web Next.js), voici les étapes exactes pour relier ton nom de domaine `primegen.eu` à ton serveur.

---

## 1. Configurer les DNS chez Ionos

1. Connecte-toi à ton espace client **Ionos**.
2. Va dans la section **Domaines & SSL** et clique sur ton domaine `primegen.eu`.
3. Va dans l'onglet **DNS**.
4. Tu vas devoir créer/modifier les enregistrements suivants pour qu'ils pointent vers l'**adresse IP de ton VPS Coolify** :

| Type | Nom d'hôte (Host) | Valeur (Pointe vers) | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `@` (ou vide) | `L'adresse IP de ton VPS` (ex: `123.45.67.89`) | 1 heure |
| **A** | `www` | `L'adresse IP de ton VPS` | 1 heure |
| **A** | `api` (Optionnel)* | `L'adresse IP de ton VPS` | 1 heure |

*(Si tu veux que l'API de ton bot tourne sur `api.primegen.eu` au lieu d'un port local).*

> [!WARNING]
> La propagation DNS peut prendre entre 5 minutes et 24 heures. Si le site ne marche pas tout de suite, c'est normal, il faut patienter.

---

## 2. Configurer Coolify pour héberger le Site et le Bot

Puisque tout est sur ton Github (`limoonsdev/ls-bot`), tu peux tout déployer avec Coolify très facilement.

### A. Déployer le Site Web (Next.js)
1. Dans Coolify, crée un nouveau projet -> **Public Repository** (ou Private si tu l'as mis en privé).
2. Connecte ton repo : `limoonsdev/ls-bot`
3. Sélectionne la branche `main`.
4. Configure le chemin de base (Base Directory) : `/web`
5. Dans les paramètres de Build :
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Install Command: `npm install`
6. Dans **Domains**, ajoute : `https://primegen.eu` (Coolify va générer le certificat SSL automatiquement).
7. Ajoute ces **Environment Variables** (variables d'environnement) :
   - `DISCORD_CLIENT_ID` = `L'ID de ton application Discord`
   - `DISCORD_CLIENT_SECRET` = `Le Secret de ton application Discord`
   - `NEXTAUTH_URL` = `https://primegen.eu`
   - `NEXTAUTH_SECRET` = `(Génère un mot de passe aléatoire long)`
8. Clique sur **Deploy**.

### B. Déployer le Bot & Backend API
1. Ajoute un **2ème service** dans le même projet Coolify, depuis le même Repository Github.
2. Laisse le Base Directory sur `/` (la racine).
3. Start Command: `npm run start` (ou `node src/index.js`)
4. Assure-toi que les variables d'environnement de ton bot sont bien présentes (Token Discord, PostgreSQL URL, etc.).
5. Si ton API est utilisée par le site web, assure-toi d'exposer le port `3001` (tu pourras changer l'URL de fetch dans le Next.js plus tard vers l'URL Coolify).
6. Clique sur **Deploy**.

---

## 3. Configurer l'OAuth2 sur le portail Discord
1. Va sur [Discord Developer Portal](https://discord.com/developers/applications).
2. Sélectionne ton bot PrimeGen.
3. Va dans **OAuth2**.
4. Dans **Redirects**, ajoute exactement :
   - `https://primegen.eu/api/auth/callback/discord`
   - (Si tu testes en local, ajoute aussi `http://localhost:3000/api/auth/callback/discord`)
5. Sauvegarde !

Désormais, tout est prêt pour accueillir tes utilisateurs sur `primegen.eu`. Le système de vérification `.gg/primegen` a été supprimé comme tu l'as demandé, les générateurs "Free" sont donc accessibles à tous !
