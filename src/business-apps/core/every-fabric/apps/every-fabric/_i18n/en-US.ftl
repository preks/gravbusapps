enterprise-agent-title = { -platform-ai-agent-product.label }
enterprise-agent-subtitle = Your AI that plans, researches and executes ? in the background

enterprise-agent-nav-chat = Chat
enterprise-agent-nav-activity = Activity
enterprise-agent-nav-memory = Memory
enterprise-agent-nav-trace = Trace

enterprise-agent-new-session = New Task
enterprise-agent-input-placeholder = Describe your goal. The agent will figure out the rest.
enterprise-agent-send = Run
enterprise-agent-stop = Stop
enterprise-agent-reply = Answer

enterprise-agent-status-running = Working?
enterprise-agent-status-completed = Completed
enterprise-agent-status-failed = Failed
enterprise-agent-status-waiting = Waiting for you

enterprise-agent-plan-title = Plan
enterprise-agent-plan-progress = { $done } of { $total } steps
enterprise-agent-plan-current = Currently: { $step }

enterprise-agent-tool-call = { $tool }
enterprise-agent-tool-cached = (cached)
enterprise-agent-tool-duration = { $ms }ms

enterprise-agent-reflection-complete = Quality check passed
enterprise-agent-reflection-gaps = Agent found gaps and is continuing?

enterprise-agent-interrupt-title = Agent needs your input
enterprise-agent-interrupt-reply-placeholder = Your answer?

enterprise-agent-final-summary = Summary
enterprise-agent-final-findings = Findings
enterprise-agent-final-actions = Actions taken
enterprise-agent-final-recommendations = Recommendations
enterprise-agent-final-cost = Cost: ${ $cost }
enterprise-agent-final-duration = { $duration }
enterprise-agent-final-export = Export

enterprise-agent-memory-this-session = This session
enterprise-agent-memory-past = From past sessions
enterprise-agent-memory-workspace = Workspace knowledge
enterprise-agent-memory-add-placeholder = Tell the agent something to remember?

enterprise-agent-welcome-heading = What would you like to accomplish?
enterprise-agent-welcome-subtitle = Describe any goal. The agent will plan, research, and execute ? even while you work on other things.

enterprise-agent-background-running = { $count } agent{ $count ->
    [one] is
   *[other] s are
  } working in the background
enterprise-agent-background-waiting = Agent waiting for you

shell-session-load-error = Couldn't load this session
shell-try-again = Try again
shell-back-to-landing = Back to landing
shell-opening-session = Opening session...
shell-session-not-found = Session not found

# Centralized product / category nouns
brand-attribution = NEWWORK { -platform-ai-agent-product.label-plural }
brand-product-plural = { -platform-ai-agent-product.label-plural }
nav-digital-workforce = { -platform-ai-agent-fleet.label }
workforce-hero-title = { -platform-ai-agent-fleet.label }
workforce-label = { -platform-ai-agent-fleet.label }
skills-screen-title = { -platform-ai-agent-product.label }
trace-explorer-agent-mesh = { -platform-ai-agent-network.label }
agents-specialist-description = Task-matched specialists that the { -platform-ai-agent-product.label } activates automatically based on your request. They cannot be configured or run directly.
agent-config-runs-live-in-workforce = Cases, runs, and traces for this Worker live in { -platform-ai-agent-fleet.label }.
agent-config-view-activity-in-workforce = View live activity in { -platform-ai-agent-fleet.label }

# Workforce hero
workforce-hero-subtitle = Your governed Workers. They react to triggers, follow policies, use skills, and escalate to humans when needed.
workforce-hero-working-now = { $count } working now
workforce-hero-test-webhook-enabled-tooltip = Fire a webhook trigger with custom message content
workforce-hero-test-webhook-disabled-tooltip = No agents have an enabled webhook trigger
workforce-hero-test-webhook = Test webhook
workforce-hero-hire = Hire
workforce-kpi-active = Active agents
workforce-kpi-paused = Paused
workforce-kpi-triggers = Active triggers
workforce-kpi-credits = Credits / 7d

# Workforce filters
workforce-filters-search-placeholder = Search by name, role, department?
workforce-filters-aria-label = Filter workforce agents
workforce-filter-all = All
workforce-filter-active = Active
workforce-filter-paused = Paused

# Live status
workforce-live-pill-default = Live

# Common actions
action-close = Close
action-cancel = Cancel
action-save = Save
action-working = Working?
action-reset = Reset
action-add = Add

# Hire options
hire-options-title = Hire a workforce agent
hire-options-subtitle = Start from a ready-made agent or build your own.
hire-options-marketplace-title = Hire from marketplace
hire-options-marketplace-description = Browse ready-made agents with skills, tools and governance built in.
hire-options-create-title = Create from scratch
hire-options-create-description = Define a brand-new agent with your own role, instructions and autonomy.

# Value scoreboard
value-scoreboard-title = Business value
value-scoreboard-window = this week
value-scoreboard-estimated-note = ?Estimated? uses workspace value assumptions
value-kpi-cases = Cases handled
value-kpi-time-saved = Time saved
value-kpi-sla = SLA attainment
value-kpi-deflection = Deflection rate
value-kpi-cost = Cost per case
value-kpi-governance = Governance coverage
value-hint-runs-total = { $runs } runs total
value-hint-baseline = ~{ $minutes }m/case baseline
value-hint-sla = { $under }/{ $measured } ? { $target }
value-hint-deflection = { $autonomous } autonomous / { $cases } cases
value-hint-cost = { $cost } spent
value-hint-governance = { $audited }/{ $runs } audited ? { $stops } guardrail stops
value-sla-target-minutes = { $minutes }m target
value-sla-target-seconds = { $seconds }s target
value-kpi-estimated = Estimated
value-kpi-estimated-tooltip = Derived from workspace value assumptions

# Run source
source-manual = Manual run
source-schedule = Scheduled
source-webhook = Webhook
source-inbound-email = Inbound email
source-unknown = Unknown source

# Command center
command-center-title = Command center
command-center-empty = Nothing in flight right now. New runs will appear here as they start and finish.
command-center-stat-running = running
command-center-stat-waiting = waiting
command-center-stat-pending = pending
command-center-done-today = done today

# Run detail header
run-detail-back = Back
run-detail-refreshing = Refreshing
run-detail-fact-agent = Agent
run-detail-fact-trigger = Trigger
run-detail-fact-started = Started
run-detail-fact-duration = Duration
run-detail-fact-credits = Credits

# Run detail screen
run-detail-loading = Loading run?
run-detail-not-found = Run not found.
run-detail-load-error = Failed to load run detail.

# Run detail tabs
run-tab-overview = Overview
run-tab-actions = Actions & Records
run-tab-flows = Flows
run-tab-diagnostics = Diagnostics

# Overview tab
run-overview-task = Task
run-overview-empty-input = (empty)
run-overview-awaiting-approval = Awaiting human approval
run-overview-signin-required = Sign in is required to review and send this email draft.
run-overview-subject = Subject:
run-overview-output = Output
run-overview-no-output = (no output yet)
run-overview-artifacts = Artifacts

# Actions & records tab
run-actions-title = Records & actions
run-actions-empty = This run did not touch any records.

# Flows tab
run-flows-empty = This run did not trigger any workflows.
run-flows-view-map = Map
run-flows-view-list = List
run-flows-view-timeline = Timeline

# Diagnostics tab
run-diag-trace = Trace
run-diag-cost = Cost
run-diag-credits = { $credits } Newwork credits
run-diag-total-tokens = { $tokens } total tokens

# Run context links
run-context-records = Records
run-context-policies = Policies
run-context-open = Open { $label }: { $display }

# Config section shell
section-unsaved = Unsaved changes
section-saved = Saved
section-saving = Saving?

# Autonomy section
autonomy-title = Autonomy
autonomy-description = How much the agent may decide on its own + the custom system instructions it follows.
autonomy-aria-level = Autonomy level
autonomy-opt-draft-only-label = Assistive
autonomy-opt-draft-only-hint = Searches, summarizes, classifies, and drafts. Makes no system changes.
autonomy-opt-approval-label = Approval Required
autonomy-opt-approval-hint = Prepares actions and routes them to a human before execution.
autonomy-opt-delegated-label = Delegated
autonomy-opt-delegated-hint = Executes low-risk actions within thresholds and escalates exceptions.
autonomy-opt-autonomous-label = Autonomous
autonomy-opt-autonomous-hint = Runs end-to-end inside validated boundaries. Requires at least one escalation channel.
autonomy-instructions-label = Instructions
autonomy-instructions-suffix = (appended to system prompt)

# Budget section
budget-title = Budget
budget-description = Soft credit limits enforced at run time. 1 credit = 1,000 total tokens.
budget-daily = Daily credits
budget-weekly = Weekly credits
budget-monthly = Monthly credits
budget-no-limit = No limit
budget-when-exceeded = When exceeded
budget-aria-exceeded = Behaviour when budget exceeded
budget-opt-pause-label = Pause
budget-opt-pause-hint = Block new runs once the budget is exhausted.
budget-opt-escalate-label = Escalate
budget-opt-escalate-hint = Route the next run to the human owner instead.
budget-opt-warn-label = Warn only
budget-opt-warn-hint = Log a warning but keep running.

# Escalation section
escalation-title = Escalation
escalation-description = How the agent hands work back to humans. Full-auto agents and 'escalate' budgets need at least one channel.
escalation-owner-label = Owner user ID
escalation-queue-label = Ticket queue
escalation-queue-placeholder = e.g. ops-tier-1
escalation-notify-label = Notify emails
escalation-email-placeholder = ops@acme.com
escalation-confidence-label = Confidence threshold ({ $value })
escalation-confidence-hint = The agent escalates if its self-assessed confidence on the next action falls below this.
escalation-blocked-label = Blocked intents
escalation-intent-placeholder = e.g. cancel_contract
escalation-remove = Remove { $value }

# Triggers section
trigger-section-title = Triggers
trigger-section-desc = What makes this agent start working without a chat.
trigger-type-manual = Manual
trigger-type-manual-hint = Operator starts the agent from the UI.
trigger-type-schedule = Schedule
trigger-type-schedule-hint = Runs on a cron schedule or fixed interval.
trigger-type-webhook = Webhook
trigger-type-webhook-hint = External system POSTs to start a run.
trigger-type-inbound-email = Inbound email
trigger-type-inbound-email-hint = New emails to a mailbox start a run.
trigger-new = New trigger
trigger-type-aria = Trigger type
trigger-name-placeholder = Optional name
trigger-cron-placeholder = cron e.g. 0 8 * * MON
trigger-interval-placeholder = or interval (minutes)
trigger-subject-filter-title = Subject filter (optional)
trigger-subject-filter-desc = Only forward emails whose subject matches. Leave empty to forward all.
trigger-subject-filter-mode-aria = Subject filter mode
trigger-subject-mode-contains = Contains
trigger-subject-mode-prefix = Starts with
trigger-subject-mode-regex = Regex
trigger-case-sensitive = Case sensitive
trigger-subject-patterns-placeholder = One pattern per line, e.g. ticket, [support]
trigger-secret-placeholder = Optional shared secret
trigger-create-error = Failed to create trigger.
trigger-create-submit = Create trigger
trigger-creating = Creating?
trigger-empty = No triggers yet ? add a schedule, inbound mailbox, or webhook to make this agent proactive.
trigger-disable = Disable
trigger-enable = Enable
trigger-delete-aria = Delete trigger { $name }
trigger-webhook-url-missing = Webhook URL not provided by the backend. Re-fetch the trigger to populate it.
trigger-webhook-url-label = Webhook URL
trigger-test = Test
trigger-webhook-post-secret = POST a JSON body with header X-Workforce-Signature: sha256=<HMAC-SHA256 of the body using your secret>.
trigger-webhook-post-nosecret = POST a JSON body. Optional: configure a secret to require an X-Workforce-Signature header.
trigger-no-mailbox-configured = No mailbox configured.
trigger-inbound-mailbox-label = Inbound mailbox
trigger-inbound-forward-hint = Forward messages here from your email provider. The router fires the agent once per matched recipient.
trigger-last-fired = Last fired { $time }
trigger-copy-aria = Copy to clipboard
trigger-mode-contains = contains
trigger-mode-prefix = starts with
trigger-mode-regex = matches
trigger-forwards-all = forwards all
trigger-filter-summary = filter: { $mode } { $patterns }
trigger-cfg-cron = cron: { $cron }
trigger-cfg-interval = every { $minutes } min
trigger-cfg-not-configured = not configured
trigger-cfg-no-mailbox = no mailbox
trigger-cfg-secret-set = secret set
trigger-cfg-no-secret = no secret
trigger-err-schedule = Schedule triggers need either 'cron' or 'interval_minutes'.
trigger-err-interval = 'interval_minutes' must be a positive integer.
trigger-err-mailbox = Select a connected mailbox for inbound email triggers.

# Inbound mailbox picker
mailbox-signin-required = Sign in to load your connected mailboxes.
mailbox-load-error = Failed to load connected mailboxes.
mailbox-select-aria = Connected mailbox
mailbox-loading = Loading mailboxes?
mailbox-select-placeholder = Select a connected mailbox
mailbox-refresh-aria = Refresh connected mailboxes
mailbox-empty-prefix = No connected mailboxes yet.
mailbox-connect-link = Connect a mailbox in the Email app
mailbox-empty-suffix = then refresh.
mailbox-forwarding-hint = Forwarding is off for this mailbox. Enable "Forward to { -platform-ai-agent-fleet.label }" for it in the Email app, or this trigger will not receive mail.
mailbox-footer-hint = Only mailboxes you have connected can be used. The address is taken from the verified account.

# Common: remove chip / item
action-remove = Remove { $value }

# Role & ownership fields
roleown-role-label = Role
roleown-department-label = Department
roleown-owner-label = Owner user ID
roleown-owner-placeholder = Person responsible for escalations
roleown-section-title = Role & ownership
roleown-section-desc = The { -platform-ai-agent.inline }'s role, department, and the person accountable for it.

