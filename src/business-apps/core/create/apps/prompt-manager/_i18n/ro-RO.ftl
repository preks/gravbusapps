# Task Expert Studio Translations (Romanian)

# Page Header
page-title = Studio experti AI pentru sarcini
page-description = Creati experti AI pentru sarcini din prompturi si testati integrarile.

# Section
section-label = Experti AI pentru sarcini

# Actions
new-task-expert = AI Task Expert nou
view = Vizualizare
edit = Editare
test = Testare
add-to-mesh = Adauga in Mesh
added-to-mesh = Adaugat in Mesh
already-in-mesh = Deja in Mesh

# Tabs
tab-task-experts = Experti AI pentru sarcini
tab-tools = Setări
tab-monitoring = Monitoring
tab-dashboard = Dashboard

# Search
search-placeholder = Cautati experti AI pentru sarcini...

# Navigation / Common actions
back = Inapoi
back-to-list = Inapoi la lista
save = Salveaza
saving = Se salveaza...
save-failed = Salvarea a esuat
ai-assist = Asistent AI

# Builder tabs
builder-tab-general = General
builder-tab-behavior = Comportament
builder-tab-knowledge = Cunostinte
builder-tab-tools = Tools
builder-tab-advanced = Avansat

# Table Columns
column-name = Nume
column-agent-type = Tip
column-model = Model
column-tools = Tools
column-knowledge-sources = Surse de cunostinte
column-created-at = Ultima actualizare
column-created-by = Proprietar
column-specialty = Specialitate
column-version = Versiune

# Agent Types
agent-type-everyai = EveryAI
agent-type-general = General
agent-type-flow = FLOW
agent-type-decision = Decizie

# Badges
badge-public = Public

# Empty State
empty-message = Nu s-au gasit AI task experts. Faceti clic pe 'AI Task Expert nou' pentru a crea unul.

# Editor
create-task-expert = Creare AI Task Expert
edit-task-expert = Editare AI Task Expert
view-task-expert = AI Task Expert

# View Mode
view-edit-button = Configuratie
view-tab-test = Testare
view-test-system-params = Parametri sistem
view-test-user-params = Parametri utilizator
view-test-run = Ruleaza test
view-test-running = Se ruleaza...
view-test-result = Rezultat
view-test-description = Ruleaza agentul cu parametri de test
view-test-file-upload = Incarcare fisier
view-test-parameters = Parametri
view-test-parameters-description = Furnizati valori pentru variabilele prompt-ului
view-test-goal-params = Parametri obiectiv
view-test-no-goal-params = Niciun parametru in obiectiv
view-test-no-system-params = Niciun parametru in instructiunile de sistem

# Common
retry = Reincercare
close = Inchide
loading = Se incarca...
refresh = Reincarcare

# Expert dashboard
expert_dashboard_metric_total = Total rulari
expert_dashboard_metric_success_rate = Rata de succes
expert_dashboard_metric_avg_duration = Durata medie (ultimele 20)
expert_dashboard_metric_running = In rulare acum
expert_dashboard_metric_total_30d = { $count } · 30z
expert_dashboard_metric_success_rate_30d = { $percent }% · 30z
expert_dashboard_metric_tool_calls_30d = { $count } tool calls · 30z
expert_dashboard_last20_runs = ultimele 20 rulari
expert_dashboard_avg_duration_runs = din { $count } rulari
expert_dashboard_metric_total_days = { $count } · { $days }z
expert_dashboard_metric_success_rate_days = { $percent }% · { $days }z
expert_dashboard_metric_tool_calls_days = { $count } tool calls · { $days }z
expert_dashboard_window_label = Fereastra
expert_dashboard_window_7d = Ultimele 7 zile
expert_dashboard_window_30d = Ultimele 30 zile
expert_dashboard_window_90d = Ultimele 90 zile
expert_dashboard_trend_title = Trend executii (ultimele { $days } zile)
expert_dashboard_status_breakdown_title = Distribuție status ({ $days } zile)
expert_dashboard_top_tools_days = Top tools ({ $days } zile)
expert_dashboard_chart_empty = Nu exista date inca.
expert_dashboard_status_breakdown_empty = Nu exista executii in fereastra selectata.
expert_dashboard_recent_executions = Executii recente
expert_dashboard_recent_empty = Nu exista executii inca pentru acest expert.
expert_dashboard_load_more = Incarca mai multe
expert_dashboard_top_tools = Top tools (ultimele 20)
expert_dashboard_top_tools_empty = Nu au fost folosite tools inca.
expert_dashboard_tool_calls = { $count } tool calls
expert_dashboard_last_run_hint = Ultimul execution id: { $executionId }

# Monitoring
monitoring-title = Executii
monitoring-empty = Nu s-au gasit executii pentru aceste filtre.
monitoring-apply = Aplica filtre
monitoring-clear = Reseteaza
monitoring-action-open = Deschide

