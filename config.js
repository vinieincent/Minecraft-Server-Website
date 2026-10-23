/* =====================================================
   HIER STELLST DU ALLES EIN – mehr musst du nicht anfassen.
   Die Server-IP wird automatisch überall verwendet:
   Anzeige, Kopieren-Button, Status-API, Spielerzahl, Version.
   ===================================================== */
window.SITE = {

    // Name des Projekts (Titel, Überschrift, Kalendereintrag)
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
    MODPACK_URL: '',

    // "Zurück"-Link im Footer
    HOME_URL: 'https://vinicent.de',
    PROJECTS_URL: 'https://vinicent.de'
};