# Identity section
identity-section-title = Identity
identity-section-desc = How this { -platform-ai-agent.inline } is identified across its deployments.
identity-identifier-label = Identifier (read-only)
identity-display-name-label = Display name
identity-description-label = Description

# Orgchart registration section
orgchart-section-title = Orgchart identity
orgchart-section-desc = Attach this { -platform-ai-agent.inline } to the orgchart. Registered { -platform-ai-agent.inline-plural } run inbound and scheduled work under their own identity instead of the shared service account.
orgchart-err-503 = Keycloak user creation is disabled on this tenant (KEYCLOAK_USER_CREATION_ENABLED). Create the user manually and paste its ID below.
orgchart-err-409 = A Keycloak user or employee with this identity already exists. Paste the existing Keycloak user ID below to link it instead.
orgchart-unlink-error = Failed to unlink orgchart identity
orgchart-unit-members-count = { $count ->
    [one] { $count } member
   *[other] { $count } members
}
orgchart-registered-badge = Registered in orgchart
orgchart-org-unit-label = Org unit:
orgchart-employee-label = Employee:
orgchart-keycloak-label = Keycloak user:
orgchart-since-label = Since:
orgchart-first-name = First name
orgchart-last-name = Last name
orgchart-job-position = Job position
orgchart-job-position-placeholder = e.g. Customer Service Agent
orgchart-org-unit = Organizational unit
orgchart-org-unit-placeholder = Default: Virtual Assistants team
orgchart-org-unit-search = Search organizational units?
orgchart-org-unit-empty = No organizational units found
orgchart-org-unit-hint = Where the { -platform-ai-agent.inline } appears in the org chart. Leave empty to use the default "Virtual Assistants" team.
orgchart-existing-user-id = Existing Keycloak user ID (optional)
orgchart-existing-user-id-placeholder = Leave empty to create a new user automatically
orgchart-unlink = Unlink identity
orgchart-registering = Registering?
orgchart-register = Register in orgchart

# Knowledge section
knowledge-section-title = Knowledge
knowledge-section-desc = Policies, contracts, and other references the { -platform-ai-agent-product.inline } may read while working.
knowledge-source-policy = Policy
knowledge-source-contract = Contract
knowledge-source-knowledge = Knowledge source
knowledge-source-skill = Skill
knowledge-source-url = URL
knowledge-source-type-aria = Knowledge source type
knowledge-ref-id-placeholder = Reference ID or URL
knowledge-title-placeholder = Optional title
knowledge-empty = No knowledge references yet.
knowledge-open-policy = Open policy in a new tab (ID: { $id })

# Skills & policies section
skills-section-title = Skills & policies
skills-section-desc = Skills and intranet policies attached to this { -platform-ai-agent-product.inline }.
skills-resolving = Resolving skill details?
skills-attached-tools = Attached tools
skills-no-tools = No tools attached by this skill.
skills-label = Skills
skills-skill-id-placeholder = Skill ID
skills-policies-desc = Attach intranet policies the { -platform-ai-agent-product.inline } can read at run time. Workspace defaults are inherited automatically; remove any that are not relevant for this { -platform-ai-agent-product.inline }.

# Customer 360 surface section
customer360-section-title = Customer 360
customer360-section-desc = Surface this { -platform-ai-agent-product.inline }'s inbound-email runs in the CRM Customer 360 Inbound tab, matched to the customer who wrote in.
customer360-toggle-title = Show inbound runs in Customer 360
customer360-toggle-desc = Inbound emails this { -platform-ai-agent-product.inline } handles appear in the Customer 360 Inbound stream. Leave off for { -platform-ai-agent-product.inline-plural } whose mail should not show up in CRM.

# Agent tile / deck
tile-status-active = Active
tile-status-paused = Paused
tile-best-match = Best match
tile-working = Working
tile-specialist-fallback = Workforce specialist
tile-no-description = No description provided yet.
tile-open-agent = Open { $name }
tile-triggers-stat = { $active }/{ $total } triggers
tile-last-run-stat = Last run { $time }
tile-credits-stat = { $credits } credits / 7d
tile-pause = Pause
tile-pausing = Pausing?
tile-activate = Activate
tile-activating = Activating?
tile-archive-aria = Remove from workforce

# Recent runs panel
recent-runs-title = Recent runs
recent-runs-desc = Latest deep-agent sessions attributed to this { -platform-ai-agent-product.inline }. Click a run for the full trace.
recent-runs-refresh-aria = Refresh runs
recent-runs-refresh = Refresh
recent-runs-loading = Loading runs?
recent-runs-empty-title = No runs yet
recent-runs-empty-desc = Fire a manual test run or wait for a trigger to schedule one.
recent-runs-empty-input = (empty input)
recent-runs-credits = { $credits } credits

# Agent detail screen
detail-back-aria = Back to workforce
detail-loading-title = Loading agent?
detail-no-role = No role set
detail-publish-marketplace = Publish to tenant
detail-test-run = Test run
detail-tab-overview = Overview
detail-tab-runs = Runs
detail-tab-inbox = Inbox
detail-tab-trace = Trace
detail-tab-config = Config
detail-dismiss = Dismiss
detail-loading-agent = Loading workforce agent?
detail-webhook-fail = Failed to send webhook.
detail-publish-fail = Publish failed

# Test run modal
testrun-title = Test run for { $name }
testrun-desc = Fires a manual run using the { -platform-ai-agent-product.inline }'s current configuration. Useful for rehearsing a scheduled job or verifying instructions before going live.
testrun-demo-email = Sample inbound email
testrun-custom-task = Custom task (type below)
testrun-expected = Expected: { $path }
testrun-demo-hint = Pick one of the insurance demo scenarios to pre-fill the task with Subject, From, To, and body.
testrun-task = Task
testrun-task-placeholder = e.g. "Triage the latest unassigned policy questions in the support queue and draft a response."
testrun-task-hint = What should the { -platform-ai-agent-product.inline } do right now? It will use its standing instructions, skills and policies.
testrun-trigger-label = Attribute to trigger (optional)
testrun-trigger-none = Ad-hoc test (no trigger)
testrun-trigger-hint = Attribute this run to a real trigger so it shows up in that trigger's run history.
testrun-starting = Starting?
testrun-submit = Run now

# Hire modal
hire-title-default = Activate a Worker
hire-subtitle-default = Activate a proactive Worker. You can wire up triggers, skills, escalation and budget in the next step.
hire-display-name = Display name
hire-name-placeholder = e.g. Claims Triage Specialist
hire-stored-as = Stored as
hire-name-hint = Letters, digits and spaces are fine ? we will convert this to an identifier.
hire-role = Role
hire-role-placeholder = e.g. Claims agent
hire-department = Department
hire-department-placeholder = e.g. Insurance Ops
hire-short-description = Short description
hire-description-placeholder = One sentence the team will see on the workforce card
hire-instructions = Instructions
hire-instructions-optional = (optional)
hire-instructions-placeholder = How should this { -platform-ai-agent-product.inline } behave? E.g. Always check the policy library before replying. Escalate to a human if confidence < 0.7.
hire-autonomy = Autonomy
hire-autonomy-aria = Autonomy level
hire-creating = Hiring?
hire-submit = Hire { -platform-ai-agent-product.inline }
hire-error = Failed to hire workforce agent.

# Agent deck
deck-best-matches-for = Best matches for "{ $query }"

# Overview tab
overview-kpi-today = Today
overview-kpi-week = This week
overview-kpi-month = This month
overview-kpi-credits = credits
overview-kpi-runs = { $count ->
    [one] { $count } run
   *[other] { $count } runs
}
overview-view-all-runs = View all runs

# Runs tab
runs-search-placeholder = Search subject or sender?
runs-filter-all-statuses = All statuses
runs-filter-running = Running
runs-filter-completed = Completed
runs-filter-failed = Failed
runs-filter-cancelled = Cancelled
runs-filter-waiting-human = Waiting for human
runs-filter-all-sources = All sources
runs-filter-manual = Manual
runs-filter-schedule = Scheduled
runs-filter-webhook = Webhook
runs-filter-inbound-email = Inbound email
runs-refresh = Refresh
runs-loading = Loading runs?
runs-empty = No runs match these filters yet.
runs-page = Page { $page } of { $totalPages } ? { $total } total
runs-prev = Prev
runs-next = Next
runs-row-credits = { $credits } credits

# Inbox tab
inbox-search-placeholder = Search subject or sender?
inbox-loading = Loading inbox?
inbox-empty-title = No inbound emails for this { -platform-ai-agent-product.inline } yet.
inbox-empty-desc = Wire an inbound-email trigger and forward mail to that mailbox to start the queue.
inbox-col-from = From
inbox-col-subject = Subject
inbox-col-received = Received
inbox-col-status = Status
inbox-col-credits = Credits
inbox-open-run-aria = Open run details for { $subject }

# Trace tab
trace-inbound-email-header = Inbound email ? { $time }
trace-from = From
trace-no-subject = (no subject)
trace-loading-runs = Loading runs?
trace-no-runs-hint = No runs available yet. Fire a Test run from the header to see a trace.
trace-view-timeline = Timeline
trace-view-mesh = Mesh
trace-streaming-live = Streaming live activity?
trace-title = Run trace
trace-desc = Pick a run to see every decision the { -platform-ai-agent-product.inline } made ? tool calls, sub-agent invocations, approvals, and HITL pauses.
trace-back-to-list = ? Back to run list
trace-reload = Reload
trace-loading-run = Loading run?
trace-load-fail = Failed to load run.
trace-empty-events = No trace events recorded for this run yet.
trace-picker-credits = { $credits } credits
trace-cat-tool = Tool
trace-cat-decision = Decision
trace-cat-policy = Policy
trace-cat-hitl = Waiting on human
trace-cat-approval = Approval
trace-cat-cost = Cost
trace-cat-skill = Skill
trace-cat-thinking = Thinking
trace-cat-message = Message
trace-cat-status = Status
trace-cat-system = System
trace-chose = Chose: { $choice }
trace-confidence = confidence { $percent }%
trace-why = Why:
trace-alternatives = Alternatives considered
trace-actor-by = by { $name }
trace-show-raw = Show raw
trace-hide-raw = Hide raw
trace-open-policy-title = Open policy in a new tab (ID: { $id })

# Run mesh view
mesh-live-activity = Live activity
mesh-no-activity = No activity recorded yet.

# Dashboard charts
chart-credit-title = Credits & cost (7d)
chart-credit-subtitle = { $credits } credits ? ~{ $usd } estimated
chart-credit-empty = No usage in this window yet.
chart-credits-label = Credits

chart-outcome-title = Run outcomes
chart-outcome-none-finished = No finished runs yet
chart-outcome-success-runs = { $rate }% success ? { $runs } runs
chart-outcome-empty = No runs in this window yet.
chart-outcome-completed = Completed
chart-outcome-failed = Failed
chart-outcome-cancelled = Cancelled
chart-outcome-success-label = success

chart-source-title = Where work comes from
chart-source-desc = Last 30 days, grouped by trigger source.
chart-source-empty = No runs in the last 30 days yet.
chart-source-runs-label = Runs

# Test webhook modal
testwebhook-title = Test webhook
testwebhook-desc = Fires through the webhook trigger path (not a manual run). The { -platform-ai-agent-product.inline } receives your message as webhook payload content.
testwebhook-close-aria = Close
testwebhook-empty = No { -platform-ai-agent-product.inline-plural } have an enabled webhook trigger. Add one in Config ? Triggers.
testwebhook-agent-label = { -platform-ai-agent-product.inline }
testwebhook-trigger-label = Webhook trigger
testwebhook-subject-label = Subject
testwebhook-message-label = Message
testwebhook-message-placeholder = e.g. "Customer John Doe reports claim #12345 was denied incorrectly. Please review and respond."
testwebhook-message-hint = Sent as the webhook body. The { -platform-ai-agent-product.inline } sees subject and message in its task string.
testwebhook-default-subject = Test webhook
testwebhook-sending = Sending?
testwebhook-submit = Send webhook

# Archived agents panel
archived-title = Archived { -platform-ai-agent-product.inline-plural }
archived-desc = Soft-deleted workforce { -platform-ai-agent-product.inline-plural }. Restoring brings them back paused so you can review before re-activating.
archived-refresh-aria = Refresh archived { -platform-ai-agent-product.inline-plural }
archived-loading = Loading archived { -platform-ai-agent-product.inline-plural }?
archived-empty-title = No archived { -platform-ai-agent-product.inline-plural }
archived-empty-desc = When you archive an { -platform-ai-agent-product.inline } it shows up here so you can restore it.
archived-meta = Archived { $time }
archived-meta-by = Archived { $time } by { $user }
archived-restoring = Restoring?
archived-restore = Restore

# Live activity feed
live-activity-title = Live activity
live-activity-running-count = { $count } running
live-activity-empty = No runs in flight right now.

# Run approval sections (flow, email, structured)
approval-awaiting-title = Awaiting human approval
approval-comment-placeholder = Add a comment (optional)
approval-approve = Approve
approval-reject = Reject
approval-submitting = Submitting?
approval-flow-missing-task-id = This approval task is missing its id and cannot be actioned here.
approval-flow-missing-user = Could not resolve your user to record the decision.
approval-flow-submit-fail = Failed to submit your decision.
approval-flow-empty-proposal = No proposed changes captured for review.
approval-email-signin = Sign in required to send email.
approval-email-submit-fail = Failed to submit email.
approval-structured-signin = Sign in required to respond.
approval-structured-submit-fail = Failed to submit your response.

# Run entity links & domain actions
entity-records-actions-title = Records & actions
entity-case-assigned = Case assigned
entity-action-search-label = Search
entity-action-search-desc = Looked up an existing record
entity-action-create-label = Create
entity-action-create-desc = Created a new record
entity-action-update-label = Update
entity-action-update-desc = Updated an existing record
entity-action-timeline-label = Timeline
entity-action-timeline-desc = Read record history
entity-action-note-label = Note
entity-action-note-desc = Added a note
entity-action-task-label = Task
entity-action-task-desc = Logged a follow-up task
entity-action-flow-label = Flow
entity-action-flow-desc = Started a workflow
entity-action-fallback-desc = Tool call
entity-label-account = Account
entity-label-contact = Contact
entity-record-id-label = { $label }: { $value }
entity-workflow-fallback = Workflow

