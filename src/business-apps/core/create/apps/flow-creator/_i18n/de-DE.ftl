# Flow Studio Übersetzungen (Deutsch)

# App
app-title = Flow Studio
app-description = Workflows visuell gestalten und konfigurieren
app-eyebrow = Create

# Studio navigation
studio-back-to-list = Zurück zur Liste
studio-discard-title = Änderungen verwerfen?
studio-discard-desc = Es gibt ungespeicherte Änderungen. Studio ohne Speichern verlassen und verwerfen?
studio-discard-cancel = Weiter bearbeiten
studio-discard-confirm = Verwerfen und schließen
studio-save-name-title = Flow vor dem Speichern benennen
studio-save-name-description = Geben Sie diesem Flow einen eindeutigen Namen, damit er gespeichert und später wiedergefunden werden kann.
studio-save-name-label = Flow-Name
studio-save-name-placeholder = z. B. Mitarbeiter-Onboarding
studio-save-name-validation = Bitte geben Sie vor dem Speichern einen Flow-Namen ein.
studio-save-name-cancel = Abbrechen
studio-save-name-confirm = Flow speichern
studio-unsaved-changes = Ungespeicherte Änderungen
studio-saved = Gespeichert
studio-loading = Lädt...
studio-test-flow = Flow testen
studio-import-flow = Importieren
studio-export-flow = Exportieren
studio-import-failed = Import fehlgeschlagen. Bitte wählen Sie eine gültige Flow-JSON-Datei aus.

# Labels / Tags
labels-title = Labels
labels-tab-categories = Kategorien
labels-tab-custom = Eigene Labels
labels-app = Anwendung
labels-app-placeholder = Anwendung auswählen
labels-service-category = Service-Kategorie
labels-service-category-placeholder = Service-Kategorie auswählen
labels-dwp-category = Digital-Workplace-Kategorie
labels-dwp-category-placeholder = Digital-Workplace-Kategorie auswählen
labels-none = Keine Auswahl
labels-preview = Vorschau
labels-custom-title = Eigene Labels
labels-custom-description = Beliebige Key/Value-Labels zum Filtern und Organisieren hinzufügen.
labels-custom-add = Label hinzufügen
labels-key = Schlüssel
labels-key-placeholder = z. B. solution
labels-value = Wert
labels-value-placeholder = z. B. compliance
labels-cancel = Abbrechen
labels-save = Speichern
labels-error-duplicate = Doppelter Schlüssel: {$key}

# List
list-title = FLOWs
list-subtitle = Vorhandene Flow-Templates durchsuchen und öffnen
list-tab-create = Erstellen
list-tab-flows = FLOWs
list-subtitle-create = Neue Flows entwerfen und anlegen
list-search = Suche
list-search-placeholder = Flows durchsuchen...
list-sort = Sortierung
list-sort-name-asc = Name (A–Z)
list-sort-name-desc = Name (Z–A)
list-sort-version-desc = Version (hoch → niedrig)
list-sort-steps-desc = Schritte (hoch → niedrig)
list-create = Flow erstellen
list-empty-title = Keine Flows gefunden
list-empty-subtitle = Suche anpassen oder einen neuen Flow erstellen.
list-col-name = Name
list-col-app = Kategorie
list-col-created-by = Ersteller
list-col-updated = Zuletzt aktualisiert
list-col-type = Typ
list-col-version = Version
list-col-steps = Schritte
list-col-labels = Labels
list-untitled = Unbenannt
list-no-id = Keine ID
list-error-title = Flows konnten nicht geladen werden
list-retry = Erneut versuchen
list-pager-summary = {$from}–{$to} von {$total}
list-pager-empty = Keine Ergebnisse
list-prev = Zurück
list-next = Weiter

# Mode Toggle
mode-simple = Einfach
mode-advanced = Erweitert
mode-toggle-label = Designer Modus
mode-simple-description = Vereinfachtes Workflow-Design für Fachanwender
mode-advanced-description = Vollständiges Workflow-Design für Experten

# Canvas
canvas-empty-title = Erstellen Sie Ihren Flow
canvas-empty-description = Ziehen Sie Knoten aus der Palette oder klicken Sie zum Hinzufügen
canvas-zoom-in = Vergrößern
canvas-zoom-out = Verkleinern
canvas-fit-view = Ansicht anpassen
canvas-auto-layout = Auto-Layout

