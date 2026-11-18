# Lesezeichen

Eine kleine Web-App, mit der du deine Lieblingslinks direkt im Browser sammeln und verwalten kannst.

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

- `index.html` enthält das deutsche Seiten-Markup und ist der Einstiegspunkt für Vite.
- `src/main.ts` verbindet Navigation, Lesezeichen und PIN-Sperre.
- `src/bookmarks/` enthält die Lesezeichenansicht, die Validierung und den lokalen JSON-Speicher.
- `src/pin/` enthält die PIN-Oberfläche und verwendet Web Crypto für die PIN-Prüfung.
- `src/styles.scss` enthält die Komponentenstile und die Farben für Hell- und Dunkelmodus.

## Funktionen

- Lesezeichen hinzufügen, öffnen, bearbeiten und löschen
- Nach Namen oder URL suchen
- Die Reihenfolge per Ziehen oder mit den Pfeiltasten ändern
- Lesezeichen als JSON-Datei exportieren und wieder importieren
- Die Oberfläche optional mit einer PIN sperren

Die App speichert deine Lesezeichen und PIN-Einstellungen im Browser (`localStorage`). Zum Übertragen deiner Lesezeichen auf ein anderes Gerät oder an einen anderen Speicherort verwende den JSON-Export und -Import. Auch mit aktivierter PIN bleiben die gespeicherten Lesezeichen im Klartext.
