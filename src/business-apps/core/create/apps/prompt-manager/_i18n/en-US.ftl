# Task Expert Studio Translations (English)

# Page Header
page-title = AI Task Expert Studio
page-description = Create AI task experts from prompts and test integrations.

# Section
section-label = AI Task Experts

# Actions
new-task-expert = New AI Task Expert
view = View
edit = Edit
test = Test
add-to-mesh = Add to Mesh
added-to-mesh = Added to Mesh
already-in-mesh = Already in Mesh

# Tabs
tab-task-experts = AI Task Experts
tab-tools = Settings
tab-monitoring = Monitoring
tab-dashboard = Dashboard

# Search
search-placeholder = Search AI task experts...

# Navigation / Common actions
back = Back
back-to-list = Back to list
save = Save
saving = Saving...
save-failed = Failed to save
ai-assist = AI Assist

# Builder tabs
builder-tab-general = General
builder-tab-behavior = Behavior
builder-tab-knowledge = Knowledge
builder-tab-tools = Tools
builder-tab-advanced = Advanced

# Table Columns
column-name = Name
column-agent-type = Type
column-model = Model
column-tools = Tools
column-knowledge-sources = Knowledge Sources
column-created-at = Last Updated
column-created-by = Owner
column-specialty = Specialty
column-workspace = Workspace
column-version = Version

# Filters
filter-workspace-all = All Workspaces

# Agent Types
agent-type-everyai = EveryAI
agent-type-general = General
agent-type-flow = FLOW
agent-type-decision = Decision

# Badges
badge-public = Public

# Empty State
empty-message = No AI task experts found. Click 'New AI Task Expert' to create one.

# Editor
create-task-expert = Create AI Task Expert
edit-task-expert = Edit AI Task Expert
view-task-expert = AI Task Expert

# View Mode
view-edit-button = Configuration
view-tab-test = Test
view-test-system-params = System Parameters
view-test-user-params = User Parameters
view-test-run = Run Test
view-test-running = Running...
view-test-result = Result
view-test-description = Run the agent with test parameters
view-test-file-upload = File Upload
view-test-parameters = Parameters
view-test-parameters-description = Provide values for prompt variables
view-test-goal-params = Goal Parameters
view-test-no-goal-params = No parameters in Goal
view-test-no-system-params = No parameters in System Instructions

# Common
retry = Retry
close = Close
loading = Loading...
refresh = Refresh

# Expert dashboard
expert_dashboard_metric_total = Total runs
expert_dashboard_metric_success_rate = Success rate
expert_dashboard_metric_avg_duration = Avg duration (last 20)
expert_dashboard_metric_running = Running now
expert_dashboard_metric_total_30d = { $count } · 30d
expert_dashboard_metric_success_rate_30d = { $percent }% · 30d
expert_dashboard_metric_tool_calls_30d = { $count } tool calls · 30d
expert_dashboard_last20_runs = last 20 runs
expert_dashboard_avg_duration_runs = across { $count } runs
expert_dashboard_metric_total_days = { $count } · { $days }d
expert_dashboard_metric_success_rate_days = { $percent }% · { $days }d
expert_dashboard_metric_tool_calls_days = { $count } tool calls · { $days }d
expert_dashboard_window_label = Window
expert_dashboard_window_7d = Last 7 days
expert_dashboard_window_30d = Last 30 days
expert_dashboard_window_90d = Last 90 days
expert_dashboard_trend_title = Executions trend (last { $days } days)
expert_dashboard_status_breakdown_title = Status breakdown ({ $days } days)
expert_dashboard_top_tools_days = Top tools ({ $days } days)
expert_dashboard_chart_empty = No data yet.
expert_dashboard_status_breakdown_empty = No executions in the selected window.
expert_dashboard_recent_executions = Recent executions
expert_dashboard_recent_empty = No executions yet for this expert.
expert_dashboard_load_more = Load more
expert_dashboard_top_tools = Top tools (last 20)
expert_dashboard_top_tools_empty = No tools used yet.
expert_dashboard_tool_calls = { $count } tool calls
expert_dashboard_last_run_hint = Latest execution id: { $executionId }

# Monitoring
monitoring-title = Executions
monitoring-empty = No executions found for these filters.
monitoring-apply = Apply filters
monitoring-clear = Clear
monitoring-action-open = Open

monitoring-filter-status = Status
monitoring-filter-status-placeholder = Select status
monitoring-filter-status-all = All
monitoring-filter-status-success = Success
monitoring-filter-status-error = Error
monitoring-filter-status-running = Running