# Node Palette
palette-title = Knoten
palette-start = Start
palette-task = Aufgabe
palette-approval = Genehmigung
palette-decision = Entscheidung
palette-fork = Parallele Aufteilung
palette-join = Parallele Zusammenführung
palette-end = Ende

# Toolbar
toolbar-save = Speichern
toolbar-publish = Veröffentlichen
toolbar-simulate = Simulieren
toolbar-undo = Rückgängig
toolbar-redo = Wiederholen
toolbar-delete = Löschen
toolbar-duplicate = Duplizieren

# Config Panels
config-panel-title = Konfiguration
config-general = Allgemein
config-form = Formular
config-assignment = Zuweisung
config-result-display = Erfasste Daten
config-outcomes = Ergebnisse
config-conditions = Bedingungen
config-branches = Zweige
config-events = Automatisierung
config-parameters = Parameter
config-rework = Nacharbeit

# Start Node Config
start-trigger-type = Auslösertyp
start-trigger-manual = Manuelles Formular
start-trigger-webhook = Webhook
start-trigger-email = E-Mail
webhook-payload-schema = Webhook-Payload
webhook-payload-schema-desc = Felder, die im JSON-Body beim Aufruf des Webhooks erwartet werden.
webhook-url-label = Webhook-URL
webhook-url-placeholder = Flow speichern, um eine Webhook-ID zu erhalten
webhook-url-hint = POST mit Header x-webhook-secret senden, wenn ein Geheimnis konfiguriert ist.
webhook-url-copied = URL in die Zwischenablage kopiert
webhook-url-copy-failed = URL konnte nicht kopiert werden
webhook-secret-label = Webhook-Geheimnis
webhook-secret-generate = Erzeugen
webhook-secret-regenerate = Erneuern
webhook-secret-show = Geheimnis anzeigen
webhook-secret-hide = Geheimnis ausblenden
webhook-secret-not-set = Noch kein Geheimnis — unten eingeben oder erzeugen
webhook-secret-manual-placeholder = Geheimnis eingeben (mit Flow speichern)
webhook-secret-or = ODER
webhook-secret-unsaved-hint = Geheimnis wird erst beim Speichern des Flows gesichert.
webhook-secret-copy = Geheimnis kopieren
webhook-secret-copied = Geheimnis in die Zwischenablage kopiert
webhook-secret-copy-failed = Geheimnis konnte nicht kopiert werden
webhook-url-copy = URL kopieren
webhook-secret-hint = Beim Speichern in Functions Service (Namespace global, Feld WEBHOOK_SECRET). Im Flow nur fncred:…:WEBHOOK_SECRET. Aufrufer senden Header x-webhook-secret. Flow mit Webhook-Trigger speichern, damit die URL registriert wird.
webhook-secret-reveal-empty = Geheimnis konnte nicht aufgelöst werden. Prüfen Sie die Berechtigung apps-creator.
webhook-secret-flow-name-required = Benennen Sie diesen Flow oben in Flow Studio, bevor Sie ein Webhook-Geheimnis speichern.
start-trigger-event = Ereignis
start-trigger-schedule = Zeitplan

# Shared step fields (tasks & user decisions)
step-title = Titel
step-message = Nachricht
step-title-placeholder = Titel eingeben… Tippe @, um Flow-Daten einzufügen.
step-message-placeholder = Nachricht hinzufügen… Tippe @, um Flow-Daten einzufügen.
step-instruction-placeholder = Beschreiben Sie, was der Agent tun soll… Tippe @, um Flow-Daten einzufügen.
step-due-label = Fälligkeitszeit
step-due-description = Legen Sie fest, wie lange Bearbeiter haben, diesen Schritt abzuschließen.
step-due-placeholder = Anzahl eingeben
step-due-unit-minutes = Minuten
step-due-unit-hours = Stunden
step-due-unit-days = Tage

# Task Node Config
task-instruction = KI-Anweisung
task-switch-type = Schritt-Typ wechseln
task-type = Aufgabentyp
task-type-task = Aufgabe
task-type-approval = Genehmigung
task-type-information = Information
task-type-acknowledge = Bestätigung
task-type-function = Funktion
task-type-ai_agent = EveryAI-Agent
task-type-ai_task_expert = { platform-ai-agent-product }
task-type-custom_data_mutation = In Custom Data speichern
task-kind = Schrittart
task-kind-user = Benutzerschritt
task-kind-system = Systemschritt

