# Task Expert Studio Translations (German)

# Page Header
page-title = AI Task Expert Studio
page-description = Erstellen Sie KI-Aufgabenexperten aus Prompts und testen Sie Integrationen.

# Section
section-label = AI Task Experts

# Actions
new-task-expert = Neuer AI Task Expert
view = Anzeigen
edit = Bearbeiten
test = Testen

# Tabs
tab-task-experts = AI Task Experts
tab-tools = Einstellungen
tab-monitoring = Monitoring
tab-dashboard = Dashboard

# Search
search-placeholder = AI Task Experts suchen...

# Table Columns
column-name = Name
column-agent-type = Agent-Typ
column-tools = Tools
column-specialty = Spezialitaet
column-version = Version

# Agent Types
agent-type-everyai = EveryAI
agent-type-general = General
agent-type-flow = FLOW

# Badges
badge-public = Oeffentlich

# Empty State
empty-message = Keine AI Task Experts gefunden. Klicken Sie auf 'Neuer AI Task Expert' um einen zu erstellen.

# Editor
create-task-expert = AI Task Expert erstellen
edit-task-expert = AI Task Expert bearbeiten
view-task-expert = AI Task Expert

# View Mode
view-edit-button = Konfiguration
view-tab-test = Testen
view-test-system-params = System Parameter
view-test-user-params = Benutzer Parameter
view-test-run = Test ausfuehren
view-test-running = Wird ausgefuehrt...
view-test-result = Ergebnis
view-test-description = Den Agenten mit Testparametern ausfuehren
view-test-file-upload = Datei-Upload
view-test-parameters = Parameter
view-test-parameters-description = Werte fuer Prompt-Variablen angeben
view-test-goal-params = Ziel-Parameter
view-test-no-goal-params = Keine Parameter im Ziel
view-test-no-system-params = Keine Parameter in den Systemanweisungen

# Common
retry = Wiederholen
close = Schliessen
loading = Laden...
refresh = Aktualisieren

# Expert dashboard
expert_dashboard_metric_total = Runs gesamt
expert_dashboard_metric_success_rate = Erfolgsquote
expert_dashboard_metric_avg_duration = Durchschnitt (letzte 20)
expert_dashboard_metric_running = Laeuft gerade
expert_dashboard_metric_total_30d = { $count } · 30T
expert_dashboard_metric_success_rate_30d = { $percent }% · 30T
expert_dashboard_metric_tool_calls_30d = { $count } Tool Calls · 30T
expert_dashboard_last20_runs = letzte 20 Runs
expert_dashboard_avg_duration_runs = ueber { $count } Runs
expert_dashboard_metric_total_days = { $count } · { $days }T
expert_dashboard_metric_success_rate_days = { $percent }% · { $days }T
expert_dashboard_metric_tool_calls_days = { $count } Tool Calls · { $days }T
expert_dashboard_window_label = Zeitraum
expert_dashboard_window_7d = Letzte 7 Tage
expert_dashboard_window_30d = Letzte 30 Tage
expert_dashboard_window_90d = Letzte 90 Tage
expert_dashboard_trend_title = Ausfuehrungen Trend (letzte { $days } Tage)
expert_dashboard_status_breakdown_title = Status Verteilung ({ $days } Tage)
expert_dashboard_top_tools_days = Top Tools ({ $days } Tage)
expert_dashboard_chart_empty = Noch keine Daten.
expert_dashboard_status_breakdown_empty = Keine Ausfuehrungen im gewaehlten Zeitraum.
expert_dashboard_recent_executions = Letzte Ausfuehrungen
expert_dashboard_recent_empty = Noch keine Ausfuehrungen fuer diesen Experten.
expert_dashboard_load_more = Mehr laden
expert_dashboard_top_tools = Top Tools (letzte 20)
expert_dashboard_top_tools_empty = Noch keine Tools verwendet.
expert_dashboard_tool_calls = { $count } Tool Calls
expert_dashboard_last_run_hint = Neueste Execution ID: { $executionId }

# Monitoring
monitoring-title = Ausfuehrungen
monitoring-empty = Keine Ausfuehrungen fuer diese Filter gefunden.
monitoring-apply = Filter anwenden
monitoring-clear = Zuruecksetzen
monitoring-action-open = Oeffnen

monitoring-filter-status = Status
monitoring-filter-status-placeholder = Status waehlen
monitoring-filter-status-all = Alle
monitoring-filter-status-success = Erfolg
monitoring-filter-status-error = Fehler
monitoring-filter-status-running = Laeuft