# Flow action details (run detail)
flow-step-progress = Step { $current } of { $total }
flow-steps-complete = { $total } of { $total } steps
flow-template-id-chip = template_id: { $id }

# CRM actions (run detail)
crm-actions-title = CRM actions
crm-action-search-label = Search
crm-action-search-desc = Looked up existing CRM record
crm-action-create-label = Create
crm-action-create-desc = Created a new CRM record
crm-action-update-label = Update
crm-action-update-desc = Updated an existing CRM record
crm-action-timeline-label = Timeline
crm-action-timeline-desc = Read CRM history
crm-action-note-label = Note
crm-action-note-desc = Added a CRM note
crm-action-task-label = Task
crm-action-task-desc = Logged a CRM follow-up task
crm-action-fallback-desc = CRM tool call
crm-record-note = CRM note
crm-record-task = CRM task
crm-record-account = Account
crm-record-contact = Contact

# Run audit timeline
audit-trail-title = Audit trail
audit-trail-loading = Loading audit trail?
audit-trail-load-fail = Failed to load audit trail.
audit-trail-empty = No audit entries recorded for this run.
audit-trail-by = by { $actor }
audit-trail-system = system

# Policies used (run detail)
policies-title = Policies

# Workforce AI composer
composer-trigger-label = Find the right workforce agent for the job
composer-collapse-aria = Collapse
composer-input-placeholder = Describe the work? e.g. answer inbound claim emails
composer-find = Find
composer-ai-badge = AI
composer-sample-claims = Answer inbound insurance claim emails
composer-sample-triage = Triage support tickets against our policies
composer-sample-leads = Qualify new leads with our ICP rules
composer-sample-expenses = Reconcile expense reports for finance

# Credit sparkline (agent config)
sparkline-title = Credits used (7d)
sparkline-summary = { $credits } credits ? { $runs } runs
sparkline-aria-label = Credit usage by day
sparkline-bar-title = { $date }: { $credits } credits

# Per-agent credits chart
per-agent-chart-title = Credits by agent
per-agent-chart-subtitle = Top consumers this week.
per-agent-chart-empty = No agent usage yet.

# Glass workforce sphere
glass-sphere-heading = Active workforce
glass-sphere-value-one = { $count } agent online
glass-sphere-value-other = { $count } agents online
glass-sphere-credits-unit = credits / month

# Agent marketplace
marketplace-modal-title = { -platform-ai-agent-product.inline } marketplace
marketplace-modal-subtitle = Hire ready-made { -platform-ai-agent-product.inline-plural } with skills, tools and governance included.
marketplace-manage-catalog = Manage catalog
marketplace-select-multiple = Select multiple
marketplace-done-selecting = Done selecting
marketplace-close-aria = Close
marketplace-search-placeholder = Search by role, skill or tool?
marketplace-offline-catalog = Using offline catalog: { $error }
marketplace-loading-catalog = Loading catalog?
marketplace-empty-search = No { -platform-ai-agent-product.inline-plural } match your search
marketplace-selected-count = { $count } selected
marketplace-installing = Installing?
marketplace-install-selected = Install selected ({ $count })
marketplace-error-install-failed = Install failed
marketplace-error-preflight-failed = Preflight failed
marketplace-error-offline-cannot-publish = Select catalog packages that exist on this deployment (offline demo { -platform-ai-agent-product.inline-plural } cannot be published).
marketplace-card-skills-count = { $count } skills
marketplace-card-tools-count = { $count } tools
marketplace-card-installs-count = { $installs } installs
marketplace-card-selected = Selected
marketplace-card-select = Select
marketplace-card-view-profile = View profile
marketplace-detail-back = Back to marketplace
marketplace-detail-rating-installs = { $rating } ? { $installs } installs
marketplace-detail-section-skills = Skills
marketplace-detail-section-tools = Tools & integrations
marketplace-detail-section-governance = Governance
marketplace-detail-section-triggers = Reacts to
marketplace-detail-section-pricing = Pricing
marketplace-detail-bundled-skills = { $count } bundled skills included
marketplace-detail-tools-wired = { $count } tools wired via skills
marketplace-detail-hire-note-legacy = Starts paused for your review.
marketplace-detail-hire-note-package = Installs { -platform-ai-agent-product.inline }, skills and tools immediately.
marketplace-detail-hire-button = Hire { $name }
marketplace-install-summary-title = Install summary
marketplace-install-summary-stats = { $succeeded } succeeded ? { $failed } failed ? { $total } total
marketplace-install-summary-agent-id = Agent id: { $agentId }
marketplace-needs-configuration = Needs configuration: { $items }
marketplace-done = Done
marketplace-preflight-title-ready = Ready to hire
marketplace-preflight-title-check = Compatibility check
marketplace-preflight-all-ready = All selected packages passed preflight checks.
marketplace-preflight-issues-found =
    { $count ->
        [one] { $count } issue found before install.
       *[other] { $count } issues found before install.
    }
marketplace-preflight-missing-tools = Missing tools: { $tools }
marketplace-preflight-missing-functions = Missing functions: { $functions }
marketplace-preflight-install-now = Install now
marketplace-preflight-install-anyway = Install anyway
marketplace-publish-agent-description = List { $agentName } in a customer marketplace. They can hire it after you publish.
marketplace-publish-agent-success = { $name } published
marketplace-publish-agent-success-meta = Available on { $target } ? package id { $packageId } ? { $skillCount } skills ? { $toolCount } tools
marketplace-target-tenant-url = Target tenant URL
marketplace-target-url-placeholder = https://customer.example.com/prompt-manager
marketplace-target-bearer-token = Target bearer token
marketplace-target-token-placeholder = Paste tenant access token
marketplace-package-id-optional = Package id (optional)
marketplace-package-id-placeholder = Auto-generated from agent name
marketplace-category-label = Category
marketplace-category-placeholder = general
marketplace-publisher-label = Publisher
marketplace-publisher-placeholder = newwork
marketplace-publishing = Publishing?
marketplace-push-description =
    { $count ->
        [one] List { $count } selected { -platform-ai-agent-product.inline } in a customer marketplace.
       *[other] List { $count } selected { -platform-ai-agent-product.inline-plural } in a customer marketplace.
    }
marketplace-push-success =
    { $count ->
        [one] Published { $count } package
       *[other] Published { $count } packages
    }
marketplace-push-failed =
    { $count ->
        [one] { $count } package failed
       *[other] { $count } packages failed
    }
marketplace-push-failed-item = { $name }: { $error }
marketplace-manage-loading = Loading catalog?
marketplace-manage-description = Published packages visible in the hire marketplace on this tenant. Unpublish removes a listing.
marketplace-manage-empty = No published packages yet.
marketplace-manage-package-meta = { $packageId } ? { $category } ? { $skillCount } skills ? { $toolCount } tools ? { $installCount } installs
marketplace-manage-unpublish = Unpublish
marketplace-manage-error-load = Failed to load catalog
marketplace-manage-error-unpublish = Unpublish failed
marketplace-pack-hr = Human Resources
marketplace-pack-crm = Customer Relationship
marketplace-pack-service = Customer Service
marketplace-pack-finance = Finance
marketplace-pack-erp = ERP & Procurement
marketplace-pack-general = General

# Flow detail panel & map
flow-detail-empty = This action did not return a workflow id.
flow-field-initiated-by = Initiated by
flow-field-progress = Progress
flow-field-started = Started
flow-field-completed = Completed
flow-field-who = Who
flow-field-claimed = Claimed
flow-field-duration = Duration
flow-field-due-sla = Due / SLA
flow-steps-title = Steps
flow-steps-loading = Loading steps?
flow-steps-empty = No steps reported yet.
flow-step-results = Results
flow-step-results-loading = Loading results?
flow-step-captured-data = Captured data
flow-step-result-empty = No results captured for this step yet.
flow-step-result-empty-review = No step result is captured for this node.
flow-step-data-empty = No data captured.
flow-live-badge = Live
flow-live-updating = Updating
flow-legend-status = Status:
flow-legend-current = Current
flow-legend-completed = Completed
flow-legend-failed = Failed
flow-legend-pending = Pending
flow-replay-restart-aria = Restart replay
flow-replay-prev-aria = Previous step
flow-replay-toggle-pause = Pause replay
flow-replay-toggle-play = Play replay
flow-replay-next-aria = Next step
flow-replay-position-aria = Replay position
flow-progress-steps = { $completed }/{ $total } steps
flow-progress-summary-complete = { $total } of { $total } steps
flow-progress-summary = Step { $current } of { $total }
flow-progress-summary-pct = Step { $current } of { $total } ? { $percent }%
flow-map-replaying-path = Replaying the path this flow took
flow-map-completed-path = Completed execution path
flow-map-live-path = Live execution path
flow-map-step-of = Step { $current } of { $total }
flow-map-step-of-titled = Step { $current } of { $total } ? { $title }
flow-map-fullscreen-enter = Enter fullscreen
flow-map-fullscreen-exit = Exit fullscreen
flow-map-unavailable-title = Flow map unavailable
flow-map-unavailable-desc = This workflow has no template reference, so its diagram cannot be shown.
flow-map-step-detail-close = Close step details
flow-map-step-detail-empty = No step result is captured for this node.
flow-node-start = Start
flow-node-end = End
flow-node-step = Step
flow-not-available = Not available

# Sidebar
sidebar-search-label = Search sessions
sidebar-search-clear-aria = Clear search
sidebar-search-loading-aria = Searching sessions
sidebar-matching-sessions-one = 1 matching session
sidebar-matching-sessions-many = { $count } matching sessions
sidebar-recents-label = Recents
sidebar-recents-loading = Loading sessions...
sidebar-recents-empty = No sessions yet. Start one from the composer.
sidebar-recents-empty-search = No sessions match your search or filters.
sidebar-recents-load-more-loading = Loading older sessions...
sidebar-recents-load-more-search = Load more matches
sidebar-recents-load-more = Load older sessions
sidebar-group-today = Today
sidebar-group-yesterday = Yesterday
sidebar-group-earlier = Earlier
sidebar-signed-in = Signed in
sidebar-scheduled-tasks = Scheduled Tasks
sidebar-settings = Settings
sidebar-new-session = New session
sidebar-live-label = Live
sidebar-status-waiting = Waiting
sidebar-status-pending = Pending
sidebar-status-running = Running
sidebar-untitled-task = Untitled task
sidebar-stop-session = Stop session
sidebar-untitled-session = Untitled session
sidebar-status-done = Done
sidebar-status-failed = Failed
sidebar-status-cancelled = Cancelled
sidebar-delete-session = Delete session

# Chat
chat-attachment-index-failed = Failed to index: { $name }
chat-attachment-indexing = Indexing: { $name }
chat-attachment-ready-prefix = Ready
chat-attachment-upload-failed = Failed to upload { $name }
chat-attachment-ready-pending = Ready: { $name } (will upload when you send)
chat-attachment-uploading = Uploading { $name }...
chat-attachment-indexing-pending = Indexing { $name }...
chat-attachment-preview-open = Open
chat-attachment-preview-download = Download
chat-attachment-preview-aria = Open larger preview for { $name }
chat-attachment-remove = Remove { $name }
chat-email-status-sent = Email sent
chat-email-status-drafted = Saved as draft
chat-email-status-cancelled = Cancelled
chat-email-status-error = Send failed
chat-email-status-completed = Completed
chat-email-review-title = Review and send email
chat-email-field-from = From
chat-email-field-to = To
chat-email-field-cc = Cc
chat-email-field-bcc = Bcc
chat-email-add-cc-bcc = Add Cc / Bcc
chat-email-subject-placeholder = Subject
chat-email-body-placeholder = Write your message?
chat-email-signature-label = Signature
chat-email-use-account-signature = Use my account signature
chat-email-signature-placeholder = -- \nYour Name
chat-email-recipient-placeholder = Type a name or email?
chat-email-searching = Searching?
chat-email-no-employees-hint = No matching employees. Press Enter to add raw email.
chat-email-loading-accounts = Loading accounts?
chat-email-no-accounts = No email accounts connected. Connect one in your email settings to send.
chat-email-accounts-error = Failed to load accounts: { $error }
chat-email-default-account = (default)
chat-email-validation-recipients = Add at least one recipient.
chat-email-validation-subject = Subject is required.
chat-email-validation-pick-account = Pick an email account to send from.
chat-email-validation-no-account = No email account is connected.
chat-email-no-subject = No subject
chat-email-save-draft = Save draft
chat-email-sending = Sending?
chat-email-send = Send
chat-email-remove-recipient = Remove { $address }
chat-email-remove-attachment = Remove attachment { $name }
chat-activity-aria = Agent progress
chat-agent-working = Agent is working?

# Landing
landing-greeting-with-name = Hi { $name }, what
landing-greeting = What
landing-heading-suffix = would you like to do?
landing-subtitle = Assign a task, ask anything, or continue a workflow.
landing-input-placeholder = Describe a task, research topic, or ask anything?
landing-input-reply-prefix = Your answer to: "{ $text }"
landing-input-working = Agent is working?
landing-input-reply = Reply or give feedback?
landing-input-uploading = Uploading attachment?
landing-input-indexing = Indexing attachment, almost ready?
landing-input-hint = Enter to send, Shift+Enter for newline
landing-input-starting = Starting session...
landing-stop-aria = Stop
landing-connectors-count = { $count } connectors
landing-composer-add-title = Add
landing-composer-panel-title = Add to this session
landing-composer-panel-subtitle = Choose an agent, attach files, or connect data.
landing-composer-section-agents = Work with an agent
landing-composer-clear = Clear
landing-composer-agent-search = Search agents?
landing-composer-agents-empty = No agents available.
landing-composer-agents-no-match = No agents match your search.
landing-composer-section-files = Files & images
landing-composer-upload-title = Add photos & files
landing-composer-upload-desc = PDFs, images, and documents
landing-composer-section-connectors = Connectors
landing-composer-connectors-active = { $count } active
landing-composer-connectors-empty-hint = Connect external data sources
landing-composer-connectors-none = No connectors available.
landing-composer-manage-connections = Manage connections
landing-agent-chip-label = Agent
landing-agent-chip-title = Working with { $name }
landing-model-label = Model
landing-model-fallback = Model
landing-model-aria = Model: { $model }
landing-model-aria-with-effort = Model: { $model }, { $effort }
landing-reasoning-label = Reasoning
landing-effort-none = None
landing-effort-low = Low
landing-effort-medium = Medium
landing-effort-high = High

