# Enterprise Agent Studio Translations (German)

# Page Header
page-title = Enterprise Agent Studio
page-description = Erstellen Sie Agenten aus Prompts und testen Sie Integrationen.

# Section
section-label = Agenten

# Actions
new-task-expert = Neuer { -platform-ai-agent-product.label }
view = Anzeigen
edit = Bearbeiten
test = Testen
add-to-mesh = Zum Mesh hinzufuegen
added-to-mesh = Zum Mesh hinzugefuegt
already-in-mesh = Bereits im Mesh

# Tabs
tab-task-experts = Agenten
tab-tools = Einstellungen
tab-monitoring = Monitoring
tab-dashboard = Dashboard

# Search
search-placeholder = Agenten suchen...

# Navigation / Common actions
back = Zurueck
back-to-list = Zurueck zur Liste
save = Speichern
saving = Speichern...
save-failed = Speichern fehlgeschlagen
ai-assist = KI Assist

# Builder tabs
builder-tab-general = Allgemein
builder-tab-behavior = Verhalten
builder-tab-knowledge = Wissen
builder-tab-tools = Tools
builder-tab-advanced = Erweitert

# Table Columns
column-name = Name
column-agent-type = Typ
column-model = Modell
column-tools = Tools
column-knowledge-sources = Wissensquellen
column-created-at = Zuletzt aktualisiert
column-created-by = Besitzer
column-specialty = Spezialitaet
column-workspace = Arbeitsbereich
column-version = Version

# Filters
filter-workspace-all = Alle Arbeitsbereiche

# Agent Types
agent-type-everyai = EveryAI
agent-type-general = General
agent-type-flow = FLOW
agent-type-decision = Entscheidung

# Badges
badge-public = Oeffentlich

# Empty State
empty-message = Keine Agenten gefunden. Klicken Sie auf 'Neuer { -platform-ai-agent-product.label }', um einen zu erstellen.

# Editor
create-task-expert = { -platform-ai-agent-product.label } erstellen
agent-type-everyai-description = KI-Assistent für Chat & { -platform-ai-agent-network.label }
edit-task-expert = Agent bearbeiten
view-task-expert = Agent

# Form errors
form-error-create-failed = Agent konnte nicht erstellt werden
form-error-load-failed = Agenten konnten nicht geladen werden
form-error-generate-failed = Agent konnte nicht generiert werden

# Test panel
test-dialog-title = Agent testen

# Tools space
tools-space-card-description = MCP-Server-Verbindungen für Agenten verwalten

# MCP tools panel
mcp-tools-configure-help-prefix = Wählen Sie aus, welche Aktionen dieser Agent ausführen kann für
mcp-tools-configure-help-fallback = diesen MCP-Server

# Internal tools panel
internal-tools-step-add-to-agent = Fügen Sie die Funktion als Tool zu Ihrem Agenten hinzu
internal-tools-dialog-description = Vorgefertigte Tools für Agenten zur Interaktion mit Plattform-Daten.

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

