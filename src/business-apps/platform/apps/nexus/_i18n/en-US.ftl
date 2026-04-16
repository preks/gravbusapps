# App shell
app-auth-required = Authentication required
app-user-fallback = User

# Sidebar
sidebar-session-history = Session History
sidebar-new-session = New Session
sidebar-empty = No sessions yet
sidebar-untitled = Untitled
sidebar-time-just-now = Just now
sidebar-time-minutes-ago = { $count }m ago
sidebar-time-hours-ago = { $count }h ago
sidebar-time-days-ago = { $count }d ago

# Chat
chat-empty-title = Welcome to Nexus
chat-empty-description = Ask me anything about your documents, or instruct me to create content.
chat-llm-smart-mode = Smart mode
chat-llm-fast-mode = Fast mode
chat-llm-smart-active = Smart (active)
chat-llm-fast-active = Fast (active)
chat-data-access = Data access
chat-data = Data
chat-web-search = Web search
chat-web = Web
chat-deep-research = Deep Research
chat-input-placeholder = Ask a question, or instruct me to create something...
chat-status-planning-research-strategy = Planning research strategy...
chat-status-searching-internal-knowledge = Searching internal knowledge base...
chat-status-time-limit-reached = Time limit reached - assembling report from gathered sources...
chat-status-gap-analysis-interrupted = Gap analysis interrupted - proceeding with current sources...
chat-status-research-issue = Research encountered an issue - generating report from collected sources...
chat-status-writing-research-report = Writing comprehensive research report...
chat-status-searching-documents = Searching documents...
chat-status-fetching-live-data = Fetching live data...
chat-status-web-results-obtained = Web results obtained, processing...
chat-status-classifying-intent = Classifying intent...
chat-status-refining-artifact = Refining artifact...
chat-status-planning-data-query = Planning data query...
chat-status-preparing-response = Preparing response...
chat-status-querying-data-sources = Querying available data sources...
chat-status-answering = Answering...
chat-status-system-data-fallback = System data is not configured here - using tables instead...
chat-status-processing-results = Processing results...
chat-status-writing-answer = Writing answer...
chat-status-fetching-missing-details = Still fetching missing details...

# Scope selector
scope-none = None
scope-all = All
scope-all-content = All my content
scope-active = (active)

# Messages and sources
message-artifact-created = { $type } created
message-click-to-view = Click to view on canvas
message-view = View
message-searching-web = Searching the web...
message-searched-sites = { $count ->
    [one] Searched { $count } site
   *[other] Searched { $count } sites
}
message-sources = Sources
message-content-type-document = Document
message-content-type-note = Note
message-content-type-spreadsheet = Spreadsheet
message-content-type-web = Web

# Empty canvas
canvas-hero-description = Your AI-powered workspace. Generate documents, build analyses, and query live data.
canvas-title = What would you like to create?
canvas-description = Choose a starting point below, or open the chat to ask anything.
canvas-open-chat-title = Start a conversation
canvas-open-chat-description = Open the AI chat and ask me anything about your content
canvas-suggestion-ask-title = Ask about your documents
canvas-suggestion-ask-description = Search and query across all your documents, notes, and spreadsheets
canvas-suggestion-document-title = Generate a document
canvas-suggestion-document-description = Create reports, memos, proposals, or summaries from your content
canvas-suggestion-analysis-title = Create an analysis
canvas-suggestion-analysis-description = Build dashboards with KPIs, charts, tables, and key insights
canvas-suggestion-data-title = Query system data
canvas-suggestion-data-description = Pull real HR, CRM, or finance data from NEWWORK (enable Data Access first)

# Artifacts and canvas toasts
artifact-type-document = Document
artifact-type-analysis = Analysis
artifact-type-slides = Presentation
artifact-status-generating = Generating
artifact-action-saving = Saving...
artifact-action-saved = Saved
artifact-action-updated = Updated
artifact-action-copy = Copy
artifact-open-in-documents = Open in Documents
artifact-save-document = Save to Documents
artifact-update-document = Update Documents
artifact-saved-in-documents = In Documents
artifact-legacy-slides-title = Presentations are no longer supported in Nexus
artifact-legacy-slides-description = This presentation can no longer be opened or updated in Nexus. Create a document or analysis instead.
canvas-toast-saved-success = Saved successfully - { $message }
canvas-toast-updated-success = Updated successfully - { $message }
canvas-toast-save-failed = Save failed - { $message }
canvas-toast-open-not-ready = Document is still being prepared. Please try again in a few seconds.
canvas-toast-copied = Copied to clipboard

# Document renderer
document-generating = Generating document...
document-writing = Writing...

# Analysis renderer
analysis-generating = Generating analysis...
analysis-report = Analysis Report
analysis-key-insights = Key Insights
analysis-key-metrics = Key Metrics
analysis-visualizations = Visualizations
analysis-data-tables = Data Tables
analysis-building = Building analysis...
analysis-loading-title = Building your analysis
analysis-loading-step-analyzing = Analyzing your content
analysis-loading-step-metrics = Extracting key metrics
analysis-loading-step-insights = Generating insights
analysis-loading-step-visualizations = Building visualizations
analysis-loading-step-compiling = Compiling report
