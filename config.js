/* =====================================================
   HIER STELLST DU ALLES EIN – mehr musst du nicht anfassen.
   Die Server-IP wird automatisch überall verwendet:
   Anzeige, Kopieren-Button, Status-API, Spielerzahl, Version.
   ===================================================== */
window.SITE = {

    // Name des Projekts (Titel, Überschrift, Kalendereintrag)
    // Achtung: Die Link-Vorschau (og:-Tags in index.html und assets/vorschau.png)
    // kann config.js nicht lesen. Bei Änderung von Name oder START dort
    // anpassen bzw. das Bild mit tools/vorschau-bild.html neu erzeugen.
    PROJECT_NAME: 'Fitna Scuffed 1',

    // ► SERVER-IP HIER EINFÜGEN (optional mit Port, z. B. 'mc.example.de:25566')
    SERVER_IP: 'Bald verfügbar',

    // Startzeit. Format: JJJJ-MM-TTTHH:MM:SS+Zeitzone
    // 6. November 2026, 18:00 Uhr deutscher Zeit (nach der Zeitumstellung = +01:00)
    START: '2026-11-06T18:00:00+01:00',

    // Tally-Formular: der Teil nach tally.so/r/ im Anmelde-Link
    TALLY_FORM_ID: 'xVXBWE',

    // Liste der angemeldeten Spieler (siehe Anleitung in der Antwort):
    // Link der veröffentlichten Google-Tabelle als CSV. Leer lassen = Liste bleibt leer.
    PLAYERS_CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTloZ1UY_x99yngoXBY5nlLaPxrOoyygJYx1_n7C_OTZPMLSamwrLB9VPUwM-ue3swBUF6ROMAgcGjg/pub?gid=908896186&single=true&output=csv',
    // In welcher Spalte (ab 0 gezählt) steht der Minecraft-Name?
    NAME_COLUMN: 4,
    REAL_NAME_COLUMN: 3,

    // Minecraft-Namen der Admins. Sie stehen immer in der Spielerliste
    // (auch ohne Anmeldung) und bekommen das Label "Admin".
    // Beispiel: ['VinicentDE', 'Notch']
    ADMINS: ['Craftingkatzen',],

    // Modpack-Link (.mrpack). Leer lassen = Modpack-Hinweis wird ausgeblendet.
    MODPACK_URL: 'https://modrinth.com/share/6yZ7208m',

    // Discord-Einladung (z. B. 'https://discord.gg/abc123').
    // Leer lassen = Discord-Button wird ausgeblendet.
    DISCORD_URL: '',

    // Regeln. Einträge hinzufügen, löschen oder umsortieren – die Seite
    // zeigt sie wie die FAQ als aufklappbare Kästen. Leere Liste = kein Regel-Bereich.
    //   titel: kurze Überschrift der Regel (immer sichtbar)
    //   text:  Erklärung zum Aufklappen. Links und Platzhalter wie bei FAQ (siehe unten).
    REGELN: [
        {
            titel: 'Faire Mods sind erlaubt',
            text: 'Eigene Mods sind erlaubt, solange sie fair bleiben und dir keinen Vorteil gegenüber anderen verschaffen.'
        },
        {
            titel: 'Keine Cheat-Mods',
            text: 'Nicht erlaubt sind zum Beispiel X-Ray, Auto-Totem oder normale Freecam.'
        },
        {
            titel: 'Kein Griefing',
            text: 'Zerstöre oder verändere keine Bauten anderer Spieler, auch nicht „nur zum Spaß“.'
        },
        {
            titel: 'Nicht stehlen',
            text: 'Nimm nichts aus fremden Kisten, Bases oder Farmen, wenn der Besitzer es dir nicht erlaubt hat.'
        },
        {
            titel: 'Respektvoll bleiben',
            text: 'Keine Beleidigungen, kein Rassismus, keine Diskriminierung und kein Spam – im Chat genauso wie im Voice.'
        },
        {
            titel: 'Keine Bugs ausnutzen',
            text: 'Duping und andere Glitches sind verboten. Wenn du einen Bug findest, melde ihn bitte den Admins.'
        },
        {
            titel: 'Keine Lag-Maschinen',
            text: 'Baue nichts, was den Server absichtlich ausbremst, zum Beispiel riesige Redstone-Uhren oder Entity-Massen.'
        },
        {
            titel: 'Admins haben das letzte Wort',
            text: 'Folge den Anweisungen der Admins. Wer gegen die Regeln verstößt, kann verwarnt oder vom Server ausgeschlossen werden.'
        }
    ],

    // Häufige Fragen. Einträge hinzufügen, löschen oder umsortieren –
    // die Seite zeigt sie genau in dieser Reihenfolge. Leere Liste = kein FAQ.
    //   frage:       die Frage
    //   antwort:     die Antwort. Links: [Text](https://…) oder [Text](#regeln).
    //                Platzhalter: {START} = Startdatum, {MODPACK_URL},
    //                {DISCORD_URL}, {SERVER_IP} usw. (jedes Feld aus dieser Datei).
    //                Ist die Adresse eines Links leer, erscheint nur der Text.
    //   nurVorStart: true = Frage verschwindet, sobald der Countdown abläuft (optional)
    //   nurMit:      Feldname, z. B. 'DISCORD_URL' = Frage nur zeigen,
    //                wenn dieses Feld ausgefüllt ist (optional)
    FAQ: [
        {
            frage: 'Wann geht es los?',
            antwort: 'Der Server öffnet am {START}. Vorher kannst du dich schon anmelden und die IP speichern.',
            nurVorStart: true
        },
        {
            frage: 'Kostet das etwas?',
            antwort: 'Nein. Anmeldung und Mitspielen sind kostenlos.'
        },
        {
            frage: 'Welche Minecraft-Version brauche ich?',
            antwort: 'Du brauchst die Minecraft Java Edition für PC oder Mac. Die genaue Version steht oben beim [Serverstatus](#serverstatus), sobald der Server online ist.'
        },
        {
            frage: 'Brauche ich Mods?',
            antwort: 'Nein, du brauchst keine Mods. Es gibt aber ein offizielles [Modpack]({MODPACK_URL}), und wir bitten dich, damit zu spielen. Eigene Mods sind erlaubt, solange sie fair bleiben – siehe [Regeln](#regeln).'
        },
        {
            frage: 'Ich bin angemeldet, stehe aber nicht in der Liste.',
            antwort: 'Neue Anmeldungen erscheinen mit etwa 5 Minuten Verzögerung. Prüf auch, ob du deinen Minecraft-Namen genau richtig geschrieben hast. Fehlt er danach immer noch, melde dich bei den Admins.'
        },
        {
            frage: 'Ich komme nicht auf den Server.',
            antwort: 'Schau zuerst beim [Serverstatus](#serverstatus), ob der Server online ist. Kopier die IP am besten mit dem Button, damit kein Zeichen fehlt. Und prüf, ob deine Minecraft-Version zur Version des Servers passt.'
        },
        {
            frage: 'Gibt es einen Discord?',
            antwort: 'Ja! Dort bekommst du Neuigkeiten und Hilfe: [Discord beitreten]({DISCORD_URL}).',
            nurMit: 'DISCORD_URL'
        }
    ],

    // "Zurück"-Link im Footer
    HOME_URL: 'https://vinicent.de',
    PROJECTS_URL: 'https://vinicent.de'
};
