# NSFW Shield

Userscript Tampermonkey qui bloque les sites et recherches pornographiques / NSFW ainsi que les réseaux sociaux, et force le SafeSearch des moteurs de recherche.

## Installation

1. Installer [Tampermonkey](https://www.tampermonkey.net/).
2. Ouvrir **[nsfw-shield.user.js](https://raw.githubusercontent.com/adriendelage/NSFW-blocker-script/main/nsfw-shield.user.js)** → *Installer*.

Les mises à jour arrivent automatiquement via `@updateURL`.

## Fonctionnalités

- **Sites adultes** : liste de domaines, extensions `.xxx` / `.porn` / `.sex` / `.adult`, mots-clés dans le nom d'hôte.
- **Recherches NSFW** : analyse des requêtes (Google, Bing, DuckDuckGo, Qwant, YouTube… et tout site avec `?q=`, `/search/…`). Normalise accents, casse, leet-speak (`p0rn`) et lettres espacées.
  - terme **fort** → bloqué seul ; deux termes **faibles** → bloqués ensemble ;
  - préfixes (`avaleuse*`) et exceptions légitimes (« cancer du sein », « banque de sperme »…).
- **Réseaux sociaux** : Facebook, Instagram, Threads, X/Twitter, TikTok, Snapchat, Reddit, LinkedIn, Pinterest, Tumblr, Bluesky, Mastodon… (`BLOCK_SOCIAL`).
- **Vidéo / chat** (YouTube, Twitch, Kick, Discord, WhatsApp Web, Telegram Web) : désactivé par défaut, activable via `BLOCK_VIDEO_CHAT = true`.
- **SafeSearch forcé** : Google, Bing, DuckDuckGo, Yahoo.
- **Détection de page** : label RTA / `rating=adult`, titre et description explicites.
- Interception de la recherche avant envoi, support des SPA, page de blocage non contournable par le site.

## Menu Tampermonkey

- 🔓 Autoriser ce site (phrase de confirmation à taper)
- 📝 Gérer la liste blanche
- 📊 Statistiques

## Personnalisation

Toutes les listes sont en haut du script : `BLOCKED_DOMAINS`, `SOCIAL_DOMAINS`, `VIDEO_CHAT_DOMAINS`, `STRONG_TERMS`, `WEAK_TERMS`, `ALLOW_PHRASES`.

## Limites

Un userscript se désactive facilement et ne protège que le navigateur où il est installé. Pour une protection plus solide, le combiner avec un DNS filtrant (Cloudflare Family `1.1.1.3`, CleanBrowsing, NextDNS).