# Connections
tab-connections = Connections
connections-title = Connections
connections-description = Durchsuchen Sie verfuegbare Connector-Karten und verwalten Sie gespeicherte MCP-, DataBridge- und AnyPoint-Connect-Verbindungen.
connections-catalog-title = Verfuegbare Connectoren
connections-catalog-description = Starten Sie mit einer vorkonfigurierten Provider-Karte und speichern Sie wiederverwendbare Verbindungen.
connections-catalog-lane-mcp-description = Verbinden Sie MCP Server und gemeinsame Tool-Endpunkte.
connections-catalog-lane-data-bridge-description = Verbinden Sie strukturierte Systeme ueber DataBridge.
connections-catalog-lane-anypoint-description = Verbinden Sie unstrukturierte Systeme ueber AnyPoint Connect.
connections-connect = Verbinden
connections-instances-title = Verbundene Instanzen
connections-instances-description = Verwenden Sie gespeicherte Verbindungen in MCP-Tools, Funktionen und Importen wieder.
connections-search-placeholder = Gemeinsame Verbindungen suchen...
connections-lane-all = Alle Bereiche
connections-lane-mcp = MCP Server
connections-lane-data-bridge = DataBridge
connections-lane-anypoint = AnyPoint Connect
connections-add = Verbindung hinzufuegen
connections-add-custom = Benutzerdefinierte Verbindung hinzufuegen
connections-count-total = { $count } gesamt
connections-count-mcp = { $count } MCP
connections-count-data-bridge = { $count } DataBridge
connections-count-anypoint = { $count } AnyPoint Connect
connections-empty-title = Keine gemeinsamen Verbindungen gefunden.
connections-empty-description = Starten Sie mit einer Provider-Karte oben oder erstellen Sie eine benutzerdefinierte Verbindungsinstanz.
connections-column-lane = Bereich
connections-column-provider = Provider
connections-column-connector = Connector
connections-column-status = Status
connections-column-actions = Aktionen
connections-badge-internal = Intern
connections-badge-managed = Managed
connections-connector-custom = Benutzerdefiniert
connections-status-active = Aktiv
connections-status-inactive = Inaktiv
connections-test = Verbindung testen
connections-test-running = Wird getestet...
connections-delete = Loeschen
connections-internal-readonly = Diese Verbindung wird vom Produkt bereitgestellt und ist schreibgeschuetzt.
connections-edit-title = Verbindung bearbeiten
connections-create-title = Neue Verbindung
connections-create-from-provider-title = Provider verbinden
connections-kind-label = Typ
connections-kind-mcp = MCP
connections-kind-structured = Strukturierte Daten
connections-kind-unstructured = Unstrukturierte Daten
connections-description-label = Beschreibung
connections-connector-id-label = Connector ID
connections-connector-name-label = Connector Name
connections-transport-label = Transport
connections-url-label = URL
connections-url-placeholder = https://...
connections-consumer-types-label = Consumer Types
connections-config-json-label = Verbindungs-Config JSON
connections-env-json-label = Environment JSON
connections-load-failed = Verbindungen konnten nicht geladen werden
connections-save-failed = Verbindung konnte nicht gespeichert werden
connections-test-failed = Verbindungstest fehlgeschlagen
connections-provider-custom-mcp-title = Custom MCP Server
connections-provider-custom-mcp-description = Verbinden Sie beliebige MCP Endpunkte mit URL-, Transport- und Auth-Einstellungen.
connections-provider-sap-title = SAP
connections-provider-sap-description = Verbinden Sie SAP Systeme fuer strukturierte Importe ueber DataBridge.
connections-provider-oracle-title = Oracle
connections-provider-oracle-description = Verbinden Sie Oracle-basierte Systeme fuer strukturierte Importe ueber DataBridge.
connections-provider-custom-structured-title = Benutzerdefinierte strukturierte Quelle
connections-provider-custom-structured-description = Verbinden Sie benutzerdefinierte APIs, Datenbanken und strukturierte Systeme ueber DataBridge.
connections-provider-sharepoint-title = SharePoint
connections-provider-sharepoint-description = Verbinden Sie SharePoint Sites und Bibliotheken ueber AnyPoint Connect.
connections-provider-onedrive-title = OneDrive
connections-provider-onedrive-description = Verbinden Sie OneDrive Ordner und Dateien ueber AnyPoint Connect.
connections-provider-confluence-title = Confluence
connections-provider-confluence-description = Verbinden Sie Confluence Bereiche und Seiten ueber AnyPoint Connect.
connections-provider-google-drive-title = Google Drive
connections-provider-google-drive-description = Verbinden Sie Google Drive Dateien und Ordner ueber AnyPoint Connect.
connections-provider-s3-title = S3
connections-provider-s3-description = Verbinden Sie S3 Buckets und Praefixe ueber AnyPoint Connect.
connections-provider-custom-unstructured-title = Benutzerdefinierte unstrukturierte Quelle
connections-provider-custom-unstructured-description = Verbinden Sie benutzerdefinierte Repositories und File Stores ueber AnyPoint Connect.
connections-field-base-url-label = Base URL
connections-field-api-key-label = API Key
connections-field-host-label = Host
connections-field-port-label = Port
connections-field-service-name-label = Service Name
connections-field-username-label = Benutzername
connections-field-password-label = Passwort
connections-field-site-url-label = Site URL
connections-field-tenant-id-label = Tenant ID
connections-field-client-id-label = Client ID
connections-field-client-secret-label = Client Secret
connections-field-drive-id-label = Drive ID
connections-field-email-label = E-Mail
connections-field-api-token-label = API Token
connections-field-folder-id-label = Folder ID
connections-field-service-account-json-label = Service Account JSON
connections-field-bucket-label = Bucket
connections-field-region-label = Region
connections-field-access-key-id-label = Access Key ID
connections-field-secret-access-key-label = Secret Access Key
connections-field-auth-token-label = Auth Token

# Tool editor
tool-editor-test-success = Verbindung erfolgreich - { $count } Aktion(en) verfuegbar
tool-editor-test-failed = Verbindung fehlgeschlagen
tool-editor-add-mcp = MCP Server hinzufuegen
tool-editor-basic-information = Basisinformationen
tool-editor-display-name = Anzeigename
tool-editor-mcp-configuration = MCP Konfiguration
tool-editor-managed-mcp = Managed MCP Verbindung
tool-editor-custom-mcp-config = Benutzerdefinierte MCP Konfiguration verwenden
tool-editor-managed-mcp-help = Verwendet die gemeinsame URL-, Transport- und Auth-Konfiguration aus Connections.
