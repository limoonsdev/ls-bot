# Configuration DNS pour primegen.eu (Ionos -> Coolify) 🌐

Voici **uniquement les enregistrements DNS** que tu dois ajouter dans ton espace Ionos pour relier ton nom de domaine à ton VPS Coolify.

Dans Ionos, va dans **Domaines & SSL**, clique sur `primegen.eu`, puis va dans l'onglet **DNS**.
Ajoute ou modifie ces enregistrements pour qu'ils pointent vers l'adresse IP de ton VPS :

| Type | Nom d'hôte (Host) | Valeur (Pointe vers) |
| :--- | :--- | :--- |
| **A** | `@` (ou vide) | `L'adresse IP de ton VPS` (ex: `123.45.67.89`) |
| **A** | `www` | `L'adresse IP de ton VPS` |
| **A** | `api` *(Optionnel, pour le bot)* | `L'adresse IP de ton VPS` |

*(Note : Supprime tous les autres enregistrements de type A ou AAAA par défaut créés par Ionos pour éviter les conflits).*

---
*C'est tout ! Une fois les DNS propagés, Coolify s'occupera du reste (certificats SSL, routage, etc).*