# Task links / attachments
task-links-title = Links
task-links-subtitle = Dokumente anhängen und hilfreiche Referenzen hinzufügen.
task-links-add = Link hinzufügen
task-links-empty = Noch keine Links konfiguriert.
task-links-item = Link
task-links-kind = Art
task-links-kind-document = Dokument
task-links-kind-link = Link
task-links-document-source = Dokument aus vorherigem Schritt
task-links-document-source-placeholder = Datei-Feld auswählen…
task-links-document-empty-hint = Keine Datei-Uploads in früheren Schritten gefunden.
task-links-link-type = Link-Typ
task-links-link-type-knowledge = Wissensdatenbank
task-links-link-type-policy = Richtlinienartikel
task-links-link-type-external = Externe URL
task-links-picker-knowledge = Wissensdatenbank-Artikel
task-links-picker-policy = Richtlinienartikel
task-links-picker-placeholder = Inhalt auswählen…
task-links-picker-search = Inhalt suchen…
task-links-name = Name
task-links-name-placeholder = z. B. Vertrag, Richtlinie, FAQ
task-links-url = URL
task-links-url-placeholder = https://beispiel.de
task-links-document-url = Dokument-Referenz (Expression)
task-links-document-url-placeholder = {"{"}{"{"} $steps.step_0.formData.fileField {"}"}{"}"}

# Enterprise Agent parameter mapping
task-input-params = Eingabeparameter
task-input-params-loading = Parameter werden geladen...
task-input-params-empty = Keine Parameter gefunden.
task-input-params-system = Systemparameter
task-input-params-user = Benutzerparameter
task-input-params-pick = Wert auswählen
task-input-params-expression-placeholder = Tippe @, um Flow-Daten einzufügen.
task-input-params-unmapped = Nicht zugeordnet

# EveryAI Agent output schema
task-output-schema-title = Ausgabeschema
task-output-schema-desc = Definieren Sie die strukturierte Ausgabe, die dieser Agent für nachgelagerte Schritte erzeugt.
result-display-title = Anzeige erfasster Daten
result-display-description = Wählen Sie aus, welche erfassten Felder in Genehmigungs-Ergebnisansichten angezeigt werden. HTTP-Metadaten werden immer ausgeblendet.
result-display-mode = Anzeigemodus
result-display-show-all = Alle Felder anzeigen
result-display-include = Nur ausgewählte Felder anzeigen
result-display-exclude = Ausgewählte Felder ausblenden
result-display-fields = Feldschlüssel
result-display-fields-help = Geben Sie ein Feld pro Zeile ein oder trennen Sie Felder mit Kommas. Groß-/Kleinschreibung und Trennzeichen werden ignoriert.

# Task step type selector (signature)
task-type-group-human = Benutzer-Schritte
task-type-group-ai = KI & Automatisierung

# Assignment
assignment-mode-label = Zuweisungsmodus
assignment-mode-claim = Beanspruchen
assignment-mode-assign = Zuweisen
assignment-mode-deferred = Verzögert
assignment-mode-claimable = Übernehmen
assignment-mode-auto = Zuweisen
assignment-mode-runtime = Bei Ausführung bereitgestellt
assignment-mode-desc-claim = Jeder in der ausgewählten Zielgruppe kann diese Aufgabe beanspruchen.
assignment-mode-desc-assign = Für jede Person in der ausgewählten Zielgruppe wird eine eigene Aufgabe erstellt.
assignment-mode-desc-deferred = Ziele werden zur Laufzeit ermittelt (Erweitert).
assignment-mode-desc-claimable = Nutzer mit den ausgewählten Fähigkeiten können die Aufgabe übernehmen.
assignment-mode-desc-auto = Automatisch per Strategie zuweisen (oder bei Ausführung).
assignment-mode-desc-runtime = Zuweisung muss beim Start der Ausführung bereitgestellt werden.
assignment-audience-label = Zielgruppe
assignment-capabilities-label = Fähigkeiten
assignment-runtime-hint = Dieser Schritt muss beim Start des Flows zugewiesen werden.
assignment-assign-at-execution-label = Bei Ausführung zuweisen
assignment-assign-at-execution-desc = Zuweisung wird beim Start des Flows bereitgestellt.
assignment-assign-at-execution-multi-label = Mehrere Bearbeiter:innen erlauben
assignment-assign-at-execution-multi-desc = Im Launcher können für diesen Schritt mehrere Bearbeiter:innen ausgewählt werden.
assignment-allow-reassignment-label = Neuzuweisung erlauben
assignment-allow-reassignment-desc = Der/die Bearbeiter:in kann die Aufgabe weitergeben.

