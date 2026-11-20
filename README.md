# Lesezeichen

Eine kleine Web-App, mit der du deine Lieblingslinks direkt im Browser sammeln und verwalten kannst.

[App auf bookmarks.kaydonner.de öffnen](https://bookmarks.kaydonner.de/)

## Funktionen

- Lesezeichen hinzufügen, öffnen, bearbeiten und löschen. Neue Lesezeichen erscheinen oben.
- Tabs übernehmen Änderungen an Lesezeichen und Labels automatisch. Unabhängige Änderungen werden zusammengeführt. Wurde derselbe Eintrag zwischenzeitlich geändert oder gelöscht, meldet der Editor einen Konflikt. Nach einem Reset müssen offene Vorgänge neu gestartet werden.
- Nach Namen oder URL suchen
- Lesezeichen (`#/bookmarks`), Labels (`#/labels`) und Einstellungen (`#/settings`) direkt per URL öffnen und mit den Browser-Tasten Zurück und Vorwärts zwischen den Ansichten wechseln. Bei aktivem PIN-Schutz öffnet sich das Ziel nach dem Entsperren. In der Webversion sind Impressum (`#/impressum`) und Datenschutz (`#/datenschutz`) auch bei gesperrter App erreichbar.
- Mehrere Labels pro Lesezeichen vergeben und die Liste nach einem Label filtern
- Neue Labels direkt im Lesezeichen eingeben. In der Desktopnavigation unter **Labels** und mobil unter **⋯ → Labels** lassen sich Labels anlegen, umbenennen, einfärben und löschen.
- Unter **Einstellungen → Daten** Lesezeichen und Labels als JSON-Datei importieren und exportieren. Der Dateiname enthält das lokale Datum und die Uhrzeit, etwa `lesezeichen-backup-2026-11-19_14-35-07.json`. **App zurücksetzen** löscht alle lokalen App-Daten einschließlich PIN-Schutz und ist erst nach einem Export seit der letzten Änderung verfügbar.
- Unter **Einstellungen → Sprache** zwischen Deutsch und Englisch wechseln. Die gespeicherte Auswahl hat Vorrang. Ohne Auswahl startet die App bei deutscher Browsersprache (etwa `de-AT` oder `de-CH`) auf Deutsch, sonst auf Englisch.
- Breite Fenster zeigen eine Desktopansicht mit direkter Navigation und mehrspaltigen Lesezeichenkarten. Unter **Einstellungen → Darstellung → Breite der mobilen Ansicht** legst du fest, wie lange die mobile Liste aktiv bleibt. Der Regler rastet bei **Immer Desktop**, **Standard** und **Immer mobil** leicht ein.
- Die Oberfläche optional mit einer PIN sperren

Die App speichert deine Lesezeichen und PIN-Einstellungen im Browser (`localStorage`). Zum Übertragen deiner Lesezeichen auf ein anderes Gerät oder an einen anderen Speicherort verwende den JSON-Export und -Import. Auch mit aktivierter PIN bleiben die gespeicherten Lesezeichen im Klartext.

Browser-Speicher und JSON-Export verwenden dasselbe Format (Version 3). Lokal kennzeichnet nach dem Zurücksetzen eine technische ID die neue Bibliothek, damit offene Tabs alte Entwürfe erkennen. Das Backup enthält alle Labels mit ID, Name und Farbe, auch ungenutzte Labels. Die Lesezeichen enthalten die zugehörigen Label-IDs.

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
npm test            # Fachregeln und konkurrierende Schreibvorgänge prüfen
npm run typecheck   # TypeScript prüfen
npm run build       # TypeScript prüfen und den Produktions-Build erzeugen
npm run preview     # den Build lokal im Browser prüfen
```

Der Build erzeugt eine einzelne Datei, `dist/index.html`. Sie enthält die Styles und das JavaScript und lässt sich per Doppelklick offline öffnen, weitergeben oder auf einem statischen Webserver bereitstellen.

## Struktur

- `index.html` enthält das Seiten-Markup mit Übersetzungsschlüsseln und ist der Einstiegspunkt für Vite.
- `src/i18n/` enthält die beiden typgeprüften Sprachkataloge. Statische Texte und Attribute verwenden `data-i18n`-Bindungen, dynamische Texte kommen über `messages()` aus dem aktiven Katalog. Beide Sprachen sind im Offline-Build enthalten.
- `src/main.ts` registriert die Ansichten. Jede Ansicht definiert ihren Pfad im Feld `View.path`. Die Navigation in `src/views.ts` synchronisiert den URL-Hash mit der sichtbaren Ansicht und setzt beim Wechsel den Tastaturfokus auf ihre Überschrift.
- `src/storage.ts` definiert die Schnittstelle `AppStorage`. Für ein anderes Speicher-Backend lässt sich dort die exportierte Implementierung `storage` austauschen. Der Local-Storage-Adapter ordnet die App-Einträge ihren Browser-Schlüsseln zu, koordiniert Bibliotheksänderungen tabübergreifend, speichert den Zeitpunkt der letzten Datenänderung und des letzten Exports und meldet Änderungen des Backup-Status auch tabübergreifend.
- `src/bookmarks/` enthält die Lesezeichenansicht, die Validierung und die Verwaltung der Lesezeichendaten. In `operations.ts` liegen die browserunabhängigen Schreibregeln für Lesezeichen und Labels.
- `src/labels/` enthält die Label-Verwaltung und die Mehrfachauswahl im Lesezeichen-Editor.
- `src/settings/view.ts` enthält die Einstellungen für PIN-Schutz und Datenverwaltung.
- `src/pin/` enthält die PIN-Oberfläche und verwendet Web Crypto für die PIN-Prüfung.
- `src/styles.scss` enthält die Komponentenstile und die Farben für Hell- und Dunkelmodus.
