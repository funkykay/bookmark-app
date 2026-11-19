# Lesezeichen

Eine kleine Web-App, mit der du deine Lieblingslinks direkt im Browser sammeln und verwalten kannst.

[App auf bookmarks.kaydonner.de öffnen](https://bookmarks.kaydonner.de/)

## Funktionen

- Lesezeichen hinzufügen, öffnen, bearbeiten und löschen. Neue Lesezeichen erscheinen oben.
- Nach Namen oder URL suchen
- Mehrere Labels pro Lesezeichen vergeben und die Liste nach einem Label filtern
- Neue Labels direkt im Lesezeichen eingeben. In der Desktopnavigation unter **Labels** und mobil unter **⋯ → Labels** lassen sich Labels anlegen, umbenennen, einfärben und löschen.
- Unter **Einstellungen → Daten** Lesezeichen als JSON-Datei importieren und exportieren oder alle lokalen App-Daten einschließlich PIN-Schutz löschen
- Unter **Einstellungen → Sprache** zwischen Deutsch und Englisch wechseln. Die gespeicherte Auswahl hat Vorrang. Ohne Auswahl startet die App bei deutscher Browsersprache (etwa `de-AT` oder `de-CH`) auf Deutsch, sonst auf Englisch.
- Breite Fenster zeigen eine Desktopansicht mit direkter Navigation und mehrspaltigen Lesezeichenkarten. Unter **Einstellungen → Darstellung → Breite der mobilen Ansicht** legst du fest, wie lange die mobile Liste aktiv bleibt. Der Regler rastet bei **Immer Desktop**, **Standard** und **Immer mobil** leicht ein.
- Die Oberfläche optional mit einer PIN sperren

Die App speichert deine Lesezeichen und PIN-Einstellungen im Browser (`localStorage`). Zum Übertragen deiner Lesezeichen auf ein anderes Gerät oder an einen anderen Speicherort verwende den JSON-Export und -Import. Auch mit aktivierter PIN bleiben die gespeicherten Lesezeichen im Klartext.

Browser-Speicher und JSON-Export verwenden dasselbe Format (Version 3). Das Backup enthält alle Labels mit ID, Name und Farbe, auch ungenutzte Labels. Die Lesezeichen enthalten die zugehörigen Label-IDs. Vorhandene Daten und Backups der Version 2 mit oder ohne Einzel-Label können weiterhin geladen werden.

Der Import fügt neue Lesezeichen in ihrer Listenreihenfolge vorne ein. Bei bekannten Lesezeichen-IDs bleibt die lokale Fassung erhalten. Labels werden zuerst anhand der ID, dann anhand des Namens zugeordnet. Bereits vorhandene Labels behalten ihren lokalen Namen und ihre Farbe. Ungültige Dateien werden vollständig abgelehnt.

In dieser Version beginnen die Lesezeichenliste und der PIN-Schutz in eigenen neuen Speichereinträgen. Wer eine PIN verwenden möchte, richtet sie für diese Version neu ein.

## Entwicklung

Vorausgesetzt wird Node.js 20 ab 20.19 oder Node.js ab 22.12.

```sh
npm ci
npm run dev
```

Öffne die lokale URL, die Vite im Terminal ausgibt (standardmäßig `http://localhost:5173`).

## Prüfen und bauen

```sh
npm run typecheck   # TypeScript prüfen
npm run build       # TypeScript prüfen und den Produktions-Build erzeugen
npm run preview     # den Build lokal im Browser prüfen
```

Der Build erzeugt eine einzelne Datei, `dist/index.html`. Sie enthält die Styles und das JavaScript und lässt sich per Doppelklick offline öffnen, weitergeben oder auf einem statischen Webserver bereitstellen.

## Struktur

- `index.html` enthält das Seiten-Markup mit Übersetzungsschlüsseln und ist der Einstiegspunkt für Vite.
- `src/i18n/` enthält die beiden typgeprüften Sprachkataloge. Statische Texte und Attribute verwenden `data-i18n`-Bindungen, dynamische Texte kommen über `messages()` aus dem aktiven Katalog. Beide Sprachen sind im Offline-Build enthalten.
- `src/main.ts` registriert die Ansichten. `src/views.ts` wechselt die sichtbare Ansicht und setzt den Tastaturfokus auf ihre Überschrift.
- `src/bookmarks/` enthält die Lesezeichenansicht, die Validierung und den lokalen Speicher.
- `src/labels/` enthält die Label-Verwaltung und die Mehrfachauswahl im Lesezeichen-Editor.
- `src/settings/view.ts` enthält die Einstellungen für PIN-Schutz und Datenverwaltung.
- `src/pin/` enthält die PIN-Oberfläche und verwendet Web Crypto für die PIN-Prüfung.
- `src/styles.scss` enthält die Komponentenstile und die Farben für Hell- und Dunkelmodus.
