/* =====================================================
   app.js – Logik der Seite. Einstellungen stehen in config.js.
   ===================================================== */
(() => {
    const C = window.SITE;
    const START = new Date(C.START);
    // Statusabfrage über mc-api.io. "host" oder "host:port" aus config.js.
    const HOST_PATTERN = /^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$/;
    const [SERVER_HOST, SERVER_PORT] = String(C.SERVER_IP).trim().split(':');
    // Ein Platzhalter wie "Bald verfügbar" ist keine IP: Host braucht einen Punkt
    const HAS_VALID_IP = HOST_PATTERN.test(SERVER_HOST) && SERVER_HOST.includes('.') &&
        (SERVER_PORT === undefined || /^\d{1,5}$/.test(SERVER_PORT));
    const API_URL = HAS_VALID_IP
        ? `https://mc-api.io/server/JAVA/${encodeURIComponent(SERVER_HOST)}` +
          (SERVER_PORT ? `/${SERVER_PORT}` : '')
        : null;

    // Ab dem Ende des Countdowns wird die Liste in online/offline geteilt.
    // Einzige Quelle dafür ist tick(): Sie setzt "live" genau einmal auf true,
    // damit Phase, Modus, Status und Liste immer denselben Stand nutzen.
    let live = false;
    const isLive = () => live;
    const TALLY_URL = `https://tally.so/r/${C.TALLY_FORM_ID}`;
    const TALLY_EMBED = `https://tally.so/embed/${C.TALLY_FORM_ID}?hideTitle=1&alignLeft=1`;
    const PAGE_SIZE = 24;
    const NAME_PATTERN = /^[A-Za-z0-9_]{3,16}$/;

    // Admins aus config.js (ungültige Namen und Doppelte werden ignoriert)
    const ADMINS = [...new Map(
        (Array.isArray(C.ADMINS) ? C.ADMINS : [])
            .map(n => String(n).trim())
            .filter(n => NAME_PATTERN.test(n))
            .map(n => [n.toLowerCase(), n])
    ).values()];
    const ADMIN_KEYS = new Set(ADMINS.map(n => n.toLowerCase()));

    const $ = id => document.getElementById(id);
    const pad2 = n => String(n).padStart(2, '0');
    const timeout = () => AbortSignal.timeout(8000);

    function el(tag, className, text) {
        const e = document.createElement(tag);
        if (className) e.className = className;
        if (text !== undefined) e.textContent = text;
        return e;
    }

    /* ---------- Minecraft UUID und Player Heads ---------- */
    const UUID_CACHE = new Map();
    const UUID_PENDING = new Map();
    // Fehlgeschlagene Abfragen: Name -> Zeitpunkt, ab dem neu gefragt wird
    const UUID_FAILED = new Map();
    const UUID_RETRY_MS = 5 * 60 * 1000;

    const skin = uuid =>
        `https://mc-api.io/render/HEAD/${encodeURIComponent(uuid)}?size=72`;

    // Gibt die UUID zurück oder null, wenn die Abfrage vor Kurzem fehlschlug
    async function getPlayerUUID(name) {
        const key = name.toLowerCase();

        if (UUID_CACHE.has(key)) {
            return UUID_CACHE.get(key);
        }

        if (UUID_PENDING.has(key)) {
            return UUID_PENDING.get(key);
        }

        if (UUID_FAILED.has(key)) {
            if (Date.now() < UUID_FAILED.get(key)) {
                return null;
            }
            UUID_FAILED.delete(key);
        }

        const request = (async () => {
            const response = await fetch(
                `https://mc-api.io/uuid/${encodeURIComponent(name)}/JAVA`,
                { signal: timeout() }
            );

            // 4xx (außer 429) heißt: Name existiert nicht, nie wieder fragen.
            // Alles andere (Netz, 429, 5xx) wird nach UUID_RETRY_MS erneut versucht.
            const permanent = response.status >= 400 && response.status < 500 &&
                response.status !== 429;

            if (!response.ok) {
                UUID_FAILED.set(key, permanent ? Infinity : Date.now() + UUID_RETRY_MS);
                throw new Error(`UUID-Abfrage fehlgeschlagen: HTTP ${response.status}`);
            }

            const data = await response.json();

            if (!data.uuid) {
                UUID_FAILED.set(key, Infinity);
                throw new Error(`Keine UUID für ${name} gefunden.`);
            }

            UUID_CACHE.set(key, data.uuid);
            return data.uuid;
        })();

        UUID_PENDING.set(key, request);

        try {
            return await request;
        } catch (error) {
            if (!UUID_FAILED.has(key)) {
                UUID_FAILED.set(key, Date.now() + UUID_RETRY_MS);
            }
            throw error;
        } finally {
            UUID_PENDING.delete(key);
        }
    }

    // Player Heads nacheinander laden: höchstens HEAD_CONCURRENCY Abfragen
    // gleichzeitig, damit die API nicht wegen zu vieler Anfragen blockiert.
    const HEAD_CONCURRENCY = 3;
    const headQueue = [];
    let headsActive = 0;

    function drainHeads() {
        while (headsActive < HEAD_CONCURRENCY && headQueue.length) {
            const job = headQueue.shift();
            headsActive++;
            job().finally(() => {
                headsActive--;
                drainHeads();
            });
        }
    }

    function loadPlayerHead(img, name) {
        headQueue.push(async () => {
            // Inzwischen neu gerendert? Dann ist dieser Kopf nicht mehr nötig.
            if (!img.isConnected) return;

            try {
                const uuid = await getPlayerUUID(name);

                if (uuid && img.isConnected) {
                    img.src = skin(uuid);
                }
            } catch (error) {
                console.error(`[Player Head: ${name}]`, error);
            }
        });
        // Erst nach dem Rendern starten, wenn das Bild schon im DOM hängt
        queueMicrotask(drainHeads);
    }

    const profile = name => `https://namemc.com/profile/${encodeURIComponent(name)}`;

    /* ---------- Texte aus config.js einsetzen ---------- */
    const zone = { timeZone: 'Europe/Berlin' };
    const dateLong = new Intl.DateTimeFormat('de-DE', {
        ...zone,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(START);

    const dateShort = new Intl.DateTimeFormat('de-DE', {
        ...zone,
        day: 'numeric',
        month: 'long'
    }).format(START);

    const dateYear = new Intl.DateTimeFormat('de-DE', {
        ...zone,
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(START);

    const clock = new Intl.DateTimeFormat('de-DE', {
        ...zone,
        hour: '2-digit',
        minute: '2-digit'
    }).format(START);

    document.querySelectorAll('[data-project]').forEach(n => n.textContent = C.PROJECT_NAME);
    document.querySelectorAll('[data-ip]').forEach(n => n.textContent = C.SERVER_IP);

    $('start-time').textContent = `${dateLong}, ${clock} Uhr`;
    $('start-time').dateTime = START.toISOString();
    $('start-short').textContent = `${dateShort} um ${clock} Uhr`;
    $('signup-newtab').href = TALLY_URL;
    $('home-link').href = C.HOME_URL;
    $('projects-link').href = C.PROJECTS_URL;

    document.title = `${C.PROJECT_NAME} – Start am ${dateShort} um ${clock} Uhr`;
    document.querySelector('meta[name="description"]').content =
        `${C.PROJECT_NAME} startet am ${dateYear} um ${clock} Uhr. ` +
        'Kostenlos anmelden und mit der Server-IP beitreten.';

    // Ohne gültige IP gibt es nichts zu kopieren
    document.querySelectorAll('[data-copy-ip]').forEach(b => b.disabled = !HAS_VALID_IP);

    if (C.MODPACK_URL) {
        $('modpack').hidden = false;
        $('modpack-nav').hidden = false;
        $('modpack-link').href = C.MODPACK_URL;
    }

    if (/^https:\/\//.test(C.DISCORD_URL || '')) {
        $('discord-link').hidden = false;
        $('discord-link').href = C.DISCORD_URL;
    }

    /* ---------- Regeln und FAQ aus config.js ---------- */
    // {START} wird zum Startdatum, jedes andere {FELD} zum Wert aus config.js
    const fillPlaceholders = text => String(text).replace(/\{([A-Z_]+)\}/g, (_, key) =>
        key === 'START' ? `${dateYear} um ${clock} Uhr`
            : typeof C[key] === 'string' ? C[key].trim() : ''
    );

    // Text mit [Text](Adresse)-Links in Knoten umwandeln.
    // Nur https:// und #anker werden zu Links, leere Adressen bleiben Text.
    function richText(text, tag = 'p') {
        const p = el(tag);
        const pattern = /\[([^\]]+)\]\(([^)\s]*)\)/g;
        const filled = fillPlaceholders(text);
        let last = 0;
        let match;

        while ((match = pattern.exec(filled))) {
            p.append(filled.slice(last, match.index));

            const [, label, url] = match;

            if (/^(https:\/\/|#)/.test(url)) {
                const a = el('a', null, label);
                a.href = url;

                if (url.startsWith('https://')) {
                    a.target = '_blank';
                    a.rel = 'noopener';
                }
                p.append(a);
            } else {
                p.append(label);
            }
            last = pattern.lastIndex;
        }

        p.append(filled.slice(last));
        return p;
    }

    const faq = (Array.isArray(C.FAQ) ? C.FAQ : []).filter(item =>
        item && item.frage && item.antwort &&
        (!item.nurMit || String(C[item.nurMit] || '').trim())
    );

    $('faq-list').replaceChildren(...faq.map(item => {
        const details = el('details', item.nurVorStart ? 'only-soon' : null);
        details.append(el('summary', null, item.frage), richText(item.antwort));
        return details;
    }));

    $('faq').hidden = faq.length === 0;
    $('faq-nav').hidden = faq.length === 0;

    const rules = (Array.isArray(C.REGELN) ? C.REGELN : []).filter(
        item => item && (item.titel || item.text)
    );

    // Gleiche aufklappbare Kästen wie beim FAQ
    $('rules-list').replaceChildren(...rules.map(item => {
        const details = el('details');
        details.append(el('summary', null, item.titel || item.text));
        if (item.titel && item.text) details.append(richText(item.text));
        return details;
    }));

    $('regeln').hidden = rules.length === 0;
    $('rules-nav').hidden = rules.length === 0;

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
        if (live) return;

        const left = START - Date.now();

        if (left <= 0) {
            live = true;
            clearInterval(tickTimer);
            document.body.dataset.phase = 'live';
            updateMode();

            if (booted) {
                // Countdown ist gerade abgelaufen: Liste in online/offline teilen
                // und Status ("Noch offline …" -> "offline") neu holen
                renderPlayers();
                refreshStatus();
            }
            return;
        }

        document.body.dataset.phase = 'soon';
        $('cd-days').textContent = pad2(Math.floor(left / 86400000));
        $('cd-hours').textContent = pad2(Math.floor(left % 86400000 / 3600000));
        $('cd-minutes').textContent = pad2(Math.floor(left % 3600000 / 60000));
        $('cd-seconds').textContent = pad2(Math.floor(left % 60000 / 1000));
    }

    /* ---------- Server-IP kopieren ---------- */
    async function copyIp(button) {
        if (!HAS_VALID_IP) return;

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

            if (!ok) {
                return toast(`Bitte manuell kopieren: ${C.SERVER_IP}`);
            }
        }

        toast(`IP kopiert: ${C.SERVER_IP}`);

        const original = button.textContent;
        button.textContent = 'Kopiert!';

        setTimeout(() => button.textContent = original, 1500);
    }

    document.querySelectorAll('[data-copy-ip]').forEach(
        b => b.addEventListener('click', () => copyIp(b))
    );

    /* ---------- Kalendereintrag (.ics) ---------- */
    $('btn-calendar').addEventListener('click', () => {
        const utc = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        const end = new Date(START.getTime() + 60 * 60 * 1000);
        // "Fitna Scuffed 1" -> "fitna-scuffed-1" für Dateiname und UID
        const slug = C.PROJECT_NAME.toLowerCase()
            .normalize('NFKD').replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'event';

        const ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            `PRODID:-//${C.PROJECT_NAME}//DE`,
            'BEGIN:VEVENT',
            `UID:${utc(START)}@${slug}`,
            `DTSTAMP:${utc(new Date())}`,
            `DTSTART:${utc(START)}`,
            `DTEND:${utc(end)}`,
            `SUMMARY:${C.PROJECT_NAME} startet`,
            // Solange noch keine gültige IP eingetragen ist, keine Beschreibung
            ...(HAS_VALID_IP ? [`DESCRIPTION:Server-IP: ${C.SERVER_IP}`] : []),
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        const link = el('a');
        link.href = URL.createObjectURL(
            new Blob([ics], { type: 'text/calendar' })
        );
        link.download = `${slug}.ics`;

        document.body.append(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    });

    /* ---------- Serverstatus ---------- */
    const state = {
        onlineNames: new Set(),
        onlineList: [],
        serverOnline: false,
        names: [],
        realNames: {},
        playersState: 'loading',
        showAll: false
    };

    let booted = false;
    let tickTimer;

    // Spielmodus: Timer abgelaufen und Server online.
    // Dann tritt die Anmeldung zurück (siehe site.css, [data-mode="play"]),
    // die IP steht klein unter dem Titel und der IP-Kasten rutscht unter
    // die Spielerliste.
    function updateMode() {
        const play = isLive() && state.serverOnline;
        const anchor = play ? $('spieler') : $('serverstatus');

        document.body.dataset.mode = play ? 'play' : 'default';

        if (anchor.nextElementSibling !== $('ip')) {
            anchor.after($('ip'));
        }
    }

    function setStatus(kind, text) {
        $('status').dataset.state = kind;
        $('status-text').textContent = text;
    }

    // MOTD mit Minecraft-Formatcodes (§a, §l, §r, Hex über §x§r§r§g§g§b§b)
    // in Spans mit .mc-*-Klassen umwandeln. §k (verschleiert) wird ignoriert.
    function renderMotd(text) {
        const spans = [];
        let color = null;
        let hex = null;
        let formats = new Set();

        String(text).split(/(§x(?:§[0-9a-f]){6}|§[0-9a-fk-or])/i).forEach(part => {
            if (!part) return;

            if (/^§x/i.test(part)) {
                hex = '#' + part.replace(/§x|§/gi, '');
                color = null;
                formats = new Set();
                return;
            }

            if (/^§[0-9a-fk-or]$/i.test(part)) {
                const code = part[1].toLowerCase();

                // Farbe oder §r setzt alle Formatierungen zurück
                if (/[0-9a-fr]/.test(code)) {
                    color = code === 'r' ? null : code;
                    hex = null;
                    formats = new Set();
                } else if (code !== 'k') {
                    formats.add(code);
                }
                return;
            }

            const span = el('span', [
                color && `mc-${color}`,
                ...[...formats].map(f => `mc-${f}`)
            ].filter(Boolean).join(' '), part);

            if (hex) span.style.color = hex;
            spans.push(span);
        });

        return spans;
    }

    function setServerCard(data) {
        const motd = data && (data.motd || data.rawMotd);
        const icon = data && data.favicon;
        const validIcon = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(icon || '');

        $('server-card').hidden = !motd && !validIcon;
        $('server-motd').replaceChildren(...(motd ? renderMotd(motd) : []));
        $('server-icon').hidden = !validIcon;

        if (validIcon) {
            $('server-icon').src = icon;
        } else {
            $('server-icon').removeAttribute('src');
        }
    }

    // Holt den Serverstatus. Ein Server, der nicht antwortet, gilt als offline.
    async function fetchServer() {
        if (!API_URL) {
            return { online: false };
        }

        const response = await fetch(API_URL, {
            cache: 'no-store',
            signal: timeout()
        });

        // 503 = Server konnte gar nicht angepingt werden, also offline
        if (response.status === 503) {
            return { online: false };
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return response.json();
    }

    async function refreshStatus() {
        try {
            const data = await fetchServer();
            const online = Boolean(data.online);

            setServerCard(online ? data : null);
            $('facts').hidden = !online;

            if (online) {
                setStatus('online', 'Server ist online');
                $('fact-version').textContent = data.version || '–';
                $('fact-players').textContent =
                    `${data.onlinePlayers ?? 0} / ${data.maxPlayers ?? '–'}`;
            } else if (!isLive()) {
                setStatus('waiting', `Noch offline, Start am ${dateShort} um ${clock} Uhr`);
                $('fact-version').textContent = '–';
                $('fact-players').textContent = '–';
            } else {
                setStatus('offline', 'Server ist gerade offline');
                $('fact-version').textContent = '–';
                $('fact-players').textContent = '–';
            }

            // Ist der Server offline, gibt es keine Online-Spieler.
            // Dann landen alle Angemeldeten in "Gerade offline".
            const names = online
                ? (data.players || []).filter(n => typeof n === 'string' && n)
                : [];

            state.serverOnline = online;
            state.onlineList = names;
            state.onlineNames = new Set(names.map(n => n.toLowerCase()));

            updateMode();
            renderOnline(names);
            renderPlayers();
        } catch (error) {
            console.error('[Status]', error);
            setStatus('error', 'Status gerade nicht abrufbar');
        }
    }

    function renderOnline(names) {
        $('online-now').hidden = names.length === 0;

        $('online-list').replaceChildren(...names.map(name => {
            const li = el('li');
            const a = el('a', 'chip');

            a.href = profile(name);
            a.target = '_blank';
            a.rel = 'noopener';

            const img = el('img');
            img.alt = '';
            img.loading = 'lazy';

            loadPlayerHead(img, name);

            a.append(img, el('span', 'name', name));
            li.append(a);

            return li;
        }));
    }

    /* ---------- Angemeldete Spieler ---------- */
    function parseCSV(text) {
        const rows = [];
        let row = [];
        let cell = '';
        let quoted = false;

        for (let i = 0; i < text.length; i++) {
            const ch = text[i];

            if (quoted) {
                if (ch === '"' && text[i + 1] === '"') {
                    cell += '"';
                    i++;
                } else if (ch === '"') {
                    quoted = false;
                } else {
                    cell += ch;
                }
            } else if (ch === '"') {
                quoted = true;
            } else if (ch === ',') {
                row.push(cell);
                cell = '';
            } else if (ch === '\n') {
                row.push(cell);
                rows.push(row);
                row = [];
                cell = '';
            } else if (ch !== '\r') {
                cell += ch;
            }
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
            const response = await fetch(C.PLAYERS_CSV_URL, {
                signal: timeout()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const rows = parseCSV(await response.text()).slice(1);
            const seen = new Set();
            const realNames = {};
            const names = [];

            rows.forEach(r => {
                const name = (r[C.NAME_COLUMN] || '').trim();
                const realName = (r[C.REAL_NAME_COLUMN] || '').trim();
                const key = name.toLowerCase();

                if (!NAME_PATTERN.test(name) || seen.has(key)) {
                    return;
                }

                seen.add(key);
                names.push(name);

                if (realName) {
                    realNames[key] = realName;
                }
            });

            state.names = names;
            state.realNames = realNames;
            state.playersState = 'ok';
        } catch (error) {
            console.error('[Spielerliste]', error);
            state.playersState = 'error';
        }

        renderPlayers();
    }

    // Alle Spieler, die in der Liste stehen: Admins, Angemeldete und
    // (nach dem Countdown) alle, die gerade online sind, auch ohne Anmeldung.
    function buildRoster() {
        const roster = new Map();

        const add = (name, admin) => {
            const key = name.toLowerCase();

            if (!roster.has(key)) {
                roster.set(key, { name, admin });
            }
        };

        ADMINS.forEach(n => add(n, true));
        state.names.forEach(n => add(n, false));

        if (isLive() && state.serverOnline) {
            state.onlineList.forEach(n => add(n, false));
        }

        return [...roster.values()];
    }

    // Baut einen Listeneintrag für einen Spieler
    function playerItem(player, online) {
        const { name, admin } = player;
        const li = el('li');
        const a = el('a', online ? 'player' : 'player is-offline');

        a.href = profile(name);
        a.target = '_blank';
        a.rel = 'noopener';

        const img = el('img');
        img.alt = '';
        img.loading = 'lazy';

        loadPlayerHead(img, name);

        a.append(img, el('span', 'name', name));

        if (admin) {
            a.append(el('span', 'badge-admin', 'Admin'));
        }

        const realName = state.realNames[name.toLowerCase()];

        if (realName) {
            a.append(el('span', 'real-name', realName));
        }

        if (online) {
            const live = el('span', 'live');
            live.title = 'Gerade online';

            const sr = el('span', 'visually-hidden', ' (online)');

            a.append(live, sr);
        }

        li.append(a);
        return li;
    }

    function renderPlayers() {
        const box = $('players-state');
        const grid = $('player-grid');
        const groups = $('player-groups');
        const more = $('btn-more');
        const query = $('player-search').value.trim().toLowerCase();
        const live = isLive();

        box.className = 'state';
        box.replaceChildren();
        more.hidden = true;

        // Nach dem Countdown heißt der Bereich nur noch "Spieler" und die
        // zwei Gruppen ersetzen die Chip-Zeile "Gerade online"
        $('players-heading').textContent = live ? 'Spieler' : 'Angemeldete Spieler';

        if (live) {
            $('online-now').hidden = true;
        }

        const ok = state.playersState === 'ok';
        const roster = buildRoster();

        // Vor dem Start braucht die Liste die Tabelle. Danach reichen auch
        // Admins und Online-Spieler, falls die Tabelle gerade nicht lädt.
        const usable = ok || (live && roster.length > 0);

        $('players-count').textContent = usable ? `(${roster.length})` : '';

        if (!ok && (!usable || state.playersState === 'error')) {
            if (state.playersState === 'loading') {
                box.textContent = 'Lade Spieler …';
            } else if (state.playersState === 'unconfigured') {
                box.textContent =
                    'Die Spielerliste erscheint hier, sobald die Anmeldungen laufen.';
            } else {
                box.classList.add('is-error');
                box.append('Die Liste der Anmeldungen konnte nicht geladen werden. ');

                const retry = el('button', 'link-button', 'Erneut versuchen');
                retry.type = 'button';

                retry.addEventListener('click', () => {
                    state.playersState = 'loading';
                    renderPlayers();
                    loadPlayers();
                });

                box.append(retry);
            }
        }

        if (!usable) {
            grid.replaceChildren();
            groups.hidden = true;
            return;
        }

        const matches = roster.filter(p =>
            p.name.toLowerCase().includes(query)
        );

        const isOnline = p =>
            state.serverOnline && state.onlineNames.has(p.name.toLowerCase());

        // Vor dem Start: eine gemeinsame Liste. Danach: online und offline getrennt.
        let ordered = matches;

        if (live) {
            ordered = [
                ...matches.filter(isOnline),
                ...matches.filter(p => !isOnline(p))
            ];
        }

        const limited =
            !query && !state.showAll && ordered.length > PAGE_SIZE;

        const shown = limited ? ordered.slice(0, PAGE_SIZE) : ordered;

        if (live) {
            const totalOnline = matches.filter(isOnline).length;
            const totalOffline = matches.length - totalOnline;

            grid.replaceChildren();
            groups.hidden = matches.length === 0;

            $('grid-online').replaceChildren(
                ...shown.filter(isOnline).map(p => playerItem(p, true))
            );
            $('grid-offline').replaceChildren(
                ...shown.filter(p => !isOnline(p)).map(p => playerItem(p, false))
            );

            $('count-online').textContent = `(${totalOnline})`;
            $('count-offline').textContent = `(${totalOffline})`;

            $('empty-online').textContent = totalOnline
                ? ''
                : state.serverOnline
                    ? 'Gerade ist niemand online.'
                    : 'Der Server ist gerade offline.';

            $('group-offline').hidden = totalOffline === 0;
        } else {
            groups.hidden = true;

            grid.replaceChildren(
                ...shown.map(p => playerItem(p, isOnline(p)))
            );
        }

        if (!matches.length && ok) {
            box.textContent = roster.length
                ? 'Kein Spieler mit diesem Namen gefunden.'
                : live
                    ? 'Noch keine Spieler vorhanden.'
                    : 'Noch niemand angemeldet. Sei der Erste!';
        }

        if (limited) {
            more.hidden = false;
            more.textContent = `Alle ${ordered.length} anzeigen`;
        }
    }

    $('btn-more').addEventListener('click', () => {
        state.showAll = true;
        renderPlayers();
    });

    $('player-search').addEventListener('input', renderPlayers);

    /* ---------- Anmelde-Popup ---------- */
    const dialog = $('signup');
    const frame = $('signup-frame');

    function openSignup() {
        window.location.href = TALLY_URL;
    }

    document.querySelectorAll('[data-open-signup]').forEach(
        b => b.addEventListener('click', openSignup)
    );

    dialog.querySelectorAll('[data-close]').forEach(
        b => b.addEventListener('click', () => dialog.close())
    );

    dialog.addEventListener('click', e => {
        if (e.target === dialog) dialog.close();
    });

    // Tally meldet, wenn das Formular abgeschickt wurde
    window.addEventListener('message', e => {
        if (
            e.origin === 'https://tally.so' &&
            typeof e.data === 'string' &&
            e.data.includes('Tally.FormSubmitted')
        ) {
            toast('Danke für deine Anmeldung! Dein Name erscheint in wenigen Minuten in der Liste.');
        }
    });

    /* ---------- Start ---------- */
    tick();
    refreshStatus();
    loadPlayers();
    renderPlayers();
    booted = true;

    if (!live) tickTimer = setInterval(tick, 1000);
    setInterval(refreshStatus, 30000);
    setInterval(loadPlayers, 5 * 60 * 1000);

    $('btn-refresh').addEventListener('click', () => {
        setStatus('loading', 'Status wird geladen …');
        refreshStatus();
    });
})();