# Logic decisions
logic-description-simple = Wählen Sie einen Schrittwert aus und vergleichen Sie ihn. Die erste passende Bedingung gewinnt.
logic-description-advanced = Definieren Sie Bedingungen mit Flow-Kontext. Die erste passende Bedingung gewinnt.
logic-field-label = Wert
logic-default = Standard-Ausgang
logic-field-placeholder = Wert auswählen
logic-field-search = Schrittdaten durchsuchen...
logic-field-empty = Keine passenden Werte
logic-field-group-steps = Schrittdaten
flow-context-search = Flow-Kontext durchsuchen...
flow-context-group = Flow-Kontext
logic-operator-label = Operator

logic-value-label = Vergleichen mit
logic-value-placeholder = z. B. 1000 oder 'approved'
logic-preview = Bedingung:

# Decision Node Config
decision-mode = Entscheidungsmodus
decision-mode-user = Benutzerentscheidung
decision-mode-ai = KI-Entscheidung
decision-mode-logic = Logik-Entscheidung
decision-branch-add = Zweig hinzufügen
decision-default-branch = Standardzweig
decision-confidence = Konfidenzschwelle
decision-escalation = Eskalation
decision-policy = Entscheidungsrichtlinie
decision-policy-optional-placeholder = Optional: Richtlinie auswählen...
decision-ai-executor-label = KI-Ausführung
decision-ai-executor-everyai = EveryAI
decision-ai-executor-everyai-desc = Verwenden Sie Entscheidungsanweisungen (mit Flow-Kontext), damit EveryAI den besten Zweig auswählt.
decision-ai-executor-taskexpert = { platform-ai-agent-product }
decision-ai-executor-taskexpert-desc = Führen Sie den Agenten aus und routen Sie über Mapping-Regeln. Wenn keine Regel passt, wählt ein Mensch den Zweig.
decision-ai-type-label = Entscheidungseinrichtung
decision-ai-type-policy = Richtliniengeführt
decision-ai-type-policy-desc = Verwenden Sie ein Richtliniendokument als Grundlage für die Entscheidung.
decision-ai-type-expert = KI-Experte
decision-ai-type-expert-desc = Wählen Sie einen KI-Experten aus dem Prompt Manager für die Entscheidung.
decision-ai-instructions-label = Entscheidungsanweisungen
decision-ai-instructions-desc = Kontext oder Regeln für die KI – einschließlich, wann zu einem menschlichen Fallback eskaliert werden soll.
decision-ai-instructions-placeholder = z. B. Bevorzuge Zweig A, wenn der Risikoscore über dem Wert aus einem früheren Schritt liegt.
decision-escalation-how-title = So funktioniert die Eskalation
decision-escalation-how-desc = Wenn die KI eskalieren möchte, ungültige Ausgaben liefert oder das Ergebnis keinem Zweig zugeordnet werden kann, wird eine Benutzerentscheidung erstellt und der Nutzer wählt den nächsten Zweig.
decision-escalation-due-label = Eskalierte Entscheidung fällig in
decision-human-fallback-title = Menschlicher Fallback
decision-human-fallback-desc = Legen Sie fest, wer die Fallback-Entscheidungsaufgabe erhält und was der Nutzer sieht, wenn die KI nicht entscheiden kann.
decision-human-instructions-label = Nachricht der Fallback-Aufgabe
decision-human-instructions-desc = Erforderlich. Wird angezeigt, wenn ein Mensch den Zweig auswählen muss. Flow-Kontext kann eingefügt werden.
decision-human-instructions-placeholder = z. B. Die KI konnte nicht entscheiden. Bitte wählen Sie den passendsten Zweig.
decision-ai-taskexpert-mapping-label = Mapping-Regeln
decision-ai-taskexpert-mapping-desc = Definieren Sie Regeln, die die Ausgabe des Agenten einem Zweig zuordnen.
decision-ai-taskexpert-picker-desc = Wählen Sie aus, welcher Agent diese Entscheidung ausführt.
decision-ai-taskexpert-picker-placeholder = Agent auswählen...
decision-ai-taskexpert-picker-search = Agenten durchsuchen...
decision-ai-taskexpert-picker-empty = Keine Agenten gefunden.
decision-ai-taskexpert-params-desc = Ordnen Sie jeden Prompt-Parameter explizit dem Flow-Kontext zu, der an den ausgewählten Agenten gesendet werden soll.
decision-ai-taskexpert-reasoning-label = Reasoning-Output-Mapping
decision-ai-taskexpert-reasoning-desc = Optional. Wählen Sie das Ausgabefeld, das als Begründung für den menschlichen Fallback verwendet wird.
decision-ai-taskexpert-reasoning-placeholder = Ausgabefeld auswählen (optional)
decision-ai-taskexpert-reasoning-none = Keine