# Trace explorer
trace-explorer-tab-tools = Tools ({ $count })
trace-explorer-tab-sources = Sources ({ $count })
trace-explorer-tab-cost = Cost
trace-explorer-section-execution = Execution overview
trace-explorer-stat-runtime = Total runtime
trace-explorer-stat-events = Events processed
trace-explorer-stat-tool-calls = Tool calls
trace-explorer-stat-decisions = Decisions
trace-explorer-section-llm-cost = LLM cost
trace-explorer-stat-tokens = Tokens used
trace-explorer-stat-estimated-cost = Estimated cost
trace-explorer-budget-pct = { $pct }% of budget
trace-explorer-budget-consumed = Budget consumed
trace-explorer-cost-pending = Cost data will appear once the session completes
trace-explorer-section-participants = Participants
trace-explorer-stat-subagents = Sub-agents
trace-explorer-stat-experts = Experts
trace-explorer-stat-skills = Skills
trace-explorer-tools-empty = No tool calls in this session
trace-explorer-col-tool = Tool
trace-explorer-col-calls = Calls
trace-explorer-col-total-time = Total time
trace-explorer-col-failures = Failures
trace-explorer-col-status = Status
trace-explorer-status-ok = OK
trace-explorer-sources-empty = No participants detected
trace-explorer-col-participant = Participant
trace-explorer-col-kind = Kind
trace-explorer-col-invocations = Invocations
trace-explorer-col-duration = Duration
trace-explorer-kind-orchestrator = Every
trace-explorer-kind-subagent = Sub-agent
trace-explorer-kind-expert = Expert
trace-explorer-kind-skill = Skill
trace-explorer-kind-tool = Tool
trace-explorer-status-done = Done
trace-explorer-status-failed = Failed
trace-explorer-status-running = Running
trace-explorer-status-idle = Idle
trace-explorer-detail-seq = Seq
trace-explorer-detail-offset = Offset
trace-explorer-detail-duration = Duration
trace-explorer-detail-summary = Summary

# Renderers ? final answer
renderer-final-hide-full-response = Hide full response
renderer-final-show-full-response = Show full response
renderer-final-duration = Duration:
renderer-final-tasks = Tasks:
renderer-final-export = Export
renderer-final-status-completed = Completed
renderer-final-actions-taken = Actions taken

# Renderers ? expert call
renderer-expert-agent-label = Agent
renderer-expert-subagent-fallback = Sub-agent
renderer-expert-status-working = Working
renderer-expert-status-failed = Failed
renderer-expert-status-completed = Completed

# Renderers ? plan
renderer-plan-title = Plan
renderer-plan-steps = { $done } / { $total } steps

# Renderers ? reflection
renderer-reflection-passed = Quality check passed
renderer-reflection-gaps = Agent found gaps and is continuing?

# Renderers ? tool call / result
renderer-tool-call-input = Input
renderer-tool-call-result-preview = Result preview
renderer-tool-call-cached = cached
renderer-tool-result-label = Result
renderer-tool-result-sources = Sources
renderer-tool-result-showing-rows = Showing 10 of { $total } rows
renderer-tool-result-subject = Subject:
renderer-tool-result-to = To:
renderer-tool-email-failed = Email failed
renderer-tool-email-cancelled = Email cancelled
renderer-tool-email-drafted = Email saved as draft
renderer-tool-email-sent = Email sent
renderer-tool-email-composed = Email composed

# Renderers ? preview block
renderer-preview-status-pending = Pending
renderer-preview-status-in-progress = In progress
renderer-preview-status-done = Done
renderer-preview-status-failed = Failed
renderer-preview-status-skipped = Skipped
renderer-preview-view-live = View live in side panel
renderer-preview-view-live-title = Open the live Case Panel in the side bar

# Renderers ? action card
renderer-action-open = Open
renderer-action-details = Details
renderer-action-show-tech-refs = Show technical references

# Renderers ? deliverables / artifacts
renderer-doc-type-document = Document
renderer-doc-type-slides = Presentation
renderer-doc-type-note = Note
renderer-doc-created = { $type } created
renderer-doc-view-canvas = Click to view on canvas
renderer-doc-view = View
renderer-pdf-ready = PDF ready
renderer-file-ready = File ready
renderer-download = Download
renderer-download-ellipsis = ?
renderer-pdf-unavailable = PDF unavailable ? missing session or attachment id.
renderer-pdf-download-error = Could not download PDF: { $detail }
renderer-file-unavailable = File unavailable ? missing session or attachment id.
renderer-file-download-error = Could not download file: { $detail }
renderer-artifact-open = Open
renderer-artifact-open-full = Open full view
renderer-artifact-open-new-tab = Open in new tab
renderer-artifact-download-png = Download as PNG
renderer-artifact-saving-png = Saving PNG?
renderer-chart-load-error = Chart data could not be loaded.
renderer-artifact-size-kb = { $size } KB

# Renderers ? references rail
renderer-references-title = References
renderer-ref-category-person = People
renderer-ref-category-hr = HR & Org
renderer-ref-category-crm = CRM
renderer-ref-category-finance = Finance
renderer-ref-category-investment = Investments
renderer-ref-category-document = Documents
renderer-ref-category-content = Content
renderer-ref-category-workflow = Workflows
renderer-ref-category-platform-page = Pages
renderer-ref-category-other = Other

# Renderers ? reference cards (fields)
renderer-ref-field-owner = Owner
renderer-ref-field-location = Location
renderer-ref-field-size = Size
renderer-ref-field-revenue = Revenue
renderer-ref-field-phone = Phone
renderer-ref-field-website = Website
renderer-ref-field-department = Department
renderer-ref-field-company = Company
renderer-ref-field-joined = Joined
renderer-ref-field-email = Email
renderer-ref-field-account = Account
renderer-ref-field-opportunity = Opportunity
renderer-ref-field-source = Source
renderer-ref-field-rating = Rating
renderer-ref-field-region = Region
renderer-ref-field-ai-score = AI score
renderer-ref-field-amount = Amount
renderer-ref-field-close = Close
renderer-ref-field-win = Win
renderer-ref-field-forecast = Forecast
renderer-ref-field-ai-grade = AI grade
renderer-ref-field-updated = Updated
renderer-ref-field-pages = Pages
renderer-ref-field-slides = Slides
renderer-ref-field-rows = Rows
renderer-ref-field-sheets = Sheets
renderer-ref-field-steps = Steps
renderer-ref-field-version = Version
renderer-ref-field-started = Started
renderer-ref-field-organizer = Organizer
renderer-ref-field-attendees = Attendees
renderer-ref-field-progress = Progress

renderer-ref-type-document = Document
renderer-ref-type-spreadsheet = Spreadsheet
renderer-ref-type-presentation = Presentation
renderer-ref-type-note = Note
renderer-ref-type-workflow = Workflow
renderer-ref-type-workflow-template = Workflow template
renderer-ref-type-meeting = Meeting
renderer-ref-type-conversation = Conversation
renderer-ref-type-untitled-note = Untitled note

renderer-ref-status-draft = Draft
renderer-ref-status-pinned = Pinned
renderer-ref-status-archived = Archived
renderer-ref-reports-to = Reports to

renderer-ref-intent-manager = Manager
renderer-ref-intent-reports-to = Reports to
renderer-ref-intent-team-member = Team member
renderer-ref-intent-owner = Owner

renderer-ref-count-page = { $count ->
    [one] { $count } page
   *[other] { $count } pages
}
renderer-ref-count-slide = { $count ->
    [one] { $count } slide
   *[other] { $count } slides
}
renderer-ref-count-sheet = { $count ->
    [one] { $count } sheet
   *[other] { $count } sheets
}
renderer-ref-count-row = { $count ->
    [one] { $count } row
   *[other] { $count } rows
}
renderer-ref-count-step = { $count ->
    [one] { $count } step
   *[other] { $count } steps
}
renderer-ref-count-attendee = { $count ->
    [one] { $count } attendee
   *[other] { $count } attendees
}

renderer-ref-progress-steps = { $completed } of { $total } { $total ->
    [one] step
   *[other] steps
}
renderer-ref-participant-count = { $count } { $count ->
    [one] participant
   *[other] participants
}
renderer-ref-unread-count = { $count } unread
renderer-ref-version = v{ $version }

renderer-ref-time-just-now = just now
renderer-ref-time-minutes-ago = { $count }m ago
renderer-ref-time-hours-ago = { $count }h ago
renderer-ref-time-yesterday = yesterday
renderer-ref-time-days-ago = { $count }d ago

# Renderers ? tool permission
renderer-permission-hide-fields = Hide additional fields
renderer-permission-show-fields = Show { $count } more { $count ->
    [one] field
   *[other] fields
}
renderer-permission-click-choose = Click to choose another option
renderer-permission-click-edit = Click to edit
renderer-permission-suggested = Suggested
renderer-permission-suggested-title = Pre-filled by the assistant ? review and adjust if needed. Not required.
renderer-permission-required = Required
renderer-permission-suggested-hint = Pre-filled by the assistant
renderer-permission-editing = Editing
renderer-permission-click-adjust = Click any field to adjust it before approving.
renderer-permission-approve-multi = Approve { $count } actions
renderer-permission-review-multi = Review each action below. They run only after you approve.
renderer-permission-approve-run = Approve and run
renderer-permission-save-run = Save changes and run
renderer-permission-modify = Modify
renderer-permission-cancel-changes = Cancel changes
renderer-permission-reject = Reject
renderer-permission-runs-after = Runs only after you approve.
renderer-permission-decision-submitted = Decision submitted
renderer-permission-rejected = Rejected
renderer-permission-changes-submitted = Changes submitted
renderer-permission-approved = Approved

# Renderers ? structured input form
renderer-form-field-required = This field is required
renderer-form-field-invalid = Invalid format
renderer-form-ai-will-generate = AI will generate
renderer-form-let-ai-generate = Let AI generate
renderer-form-select-placeholder = Select...
renderer-form-ai-generate-field = AI will generate this field
renderer-form-collapse-aria = Collapse submitted form
renderer-form-ai-generate-count = AI will generate { $count } field(s)
renderer-form-continue-ai = Continue with AI
renderer-form-submit = Submit
renderer-form-summary-ai = { $label }: AI-generated

# Settings
settings-title = Settings
settings-tab-agents = Agents
settings-tab-skills = Skills
settings-tab-tools = Tools
settings-page-agent-studio = Agent Studio
settings-sidebar-aria = Settings sections

settings-section-configuration = Configuration
settings-section-memory = { enterprise-agent-nav-memory }
settings-section-policies = Default Policies
settings-section-metrics = Usage & Metrics

settings-configuration-title = Configuration
settings-memory-toggle-label = { enterprise-agent-nav-memory }
settings-memory-toggle-desc = Remember preferences and context across sessions
settings-auto-approve-label = Auto-Approve Mode
settings-auto-approve-desc = Let the agent proceed without asking for confirmation on actions that normally require approval
settings-dev-mode-label = Developer mode
settings-dev-mode-desc = Show model picker, trace explorer, and debug trace tools
settings-reflection-mode-label = Reflection Mode
settings-reflection-mode-desc = Controls whether the agent reviews its work before finishing
settings-reflection-adaptive = Adaptive
settings-reflection-always = Always
settings-reflection-disabled = Disabled

settings-memory-title = { enterprise-agent-nav-memory }
settings-memory-namespace-preferences = Preferences
settings-memory-namespace-domain = Domain facts
settings-memory-namespace-skills = Patterns
settings-memory-namespace-episodes = Diary
settings-memory-empty-preferences = No saved preferences yet. Add things you want the agent to remember, e.g. ?reply in a short, direct style?.
settings-memory-empty-domain = No domain facts yet. The agent records reusable workspace facts here automatically after sessions (e.g. ?Q1 ends March 31?).
settings-memory-empty-skills = No patterns yet. The agent saves ?what workflow worked for what task? here automatically after sessions.
settings-memory-empty-episodes = No diary entries yet. After each session the agent records what you worked on together, tagged by topic and date.
settings-memory-search-placeholder = Search { $namespace }...
settings-memory-all-topics = All topics
settings-memory-entry-count = { $count ->
    [one] 1 entry
   *[other] { $count } entries
}
settings-memory-entries-episodes-suffix = ? diary of past sessions
settings-memory-entries-auto-suffix = ? learned automatically after sessions
settings-memory-delete-aria = Delete memory: { $title }
settings-memory-relative-today = Today
settings-memory-relative-yesterday = Yesterday
settings-memory-relative-days = { $days } days ago
settings-memory-relative-weeks = { $weeks }w ago

settings-preferences-intro = These apply to every task. The agent reads them at the start of each session, so you don?t have to repeat yourself.
settings-pref-response-length = Response length
settings-pref-tone = Tone
settings-pref-format = Format
settings-pref-expertise = Expertise level
settings-pref-language = Language
settings-pref-language-none = No preference
settings-pref-custom-instructions = Custom instructions
settings-pref-custom-placeholder = Anything else the agent should always keep in mind.
settings-pref-option-concise = Concise
settings-pref-option-balanced = Balanced
settings-pref-option-detailed = Detailed
settings-pref-option-professional = Professional
settings-pref-option-friendly = Friendly
settings-pref-option-direct = Direct
settings-pref-option-casual = Casual
settings-pref-option-prose = Prose
settings-pref-option-bullets = Bullet points
settings-pref-option-tables = Tables when useful
settings-pref-option-steps = Step-by-step
settings-pref-option-beginner = Beginner-friendly
settings-pref-option-expert = Expert (skip basics)
settings-pref-lang-english = English
settings-pref-lang-german = German
settings-pref-lang-french = French
settings-pref-lang-spanish = Spanish
settings-pref-lang-italian = Italian
settings-pref-lang-portuguese = Portuguese
settings-pref-lang-dutch = Dutch

