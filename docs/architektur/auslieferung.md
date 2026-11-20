# Wie entsteht die App?

```mermaid
flowchart TD
    source["HTML · TypeScript · SCSS"] --> vite["Vite bündelt JavaScript und CSS<br/>in eine einzige index.html"]
    vite -->|Webversion| pages["GitHub Pages"]
    vite -->|Offline-Version| release["GitHub Release"]
    pages -->|URL aufrufen| browser["Browser"]
    release -->|Datei herunterladen und öffnen| browser
```

[Build-Konfiguration](../../vite.config.js) · [Auslieferung auf GitHub Pages](../../.github/workflows/pages.yml) · [Release der HTML-Datei](../../.github/workflows/release.yml)

[← Architekturübersicht](../../ARCHITECTURE.md)
