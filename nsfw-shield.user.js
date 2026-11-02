// ==UserScript==
// @name         NSFW Shield
// @namespace    https://github.com/adriendelage
// @version      1.0.0
// @description  Bloque les sites et recherches pornographiques / NSFW, force le SafeSearch des moteurs de recherche
// @author       Adrien
// @match        *://*/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  'use strict';

  /* ===================================================================
   *  CONFIGURATION — à adapter librement
   * =================================================================== */

  // Domaines bloqués (sous-domaines inclus)
  const BLOCKED_DOMAINS = [
    'pornhub.com', 'pornhub.org', 'xvideos.com', 'xvideos.red', 'xnxx.com', 'xhamster.com',
    'xhamster.desi', 'xhamsterlive.com', 'redtube.com', 'youporn.com', 'tube8.com',
    'spankbang.com', 'eporner.com', 'beeg.com', 'motherless.com', 'porntrex.com', 'txxx.com',
    'hqporner.com', 'tnaflix.com', 'sunporno.com', 'youjizz.com', 'xxxbunker.com',
    'brazzers.com', 'realitykings.com', 'bangbros.com', 'naughtyamerica.com',
    'onlyfans.com', 'fansly.com', 'manyvids.com', 'clips4sale.com',
    'chaturbate.com', 'stripchat.com', 'bongacams.com', 'livejasmin.com', 'cam4.com',
    'myfreecams.com', 'camsoda.com', 'flirt4free.com',
    'rule34.xxx', 'rule34.paheal.net', 'e-hentai.org', 'exhentai.org', 'nhentai.net',
    'hanime.tv', 'hentaihaven.xxx', 'gelbooru.com', 'danbooru.donmai.us', 'f95zone.to',
    'erome.com', 'fapello.com', 'coomer.su', 'coomer.party', 'kemono.su', 'kemono.party',
    'thothub.to', 'redgifs.com', 'scrolller.com',
    'jacquieetmicheltv.net', 'jacquieetmichel.net', 'dorcelclub.com', 'dorcelvision.com',
    'marcdorcel.com', 'tukif.com', 'xxxfrance.com', 'hdporn.fr',
  ];

  // Extensions de domaine dédiées aux contenus adultes
  const BLOCKED_TLDS = ['xxx', 'porn', 'sex', 'adult', 'sexy'];

  // Mots-clés cherchés DANS le nom d'hôte (hors extension)
  const HOST_KEYWORDS = [
    'porn', 'xxx', 'hentai', 'xvideo', 'xhamster', 'xnxx', 'nsfw', 'onlyfans',
    'camgirl', 'sexcam', 'sextube', 'sexvid', 'milf', 'rule34', 'fapello', 'nudes',
  ];

  // Termes de recherche bloqués (mots entiers, accents/leet-speak normalisés, pluriel en s toléré)
  const QUERY_TERMS = [
    'porn', 'porno', 'pornographie', 'pornographique', 'xxx', 'nsfw', 'hentai',
    'nude', 'nudes', 'naked', 'sex', 'sexe', 'sexy', 'erotic', 'erotique', 'erotica',
    'milf', 'onlyfans', 'fansly', 'camgirl', 'camgirls', 'boobs', 'tits', 'pussy',
    'blowjob', 'cumshot', 'gangbang', 'bdsm', 'rule34', 'r34', 'xvideos', 'xnxx',
    'xhamster', 'pornhub', 'redtube', 'youporn', 'chaturbate', 'stripchat', 'nhentai',
    'nichons', 'branlette', 'baise', 'salope', 'cul nu', 'seins nus', 'leak onlyfans',
  ];

  // Termes repérés même collés / espacés pour contourner (« p o r n h u b »)
  const SQUISHED_TERMS = [
    'pornhub', 'xvideos', 'xnxx', 'xhamster', 'youporn', 'redtube', 'onlyfans',
    'rule34', 'nhentai', 'chaturbate', 'stripchat', 'hentai', 'nsfw',
  ];

  // Expressions légitimes neutralisées avant analyse (évite les faux positifs)
  const ALLOW_PHRASES = [
    'sexe du bebe', 'sexe bebe', 'sexe de mon bebe', 'education sexuelle', 'sex education',
    'sex pistols', 'sex and the city', 'changement de sexe', 'egalite des sexes',
    'determination du sexe', 'sexe chromosomique',
  ];

  // Paramètres d'URL contenant typiquement une recherche (sur n'importe quel site)
  const QUERY_PARAMS = ['q', 'query', 'p', 'text', 'search_query', 'search', 's', 'k', 'keyword', 'keywords', 'term', 'tags'];

  // SafeSearch forcé
  const SAFE_SEARCH = [
    { host: /(^|\.)google\.[a-z.]+$/, needs: 'q', params: { safe: 'active' } },
    { host: /(^|\.)bing\.com$/, needs: 'q', params: { adlt: 'strict' } },
    { host: /(^|\.)duckduckgo\.com$/, needs: 'q', params: { kp: '1' } },
    { host: /(^|\.)search\.yahoo\.com$/, needs: 'p', params: { vm: 'r' } },
  ];

  const SEARCH_HOST = /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.com|yandex\.[a-z]+|qwant\.com|ecosia\.org|search\.brave\.com|startpage\.com|youtube\.com|lilo\.org)$/;

  const UNLOCK_PHRASE = 'je confirme vouloir debloquer ce site';

  /* ===================================================================
   *  OUTILS
   * =================================================================== */

  const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };

  function normalize(str, leet) {
    let s = String(str).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (leet) s = s.replace(/[013457@$!]/g, (c) => LEET[c]);
    return s.replace(/[^a-z0-9]+/g, ' ').trim();
  }

  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const TERMS_SRC = QUERY_TERMS.map((t) => escapeRe(normalize(t, false)).replace(/ /g, ' +')).join('|');
  const TERM_RE = new RegExp(`(?:^| )(?:${TERMS_SRC})s?(?= |$)`);
  const TERM_RE_GLOBAL = new RegExp(`(?:^| )(?:${TERMS_SRC})s?(?= |$)`, 'g');

  function cleaned(raw, leet) {
    let t = ' ' + normalize(raw, leet) + ' ';
    for (const a of ALLOW_PHRASES) t = t.split(' ' + a + ' ').join(' ');
    return t.trim();
  }

  function isNsfwText(raw) {
    if (!raw) return false;
    for (const leet of [false, true]) {
      const t = cleaned(raw, leet);
      if (!t) continue;
      if (TERM_RE.test(t)) return true;
      const squished = t.replace(/ /g, '');
      if (SQUISHED_TERMS.some((x) => squished.includes(x))) return true;
    }
    return false;
  }

  function nsfwScore(raw) {
    if (!raw) return 0;
    const t = cleaned(raw, false);
    const hits = (t.match(TERM_RE_GLOBAL) || []).length;
    const squished = t.replace(/ /g, '');
    return hits + SQUISHED_TERMS.filter((x) => squished.includes(x)).length;
  }

  /* ===================================================================
   *  LISTE BLANCHE & STATS
   * =================================================================== */

  const getWhitelist = () => GM_getValue('whitelist', []);
  const setWhitelist = (list) => GM_setValue('whitelist', [...new Set(list.filter(Boolean))]);

  const matchesDomain = (host, d) => host === d || host.endsWith('.' + d);
  const isWhitelisted = (host) => getWhitelist().some((d) => matchesDomain(host, d));

  /* ===================================================================
   *  DÉTECTION
   * =================================================================== */

  function hostBlocked(rawHost) {
    const host = rawHost.toLowerCase().replace(/^www\./, '');
    if (!host || isWhitelisted(host)) return false;
    if (BLOCKED_TLDS.includes(host.split('.').pop())) return true;
    if (BLOCKED_DOMAINS.some((d) => matchesDomain(host, d))) return true;
    const bare = host.replace(/\.[a-z]+$/, '');
    return HOST_KEYWORDS.some((k) => bare.includes(k));
  }

  function checkUrl(href) {
    let u;
    try { u = new URL(href); } catch { return null; }
    if (!/^https?:$/.test(u.protocol)) return null;

    const host = u.hostname.toLowerCase();
    if (hostBlocked(host)) return 'Site pour adultes';
    if (isWhitelisted(host.replace(/^www\./, ''))) return null;

    // Reddit : porte NSFW et subreddits explicites
    if (/(^|\.)reddit\.com$/.test(host)) {
      if (u.pathname.startsWith('/over18')) return 'Contenu NSFW (Reddit)';
      const m = u.pathname.match(/^\/r\/([^/]+)/i);
      if (m && isNsfwText(m[1].replace(/_/g, ' '))) return 'Subreddit NSFW';
    }

    // Requêtes de recherche dans l'URL
    for (const p of QUERY_PARAMS) {
      const v = u.searchParams.get(p);
      if (v && isNsfwText(v)) return 'Recherche NSFW';
    }

    // Recherches / tags dans le chemin (/search/xxx, /tag/xxx…)
    if (/\/(search|tags?|hashtag|recherche)\//i.test(u.pathname)) {
      let path = u.pathname;
      try { path = decodeURIComponent(path); } catch { /* ignore */ }
      if (isNsfwText(path.replace(/[/+_-]/g, ' '))) return 'Recherche NSFW';
    }

    // Fragment (certains moteurs SPA y mettent la requête)
    if (u.hash && u.hash.length > 1) {
      try {
        const hp = new URLSearchParams(u.hash.slice(1));
        for (const p of QUERY_PARAMS) {
          const v = hp.get(p);
          if (v && isNsfwText(v)) return 'Recherche NSFW';
        }
      } catch { /* ignore */ }
    }
    return null;
  }

  function enforceSafeSearch() {
    let u;
    try { u = new URL(location.href); } catch { return false; }
    for (const rule of SAFE_SEARCH) {
      if (!rule.host.test(u.hostname) || !u.searchParams.has(rule.needs)) continue;
      let changed = false;
      for (const [k, v] of Object.entries(rule.params)) {
        if (u.searchParams.get(k) !== v) { u.searchParams.set(k, v); changed = true; }
      }
      if (changed) { location.replace(u.href); return true; }
    }
    return false;
  }

  function scanPageContent() {
    if (blocked || SEARCH_HOST.test(location.hostname)) return;
    if (isWhitelisted(location.hostname.replace(/^www\./, ''))) return;

    // Étiquettes officielles « adulte » (RTA, rating)
    for (const meta of document.querySelectorAll('meta')) {
      const name = (meta.getAttribute('name') || meta.getAttribute('http-equiv') || '').toLowerCase();
      const content = (meta.getAttribute('content') || '').toLowerCase();
      if ((name === 'rating' || name === 'pics-label') &&
          /(adult|mature|rta-5042|restricted|porn)/.test(content)) {
        block('Page marquée « contenu adulte »');
        return;
      }
    }

    // Titre + description + mots-clés : au moins 2 occurrences explicites
    const pick = (sel) => (document.querySelector(sel) || {}).content || '';
    const text = [
      document.title,
      pick('meta[name="description" i]'),
      pick('meta[name="keywords" i]'),
      pick('meta[property="og:title"]'),
    ].join(' ');
    if (nsfwScore(text) >= 2) block('Contenu adulte détecté');
  }

  /* ===================================================================
   *  BLOCAGE
   * =================================================================== */

  let blocked = false;
  let blockedReason = '';

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'style') node.style.cssText = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const c of children) node.append(c);
    return node;
  }

  function buildBlockPage() {
    const html = document.createElement('html');
    html.setAttribute('lang', 'fr');
    const head = el('head', {}, el('meta', { charset: 'utf-8' }), el('title', {}, 'Page bloquée'));

    const btn = 'padding:12px 22px;border-radius:10px;border:none;font:600 15px system-ui,sans-serif;cursor:pointer;';
    const card = el('div', {
      id: 'nsfw-shield-block',
      style: 'max-width:480px;padding:40px 36px;border-radius:20px;background:#161b26;' +
             'box-shadow:0 20px 60px rgba(0,0,0,.5);text-align:center;',
    },
      el('div', { style: 'font-size:64px;line-height:1;margin-bottom:16px;' }, '🛡️'),
      el('h1', { style: 'margin:0 0 10px;font:700 26px system-ui,sans-serif;color:#fff;' }, 'Accès bloqué'),
      el('p', { style: 'margin:0 0 6px;color:#9aa4b8;font:15px system-ui,sans-serif;' },
        `Motif : ${blockedReason}`),
      el('p', { style: 'margin:0 0 28px;color:#6b7488;font:13px system-ui,sans-serif;word-break:break-all;' },
        location.hostname),
      el('div', { style: 'display:flex;gap:12px;justify-content:center;flex-wrap:wrap;' },
        el('button', {
          style: btn + 'background:#3b82f6;color:#fff;',
          onclick: () => (history.length > 1 ? history.back() : location.replace('https://www.google.com/')),
        }, '← Retour'),
        el('button', {
          style: btn + 'background:#262d3d;color:#cfd6e4;',
          onclick: () => location.replace('https://www.google.com/'),
        }, 'Nouvelle recherche'),
      ),
    );

    const body = el('body', {
      style: 'margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;' +
             'background:radial-gradient(circle at top,#1e2433,#0b0e14);padding:16px;box-sizing:border-box;',
    }, card);

    html.append(head, body);
    return html;
  }

  function mountBlockPage() {
    if (document.getElementById('nsfw-shield-block')) return;
    const page = buildBlockPage();
    if (document.documentElement) document.replaceChild(page, document.documentElement);
    else document.appendChild(page);
  }

  function block(reason) {
    if (blocked) return;
    blocked = true;
    blockedReason = reason;
    GM_setValue('blockCount', GM_getValue('blockCount', 0) + 1);

    try { window.stop(); } catch { /* ignore */ }

    // Dans une iframe : on vide simplement le cadre
    if (window.top !== window.self) {
      try { document.documentElement && document.documentElement.remove(); } catch { /* ignore */ }
      return;
    }

    mountBlockPage();
    // Le site ne doit pas pouvoir redessiner par-dessus
    setInterval(mountBlockPage, 300);
    new MutationObserver(mountBlockPage).observe(document, { childList: true, subtree: true });
  }

  /* ===================================================================
   *  INTERCEPTION DES RECHERCHES AVANT ENVOI
   * =================================================================== */

  function isSearchField(t) {
    if (!t || !(t.matches && t.matches('input, textarea, [contenteditable="true"]'))) return false;
    if (SEARCH_HOST.test(location.hostname)) return true;
    const name = (t.getAttribute('name') || '').toLowerCase();
    const label = ((t.getAttribute('aria-label') || '') + ' ' + (t.getAttribute('placeholder') || '')).toLowerCase();
    return t.type === 'search' || t.getAttribute('role') === 'searchbox' ||
           QUERY_PARAMS.includes(name) || /search|recherch|cherch/.test(label);
  }

  const fieldValue = (t) => (t.isContentEditable ? t.textContent : t.value) || '';

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !isSearchField(e.target)) return;
    if (isNsfwText(fieldValue(e.target))) {
      e.preventDefault();
      e.stopImmediatePropagation();
      block('Recherche NSFW');
    }
  }, true);

  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!form || !form.querySelectorAll) return;
    const fields = form.querySelectorAll('input:not([type]), input[type="text"], input[type="search"], textarea');
    for (const f of fields) {
      if (isSearchField(f) && isNsfwText(f.value)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        block('Recherche NSFW');
        return;
      }
    }
  }, true);

  /* ===================================================================
   *  MENU TAMPERMONKEY
   * =================================================================== */

  GM_registerMenuCommand('🔓 Autoriser ce site (liste blanche)', () => {
    const host = location.hostname.replace(/^www\./, '');
    const answer = prompt(
      `Pour autoriser « ${host} », tape exactement :\n\n${UNLOCK_PHRASE}`
    );
    if (answer === null) return;
    if (normalize(answer, false) !== UNLOCK_PHRASE) {
      alert('Phrase incorrecte, rien n\'a été modifié.');
      return;
    }
    setWhitelist([...getWhitelist(), host]);
    alert(`« ${host} » ajouté à la liste blanche.`);
    location.reload();
  });

  GM_registerMenuCommand('📝 Gérer la liste blanche', () => {
    const current = getWhitelist().join(', ');
    const edited = prompt('Domaines autorisés (séparés par des virgules) :', current);
    if (edited === null) return;
    setWhitelist(edited.split(',').map((d) => d.trim().toLowerCase().replace(/^www\./, '')));
    alert('Liste blanche mise à jour.');
  });

  GM_registerMenuCommand('📊 Statistiques', () => {
    alert(`NSFW Shield a bloqué ${GM_getValue('blockCount', 0)} page(s) ou recherche(s).`);
  });

  /* ===================================================================
   *  DÉMARRAGE
   * =================================================================== */

  function run() {
    if (blocked) return;
    const reason = checkUrl(location.href);
    if (reason) { block(reason); return; }
    enforceSafeSearch();
  }

  run();

  // Navigation SPA (pushState, hash, etc.)
  let lastHref = location.href;
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      run();
    }
  }, 400);
  window.addEventListener('popstate', run);
  window.addEventListener('hashchange', run);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanPageContent, { once: true });
  } else {
    scanPageContent();
  }
  // Second passage pour les titres générés tardivement
  window.addEventListener('load', () => setTimeout(scanPageContent, 1500), { once: true });
})();