settings-profile-about = About you
settings-profile-desc = Generated from your employee record so enterprise agents understand your role, team, manager, and skills.
settings-profile-regenerate = Regenerate
settings-profile-status-missing = Not generated yet
settings-profile-status-generating = Generating from employee data...
settings-profile-status-ready = Generated from employee data
settings-profile-status-failed = Could not generate
settings-profile-status-edited = Edited by you
settings-profile-updated = Updated { $date }
settings-profile-placeholder = Your profile memory will appear here after it is generated from employee data.
settings-profile-loading = Loading your profile memory...
settings-profile-error-load = Could not load your profile memory.
settings-profile-error-save = Could not save your profile memory.
settings-profile-error-regenerate = Could not start profile generation.

settings-policies-title = Default Policies
settings-policies-intro = Always-on intranet policies. Every agent in this workspace can list and read them at any point in a conversation ? no per-agent configuration required.
settings-policies-empty = No default policies attached yet. Click Add Policy to attach intranet policies that every agent in this workspace can read.
settings-policies-add = Add Policy
settings-policies-updated = Updated { $date }
settings-policies-open-title = Open in a new tab (ID: { $id })
settings-policies-remove-aria = Remove policy { $title }
settings-policies-error-load = Failed to load default policies
settings-policies-error-save = Failed to save default policies

settings-metrics-title = Usage & Metrics
settings-metrics-range-7d = 7 days
settings-metrics-range-30d = 30 days
settings-metrics-range-all = All time
settings-metrics-total-sessions = Total Sessions
settings-metrics-tokens = Tokens Used
settings-metrics-cost = Est. Cost
settings-metrics-duration = Avg. Duration
settings-metrics-by-status = By Status

settings-skills-title = Enterprise Skills
settings-skills-intro = Skills are automatically detected based on your task. Set a fallback skill to use when auto-detection doesn't find a confident match.
settings-skills-all = All
settings-skills-empty = No skills available
settings-skills-fallback = Fallback
settings-skills-installs = { $count } installs
settings-skills-remove-fallback = Remove as fallback
settings-skills-set-fallback = Set as fallback
settings-skills-install = Install skill
settings-skills-collapse = Collapse
settings-skills-details = Details
settings-skills-setup = { $time } setup
settings-skills-setup-steps = Setup steps

settings-tools-loading = Loading tools...
settings-tools-error-load = Failed to load tools
settings-tools-empty = No tools configured yet.
settings-tools-intro = Tools available to enterprise agents, grouped by business domain.
settings-tools-hint = The bold name is what the agent sees; the monospace badge is the persisted skill ref. The small grey ?via ?? hint shows where each tool is sourced from.
settings-tools-search-placeholder = Search tools ? name, description, category, tag?
settings-tools-category = Category
settings-tools-category-all = All ({ $count })
settings-tools-no-match = No tools match the current filters.
settings-tools-via = via { $source }
settings-tools-disabled = Disabled
settings-tools-auth-required = Auth required
settings-tools-no-auth = No auth required
settings-tools-hitl = HITL
settings-tools-artifacts = Artifacts
settings-tools-integrations-title = Configured tool integrations
settings-tools-builtin = Built-in
settings-tools-active = Active
settings-tools-inactive = Inactive
settings-tools-toggle-error-disable = Failed to disable { $name }
settings-tools-toggle-error-enable = Failed to enable { $name }

settings-flow-bindings-title = Flow companion bindings
settings-flow-bindings-desc = Which lookup tools each write flow needs first. Edits here override the schema-derived base for everyone.
settings-flow-bindings-error-load = Failed to load flow bindings
settings-flow-bindings-error-save = Failed to save bindings for { $flow }
settings-flow-bindings-source-edited = edited
settings-flow-bindings-source-override = code override
settings-flow-bindings-self-contained = self-contained
settings-flow-bindings-no-companions = No companions. Add one or save as self-contained.
settings-flow-bindings-remove-aria = Remove companion
settings-flow-bindings-reset = Reset to generated
settings-flow-bindings-clear = Clear all
settings-necessity-required = required
settings-necessity-recommended = recommended
settings-necessity-conditional = conditional

settings-skill-studio-title = Skill Studio
settings-skill-studio-search-placeholder = Search skills...
settings-skill-studio-new = New Skill
settings-skill-studio-dismiss = Dismiss
settings-skill-studio-empty = No skills found
settings-skill-studio-clear-search = Clear search
settings-skill-studio-count = { $shown } of { $total } skills
settings-skill-studio-active = Active
settings-skill-studio-inactive = Inactive
settings-skill-studio-files-count = { $count } files
settings-skill-studio-tools-count = { $count } tools
settings-skill-studio-edit-title = Edit Skill
settings-skill-studio-new-title = New Skill
settings-skill-studio-field-name = Name
settings-skill-studio-field-name-placeholder = Skill name
settings-skill-studio-field-category = Category
settings-skill-studio-field-category-placeholder = e.g. crm, finance, general
settings-skill-studio-field-description = Description
settings-skill-studio-field-description-placeholder = Short description
settings-skill-studio-field-tags = Tags (comma-separated)
settings-skill-studio-field-tags-placeholder = crm, sales, automation
settings-skill-studio-field-compatibility = Compatibility
settings-skill-studio-field-compatibility-placeholder = e.g. prompt-manager>=0.9.0
settings-skill-studio-field-content = Content (Markdown)
settings-skill-studio-field-content-placeholder = # Skill instructions...
settings-skill-studio-save-changes = Save Changes
settings-skill-studio-create = Create Skill
settings-skill-studio-saving = Saving?
settings-skill-studio-delete-confirm = Delete skill "{ $name }"?
settings-skill-studio-category-label = Category: { $category }
settings-skill-studio-label-description = Description
settings-skill-studio-label-version = Version:
settings-skill-studio-label-status = Status:
settings-skill-studio-label-created-by = Created by:
settings-skill-studio-label-updated-by = Updated by:
settings-skill-studio-label-content = Content
settings-skill-studio-files-title = Attached Files
settings-skill-studio-upload = Upload File
settings-skill-studio-uploading = Uploading?
settings-skill-studio-no-files = No files attached.
settings-skill-studio-tools-title = Tools
settings-skill-studio-assign-tools = Assign Tools
settings-skill-studio-select-tools = Select tools
settings-skill-studio-assign = Assign
settings-skill-studio-no-tools = No tools available.

settings-action-enable = Enable
settings-action-disable = Disable
settings-action-loading = Loading?
settings-action-edit = Edit

# Workspace ? right rail, live preview, session timeline
workspace-panel-close = Close workspace panel
workspace-panel-open = Open workspace panel
workspace-follow-ups-title = Suggested follow-ups
workspace-follow-ups-dismiss = Close suggested follow-ups
workspace-reopen-clarification-show = Show options
workspace-artifact-type-slides = slides
workspace-artifact-type-document = document
workspace-artifact-type-note = note
workspace-artifact-type-pdf = PDF
workspace-artifact-type-html = HTML dashboard
workspace-artifact-type-chart = chart
workspace-retry-preview-with-title = The previous attempt to generate the { $label } "{ $title }" failed. Please try again.
workspace-retry-preview = The previous attempt to generate the { $label } failed. Please try again.
workspace-session-timeline-title = Session timeline
workspace-session-timeline-latest = Latest { $time }
workspace-session-timeline-event-count = { $count } events
workspace-timeline-empty = Session events will appear here?
workspace-decisions-empty = Agent decisions will appear here as the session progresses?
workspace-activity-empty = Tool activity will appear here?
workspace-delegated-task = Working on a delegated task
workspace-delegated-to = Delegated to { $agent }
workspace-delegated-subagent = Delegated to sub-agent
workspace-skill-badge = Skill: { $name }
workspace-decision-skill = Skill
workspace-decision-tool-routing = Tool routing
workspace-decision-routing = Routing
workspace-decision-reflection = Reflection
workspace-decision-hitl = Human in the loop
workspace-decision-human-input = Human input
workspace-decision-plan = Plan
workspace-decisions-title = Decisions
workspace-decisions-no-branch = No branch points yet
workspace-decisions-branch-singular = { $count } branch point
workspace-decisions-branch-plural = { $count } branch points
workspace-plan-waiting = Waiting to start
workspace-plan-progress = { $done } of { $total } done
workspace-plan-finalizing = Finalizing response?
workspace-documents-title = Workspace Documents
workspace-artifacts-title = Artifacts
workspace-latest-summary = Latest: { $name }
workspace-artifact-view = View
workspace-artifact-download = Download
workspace-experts-title = Enterprise experts
workspace-experts-summary-running = { $running } running ? { $done } done
workspace-experts-summary-running-failed = { $running } running ? { $done } done ? { $failed } failed
workspace-experts-summary-done-failed = { $done } done ? { $failed } failed
workspace-experts-summary-done = { $done } done
workspace-expert-default = Enterprise expert
workspace-expert-market = Market research
workspace-expert-hr = HR operations
workspace-expert-compensation = Compensation
workspace-expert-finance = Finance
workspace-expert-workflow = Workflow design
workspace-expert-writing = Writing
workspace-expert-data = Data analysis
workspace-expert-it = IT support
workspace-debug-trace-title = Debug Trace (dev only)
workspace-debug-trace-failed-load = Failed to load trace
workspace-debug-trace-loading = Loading trace?
workspace-debug-trace-no-steps = No traced steps yet
workspace-debug-trace-step-singular = { $count } traced step
workspace-debug-trace-step-plural = { $count } traced steps
workspace-debug-trace-loading-detail = Loading debug trace...
workspace-debug-filter-all = all
workspace-debug-filter-decisions = decisions
workspace-debug-filter-tools = tools
workspace-debug-filter-hitl = hitl
workspace-debug-filter-errors = errors
workspace-debug-filter-artifacts = artifacts
workspace-debug-refresh = Refresh
workspace-debug-refreshing = Refreshing?
workspace-debug-export = Export
workspace-debug-analyzing = Analyzing...
workspace-debug-explanation-cached = Explanation (cached)
workspace-debug-explanation-ready = Explanation ready
workspace-debug-analyze-failed = Analyze failed
workspace-debug-explain-session = Explain this session
workspace-debug-copied = Copied!
workspace-debug-copy-failed = Copy failed
workspace-debug-copy-context = Copy debug context
workspace-debug-ai-analysis = AI analysis
workspace-debug-rerun = Re-run
workspace-debug-cached-at = cached { $time }
workspace-debug-root-cause = Root cause
workspace-debug-affected-layer = Affected layer
workspace-debug-evidence = Evidence
workspace-debug-code-locations = Code locations
workspace-debug-suggested-fix = Suggested fix
workspace-debug-test-command = Test command
workspace-debug-analyzer-disabled = AI analyzer disabled. Set DEEP_AGENT_AI_ANALYZER_ENABLED=true on prompt-manager to enable.
workspace-debug-analyzer-error = Analyzer error: { $message }
workspace-debug-slow-phases = Slow phases
workspace-debug-failed-tools = Failed tools
workspace-debug-repeated-tools = Repeated tool calls
workspace-debug-langsmith-project = LangSmith project
workspace-debug-langsmith-open = open
workspace-debug-status-unknown = unknown
workspace-debug-parallel = parallel
workspace-debug-shortlist = Shortlist ({ $count })
workspace-case-title = Case
workspace-case-steps = { $completed }/{ $total } steps
workspace-case-all-closed = All cases closed
workspace-case-owner = Owner
workspace-case-due = Due
workspace-case-open-workflow = Open workflow
workspace-case-partial = Partial
workspace-status-skipped = Skipped
workspace-clarification-aria = Agent clarification
workspace-clarification-dismiss = Dismiss
workspace-clarification-custom = Write your own answer
workspace-clarification-enter-hint = Enter to send
workspace-clarification-placeholder = Type your answer and press Enter?
workspace-clarification-keyboard-hint = Press Enter to send, Shift+Enter for newline
workspace-clarification-send = Send
workspace-fallback-yes = Yes
workspace-fallback-no = No
workspace-live-preview-title = Live Preview
workspace-chart-unavailable = Chart data not available
workspace-html-path-unavailable = HTML artifact path unavailable.
workspace-pdf-preview-failed = PDF preview failed: { $error }
workspace-pdf-reference-missing = PDF reference missing.
workspace-pdf-loading = Loading PDF?
workspace-pdf-attached = { $fileName } ? attached to this session
workspace-pdf-download = Download PDF
workspace-preview-collapse = Collapse preview
workspace-preview-expand = Expand preview
workspace-generating-label = Generating { $label }...
workspace-transforming-layout = Transforming to visual layout...
workspace-generating-content = Generating content...
workspace-slides-preparing = { $count } slides - preparing layout...
workspace-slides-generating = { $count } slides - generating...
workspace-error-slides = We couldn't finish your slides
workspace-error-document = We couldn't finish your document
workspace-error-note = We couldn't finish your note
workspace-error-chart = We couldn't finish your chart
workspace-error-html = We couldn't finish your page
workspace-error-pdf = We couldn't finish your PDF
workspace-error-generic = We couldn't finish this
workspace-error-body = Something went wrong while generating this. It might be a temporary hiccup ? try again in a moment.
workspace-try-again = Try again
workspace-hide-technical = Hide technical details
workspace-show-technical = Show technical details
workspace-hide-grid = Hide grid
workspace-show-all = Show all
workspace-prev-slide = Previous slide
workspace-next-slide = Next slide
workspace-draft-review = Draft - Review before saving
workspace-draft-delete = Delete
workspace-draft-discard = Discard
workspace-draft-save-failed = Save failed
workspace-draft-retry = Retry
workspace-draft-done = Done
workspace-draft-discard-delete = Delete draft from Documents
workspace-draft-discard-dismiss = Dismiss preview
workspace-document-generating = Generating
workspace-document-saved-badge = Saved to Documents
workspace-document-badge = Document
workspace-canvas-copy = Copy
workspace-canvas-open-documents = Open in Documents
workspace-canvas-open-tooltip = Edits after the first save must be made in the Documents app
workspace-canvas-saved = Saved
workspace-canvas-save-failed = Failed
workspace-canvas-persisted-banner = Saved to Documents. Open the document to keep editing with real-time collaboration and version history.
workspace-canvas-generating-doc = Generating document...
workspace-canvas-no-content = No content
workspace-canvas-writing = Writing...
workspace-canvas-edit-hint = Click content to edit
workspace-artifact-viewer-aria = Artifact viewer
workspace-artifact-load-failed = Failed to load: { $error }
workspace-artifact-download-instead = Download instead
workspace-skill-auto = auto
workspace-skill-auto-tooltip = Automatically detected based on your task
workspace-skill-version-loaded = Loaded v{ $version }
workspace-skill-version-draft = Loaded v{ $version } (draft is v{ $draft })
workspace-connector-connected = Connected: { $names }
workspace-connector-more = +{ $count } more
workspace-avatar-unknown = Unknown
workspace-avatar-employee = Employee avatar
workspace-task-no-plan = No plan yet
workspace-task-steps-pending = Steps will appear once the agent starts
workspace-step-aria = Step { $number }: { $label }. { $status }
workspace-collaboration-title = Agent collaboration
workspace-collaboration-tree-view = Tree view
workspace-collaboration-timeline-view = Timeline view
workspace-collaboration-done = { $count } done
workspace-collaboration-running = { $count } running
workspace-collaboration-failed = { $count } failed
workspace-chart-empty = No chart data available
workspace-chart-other = Other
workspace-chart-total = Total
workspace-chart-no-data-points = No data points to display for this chart.
workspace-chart-unsupported-preview = Unsupported or empty chart preview.
workspace-timeline-tool = Tool
workspace-presentation-type = presentation

