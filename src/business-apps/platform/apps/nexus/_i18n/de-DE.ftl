# App shell
app-auth-required = Authentifizierung erforderlich
app-user-fallback = Benutzer

# Sidebar
sidebar-session-history = Sitzungsverlauf
sidebar-new-session = Neue Sitzung
sidebar-empty = Noch keine Sitzungen
sidebar-untitled = Ohne Titel
sidebar-time-just-now = Gerade eben
sidebar-time-minutes-ago = Vor { $count } Min.
sidebar-time-hours-ago = Vor { $count } Std.
sidebar-time-days-ago = Vor { $count } Tagen

# Chat
chat-empty-title = Willkommen bei Nexus
chat-empty-description = Frag mich alles zu deinen Dokumenten oder gib mir den Auftrag, Inhalte zu erstellen.
chat-llm-smart-mode = Intelligenter Modus
chat-llm-fast-mode = Schneller Modus
chat-llm-smart-active = Intelligent (aktiv)
chat-llm-fast-active = Schnell (aktiv)
chat-data-access = Datenzugriff
chat-data = Daten
chat-web-search = Websuche
chat-web = Web
chat-deep-research = Tiefenrecherche
chat-input-placeholder = Stell eine Frage oder gib mir die Anweisung, etwas zu erstellen...
chat-status-planning-research-strategy = Recherchestrategie wird geplant...
chat-status-searching-internal-knowledge = Interne Wissensbasis wird durchsucht...
chat-status-time-limit-reached = Zeitlimit erreicht - Bericht wird aus den gesammelten Quellen zusammengestellt...
chat-status-gap-analysis-interrupted = Lueckenanalyse unterbrochen - es wird mit den aktuellen Quellen fortgefahren...
chat-status-research-issue = Bei der Recherche ist ein Problem aufgetreten - Bericht wird aus den gesammelten Quellen erstellt...
chat-status-writing-research-report = Umfassender Recherchebericht wird geschrieben...
chat-status-searching-documents = Dokumente werden durchsucht...
chat-status-fetching-live-data = Live-Daten werden geladen...
chat-status-web-results-obtained = Webergebnisse erhalten, werden verarbeitet...
chat-status-classifying-intent = Absicht wird klassifiziert...
chat-status-generating-slides = Slides werden erstellt...
chat-status-refining-artifact = Artefakt wird verfeinert...
chat-status-planning-data-query = Datenabfrage wird geplant...
chat-status-preparing-response = Antwort wird vorbereitet...
chat-status-querying-data-sources = Verfuegbare Datenquellen werden abgefragt...
chat-status-answering = Antwort wird erstellt...
chat-status-system-data-fallback = Systemdaten sind hier nicht konfiguriert - stattdessen werden Tabellen verwendet...
chat-status-processing-results = Ergebnisse werden verarbeitet...
chat-status-writing-answer = Antwort wird geschrieben...
chat-status-fetching-missing-details = Fehlende Details werden noch geladen...

# Scope selector
scope-none = Keine
scope-all = Alle
scope-all-content = Alle meine Inhalte
scope-active = (aktiv)

# Messages and sources
message-artifact-created = { $type } erstellt
message-click-to-view = Zum Anzeigen auf die Arbeitsfläche klicken
message-view = Anzeigen
message-searching-web = Web wird durchsucht...
message-searched-sites = { $count ->
    [one] { $count } Website durchsucht
   *[other] { $count } Websites durchsucht
}
message-sources = Quellen
message-content-type-document = Dokument
message-content-type-note = Notiz
message-content-type-spreadsheet = Tabelle
message-content-type-web = Web

# Empty canvas
canvas-hero-description = Dein KI-gestützter Arbeitsbereich. Erstelle Dokumente, Analysen, Präsentationen und frage Live-Daten ab.
canvas-title = Was möchtest du erstellen?
canvas-description = Wähle unten einen Einstiegspunkt oder öffne den Chat, um alles zu fragen.
canvas-open-chat-title = Unterhaltung starten
canvas-open-chat-description = Öffne den KI-Chat und frag mich alles zu deinen Inhalten
canvas-suggestion-ask-title = Frage zu deinen Dokumenten
canvas-suggestion-ask-description = Durchsuche und befrage alle deine Dokumente, Notizen und Tabellen
canvas-suggestion-document-title = Dokument erstellen
canvas-suggestion-document-description = Erstelle Berichte, Memos, Vorschläge oder Zusammenfassungen aus deinen Inhalten
canvas-suggestion-analysis-title = Analyse erstellen
canvas-suggestion-analysis-description = Erstelle Dashboards mit KPIs, Diagrammen, Tabellen und wichtigen Erkenntnissen
canvas-suggestion-presentation-title = Präsentation erstellen
canvas-suggestion-presentation-description = Erstelle professionelle Foliensätze aus deinen Inhalten
canvas-suggestion-data-title = Systemdaten abfragen
canvas-suggestion-data-description = Hole echte HR-, CRM- oder Finanzdaten von NEWWORK (aktiviere zuerst den Datenzugriff)

# Artifacts and canvas toasts
artifact-type-document = Dokument
artifact-type-analysis = Analyse
artifact-type-slides = Präsentation
artifact-status-generating = Wird erstellt
artifact-action-saving = Speichern...
artifact-action-saved = Gespeichert
artifact-action-updated = Aktualisiert
artifact-action-copy = Kopieren
artifact-save-document = In Dokumente speichern
artifact-save-slides = In Slides speichern
artifact-update-document = Dokumente aktualisieren
artifact-update-slides = Slides aktualisieren
artifact-saved-in-documents = In Dokumenten
artifact-saved-in-slides = In Slides
canvas-toast-saved-success = Erfolgreich gespeichert - { $message }
canvas-toast-updated-success = Erfolgreich aktualisiert - { $message }
canvas-toast-save-failed = Speichern fehlgeschlagen - { $message }
canvas-toast-copied = In die Zwischenablage kopiert

# Document renderer
document-generating = Dokument wird erstellt...
document-writing = Wird geschrieben...

# Analysis renderer
analysis-generating = Analyse wird erstellt...
analysis-report = Analysebericht
analysis-key-insights = Zentrale Erkenntnisse
analysis-key-metrics = Kennzahlen
analysis-visualizations = Visualisierungen
analysis-data-tables = Datentabellen
analysis-building = Analyse wird erstellt...
analysis-loading-title = Deine Analyse wird erstellt
analysis-loading-step-analyzing = Deine Inhalte werden analysiert
analysis-loading-step-metrics = Kennzahlen werden extrahiert
analysis-loading-step-insights = Erkenntnisse werden generiert
analysis-loading-step-visualizations = Visualisierungen werden erstellt
analysis-loading-step-compiling = Bericht wird zusammengestellt

# Slides
slides-section = Abschnitt { $number }
slides-layout-title-cover = Titelblatt
slides-layout-thank-you = Danke
slides-layout-agenda = Agenda
slides-layout-bullets = Aufzählungen
slides-layout-section-divider = Abschnittstrenner
slides-layout-two-column = Zwei Spalten
slides-layout-key-takeaway = Kernaussage
slides-layout-key-metrics = Kennzahlen
slides-layout-process-flow = Prozessablauf
slides-layout-timeline = Zeitachse
