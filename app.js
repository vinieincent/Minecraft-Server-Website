/* =====================================================
   app.js – Logik der Seite. Einstellungen stehen in config.js.
   ===================================================== */
(() => {
    const C = window.SITE;
    const START = new Date(C.START);
    const API_URL = `https://api.mcstatus.io/v2/status/java/${C.SERVER_IP}`;
    const TALLY_URL = `https://tally.so/r/${C.TALLY_FORM_ID}`;
    const TALLY_EMBED = `https://tally.so/embed/${C.TALLY_FORM_ID}?hideTitle=1&alignLeft=1`;
    const PAGE_SIZE = 24;
    const NAME_PATTERN = /^[A-Za-z0-9_]{3,16}$/;

    const $ = id => document.getElementById(id);
    const pad2 = n => String(n).padStart(2, '0');
    const timeout = () => AbortSignal.timeout(8000);

    function el(tag, className, text) {
        const e = document.createElement(tag);
        if (className) e.className = className;
        if (text !== undefined) e.textContent = text;
        return e;
    }

    /* ---------- Skin-Rendering: Name -> UUID -> Render-URL ---------- */
    const MC_API = 'https://mc-api.io';
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const PLACEHOLDER_SKIN = 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">' +
        '<rect width="256" height="256" fill="#2a2a2a"/>' +
        '<rect x="64" y="64" width="128" height="128" fill="#3a3a3a"/>' +
        '</svg>'
    );

    // UUID-Cache: speichert in localStorage und im Speicher
    const UUID_CACHE_KEY = 'mc_uuid_cache_v1';
    const uuidCache = new Map();
    try {
        const stored = JSON.parse(localStorage.getItem(UUID_CACHE_KEY) || '{}');
        for (const [k, v] of Object.entries(stored)) {
            if (UUID_RE.test(v)) uuidCache.set(k, v);
        }
    } catch { /* ignore */ }
    function persistUuidCache() {
        try {
            localStorage.setItem(UUID_CACHE_KEY, JSON.stringify(Object.fromEntries(uuidCache)));
        } catch { /* ignore */ }
    }

    const inflight = new Map(); // name(lowercase) -> Promise<uuid|null>

    async function resolveUuid(name, edition = 'JAVA') {
        const key = name.toLowerCase();
        if (uuidCache.has(key)) return uuidCache.get(key);
        if (inflight.has(key)) return inflight.get(key);

        const p = (async () => {
            try {
                const res = await fetch(
                    `${MC_API}/profile/${encodeURIComponent(name)}/${edition}`,
                    { signal: timeout() }
                );
                if (res.status === 404) {
                    uuidCache.set(key, null);
                    persistUuidCache();
                    return null;
                }
                if (res.status === 400) {
                    console.warn('[Skin] Ungültige Edition für', name);
                    return null;
                }
                if (res.status === 429) {
                    console.warn('[Skin] Rate-Limit erreicht für', name);
                    return null;
                }
                if (!res.ok) {
                    console.warn('[Skin] Profile-API', res.status, 'für', name);
                    return null;
                }
                const data = await res.json();
                const uuid = data?.uuid;
                if (UUID_RE.test(uuid || '')) {
                    uuidCache.set(key, uuid);
                    persistUuidCache();
                    return uuid;
                }
                return null;
            } catch (err) {
                console.warn('[Skin] Fehler bei', name, err);
                return null;
            } finally {
                inflight.delete(key);
            }
        })();
        inflight.set(key, p);
        return p;
    }

    // Setzt das Skin-Bild asynchron. `img` bleibt Fallback bis UUID da ist.
    function applySkin(img, name) {
        img.src = PLACEHOLDER_SKIN;
        const key = name.toLowerCase();
        // Sofort aus Cache, falls vorhanden
        if (uuidCache.has(key)) {
            const uuid = uuidCache.get(key);
            if (uuid) img.src = `${MC_API}/render/${uuid}?size=256`;
            return;
        }
        resolveUuid(name).then(uuid => {
            if (!uuid) return;
            if (!img.isConnected) return;
            img.src = `${MC_API}/render/${uuid}?size=256`;
        });
    }

    const profile = name => `https://namemc.com/profile/${encodeURIComponent(name)}`;
    /* ---------- Texte aus config.js einsetzen ---------- */
    const zone = { timeZone: 'Europe/Berlin' };
    const dateLong = new Intl.DateTimeFormat('de-DE', { ...zone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(START);
    const dateShort = new Intl.DateTimeFormat('de-DE', { ...zone, day: 'numeric', month: 'long' }).format(START);
    const clock = new Intl.DateTimeFormat('de-DE', { ...zone, hour: '2-digit', minute: '2-digit' }).format(START);

    document.querySelectorAll('[data-project]').forEach(n => n.textContent = C.PROJECT_NAME);
    document.querySelectorAll('[data-ip]').forEach(n => n.textContent = C.SERVER_IP);
    $('start-time').textContent = `${dateLong}, ${clock} Uhr`;
    $('start-time').dateTime = START.toISOString();
    $('start-short').textContent = `${dateShort} um ${clock} Uhr`;
    $('signup-newtab').href = TALLY_URL;
    $('home-link').href = C.HOME_URL;
    $('projects-link').href = C.PROJECTS_URL;
    document.title = `${C.PROJECT_NAME} – Start am ${dateShort} um ${clock} Uhr`;

    if (C.MODPACK_URL) {
        $('modpack').hidden = false;
        $('modpack-link').href = C.MODPACK_URL;
    }

    /* ---------- Hinweis (Toast) ---------- */
    let toastTimer;
    function toast(message) {
        const t = $('toast');
        t.textContent = message;
        t.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.hidden = true, 3500);
    }

    /* ---------- Countdown ---------- */
    function tick() {
        const left = START - Date.now();
        if (left <= 0) {
            document.body.dataset.phase = 'live';
            return;
        }
        document.body.dataset.phase = 'soon';
        $('cd-days').textContent    = pad2(Math.floor(left / 86400000));
        $('cd-hours').textContent   = pad2(Math.floor(left % 86400000 / 3600000));
        $('cd-minutes').textContent = pad2(Math.floor(left % 3600000 / 60000));
        $('cd-seconds').textContent = pad2(Math.floor(left % 60000 / 1000));
    }

    /* ---------- Server-IP kopieren ---------- */
    async function copyIp(button) {
        try {
            await navigator.clipboard.writeText(C.SERVER_IP);
        } catch {
            const ta = el('textarea');
            ta.value = C.SERVER_IP;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.append(ta);
            ta.select();
            const ok = document.execCommand('copy');
            ta.remove();
            if (!ok) return toast(`Bitte manuell kopieren: ${C.SERVER_IP}`);
        }
        toast(`IP kopiert: ${C.SERVER_IP}`);
        const original = button.textContent;
        button.textContent = 'Kopiert!';
        setTimeout(() => button.textContent = original, 1500);
    }

    document.querySelectorAll('[data-copy-ip]').forEach(b => b.addEventListener('click', () => copyIp(b)));

    /* ---------- Kalendereintrag (.ics) ---------- */
    $('btn-calendar').addEventListener('click', () => {
        const utc = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        const end = new Date(START.getTime() + 60 * 60 * 1000);
        const ics = [
            'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Scuffed Attack//DE', 'BEGIN:VEVENT',
            `UID:${utc(START)}@scuffed-attack`,
            `DTSTAMP:${utc(new Date())}`,
            `DTSTART:${utc(START)}`,
            `DTEND:${utc(end)}`,
            `SUMMARY:${C.PROJECT_NAME} startet`,
            `DESCRIPTION:Server-IP: ${C.SERVER_IP}`,
            'END:VEVENT', 'END:VCALENDAR'
        ].join('\r\n');

        const link = el('a');
        link.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
        link.download = 'scuffed-attack-3.ics';
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    });

    /* ---------- Serverstatus ---------- */
    const state = { onlineNames: new Set(), names: [], playersState: 'loading', showAll: false };

    function setStatus(kind, text) {
        $('status').dataset.state = kind;
        $('status-text').textContent = text;
    }

    async function refreshStatus() {
        try {
            const response = await fetch(API_URL, { cache: 'no-store', signal: timeout() });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            if (data.online) {
                setStatus('online', 'Server ist online');
                $('fact-version').textContent = data.version?.name_clean || data.version?.name_raw || '–';
                $('fact-players').textContent = `${data.players.online} / ${data.players.max}`;
            } else if (START > Date.now()) {
                setStatus('waiting', `Noch offline, Start am ${dateShort} um ${clock} Uhr`);
                $('fact-version').textContent = '–';
                $('fact-players').textContent = '–';
            } else {
                setStatus('offline', 'Server ist gerade offline');
                $('fact-version').textContent = '–';
                $('fact-players').textContent = '–';
            }

            const online = data.online ? (data.players?.list || []) : [];
            state.onlineNames = new Set(online.map(p => (p.name_clean || p.name_raw).toLowerCase()));
            renderOnline(online);
            renderPlayers();
        } catch (error) {
            console.error('[Status]', error);
            setStatus('error', 'Status gerade nicht abrufbar');
        }
    }

    function renderOnline(list) {
        $('online-now').hidden = list.length === 0;
        $('online-list').replaceChildren(...list.map(p => {
            const name = p.name_clean || p.name_raw;
            const li = el('li');
            const a = el('a', 'chip');
            a.href = profile(name);
            a.target = '_blank';
            a.rel = 'noopener';
            const img = el('img');
            img.src = skin(name);
            img.alt = '';
            img.loading = 'lazy';
            a.append(img, el('span', 'name', name));
            li.append(a);
            return li;
        }));
    }

    /* ---------- Angemeldete Spieler ---------- */
    function parseCSV(text) {
        const rows = [];
        let row = [], cell = '', quoted = false;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (quoted) {
                if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
                else if (ch === '"') quoted = false;
                else cell += ch;
            } else if (ch === '"') quoted = true;
            else if (ch === ',') { row.push(cell); cell = ''; }
            else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
            else if (ch !== '\r') cell += ch;
        }
        row.push(cell);
        rows.push(row);
        return rows;
    }

    async function loadPlayers() {
        if (!C.PLAYERS_CSV_URL) {
            console.warn('[Spielerliste] PLAYERS_CSV_URL in config.js ist noch leer.');
            state.playersState = 'unconfigured';
            return renderPlayers();
        }
        try {
            const response = await fetch(C.PLAYERS_CSV_URL, { signal: timeout() });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const rows = parseCSV(await response.text()).slice(1);

            const seen = new Set();
            state.names = rows
                .map(r => (r[C.NAME_COLUMN] || '').trim())
                .filter(n => NAME_PATTERN.test(n) && !seen.has(n.toLowerCase()) && seen.add(n.toLowerCase()));
            state.playersState = 'ok';
        } catch (error) {
            console.error('[Spielerliste]', error);
            state.playersState = 'error';
        }
        renderPlayers();
    }

    function renderPlayers() {
        const box = $('players-state');
        const grid = $('player-grid');
        const more = $('btn-more');
        const query = $('player-search').value.trim().toLowerCase();

        box.className = 'state';
        box.replaceChildren();
        more.hidden = true;
        $('players-count').textContent = state.playersState === 'ok' ? `(${state.names.length})` : '';

        if (state.playersState !== 'ok') {
            grid.replaceChildren();
            if (state.playersState === 'loading') box.textContent = 'Lade Spieler …';
            else if (state.playersState === 'unconfigured') box.textContent = 'Die Spielerliste erscheint hier, sobald die Anmeldungen laufen.';
            else {
                box.classList.add('is-error');
                box.append('Die Liste konnte nicht geladen werden. ');
                const retry = el('button', 'link-button', 'Erneut versuchen');
                retry.type = 'button';
                retry.addEventListener('click', () => { state.playersState = 'loading'; renderPlayers(); loadPlayers(); });
                box.append(retry);
            }
            return;
        }

        const matches = state.names.filter(n => n.toLowerCase().includes(query));
        const limited = !query && !state.showAll && matches.length > PAGE_SIZE;
        const shown = limited ? matches.slice(0, PAGE_SIZE) : matches;

        grid.replaceChildren(...shown.map(name => {
            const li = el('li');
            const a = el('a', 'player');
            a.href = profile(name);
            a.target = '_blank';
            a.rel = 'noopener';
            const img = el('img');
            img.src = skin(name);
            img.alt = '';
            img.loading = 'lazy';
            a.append(img, el('span', 'name', name));
            if (state.onlineNames.has(name.toLowerCase())) {
                const live = el('span', 'live');
                live.title = 'Gerade online';
                const sr = el('span', 'visually-hidden', ' (online)');
                a.append(live, sr);
            }
            li.append(a);
            return li;
        }));

        if (!matches.length) {
            box.textContent = state.names.length
                ? 'Kein Spieler mit diesem Namen gefunden.'
                : 'Noch niemand angemeldet. Sei der Erste!';
        }
        if (limited) {
            more.hidden = false;
            more.textContent = `Alle ${matches.length} anzeigen`;
        }
    }

    $('btn-more').addEventListener('click', () => { state.showAll = true; renderPlayers(); });
    $('player-search').addEventListener('input', renderPlayers);

    /* ---------- Anmelde-Popup ---------- */
    const dialog = $('signup');
    const frame = $('signup-frame');

    function openSignup() {
       window.location.href = TALLY_URL;
    }
    document.querySelectorAll('[data-open-signup]').forEach(b => b.addEventListener('click', openSignup));
    dialog.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });  // Klick auf den Hintergrund

    // Tally meldet, wenn das Formular abgeschickt wurde
    window.addEventListener('message', e => {
        if (e.origin === 'https://tally.so' && typeof e.data === 'string' && e.data.includes('Tally.FormSubmitted')) {
            toast('Danke für deine Anmeldung! Dein Name erscheint in wenigen Minuten in der Liste.');
        }
    });

    /* ---------- Start ---------- */
    tick();
    refreshStatus();
    loadPlayers();
    renderPlayers();

    setInterval(tick, 1000);
    setInterval(refreshStatus, 30000);
    setInterval(loadPlayers, 5 * 60 * 1000);
    $('btn-refresh').addEventListener('click', () => { setStatus('loading', 'Status wird geladen …'); refreshStatus(); });
})();