# Agents (phase2-rest)
agents-toolbar-subtitle = Create agents, configure their capabilities, and choose where they run.
agents-create-button = Create agent or worker
agents-search-placeholder = Search active and archived agents...
agents-confirm-label = Confirm
agents-cancel-label = Cancel
agents-workforce-empty-goto = Go to Deployment
agents-worker-empty = No configuration available.
agents-badge-assistant = Assistant
agents-badge-worker = Worker
agents-badge-worker-paused = Worker paused
agents-card-select-aria = Select { $name }
agents-card-skills-count = { $count } skills
agents-card-tools-count = { $count } tools in skills
agents-card-no-description = No description available.
agents-card-worker-id = Worker ID
agents-card-descriptor-worker = Governed worker
agents-card-descriptor-agent = Configurable agent
agents-readiness-needs-setup = Needs setup
agents-card-action-configure = Configure
agents-card-action-continue-setup = Continue setup
agents-card-no-skills = No skills assigned
agents-card-more-skills = +{ $count } more
agents-card-archiving = Archiving...
agents-card-archive = Archive
agents-config-studio-setup = Studio setup
agents-config-progress = { $completed } of { $total } steps complete
agents-config-continue = Continue: { $step }
agents-config-tab-profile = Profile
agents-config-tab-capabilities = Capabilities
agents-config-tab-deployment = Deployment
agents-config-tab-passport = Passport
agents-config-tab-activation = Activation
agents-config-error-load-skills = Failed to load skills
agents-config-error-load-details = Failed to load agent details
agents-config-error-persist-skills = Failed to persist skills
agents-config-error-save-system-prompt = Failed to save system prompt
agents-config-error-save-details = Failed to save details
agents-config-error-generate-avatar = Failed to generate avatar
agents-config-error-remove-avatar = Failed to remove avatar
agents-config-error-description-thin = Description is too thin ? add at least { $min } characters describing what the agent does. It is how the agent gets discovered and chosen.
agents-config-error-system-prompt-short = System prompt is too short ? add at least { $min } characters describing the agent's identity, capabilities, and constraints.
agents-save-saving = Saving?
agents-save-saved = Saved
agents-avatar-alt = { $label } avatar
agents-avatar-generating = Generating?
agents-avatar-regenerate = Regenerate
agents-avatar-generate = Generate avatar
agents-avatar-removing = Removing?
agents-avatar-remove = Remove avatar
agents-compliance-title-pass = Meets the Agent Authoring Standard
agents-compliance-title-warn = Almost there ? a few improvements recommended
agents-compliance-title-fail = This agent is incomplete and may not work
agents-compliance-checks-count = { $done }/{ $total } checks
agents-description-chip-min-chars = At least { $min } characters
agents-description-chip-not-just-name = More than the name
agents-description-chip-specific = Specific
agents-description-required = A real description is required ? it's how this agent gets discovered and chosen.
agents-char-count-min = { $count } chars (min { $min })
agents-system-prompt-chip-identity = Identity ("You are ?")
agents-system-prompt-chip-constraints = Constraints (MUST / NEVER)
agents-system-prompt-chip-substantial = Enough detail
agents-system-prompt-reset = Reset
agents-system-prompt-save = Save System Prompt
agents-system-prompt-unavailable = System prompt editing is unavailable for this agent record.
agents-skill-builtin-badge = Built-in
agents-create-title = Create agent
agents-create-subtitle = Define the agent once, then choose where it runs.
agents-create-setup-title = Create setup
agents-create-steps-ready = { $completed } of { $total } steps ready
agents-create-continue = Continue: { $step }
agents-create-optional = Optional
agents-create-optional-worker = Optional until Worker deployment is selected
agents-create-step-profile = Profile
agents-create-step-capabilities = Capabilities
agents-create-step-deployment = Deployment
agents-create-step-passport = Passport
agents-create-step-activation = Activation
agents-create-submit = Create agent
agents-create-submitting = Creating?
agents-create-loading-setup = Loading setup?
agents-create-submit-worker = Create agent or worker
agents-create-open-studio = Need more configuration? Open Enterprise Agent Studio
agents-create-tool-hint = Is this really an agent? If it's a single action like creating a chart, asset, or visualization, build a tool, not an agent. Agents own a domain and make judgments (e.g. "HR Expert").
agents-create-field-name = Agent name
agents-create-field-specialty = Specialty
agents-create-field-description = Description
agents-create-field-visibility = Visibility
agents-create-field-instructions = Instructions
agents-create-field-instructions-system = (system prompt)
agents-create-use-template = Use template
agents-create-visibility-workspace = Workspace ? anyone in this workspace
agents-create-visibility-private = Private ? only me
agents-create-workforce-toggle = Activate as a Worker
agents-create-workforce-toggle-desc = Creates the same agent with a paused Worker deployment so Passport and Activation can be completed before it runs.
agents-create-field-role = Role
agents-create-field-department = Department
agents-create-field-autonomy = Autonomy
agents-create-passport-skip = Skip this step unless the agent needs Worker identity, ownership, governance, and runtime controls.
agents-create-activation-paused = The Worker deployment is created paused. Finish Passport and Activation in Studio before it runs.
agents-create-activation-no-worker = No Worker runtime will be created. You can activate this agent as a Worker later from Studio.
agents-create-loading-defaults = Loading workspace and model defaults?
agents-create-creating-in = Creating in { $workspace }.
agents-create-no-defaults = Could not find a valid workspace/model. Open Enterprise Agent Studio to configure defaults.
agents-create-error-load-defaults = Failed to load workspace/model defaults.
agents-create-error-create = Failed to create agent. Please try again.
agents-create-profile-desc = Name the agent, describe its domain, and decide who can use it.
agents-create-capabilities-desc = Give the agent instructions and optional policies. Skills can be refined later in Studio.
agents-create-deployment-desc = Every agent can be configured in Studio. Add Worker deployment only when it needs governed runtime.
agents-create-passport-desc = Only needed when this agent should run as a governed Worker.
agents-create-activation-desc = Choose the Worker runtime posture. New Workers start paused for review.
agents-create-description-helper = This is the single biggest factor in whether your agent gets picked for a task. Describe what it does using the words people will actually type.
agents-create-description-example-label = Example:
agents-create-stored-as = Stored as
agents-create-identifier-hint = letters, digits and underscores only.
agents-create-identifier-auto = Letters, digits, and spaces are fine ? we automatically convert it to an identifier.
agents-create-name-hint = A clear, human name. We derive the internal identifier automatically.
agents-create-specialty-hint = What domain or function does this agent own? Used for discovery and routing.
agents-create-policies-title = Company policies
agents-create-policies-optional = Optional
agents-create-policies-selected = { $count } selected
agents-create-policies-search = Search EveryPages policies?
agents-create-policies-loading = Loading policies?
agents-create-policies-load-error = Couldn't load policies. You can still create the agent and attach them later.
agents-create-policies-empty-search = No policies match your search.
agents-create-policies-empty = No company policies published yet.
agents-create-policy-untitled = Untitled policy
agents-create-description-check-min = At least { $min } characters
agents-create-description-check-not-name = More than just the name
agents-create-description-check-specific = Specific (uses real domain words)
agents-create-description-required = A real description is required ? it's how this agent gets discovered and chosen.
agents-create-prompt-check-identity = Declares identity ("You are ?")
agents-create-prompt-check-constraints = States hard rules (MUST / NEVER / Refuse)
agents-create-prompt-check-structure = Has structure (capabilities, constraints, output)
agents-create-prompt-check-substantial = Substantial enough (not a one-liner)
agents-create-prompt-required = A real system prompt is required (at least { $min } characters). Use the template to start.
agents-autonomy-draft-only = Assistive ? drafts and recommends, makes no system changes
agents-autonomy-approval-required = Approval Required ? prepares actions, routes to a human first
agents-autonomy-auto-low-risk = Delegated ? acts on low-risk steps, escalates exceptions
agents-autonomy-full-auto = Autonomous ? runs end-to-end within validated boundaries
agents-deployments-title = Deployments
agents-deployments-description = Choose where this agent runs. Assistant is always available; Worker adds governed runtime.
agents-deploy-assistant-title = Assistant
agents-deploy-assistant-status = Available
agents-deploy-worker-title = Worker
agents-deploy-worker-status-off = Off
agents-deploy-worker-status-paused = Paused
agents-deploy-worker-status-active = Active
agents-deploy-activate-button = Activate as Worker
agents-deploy-configure-note = Configure Passport and Activation after deploying.
agents-deploy-success-note = Worker deployment added. It starts paused for review.
agents-deploy-instructions-hint = Optional operating instructions specific to the Worker runtime.
agents-deploy-activating = Activating?
agents-deploy-error-role-required = Role is required to activate a Worker deployment.
agents-deploy-error-failed = Failed to activate Worker deployment.
agents-passport-empty-title = Not a Worker yet
agents-passport-empty-desc = Activate this agent as a Worker to give it a role, an owner, and governance.
agents-passport-empty-label = No Passport configuration available.
agents-activation-empty-title = No Worker runtime yet
agents-activation-empty-desc = Activate this agent as a Worker in Deployment before configuring autonomy, triggers, and live activity.
agents-activation-empty-label = No runtime configuration available.
agents-skill-search-placeholder = Search skills?
agents-skill-search-empty-query = No matching skills found.
agents-skill-search-all-assigned = All skills are already assigned.
agents-skill-save-changes = Save Changes
agents-tags-placeholder = Comma-separated, e.g. support, tickets, internal-ops
agents-policies-title = Policies
agents-policies-description = Attach intranet policies this agent can read at run time.
agents-policies-empty = No policies attached.
agents-policies-workspace-default = Workspace Default
agents-policies-exclude-aria = Exclude default policy
agents-policies-remove-aria = Remove policy
agents-policies-add = Add Policy
agents-policies-modal-title = Attach Intranet Policy to Agent
agents-policies-modal-close-aria = Close dialog
agents-policies-modal-search = Search policies by title?
agents-policies-modal-loading = Loading policies?
agents-policies-modal-error = Failed to load policies.
agents-policies-modal-retry = Retry
agents-policies-modal-empty-search = No policies match your search.
agents-policies-modal-empty = No policies found.
agents-policies-modal-publish-hint = Publish policies in EveryPages to attach them here.
agents-policies-modal-updated = Updated { $date }
agents-policies-modal-open-title = Open policy in new tab
agents-policies-modal-page = Page { $page } of { $total } ({ $count } total)
agents-policies-modal-previous = Previous
agents-policies-modal-next = Next
agents-policies-modal-selected = { $count } selected
agents-policies-modal-apply = Apply
agents-skill-picker-title = Assign Skills
agents-skill-picker-empty = No enabled skills available to assign.
agents-skill-picker-builtin = Built-in
agents-skill-picker-pub-version = pub v{ $version }
agents-skill-picker-runtime-version = Runtime version
agents-skill-picker-latest-published = Latest published
agents-skill-picker-pin = Pin v{ $version }
agents-skill-picker-pin-unavailable = Pin v{ $version } unavailable
agents-skill-picker-selected-count = { $count } skill(s) selected
agents-skill-picker-save = Save

