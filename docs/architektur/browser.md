# Wie greifen die Teile im Browser ineinander?

```mermaid
flowchart TD
    start["main.ts startet die App"] --> nav["Navigation · views.ts<br/>wählt die Ansicht anhand des URL-Hash"]
    nav -->|bei aktiver Sperre| pin["PIN-Eingabe"]
    pin -->|entsperrt das angeforderte Ziel| nav
    nav --> ui["Lesezeichen und Labels"]
    nav --> settings["Einstellungen"]
    nav -->|öffentlich in der Webversion| legal["Impressum und Datenschutz"]
    ui --> store["BookmarkStore<br/>verwaltet die Bibliothek"]
    settings -->|Import, Export, Zurücksetzen| store
    store --> adapter["AppStorage · storage.ts"]
    settings -->|Sprache und Darstellung| adapter
    pin -->|PIN-Prüfwert, Fehlversuche und Sperrfrist| adapter
    adapter --> local[("localStorage<br/>im Browserprofil")]
```

Die PIN sperrt den Zugang zu den Ansichten. Die Bibliothek liegt auch bei aktiver PIN im Klartext vor.

[Navigation](../../src/views.ts) · [PIN-Prüfung mit Web Crypto](../../src/pin/model.ts) · [Sprachkataloge DE und EN](../../src/i18n/) · [Oberflächenstile](../../src/styles.scss)

## Lesezeichen und Labels im Detail

```mermaid
flowchart TD
    subgraph bookmarks["Lesezeichenansicht"]
        filter["Suche in Name und URL<br/>+ Filter nach Label"] --> cards["Passende Lesezeichenkarten"]
        cards -->|Bearbeiten| bookmark["Lesezeichen-Editor<br/>Name, URL und zugeordnete Labels"]
        picker["Label-Auswahl<br/>Vorhandenes wählen oder neues eingeben"] --> bookmark
    end
    subgraph labels["Label-Verwaltung"]
        list["Liste aller Labels"] -->|Bearbeiten| label["Label-Editor<br/>Name und Farbe"]
    end
    bookmark -->|Lesezeichen mit Labels| editor["Gemeinsame Editorlogik · editor.ts"]
    label -->|Label| editor
    editor -->|Speichern oder Löschen| store["BookmarkStore"]
    store -->|wendet Schreibregeln an| rules["operations.ts<br/>Neue Labels aus dem Lesezeichen-Editor mit anlegen<br/>Gelöschte Labels aus allen Lesezeichen entfernen"]
```

[Lesezeichenansicht](../../src/bookmarks/view.ts) · [Label-Auswahl](../../src/labels/picker.ts) · [Label-Verwaltung](../../src/labels/view.ts)

[← Architekturübersicht](../../ARCHITECTURE.md)