monitoring-filter-policy-root-id = Policy Root ID
monitoring-filter-policy-root-id-placeholder = z.B. 1234-5678
monitoring-filter-prompt-id = Expert ID (promptId)
monitoring-filter-prompt-id-placeholder = z.B. 65a0...
monitoring-filter-tag = Tag
monitoring-filter-tag-placeholder = z.B. policy:1234
monitoring-filter-tool-name = Tool-Name
monitoring-filter-tool-name-placeholder = z.B. web_search
monitoring-filter-date-from = Erstellt ab
monitoring-filter-date-to = Erstellt bis

monitoring-column-status = Status
monitoring-column-prompt = Expert
monitoring-column-duration = Dauer
monitoring-column-tools = Tool Calls
monitoring-column-policies = Policies
monitoring-column-started = Start

monitoring-details-title = Ausfuehrungsdetails
monitoring-details-empty = Ausfuehrung nicht gefunden.
monitoring-details-duration = { $ms } ms
monitoring-details-tools = { $count } Tool Calls
monitoring-details-show-raw = Rohdaten anzeigen
monitoring-details-hide-raw = Rohdaten ausblenden
monitoring-details-prompt = Expert
monitoring-details-started = Start
monitoring-details-decisions = Reasoning Decisions
monitoring-details-trace = Trace Events
monitoring-details-trace-count = { $count } Events
monitoring-details-trace-empty = Keine Trace Events vorhanden.
monitoring-details-trace-truncated = +{ $count } weitere Events nicht angezeigt
monitoring-details-error = Fehler
monitoring-details-tool-event = Tool: { $tool }
monitoring-details-event-preview = Event erfasst
monitoring-details-llm-tokens = LLM{ $model } · { $total } Tokens ({ $prompt } + { $completion }) · { $toolCalls } Tool Calls

# Execution detail view
monitoring-detail-back = Zurueck zur Liste
monitoring-detail-execution-id = Execution ID
monitoring-detail-version = Version
monitoring-detail-ai-service = AI Service
monitoring-detail-ai-model = AI Modell
monitoring-detail-finished = Beendet
monitoring-detail-tools-used = Verwendete Tools
monitoring-detail-total-token-summary = { $total } Tokens ({ $prompt }p + { $completion }c) · { $requests } LLM Aufrufe
monitoring-detail-resolved-prompt = Aufgeloester Prompt
monitoring-detail-expand = Prompt anzeigen
monitoring-detail-collapse = Prompt ausblenden
monitoring-detail-system-params = System Parameter
monitoring-detail-user-params = Benutzer Parameter
monitoring-detail-system-prompt = System Prompt (aufgeloest)
monitoring-detail-user-prompt = Benutzer Prompt (aufgeloest)
monitoring-detail-output = Endausgabe
monitoring-detail-raw-json = Roh-JSON
monitoring-detail-model = Modell
monitoring-detail-iteration = Iteration
monitoring-detail-prompt-tokens = Prompt Tokens
monitoring-detail-completion-tokens = Completion Tokens
monitoring-detail-total-tokens = Gesamt Tokens
monitoring-detail-tool-name = Tool-Name
monitoring-detail-tool-code = Tool-Code
monitoring-detail-arguments = Argumente
monitoring-detail-result = Ergebnis
monitoring-detail-expand-all = Alle aufklappen
monitoring-detail-collapse-all = Alle zuklappen
monitoring-detail-prompt-not-recorded = Prompt-Daten wurden fuer diese Ausfuehrung nicht aufgezeichnet. Erneut ausfuehren um aufgeloeste Prompts zu erfassen.
monitoring-detail-section-metadata = Ausfuehrungsdetails
monitoring-detail-section-output = Endausgabe
monitoring-detail-tab-input = Eingabe
monitoring-detail-tab-output = Ausgabe
monitoring-detail-tab-tools = Tools
monitoring-detail-no-output = Keine Ausgabe aufgezeichnet.
monitoring-detail-no-tools = Keine Tool-Aufrufe fuer diese Ausfuehrung aufgezeichnet.

# Tag labels
tag-execution-test = Test

# Trace event labels
trace-event-execution-started = Ausfuehrung gestartet
trace-event-execution-finished = Ausfuehrung abgeschlossen
trace-event-execution-error = Ausfuehrungsfehler
trace-event-prompt-resolved = Prompt aufgeloest
trace-event-llm-iteration = LLM Iteration
trace-event-llm-final = LLM Endergebnis
trace-event-llm-event = LLM Event
trace-event-tool-call-started = Tool-Aufruf gestartet
trace-event-tool-call-finished = Tool-Aufruf abgeschlossen
trace-event-tool-call-error = Tool-Aufruf Fehler
trace-event-tools-load-started = Tools werden geladen
trace-event-tools-load-finished = Tools geladen
trace-event-knowledge-load-started = Wissen wird geladen
trace-event-knowledge-load-finished = Wissen geladen
