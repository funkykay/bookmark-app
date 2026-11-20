# Aufgaben aus dem Code-Review

- [ ] **BM-001 · Unterbrochenen Reset fortsetzen**  
  **Problem:** Ein fehlgeschlagener Reset kann alle Lesezeichen löschen und einzelne Einstellungen zurücklassen.  
  **Lösung:** Bündle alle Löschschritte in einem Reset, der nach einem Fehler zuverlässig fortgesetzt werden kann.

- [ ] **BM-002 · Speichererfolg unabhängig vom Rendern melden**  
  **Problem:** Wenn die Ansicht nach dem Speichern einen Fehler wirft, meldet die App den bereits gespeicherten Eintrag als fehlgeschlagen.  
  **Lösung:** Bestätige den Schreibvorgang unabhängig davon, ob die anschließende Aktualisierung der Ansicht gelingt.

- [x] **BM-003 · Lesezeichenkarten bei der Suche wiederverwenden**  
  **Problem:** Die Suche erstellt bei jedem Tastendruck alle passenden Karten neu, selbst wenn die Trefferliste gleich bleibt.  
  **Lösung:** Verwende Karten anhand ihrer Lesezeichen-ID wieder und aktualisiere nur geänderte Inhalte oder Positionen.

- [ ] **BM-004 · Tastaturfokus nach dem Speichern wiederherstellen**  
  **Problem:** Nach dem Bearbeiten eines Lesezeichens verliert die Tastaturbedienung den Fokus auf der Karte.  
  **Lösung:** Setze den Fokus nach dem Speichern auf die Bearbeiten-Schaltfläche derselben Karte zurück.

- [ ] **BM-005 · Neue Datenfelder beim Bearbeiten und im Backup erhalten**  
  **Problem:** Neue Felder wie „Favorit“ können beim Bearbeiten oder beim Einlesen eines Backups verloren gehen, wenn eine der beteiligten Stellen das Feld übersieht.  
  **Lösung:** Definiere für jedes neue Feld einen Standardwert für ältere Daten und teste, dass sein Wert beim Bearbeiten, Exportieren und erneuten Importieren erhalten bleibt.

- [x] **BM-006 · Such- und Filterlogik aus der Ansicht lösen**  
  **Problem:** Die Lesezeichenansicht verwaltet Suche, Filter, Liste, Menü und Editor gemeinsam, wodurch kleine Erweiterungen mehrere Bedienabläufe berühren.  
  **Lösung:** Lagere zuerst die Berechnung der sichtbaren Lesezeichen in eine eigenständig testbare Funktion aus und übergib das Ergebnis an die Liste.

- [x] **BM-007 · Desktoplayout von Element-IDs entkoppeln**  
  **Problem:** Teile des Desktoplayouts hängen von konkreten Button- und Formular-IDs ab, sodass ein Markup-Umbau unbeabsichtigt Abstände oder Raster verändern kann.  
  **Lösung:** Gib den betroffenen Komponenten eigene Layoutklassen und pflege ihre Desktopregeln bei den jeweiligen Komponentenstilen.

- [ ] **BM-008 · Fach- und Browsertests in der CI ausführen**  
  **Problem:** Die Veröffentlichungsworkflows führen die vorhandenen Tests nicht aus, und Fehler bei Dialogen oder Tastaturfokus bleiben durch die bisherigen Tests unentdeckt.  
  **Lösung:** Führe die Tests bei Pull Requests und vor jeder Veröffentlichung aus und ergänze einen Browsertest für das Bearbeiten und Speichern per Tastatur.