monitoring-filter-policy-root-id = Policy root id
monitoring-filter-policy-root-id-placeholder = e.g. 1234-5678
monitoring-filter-prompt-id = Expert id (promptId)
monitoring-filter-prompt-id-placeholder = e.g. 65a0...
monitoring-filter-tag = Tag
monitoring-filter-tag-placeholder = e.g. policy:1234
monitoring-filter-tool-name = Tool name
monitoring-filter-tool-name-placeholder = e.g. web_search
monitoring-filter-date-from = Created from
monitoring-filter-date-to = Created to

monitoring-column-status = Status
monitoring-column-prompt = Expert
monitoring-column-duration = Duration
monitoring-column-tools = Tool calls
monitoring-column-policies = Policies
monitoring-column-started = Started

monitoring-details-title = Execution details
monitoring-details-empty = Execution not found.
monitoring-details-duration = { $ms } ms
monitoring-details-tools = { $count } tool calls
monitoring-details-show-raw = Show raw
monitoring-details-hide-raw = Hide raw
monitoring-details-prompt = Expert
monitoring-details-started = Started
monitoring-details-decisions = Reasoning decisions
monitoring-details-trace = Trace events
monitoring-details-trace-count = { $count } events
monitoring-details-trace-empty = No trace events recorded.
monitoring-details-trace-truncated = +{ $count } more events not shown
monitoring-details-error = Error
monitoring-details-tool-event = Tool: { $tool }
monitoring-details-event-preview = Event recorded
monitoring-details-llm-tokens = LLM{ $model } · { $total } tokens ({ $prompt } + { $completion }) · { $toolCalls } tool calls

# Execution detail view
monitoring-detail-back = Back to list
monitoring-detail-execution-id = Execution ID
monitoring-detail-version = Version
monitoring-detail-ai-service = AI Service
monitoring-detail-ai-model = AI Model
monitoring-detail-finished = Finished
monitoring-detail-tools-used = Tools used
monitoring-detail-total-token-summary = { $total } tokens ({ $prompt }p + { $completion }c) · { $requests } LLM calls
monitoring-detail-resolved-prompt = Resolved prompt
monitoring-detail-expand = Show prompt
monitoring-detail-collapse = Hide prompt
monitoring-detail-system-params = System parameters
monitoring-detail-user-params = User parameters
monitoring-detail-system-prompt = System prompt (resolved)
monitoring-detail-user-prompt = User prompt (resolved)
monitoring-detail-output = Final output
monitoring-detail-raw-json = Raw JSON
monitoring-detail-model = Model
monitoring-detail-iteration = Iteration
monitoring-detail-prompt-tokens = Prompt tokens
monitoring-detail-completion-tokens = Completion tokens
monitoring-detail-total-tokens = Total tokens
monitoring-detail-tool-name = Tool name
monitoring-detail-tool-code = Tool code
monitoring-detail-arguments = Arguments
monitoring-detail-result = Result
monitoring-detail-expand-all = Expand all
monitoring-detail-collapse-all = Collapse all
monitoring-detail-prompt-not-recorded = Prompt data not recorded for this execution. Re-run to capture resolved prompts.
monitoring-detail-section-metadata = Run metadata
monitoring-detail-section-output = Final output
monitoring-detail-tab-input = Input
monitoring-detail-tab-output = Output
monitoring-detail-tab-tools = Tools
monitoring-detail-no-output = No output recorded.
monitoring-detail-no-tools = No tool calls recorded for this execution.

# Tag labels
tag-execution-test = Test

# Trace event labels
trace-event-execution-started = Execution started
trace-event-execution-finished = Execution finished
trace-event-execution-error = Execution error
trace-event-prompt-resolved = Prompt resolved
trace-event-llm-iteration = LLM iteration
trace-event-llm-final = LLM final
trace-event-llm-event = LLM event
trace-event-tool-call-started = Tool call started
trace-event-tool-call-finished = Tool call finished
trace-event-tool-call-error = Tool call error
trace-event-tools-load-started = Tools loading
trace-event-tools-load-finished = Tools loaded
trace-event-knowledge-load-started = Knowledge loading
trace-event-knowledge-load-finished = Knowledge loaded