monitoring-filter-status = Status
monitoring-filter-status-placeholder = Selectati status
monitoring-filter-status-all = Toate
monitoring-filter-status-success = Succes
monitoring-filter-status-error = Eroare
monitoring-filter-status-running = In rulare

monitoring-filter-policy-root-id = Policy root id
monitoring-filter-policy-root-id-placeholder = ex. 1234-5678
monitoring-filter-prompt-id = Expert id (promptId)
monitoring-filter-prompt-id-placeholder = ex. 65a0...
monitoring-filter-tag = Tag
monitoring-filter-tag-placeholder = ex. policy:1234
monitoring-filter-tool-name = Nume tool
monitoring-filter-tool-name-placeholder = ex. web_search
monitoring-filter-date-from = Creat de la
monitoring-filter-date-to = Creat pana la

monitoring-column-status = Status
monitoring-column-prompt = Expert
monitoring-column-duration = Durata
monitoring-column-tools = Tool calls
monitoring-column-policies = Policies
monitoring-column-started = Pornit

monitoring-details-title = Detalii executie
monitoring-details-empty = Executia nu a fost gasita.
monitoring-details-duration = { $ms } ms
monitoring-details-tools = { $count } tool calls
monitoring-details-show-raw = Arata raw
monitoring-details-hide-raw = Ascunde raw
monitoring-details-prompt = Expert
monitoring-details-started = Pornit
monitoring-details-decisions = Decizii reasoning
monitoring-details-trace = Evenimente trace
monitoring-details-trace-count = { $count } evenimente
monitoring-details-trace-empty = Nu exista evenimente trace.
monitoring-details-trace-truncated = +{ $count } evenimente suplimentare nu sunt afisate
monitoring-details-error = Eroare
monitoring-details-tool-event = Tool: { $tool }
monitoring-details-event-preview = Eveniment inregistrat
monitoring-details-llm-tokens = LLM{ $model } · { $total } token-uri ({ $prompt } + { $completion }) · { $toolCalls } tool calls

# Execution detail view
monitoring-detail-back = Inapoi la lista
monitoring-detail-execution-id = ID executie
monitoring-detail-version = Versiune
monitoring-detail-ai-service = Serviciu AI
monitoring-detail-ai-model = Model AI
monitoring-detail-finished = Terminat
monitoring-detail-tools-used = Tools folosite
monitoring-detail-total-token-summary = { $total } token-uri ({ $prompt }p + { $completion }c) · { $requests } apeluri LLM
monitoring-detail-resolved-prompt = Prompt rezolvat
monitoring-detail-expand = Arata prompt
monitoring-detail-collapse = Ascunde prompt
monitoring-detail-system-params = Parametri sistem
monitoring-detail-user-params = Parametri utilizator
monitoring-detail-system-prompt = Prompt sistem (rezolvat)
monitoring-detail-user-prompt = Prompt utilizator (rezolvat)
monitoring-detail-output = Iesire finala
monitoring-detail-raw-json = JSON brut
monitoring-detail-model = Model
monitoring-detail-iteration = Iteratie
monitoring-detail-prompt-tokens = Tokeni prompt
monitoring-detail-completion-tokens = Tokeni completare
monitoring-detail-total-tokens = Total tokeni
monitoring-detail-tool-name = Nume tool
monitoring-detail-tool-code = Cod tool
monitoring-detail-arguments = Argumente
monitoring-detail-result = Rezultat
monitoring-detail-expand-all = Deschide toate
monitoring-detail-collapse-all = Inchide toate
monitoring-detail-prompt-not-recorded = Datele promptului nu au fost inregistrate pentru aceasta executie. Rulati din nou pentru a captura prompturile rezolvate.
monitoring-detail-section-metadata = Detalii rulare
monitoring-detail-section-output = Iesire finala
monitoring-detail-tab-input = Intrare
monitoring-detail-tab-output = Iesire
monitoring-detail-tab-tools = Tools
monitoring-detail-no-output = Nu exista iesire inregistrata.
monitoring-detail-no-tools = Nu exista apeluri de tools inregistrate pentru aceasta executie.

# Tag labels
tag-execution-test = Test

# Trace event labels
trace-event-execution-started = Executie pornita
trace-event-execution-finished = Executie finalizata
trace-event-execution-error = Eroare executie
trace-event-prompt-resolved = Prompt rezolvat
trace-event-llm-iteration = Iteratie LLM
trace-event-llm-final = LLM final
trace-event-llm-event = Eveniment LLM
trace-event-tool-call-started = Apel tool pornit
trace-event-tool-call-finished = Apel tool finalizat
trace-event-tool-call-error = Eroare apel tool
trace-event-tools-load-started = Se incarca tools
trace-event-tools-load-finished = Tools incarcate
trace-event-knowledge-load-started = Se incarca cunostinte
trace-event-knowledge-load-finished = Cunostinte incarcate