# Skills (phase2-rest)
skills-browse-upload = Upload Skill
skills-browse-create = Create Skill
skills-browse-search = Search skills?
skills-browse-loading = Loading?
skills-browse-no-match = No matching skills
skills-browse-empty = No skills found
skills-browse-status-draft = Draft
skills-browse-status-builtin = Built-in
skills-browse-status-archived = Archived
skills-browse-status-inactive = Inactive
skills-browse-status-enabled = Enabled
skills-browse-default-badge = (default)
skills-browse-pub-version = pub v{ $version }
skills-browse-unpublished = unpublished
skills-browse-draft-version = draft v{ $version }
skills-browse-tools-in-skill = Tools in Skill:
skills-browse-files = Files
skills-browse-hide-files = Hide files
skills-browse-export = Export
skills-browse-runtime-skill = Runtime skill
skills-browse-enable = Enable
skills-browse-disable = Disable
skills-browse-archive = Archive
skills-browse-archived-title = Archived Skills
skills-browse-archived-loading = Loading archived?
skills-browse-archived-empty = No archived skills
skills-browse-restore = Restore
skills-editor-select-skill = Select a skill to edit
skills-editor-pick-skill = Pick a skill from the list or create a new one.
skills-editor-edit-title = Edit { $id }
skills-editor-unsaved = Unsaved
skills-editor-clear-selection-aria = Clear selection
skills-editor-skill-md = SKILL.md
skills-editor-tools = Tools
skills-editor-add-tool = Add Tool to Skill
skills-editor-attach-files = Attach files?
skills-editor-revert = Revert
skills-editor-publish = Publish v{ $version }
skills-editor-save-draft = Save draft
skills-editor-saving = Saving?
skills-create-title = Create new skill
skills-create-cancel-aria = Cancel creation
skills-create-name = Skill name
skills-create-description = Description
skills-create-instructions = Instructions
skills-create-will-save-as = Will be saved as
skills-create-tools = Tools
skills-create-add-tool = Add Tool to Skill
skills-create-attach-files = Attach files?
skills-create-cancel = Cancel
skills-create-submit = Create
skills-create-creating = Creating?
skills-add-tools-title = Add Tool to Skill
skills-add-tools-search = Search tools?
skills-add-tools-category = Category
skills-add-tools-all = All ({ $count })
skills-add-tools-loading = Loading tools?
skills-add-tools-retry = Retry
skills-add-tools-select-all = Select all
skills-add-tools-deselect-all = Deselect all
skills-add-tools-via = via { $source }
skills-add-tools-hitl = HITL
skills-add-tools-artifacts = Artifacts
skills-add-tools-disabled = Disabled
skills-add-tools-preview-schema = Preview schema
skills-add-tools-cancel = Cancel
skills-add-tools-add = Add
skills-add-tools-preview-select = Select a tool to preview its schema and parameters.
skills-add-tools-what-it-does = What it does
skills-add-tools-parameters = Parameters
skills-add-tools-show-raw = Show raw JSON
skills-add-tools-show-readable = Show readable
skills-add-tools-loading-params = Loading parameters?
skills-add-tools-no-params = No input parameters
skills-add-tools-no-auth = No auth required
skills-add-tools-auth-required = Auth required
skills-tool-companions-title = Works with
skills-tool-companions-add-all = Add all ({ $count })
skills-tool-companions-required = Required
skills-tool-companions-recommended = Recommended
skills-tool-companions-if-needed = If needed
skills-tool-companions-open-details = Open tool details
skills-tool-companions-added = Added
skills-tool-companions-add = Add
skills-version-history-title = Version history
skills-version-draft = Draft v{ $version }
skills-version-published = Published v{ $version }
skills-version-unpublished = Unpublished
skills-version-live = Live
skills-version-loading = Loading versions?
skills-version-empty = No versions yet
skills-version-restore = Restore
skills-version-publish = Publish
skills-browse-loading-files = Loading files?
skills-browse-no-aux-files = No auxiliary files yet.
skills-browse-add-files = Add files
skills-tool-companions-hint = Add these so the agent can resolve ids/values before this action runs.
agents-skill-picker-error-load = Failed to load skill data
agents-skill-picker-error-pin = Pinned version for { $skillId } is not published. Choose Latest published or a published version.
agents-skill-picker-error-save = Failed to save skill assignments
skills-source-functions = Tools
skills-source-native = Native
skills-source-flowbot = FlowBot
skills-source-mcp = MCP
skills-source-builtin = Built-in
skills-category-hr = HR & Employees
skills-category-crm = CRM
skills-category-irm = Investments
skills-category-office = Office & Intranet
skills-category-flow = Flows & Automations
skills-category-flowbot-actions = Business Actions
skills-category-expert = Experts
skills-category-create-expert = Create Expert
skills-category-documents = Documents
skills-category-knowledge = Knowledge
skills-category-email = Email
skills-category-meeting = Meetings
skills-category-calendar = Calendar
skills-category-analytics = Analytics
skills-category-commerce = Commerce
skills-category-service = Service Desk
skills-category-charts = Charts
skills-category-web = Web
skills-category-mcp = MCP Connectors
skills-category-structured-connectors = Structured Data
skills-category-unstructured-connectors = Unstructured Data
skills-category-control = Control & Approval
skills-category-memory = Memory
skills-category-session-documents = Session Documents
skills-category-policies = Policies
skills-category-graphql = GraphQL (advanced)
skills-category-uncategorized = Other

# Memory lens (phase2-rest)
memory-lens-back-aria = Back to workspace
memory-lens-title = What we know about you
memory-lens-dev-badge = dev
memory-lens-subtitle = Everything the agent remembers about you ? profile brief, preferences, learned facts, patterns and diary.
memory-lens-refresh = Refresh
memory-lens-tab-overview = Overview
memory-lens-tab-diary = Diary
memory-lens-tab-topics = Topics
memory-lens-tab-people = People & things
memory-lens-tab-graph = Mind map
memory-lens-profile-title = Profile brief
memory-lens-profile-subtitle = The agent's natural-language summary of who you are.
memory-lens-profile-status-ready = Ready
memory-lens-profile-status-edited = Edited
memory-lens-profile-status-generating = Generating
memory-lens-profile-status-failed = Failed
memory-lens-profile-status-missing = Not generated
memory-lens-profile-regenerating = Regenerating
memory-lens-profile-regenerate = Regenerate
memory-lens-profile-empty = No profile brief yet. It is generated from your workspace facts and recent sessions ? use Regenerate to build one.
memory-lens-profile-model = Model: { $model }
memory-lens-profile-updated = Updated { $date }
memory-lens-profile-source-facts = Source facts
memory-lens-browser-title = Memories
memory-lens-browser-search = Semantic search across all memory...
memory-lens-browser-all = All
memory-lens-browser-topic-clear = clear
memory-lens-browser-empty-filters = No memories match the current filters.
memory-lens-entry-salience = Salience { $score }
memory-lens-entry-score = Score { $score }
memory-lens-entry-delete-aria = Delete memory: { $title }
memory-lens-detail-select = Select an entry to read its full content.
memory-lens-detail-delete-aria = Delete memory
memory-lens-diary-all-month = All of this month
memory-lens-diary-count = { $count } { $count ->
    [one] memory
   *[other] memories
}
memory-lens-diary-clear = Clear
memory-lens-diary-empty = No memories recorded for this day.
memory-lens-diary-no-date = No date
memory-lens-calendar-prev-aria = Previous month
memory-lens-calendar-next-aria = Next month
memory-lens-facet-empty-topic = No topics yet. Memories gain topics as the agent learns about you.
memory-lens-facet-empty-entity = No people or things yet.
memory-lens-facet-search-topic = Search topics?
memory-lens-facet-search-entity = Search people & things?
memory-lens-facet-no-match = No matches.
memory-lens-facet-count = { $count } { $unit }(s)
memory-lens-references-open = Open
memory-lens-graph-loading = Mapping your memory?
memory-lens-graph-empty-title = Nothing to map yet
memory-lens-graph-empty-desc = Memories will appear here once the agent has learned enough to connect topics, people, and facts.
memory-lens-graph-click-explore = Click a node to explore connections.
memory-lens-graph-controls-search = Search graph?
memory-lens-graph-controls-clear-aria = Clear search
memory-lens-graph-controls-fit-aria = Fit graph to view
memory-lens-graph-controls-searching = Searching?
memory-lens-graph-controls-matches = { $count } { $count ->
    [one] match
   *[other] matches
}
memory-lens-graph-legend-topics = Topics
memory-lens-graph-legend-entities = People & things
memory-lens-graph-legend-memories = Memories
memory-lens-graph-detail-salience-critical = Critical
memory-lens-graph-detail-salience-important = Important
memory-lens-graph-detail-salience-notable = Notable
memory-lens-graph-detail-salience-routine = Routine
memory-lens-graph-detail-entities = People & things
memory-lens-graph-detail-topics = Topics
memory-lens-graph-detail-topic = Topic
memory-lens-graph-detail-person = Person
memory-lens-graph-detail-thing = thing
memory-lens-graph-detail-memories-count = { $count } memories
memory-lens-graph-detail-connected = Connected memories
memory-lens-graph-detail-load-more = Load more memories
memory-lens-graph-detail-loading = Loading?
memory-lens-graph-detail-hub-empty = Select a node to see its connected memories.
memory-lens-graph-detail-close-aria = Close details
memory-lens-stat-total = Total memories
memory-lens-stat-total-desc = Across all namespaces
memory-lens-stat-salience = High salience
memory-lens-stat-salience-desc = Importance 7+
memory-lens-stat-updated = Last updated
memory-lens-stat-updated-none = No activity
memory-lens-insights-topics = Top topics
memory-lens-insights-entities = Top entities
memory-lens-insights-salience = Salience
memory-lens-insights-topics-empty = Topics emerge as the agent learns about you.
memory-lens-insights-entities-empty = People and things appear from your memories.
memory-lens-salience-critical = Critical
memory-lens-salience-high = High
memory-lens-salience-medium = Medium
memory-lens-salience-low = Low

# Trace lens (phase2-rest)
trace-lens-back-aria = Back to workspace
trace-lens-title = Trace Lens
trace-lens-subtitle = LangSmith-style debugger ? tools, sub-agents, experts, skills and decisions in execution order.
trace-lens-refresh = Refresh
trace-lens-copied = Copied
trace-lens-copy-cursor = Copy for Cursor
trace-lens-copy = Copy
trace-lens-workforce = Workforce
trace-lens-workforce-source = Workforce ? { $source }
trace-lens-stat-ttft = TTFT
trace-lens-stat-duration = Duration
trace-lens-stat-tools = Tools
trace-lens-stat-subagents = Sub-agents
trace-lens-stat-experts = Experts
trace-lens-stat-skills = Skills
trace-lens-stat-decisions = Decisions
trace-lens-stat-llm-calls = LLM calls
trace-lens-stat-avg-llm = Avg LLM
trace-lens-stat-human-wait = Human wait
trace-lens-stat-failed = Failed
trace-lens-stat-tokens = Tokens
trace-lens-stat-cost = Cost
trace-lens-filter-placeholder = Filter steps?
trace-lens-show-events = Show events
trace-lens-steps-count = { $count } steps
trace-lens-select-run = Select a run to inspect its trace.
trace-lens-loading = Loading trace?
trace-lens-retry = Retry
trace-lens-runs-title = Runs
trace-lens-runs-filter-all = All
trace-lens-runs-filter-chat = Chat
trace-lens-runs-filter-workforce = Workforce
trace-lens-runs-source-manual = Manual
trace-lens-runs-source-schedule = Schedule
trace-lens-runs-source-webhook = Webhook
trace-lens-runs-source-email = Email
trace-lens-runs-no-input = (no input)
trace-lens-runs-empty = No runs found.
trace-lens-runs-time-just-now = just now
trace-lens-runs-time-minutes = { $count }m ago
trace-lens-runs-time-hours = { $count }h ago
trace-lens-runs-time-days = { $count }d ago
trace-lens-span-select = Select a step to inspect its input, output, and timing.
trace-lens-span-input = Input
trace-lens-span-output = Output
trace-lens-span-details = Details
trace-lens-span-seq = seq #{ $seq }
trace-lens-span-start = start +{ $ms }
trace-lens-span-duration = duration { $ms }
trace-lens-llm-latency = Latency
trace-lens-llm-prompt = Prompt
trace-lens-llm-completion = Completion
trace-lens-llm-cached = Cached
trace-lens-llm-cache-hit = Cache hit
trace-lens-llm-cost = Cost
trace-lens-llm-stage = Stage
trace-lens-llm-finish = Finish
trace-lens-detail-yes = Yes
trace-lens-detail-no = No
trace-lens-detail-none = None
trace-lens-span-kind-tool = Tool
trace-lens-span-kind-thinking = Thinking
trace-lens-span-kind-subagent = Sub-agent
trace-lens-span-kind-expert = Expert
trace-lens-span-kind-skill = Skill
trace-lens-span-kind-decision = Decision
trace-lens-span-kind-routing = Routing
trace-lens-span-kind-hitl = Human-in-the-loop
trace-lens-span-kind-wait = Waiting
trace-lens-span-kind-approval = Approval
trace-lens-span-kind-capability-missing = Capability gap
trace-lens-span-kind-artifact = Artifact
trace-lens-span-kind-pack = Execution pack
trace-lens-span-kind-cost = Cost
trace-lens-span-kind-llm = LLM call
trace-lens-span-kind-workforce = Workforce
trace-lens-span-kind-status = Status
trace-lens-span-kind-message = Message
trace-lens-span-kind-terminal = Terminal
trace-lens-span-kind-error = Error

