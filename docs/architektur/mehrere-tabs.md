# Was passiert, wenn zwei Tabs gleichzeitig speichern?

```mermaid
sequenceDiagram
    participant A as Editor in Tab A
    participant S as BookmarkStore in A
    participant L as Browserspeicher
    participant B as Tab B
    A->>S: Bearbeitetes Lesezeichen speichern
    S->>L: Schreibsperre anfordern
    Note over S,L: Nur ein Tab darf gleichzeitig schreiben
    L-->>S: Aktueller Stand der Bibliothek
    alt Eintrag geändert, gelöscht oder Bibliothek zurückgesetzt
        S-->>A: Konflikt anzeigen, Entwurf bleibt offen
    else Entwurf passt zum aktuellen Stand
        S->>L: Änderung in den aktuellen Stand übernehmen
        S-->>A: Ansicht aktualisieren
        L-->>B: storage-Ereignis
        B->>L: Bibliothek für die eigene Ansicht neu laden
    end
```

Die Schreibsperre verwendet Web Locks. Fehlen sie im Browser, übernimmt eine IndexedDB-Transaktion die Sperre. Beim Zurücksetzen erhält die Bibliothek eine neue Kennung, an der offene Editoren veraltete Entwürfe erkennen.

[Editor](../../src/bookmarks/editor.ts) · [Schreibregeln](../../src/bookmarks/operations.ts) · [BookmarkStore](../../src/bookmarks/store.ts) · [Speicheradapter und Sperre](../../src/storage.ts)

[← Architekturübersicht](../../ARCHITECTURE.md)