# Connections
tab-connections = Connections
connections-title = Connections
connections-description = Browse available connector cards and manage saved MCP, DataBridge, and AnyPoint Connect connections.
connections-catalog-title = Available connectors
connections-catalog-description = Start from a preconfigured provider card, then save reusable connection instances.
connections-catalog-lane-mcp-description = Connect MCP servers and shared tool endpoints.
connections-catalog-lane-data-bridge-description = Connect structured systems through DataBridge.
connections-catalog-lane-anypoint-description = Connect unstructured systems through AnyPoint Connect.
connections-connect = Connect
connections-instances-title = Connected instances
connections-instances-description = Reuse saved connections across MCP tools, functions, and imports.
connections-search-placeholder = Search shared connections...
connections-lane-all = All lanes
connections-lane-mcp = MCP Servers
connections-lane-data-bridge = DataBridge
connections-lane-anypoint = AnyPoint Connect
connections-add = Add connection
connections-add-custom = Add custom connection
connections-count-total = { $count } total
connections-count-mcp = { $count } MCP
connections-count-data-bridge = { $count } DataBridge
connections-count-anypoint = { $count } AnyPoint Connect
connections-empty-title = No shared connections found.
connections-empty-description = Start from a provider card above, or create a custom connection instance.
connections-column-lane = Lane
connections-column-provider = Provider
connections-column-connector = Connector
connections-column-status = Status
connections-column-actions = Actions
connections-badge-internal = Internal
connections-badge-managed = Managed
connections-connector-custom = Custom
connections-status-active = Active
connections-status-inactive = Inactive
connections-test = Test connection
connections-test-running = Testing...
connections-delete = Delete
connections-internal-readonly = This connection is provisioned by the product and is read-only.
connections-edit-title = Edit connection
connections-create-title = New connection
connections-create-from-provider-title = Connect provider
connections-kind-label = Kind
connections-kind-mcp = MCP
connections-kind-structured = Structured data
connections-kind-unstructured = Unstructured data
connections-description-label = Description
connections-connector-id-label = Connector ID
connections-connector-name-label = Connector name
connections-transport-label = Transport
connections-url-label = URL
connections-url-placeholder = https://...
connections-consumer-types-label = Consumer types
connections-config-json-label = Connection config JSON
connections-env-json-label = Environment JSON
connections-load-failed = Failed to load connections
connections-save-failed = Failed to save connection
connections-test-failed = Connection test failed
connections-provider-custom-mcp-title = Custom MCP Server
connections-provider-custom-mcp-description = Connect any custom MCP endpoint with URL, transport, and auth settings.
connections-provider-sap-title = SAP
connections-provider-sap-description = Connect SAP systems for structured imports through DataBridge.
connections-provider-oracle-title = Oracle
connections-provider-oracle-description = Connect Oracle-backed systems for structured imports through DataBridge.
connections-provider-custom-structured-title = Custom Structured Source
connections-provider-custom-structured-description = Connect custom APIs, databases, and structured systems through DataBridge.
connections-provider-sharepoint-title = SharePoint
connections-provider-sharepoint-description = Connect SharePoint sites and libraries through AnyPoint Connect.
connections-provider-onedrive-title = OneDrive
connections-provider-onedrive-description = Connect OneDrive folders and files through AnyPoint Connect.
connections-provider-confluence-title = Confluence
connections-provider-confluence-description = Connect Confluence spaces and pages through AnyPoint Connect.
connections-provider-google-drive-title = Google Drive
connections-provider-google-drive-description = Connect Google Drive files and folders through AnyPoint Connect.
connections-provider-s3-title = S3
connections-provider-s3-description = Connect S3 buckets and prefixes through AnyPoint Connect.
connections-provider-custom-unstructured-title = Custom Unstructured Source
connections-provider-custom-unstructured-description = Connect custom repositories and file stores through AnyPoint Connect.
connections-field-base-url-label = Base URL
connections-field-api-key-label = API key
connections-field-host-label = Host
connections-field-port-label = Port
connections-field-service-name-label = Service name
connections-field-username-label = Username
connections-field-password-label = Password
connections-field-site-url-label = Site URL
connections-field-tenant-id-label = Tenant ID
connections-field-client-id-label = Client ID
connections-field-client-secret-label = Client secret
connections-field-drive-id-label = Drive ID
connections-field-email-label = Email
connections-field-api-token-label = API token
connections-field-folder-id-label = Folder ID
connections-field-service-account-json-label = Service account JSON
connections-field-bucket-label = Bucket
connections-field-region-label = Region
connections-field-access-key-id-label = Access key ID
connections-field-secret-access-key-label = Secret access key
connections-field-auth-token-label = Auth token

# Tool editor
tool-editor-test-success = Connection successful - { $count } action(s) available
tool-editor-test-failed = Connection failed
tool-editor-add-mcp = Add MCP server
tool-editor-basic-information = Basic information
tool-editor-display-name = Display name
tool-editor-mcp-configuration = MCP configuration
tool-editor-managed-mcp = Managed MCP connection
tool-editor-custom-mcp-config = Use custom MCP config
tool-editor-managed-mcp-help = Uses the shared URL, transport, and auth config from Connections.