# Agent mesh (phase2-rest)
agent-mesh-scope-company = Company
agent-mesh-scope-user = User Sessions
agent-mesh-scope-me = My Sessions
agent-mesh-scope-session = Current Session
agent-mesh-scope-desc-company = All sessions across the workspace
agent-mesh-scope-desc-user = Sessions for a selected user
agent-mesh-scope-desc-me = All your sessions
agent-mesh-scope-desc-session = Live or replayed session view
agent-mesh-scope-title-company = Company { -platform-ai-agent-network.label }
agent-mesh-scope-title-user = User { -platform-ai-agent-network.label }
agent-mesh-scope-title-user-named = { -platform-ai-agent-network.label } for { $name }
agent-mesh-scope-title-me = My { -platform-ai-agent-network.label }
agent-mesh-scope-title-session = Session { -platform-ai-agent-network.label }
agent-mesh-scope-subtitle-company = All { -platform-ai-agent-product.inline-plural }, skills, and tools used across the workspace
agent-mesh-scope-subtitle-user = { -platform-ai-agent-product.inline-plural }, skills, and tools used by this user
agent-mesh-scope-subtitle-me = { -platform-ai-agent-product.inline-plural }, skills, and tools across your sessions
agent-mesh-scope-subtitle-session = How your { -platform-ai-agent-product.inline-plural } connect ? replay the decision that produced a response
agent-mesh-empty-title = No session selected
agent-mesh-empty-desc = Open or start an Every Fabric session to see the live agent mesh ? { -platform-ai-agent-product.inline-plural }, skills and tools connected by the messages flowing between them.
agent-mesh-back-landing = Back to landing
agent-mesh-loading-trace = Loading session trace?
agent-mesh-decision-default-title = Session decision simulation
agent-mesh-loading-data = Loading mesh data?
agent-mesh-error-load = Failed to load mesh data
agent-mesh-empty-activity-title = No activity yet
agent-mesh-empty-activity-company = No sessions have been recorded across the workspace.
agent-mesh-empty-activity-scope = No sessions found for this scope.
agent-mesh-view-graph = Graph
agent-mesh-view-cards = Cards
agent-mesh-layer-agents = { -platform-ai-agent-product.label-plural }
agent-mesh-layer-skills = Skills
agent-mesh-layer-tools = Tools & connectors
agent-mesh-layers-title = Layers
agent-mesh-layers-edge-labels = Edge labels
agent-mesh-status-online = { $agents } { $agents ->
    [one] agent
   *[other] agents
} online ? { $tools } { $tools ->
    [one] tool
   *[other] tools
} reachable
agent-mesh-breadcrumb-nav-aria = Mesh navigation
agent-mesh-breadcrumb-user-fallback = User { $id }?
agent-mesh-breadcrumb-session-fallback = Session { $id }?
agent-mesh-back-previous = Back to previous mesh view
agent-mesh-back-workspace = Back to workspace
agent-mesh-back-shortcut = Back (Backspace)
agent-mesh-back-previous-view = Back to previous view
agent-mesh-trace-explorer = Trace Explorer
agent-mesh-view-changed = View changed to { $title }
agent-mesh-fullscreen-enter = Enter fullscreen
agent-mesh-fullscreen-exit = Exit fullscreen
agent-mesh-fullscreen-shortcut-esc = { $label } (F or Esc)
agent-mesh-fullscreen-shortcut = { $label } (F)
agent-mesh-scope-aria = Mesh scope
agent-mesh-layers-aria = Mesh layers
agent-mesh-search-placeholder = Search agents, skills, tools...
agent-mesh-search-aria = Search mesh nodes
agent-mesh-search-clear = Clear search
agent-mesh-search-no-matches = No matches for "{ $query }"
agent-mesh-node-orchestrator = orchestrator
agent-mesh-node-agent = { -platform-ai-agent-product.inline }
agent-mesh-node-skill = skill
agent-mesh-node-tool = tool
agent-mesh-view-2d = Switch to 2D view
agent-mesh-view-3d = Switch to 3D view
agent-mesh-toggle-layers = Toggle layers panel
agent-mesh-live-hud-title = Live activity currently visible in this mesh
agent-mesh-live-hud-sessions = { $count } live
agent-mesh-live-hud-agents = { $count } agents
agent-mesh-live-hud-tools = { $count } tools
agent-mesh-replay-aria = Replay timeline
agent-mesh-replay-pause = Pause replay
agent-mesh-replay-play = Play replay
agent-mesh-replay-restart = Restart replay
agent-mesh-replay-seek = Seek replay timeline
agent-mesh-replay-events = { $count } { $count ->
    [one] event
   *[other] events
}
agent-mesh-replay-live = Live
agent-mesh-decision-aria = Decision simulation
agent-mesh-decision-heading = Decision simulation
agent-mesh-decision-replay-summary = Replay how the answer was assembled ? { $agents } { $agents ->
    [one] agent
   *[other] agents
} ? { $tools } { $tools ->
    [one] tool call
   *[other] tool calls
}
agent-mesh-decision-stat-runtime = { $duration } runtime
agent-mesh-decision-stat-tokens = { $tokens } tokens
agent-mesh-decision-stat-cost = ${ $cost } cost
agent-mesh-decision-stat-count = { $count } decisions
agent-mesh-decision-empty = No decisions or events yet.
agent-mesh-decision-conf = conf { $percent }%
agent-mesh-overview-title = Overview
agent-mesh-overview-agents = Agents
agent-mesh-overview-tools = Tools
agent-mesh-overview-sessions = Sessions
agent-mesh-overview-users = Users
agent-mesh-overview-top-agents = Top Agents
agent-mesh-overview-top-skills = Top Skills
agent-mesh-overview-top-tools = Top Tools
agent-mesh-overview-no-agents = No agents recorded
agent-mesh-overview-no-skills = No skills recorded
agent-mesh-overview-no-tools = No tools recorded
agent-mesh-overview-active-users = Active Users
agent-mesh-overview-recent-sessions = Recent Sessions
agent-mesh-overview-user-sessions = { $count } sessions
agent-mesh-edge-view-message = View message between agents
agent-mesh-edge-view-message-title = Click to view the full message
agent-mesh-edge-message-aria = { $kind } message
agent-mesh-edge-close = Close message detail
agent-mesh-edge-status = Status
agent-mesh-edge-no-body = (No message body recorded.)
agent-mesh-edge-unknown-source = Unknown source
agent-mesh-edge-unknown-target = Unknown target
agent-mesh-edge-sessions = Sessions ({ $count })
agent-mesh-edge-kind-delegation = Delegation
agent-mesh-edge-kind-tool-call = Tool call
agent-mesh-edge-kind-expert-call = Expert call
agent-mesh-edge-kind-skill-load = Skill load
agent-mesh-edge-kind-completion = Completion
agent-mesh-node-detail-aria = Node detail: { $label }
agent-mesh-node-detail-close = Close detail
agent-mesh-node-detail-status = Status
agent-mesh-node-detail-invocations = Invocations
agent-mesh-node-detail-duration = Duration
agent-mesh-node-detail-first-seen = First seen
agent-mesh-node-detail-used-by = Used by { $count } { $count ->
    [one] user
   *[other] users
}
agent-mesh-node-detail-sessions = { $count } { $count ->
    [one] session
   *[other] sessions
}
agent-mesh-node-detail-inbound = Inbound ({ $count })
agent-mesh-node-detail-outbound = Outbound ({ $count })
agent-mesh-node-detail-skills = Skills ({ $count })
agent-mesh-node-detail-auto-detected = Auto-detected
agent-mesh-node-skills-aria = { $count } { $count ->
    [one] skill
   *[other] skills
}
agent-mesh-node-live-sessions = { $count } live sessions
agent-mesh-glass-heading = Company agents
agent-mesh-glass-value = { $count } { $count ->
    [one] agent
   *[other] agents
}

# Scheduled tasks (phase2-rest)
scheduled-title = Scheduled Tasks
scheduled-back-aria = Back
scheduled-refresh-aria = Refresh
scheduled-close = Close
scheduled-new-task = New task
scheduled-editing = Editing schedule
scheduled-title-placeholder = Schedule title
scheduled-task-placeholder = Agent task to run on each recurrence
scheduled-repeat = Repeat
scheduled-frequency-once = Once
scheduled-frequency-daily = Daily
scheduled-frequency-weekly = Weekly
scheduled-frequency-monthly = Monthly
scheduled-save-template = Save as template
scheduled-saving-template = Saving?
scheduled-create-once = Schedule task
scheduled-create-recurring = Create recurring schedule
scheduled-saving = Saving?
scheduled-creating = Creating?
scheduled-save-changes = Save changes
scheduled-tab-all = All
scheduled-tab-pending = Pending
scheduled-tab-sent = Sent
scheduled-tab-failed = Failed
scheduled-tab-cancelled = Cancelled
scheduled-try-again = Try again
scheduled-empty-title = No scheduled tasks yet
scheduled-empty-desc = Start from a template below, or ask the agent in chat to schedule one for you.
scheduled-status-pending = Pending
scheduled-status-firing = Sending?
scheduled-status-fired = Sent
scheduled-status-cancelled = Cancelled
scheduled-status-failed = Failed
scheduled-badge-agent-run = Agent run
scheduled-badge-recurring = Recurring
scheduled-subtitle-agent-session = Durable { -platform-ai-agent-product.inline } session
scheduled-subtitle-assignees = { $count } { $count ->
    [one] assignee
   *[other] assignees
}
scheduled-open-result = Open result
scheduled-run-now = Run now
scheduled-edit-aria = Edit
scheduled-cancel = Cancel
scheduled-disable = Disable
scheduled-enable = Enable
scheduled-retry = Retry
scheduled-delete = Delete
scheduled-keep = Keep
scheduled-delete-aria = Delete
scheduled-collapse = Collapse
scheduled-expand = Expand
scheduled-detail-message = Message
scheduled-detail-assignees = Assignees ({ $count })
scheduled-detail-result = Result
scheduled-detail-open-session = Open the agent session to view the result
scheduled-detail-recurrence = Recurrence
scheduled-detail-recurrence-next = { $label } ? next run { $when }
scheduled-detail-run-history = Run history
scheduled-detail-triggered = Triggered
scheduled-detail-open = Open
scheduled-detail-inbox = Delivered to inbox
scheduled-detail-inbox-summary = { $count } { $count ->
    [one] task
   *[other] tasks
} delivered to the assignee{ $plural } inbox
scheduled-detail-last-attempt = Last attempt:
scheduled-detail-sent-at = Sent at:
scheduled-detail-id = ID: { $id }
scheduled-templates-quick-start = Quick start
scheduled-templates-delete-aria = Delete template
scheduled-err-task-required = Add the task the agent should run.
scheduled-err-datetime-required = Choose a future date and time.
scheduled-err-datetime-future = Scheduled time must be in the future.
scheduled-err-save-failed = Failed to save changes.
scheduled-err-template-task = Add the task before saving it as a template.
scheduled-err-template-save = Failed to save template.
scheduled-err-create-failed = Failed to create schedule.
scheduled-dispatch-err-auth-label = Authentication failed
scheduled-dispatch-err-unavailable-label = Service unavailable
scheduled-dispatch-err-timeout-label = Timed out
scheduled-dispatch-err-assignee-label = Invalid assignee
scheduled-dispatch-err-unknown-label = Failed
scheduled-dispatch-err-auth-msg = Authentication to the flow engine failed (token missing or rejected). Check the service-account credentials, then Retry.
scheduled-dispatch-err-unavailable-msg = The flow engine could not be reached. Check that the service is running.
scheduled-dispatch-err-timeout-msg = The flow engine did not respond in time. Retry when it is reachable.
scheduled-dispatch-err-assignee-msg = An assignee could not be resolved. Verify the assignee still exists.
scheduled-dispatch-err-unknown-msg = The task could not be delivered.
scheduled-dispatch-details = Details
scheduled-dispatch-hide-details = Hide details

# Error boundary (phase2-rest)
error-boundary-title = Every Fabric crashed while rendering
error-boundary-unknown = Unknown rendering error
error-boundary-retry = Retry workspace

# Artifacts (phase2-rest)
artifact-replay-animation = Replay animation
artifact-replay-label = Replay
artifact-chart-empty = No chart content available.

# Connectors (phase2-rest)
connectors-picker-title = Connectors
connectors-picker-loading = Loading connectors?
connectors-picker-empty = No connectors available.
connectors-picker-close-aria = Close

# Forms (phase2-rest)
forms-employee-search-placeholder = Search and select employee?
forms-employee-change = Change
forms-employee-auth-required = Authentication required to search employees
forms-employee-error = Error: { $error }
forms-employee-searching = Searching employees?
forms-employee-no-match = No employees found matching your search
forms-employee-start-typing = Start typing to search employees

# Trace explorer timeline (phase2-rest)
trace-explorer-timeline-empty = No timeline data available yet
trace-explorer-timeline-truncated = Showing { $shown } of { $total } frames
trace-explorer-bar-running = running
trace-explorer-legend-tool = Tool call
trace-explorer-legend-subagent = Delegation
trace-explorer-legend-expert = Expert
trace-explorer-legend-decision = Decision
trace-explorer-legend-skill = Skill
trace-explorer-legend-hitl = Human input
trace-explorer-legend-step = Step
trace-explorer-legend-terminal = Terminal
trace-explorer-legend-capability-missing = Missing
trace-explorer-legend-artifact = Artifact
trace-explorer-legend-other = Other

# Glass card sphere (phase2-rest)
glass-card-status-running = Running
glass-card-status-active = Active
glass-card-status-renewing = Renewing
glass-card-status-trial = Trial
glass-card-status-paused = Paused

# Artifacts toolbar & renderers (phase2-rest)
artifact-type-html = HTML
artifact-type-document = Document
artifact-type-markdown = Markdown
artifact-type-slide = Slides
artifact-type-chart = Chart
artifact-type-table = Table
artifact-type-diagram = Diagram
artifact-type-app-preview = App Preview
artifact-type-code = Code
artifact-type-unknown = File
artifact-view-preview = Preview
artifact-view-code = Code
artifact-copy-content = Copy content
artifact-copy = Copy
artifact-copied = Copied!
artifact-download = Download
artifact-download-png = Download as PNG
artifact-open-tab = Open in new tab
artifact-close-viewer = Close viewer
artifact-table-empty = No table content available.
artifact-table-no-rows = No table rows available.
artifact-app-preview-desc = Generated app preview source. Interactive execution is disabled in the artifact viewer; review or download the source.
artifact-loading-document = Loading document?
artifact-loading-diagram = Loading diagram?
artifact-loading-slides = Loading slides?
artifact-slides-empty = No slides found.
artifact-slide-notes = Notes

# Sidebar navigation (phase2-rest completion)
sidebar-nav-aria = { -platform-ai-agent-product.label-plural } navigation
sidebar-section-workspace = Workspace
sidebar-section-active-session = Active session
sidebar-badge-new = NEW
sidebar-expand-tooltip = Expand sidebar
sidebar-collapse-tooltip = Collapse sidebar

# Final answer compact summaries (phase2-rest completion)
renderer-compact-summary-single = I've created the { $type } "{ $title }". You can review it on the canvas, refine it with follow-up instructions, or save it to your documents.
renderer-compact-summary-multi = I've created { $count } items: { $titles }. You can review them on the canvas or save them to your workspace.
renderer-dashboard-ready = Dashboard ready ? see the visualization below.

# Agent mesh 3D node (phase2-rest completion)
agent-mesh-node-live-badge = ?{ $count } live
