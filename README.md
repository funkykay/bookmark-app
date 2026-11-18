# Lesezeichen

Eine kleine Web-App, mit der du deine Lieblingslinks direkt im Browser sammeln und verwalten kannst.

## Funktionen

- Lesezeichen hinzufügen, öffnen, bearbeiten und löschen
- Nach Namen oder URL suchen
- Die Reihenfolge per Ziehen oder mit den Pfeiltasten ändern
- Unter **Einstellungen → Daten** Lesezeichen als JSON-Datei importieren und exportieren oder alle lokalen App-Daten einschließlich PIN-Schutz löschen
- Die Oberfläche optional mit einer PIN sperren

Die App speichert deine Lesezeichen und PIN-Einstellungen im Browser (`localStorage`). Zum Übertragen deiner Lesezeichen auf ein anderes Gerät oder an einen anderen Speicherort verwende den JSON-Export und -Import. Auch mit aktivierter PIN bleiben die gespeicherten Lesezeichen im Klartext.

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
- `src/main.ts` registriert die vier Ansichten. `src/views.ts` wechselt die sichtbare Ansicht und setzt den Tastaturfokus auf ihre Überschrift.
- `src/bookmarks/` enthält die Lesezeichenansicht, die Validierung und den lokalen Speicher. Die Sortieransicht in `src/reorder/` verwendet dieselben Lesezeichen und Karten.
- `src/settings/view.ts` enthält die Einstellungen für PIN-Schutz und Datenverwaltung.
- `src/pin/` enthält die PIN-Oberfläche und verwendet Web Crypto für die PIN-Prüfung.
- `src/styles.scss` enthält die Komponentenstile und die Farben für Hell- und Dunkelmodus.
