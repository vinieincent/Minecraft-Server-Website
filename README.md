<p align="center">
  <img src="assets/favicon.svg" width="96" height="96" alt="">
</p>

<h1 align="center">Fitna Scuffed – Event-Website</h1>

<p align="center">
  Startseite für das Minecraft-Event <b>Fitna Scuffed</b>: Countdown, Anmeldung, Server-IP, Serverstatus und Spielerliste.<br>
  Live unter <a href="https://vinicent.de">vinicent.de</a>
</p>

---

## Was die Seite kann

- **Countdown** bis zum Start. Danach wechselt die Seite automatisch in den Spielmodus: Anmeldung tritt zurück, Spielerzahl und Version stehen oben.
- **Anmeldung** über ein Tally-Formular
- **Server-IP** mit Kopieren-Button (gesperrt, solange noch keine gültige IP eingetragen ist)
- **Serverstatus** über [mc-api.io](https://mc-api.io): online/offline, Version, Spielerzahl, Server-Icon und MOTD mit Minecraft-Farben
- **Spielerliste** aus einer Google-Tabelle, mit Player Heads, Suche und Admin-Label. Nach dem Start getrennt nach online und offline.
- **Kalendereintrag** (.ics) zum Herunterladen
- **Regeln** als aufklappbare Kästen wie die FAQ, in `config.js` pflegbar
- **Modpack** als eigener Bereich mit Download-Link (optional)
- **Discord-Button** (optional)
- **FAQ** mit aufklappbaren Antworten, komplett in `config.js` pflegbar
- **Link-Vorschau** für Discord, WhatsApp & Co. und eigenes Favicon

Reines HTML, CSS und JavaScript, kein Build-Schritt, keine Abhängigkeiten. Schriften liegen lokal im Repo.

## Einstellungen

Alles Wichtige steht in [`config.js`](config.js). Mehr muss normalerweise nicht angefasst werden.

| Feld | Bedeutung |
| --- | --- |
| `PROJECT_NAME` | Name des Events (Titel, Überschrift, Kalendereintrag) |
| `SERVER_IP` | Server-Adresse, optional mit Port (`mc.example.de:25566`). Ein Platzhalter wie „Bald verfügbar“ sperrt den Kopieren-Button. |
| `START` | Startzeit mit Zeitzone, z. B. `2026-11-06T18:00:00+01:00` |
| `TALLY_FORM_ID` | Teil nach `tally.so/r/` im Anmelde-Link |
| `PLAYERS_CSV_URL` | Veröffentlichte Google-Tabelle als CSV. Leer = keine Liste. |
| `NAME_COLUMN` / `REAL_NAME_COLUMN` | Spalten (ab 0) für Minecraft-Name und Klarname |
| `ADMINS` | Minecraft-Namen, die immer in der Liste stehen und das Label „Admin“ bekommen |
| `MODPACK_URL` | Link zum Modpack (.mrpack). Leer = ausgeblendet. |
| `DISCORD_URL` | Discord-Einladung. Leer = ausgeblendet. |
| `HOME_URL` / `PROJECTS_URL` | Links im Footer |
| `REGELN` | Liste der Regeln mit `titel` und `text`, aufklappbar wie die FAQ. Leer = kein Regel-Bereich. |
| `FAQ` | Liste der häufigen Fragen (siehe unten). Leer = kein FAQ-Bereich. |

### FAQ bearbeiten

Jede Frage ist ein Eintrag in `FAQ` in `config.js`. Zum Hinzufügen einen Block kopieren, zum Entfernen löschen. Die Reihenfolge auf der Seite entspricht der Reihenfolge in der Datei.

```js
{
    frage: 'Brauche ich Mods?',
    antwort: 'Nein. Es gibt aber ein offizielles [Modpack]({MODPACK_URL}).'
},
```

- **Links** schreibst du als `[Text](https://…)` oder `[Text](#regeln)`.
- **Platzhalter** wie `{START}` (Startdatum), `{MODPACK_URL}` oder `{DISCORD_URL}` werden durch die Werte aus `config.js` ersetzt. Ist eine Link-Adresse leer, erscheint nur der Text.
- **`nurVorStart: true`** blendet die Frage aus, sobald der Countdown abgelaufen ist.
- **`nurMit: 'DISCORD_URL'`** zeigt die Frage nur, wenn das genannte Feld ausgefüllt ist.

> [!IMPORTANT]
> Discord, WhatsApp & Co. führen kein JavaScript aus. Die Link-Vorschau (`og:`-Tags in `index.html` und `assets/vorschau.png`) liest `config.js` deshalb nicht. Ändern sich Name oder Startzeit, dort von Hand anpassen und das Bild neu erzeugen (siehe unten).

## Ordner

```
index.html                Seite
config.js                 Einstellungen
app.js                    Logik (Countdown, Status, Spielerliste …)
site.css                  Styles
fonts/                    Schriften (Atkinson Hyperlegible, Pixelify Sans)
assets/
  favicon.svg             Icon (Vorlage für alle anderen Bilder)
  favicon-32.png          Favicon für ältere Browser
  apple-touch-icon.png    Icon für den iPhone-Homescreen
  server-icon.png         Minecraft-Server-Icon, genau 64×64
  vorschau.png            Link-Vorschau, 1200×630
tools/vorschau-bild.html  Erzeugt die Bilder in assets/ neu
CNAME                     Domain für GitHub Pages
```

## Bilder neu erzeugen

`tools/vorschau-bild.html` über den Webserver öffnen, also z. B. `https://vinicent.de/tools/vorschau-bild.html` oder lokal (siehe unten). Die Seite liest `config.js` und `assets/favicon.svg` und erzeugt Vorschaubild, Favicon-PNG, Apple-Icon und Server-Icon zum Herunterladen. Die Dateien dann in `assets/` ersetzen.

Das Server-Icon kommt als `server-icon.png` in den Hauptordner des Minecraft-Servers.

## Lokal testen

Die Seite braucht einen kleinen Webserver, direkt als Datei geöffnet laden Schriften und Skripte nicht. Zum Beispiel:

```bash
python3 -m http.server 8000
```

Dann `http://localhost:8000` öffnen.

## Veröffentlichen

Die Seite läuft über GitHub Pages. Was auf `main` landet, ist nach kurzer Zeit unter [vinicent.de](https://vinicent.de) online. Die Domain steht in `CNAME`.