# Fork/Join Config
fork-branches = Parallele Zweige
fork-add-branch = Zweig hinzufügen
join-condition = Zusammenführungsbedingung
join-wait-all = Auf alle warten
join-wait-any = Auf ersten warten

# Rework / Go-Back
rework-title = Nacharbeit
rework-on-reject = Bei Ablehnung
rework-send-back-to = Zurück an
rework-reason-required = Grund erforderlich
rework-preserve-data = Formulardaten beibehalten
rework-max-iterations = Max. Iterationen

# Simulation
sim-title = Simulation
sim-start = Simulation starten
sim-stop = Stoppen
sim-pause = Pausieren
sim-resume = Fortsetzen
sim-provide-input = Eingabe bereitstellen
sim-completed = Simulation abgeschlossen
sim-step-log = Schrittprotokoll
sim-mock-data = Testdaten

# Validation
validation-title = Validierung
validation-no-start = Flow muss einen Startknoten haben
validation-no-end = Flow muss einen Endknoten haben
validation-orphan-nodes = Verwaiste Knoten erkannt
validation-fork-no-join = Parallelknoten hat keinen passenden Zusammenführungsknoten
validation-decision-branches = Entscheidung muss mindestens 2 Zweige haben
validation-disconnected = Einige Knoten sind nicht verbunden
validation-decision-must-select-agent = Entscheidung "{ $label }" muss einen { -platform-ai-agent-product.inline } auswählen
validation-decision-unmapped-agent-params = Entscheidung "{ $label }" muss alle { -platform-ai-agent-product.inline } Prompt-Parameter vor der Veröffentlichung zuordnen: { $params }

# Add step panel
step-panel-add-step = Schritt hinzufügen
step-panel-change-step = Schritt ändern
step-panel-back-to-config = Zurück zur Konfiguration
add-step-tip-advanced-mode = Wechseln Sie in den Erweitert-Modus, um Function Tasks und { -platform-ai-agent-product.label }-Schritte freizuschalten.
step-kind-group-user-tasks = Benutzeraufgaben
step-kind-group-ai-tasks = KI-Aufgaben
step-kind-group-automation = Automatisierung
step-kind-group-decisions = Entscheidungen
step-kind-group-control-flow = Ablaufsteuerung
step-kind-custom-task = Benutzerdefinierte Aufgabe
step-kind-custom-decision = Benutzerdefinierte Entscheidung
step-kind-desc-custom-task = Eigenes Formular
step-kind-desc-information = Info teilen
step-kind-desc-acknowledge = Gelesen bestätigen
step-kind-desc-approval = Genehmigen oder ablehnen
step-kind-desc-custom-decision = Eigene Pfade
step-kind-desc-decision-ai = KI entscheidet
step-kind-desc-decision-logic = Regeln routen
step-kind-desc-ai-agent = KI-Agent
step-kind-desc-ai-task-expert = { -platform-ai-agent-product.label }
step-kind-desc-function = Funktion ausführen
step-kind-desc-connector = Connector aufrufen
step-kind-desc-save-to-custom-data = Zeilen oder Flow-Daten schreiben
step-kind-desc-parallelize = Parallele Pfade
step-kind-connector = Connector
step-kind-parallelize = Aufgaben parallelisieren

step-kind-switch-confirm-soft-title = Schritttyp ändern?
step-kind-switch-confirm-soft-desc = Der Schritt-Titel wird zurückgesetzt. Andere Einstellungen bleiben wo möglich erhalten.
step-kind-switch-confirm-destructive-title = Schrittkonfiguration ersetzen?
step-kind-switch-confirm-destructive-desc = Beim Wechsel zu diesem Schritttyp werden nicht zutreffende Einstellungen gelöscht (Formularfelder, Zuweisung, Automatisierung usw.).
step-kind-switch-confirm-cancel = Abbrechen
step-kind-switch-confirm-action = Schritttyp ändern

# Task step type selector descriptions
task-step-type-ai-task-expert-description = { -platform-ai-agent-product.label } Prompt-Schritt.

# Decision Enterprise Agent mapping suggestions
decision-ai-taskexpert-mapping-suggestion-description = Aus dem Ausgabe-Schema des ausgewählten Agenten.
