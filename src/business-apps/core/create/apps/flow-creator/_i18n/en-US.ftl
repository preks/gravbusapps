# Flow Studio Translations (English)

# App
app-title = Flow Studio
app-description = Design and configure workflows visually
app-eyebrow = Create

# Studio navigation
studio-back-to-list = Back to list
studio-discard-title = Discard changes?
studio-discard-desc = You have unsaved changes. Leave the studio without saving and discard them.
studio-discard-cancel = Keep editing
studio-discard-confirm = Discard and close
studio-save-name-title = Name flow before saving
studio-save-name-description = Give this flow a clear name so it can be saved and found again later.
studio-save-name-label = Flow name
studio-save-name-placeholder = e.g. Employee onboarding
studio-save-name-validation = Please enter a flow name before saving.
studio-save-name-cancel = Cancel
studio-save-name-confirm = Save flow
studio-unsaved-changes = Unsaved changes
studio-saved = Saved
studio-loading = Loading...
studio-test-flow = Test flow
studio-import-flow = Import
studio-export-flow = Export
studio-import-failed = Import failed. Please select a valid flow JSON file.

# Labels / Tags
labels-title = Labels
labels-tab-categories = Categories
labels-tab-custom = Custom labels
labels-app = Application
labels-app-placeholder = Select an application
labels-service-category = Service category
labels-service-category-placeholder = Select a service category
labels-dwp-category = Digital Workplace category
labels-dwp-category-placeholder = Select a Digital Workplace category
labels-none = None selected
labels-preview = Preview
labels-custom-title = Custom labels
labels-custom-description = Add arbitrary key/value labels for filtering and organization.
labels-custom-add = Add label
labels-key = Key
labels-key-placeholder = e.g. solution
labels-value = Value
labels-value-placeholder = e.g. compliance
labels-cancel = Cancel
labels-save = Save
labels-error-duplicate = Duplicate key: {$key}

# List
list-title = FLOWs
list-subtitle = Browse and open existing flow templates
list-tab-create = Create
list-tab-flows = FLOWs
list-subtitle-create = Design and create new flows
list-search = Search
list-search-placeholder = Search flows...
list-sort = Sort
list-sort-name-asc = Name (A–Z)
list-sort-name-desc = Name (Z–A)
list-sort-version-desc = Version (high → low)
list-sort-steps-desc = Steps (high → low)
list-create = Create flow
list-empty-title = No flows found
list-empty-subtitle = Try adjusting your search or create a new flow.
list-col-name = Name
list-col-app = Category
list-col-created-by = Creator
list-col-updated = Last updated
list-col-type = Type
list-col-version = Version
list-col-steps = Steps
list-col-labels = Labels
list-untitled = Untitled
list-no-id = No ID
list-error-title = Could not load flows
list-retry = Retry
list-pager-summary = {$from}–{$to} of {$total}
list-pager-empty = No results
list-prev = Previous
list-next = Next

# Mode Toggle
mode-simple = Simple
mode-advanced = Advanced
mode-toggle-label = Designer Mode
mode-simple-description = Simplified workflow design for business users
mode-advanced-description = Full-featured workflow design for expert users

# Canvas
canvas-empty-title = Start building your flow
canvas-empty-description = Drag nodes from the palette or click to add
canvas-zoom-in = Zoom in
canvas-zoom-out = Zoom out
canvas-fit-view = Fit to view
canvas-auto-layout = Auto layout

# Node Palette
palette-title = Nodes
palette-start = Start
palette-task = Task
palette-approval = Approval
palette-decision = Decision
palette-fork = Parallel Split
palette-join = Parallel Merge
palette-end = End

# Toolbar
toolbar-save = Save
toolbar-publish = Publish
toolbar-simulate = Simulate
toolbar-undo = Undo
toolbar-redo = Redo
toolbar-delete = Delete
toolbar-duplicate = Duplicate

# Config Panels
config-panel-title = Configuration
config-general = General
config-form = Form
config-assignment = Assignment
config-conditions = Conditions
config-branches = Branches
config-events = Automation
config-parameters = Parameters
config-rework = Rework Actions

# Start Node Config
start-trigger-type = Trigger Type
start-trigger-manual = Manual Form
start-trigger-webhook = Webhook
start-trigger-event = Event
start-trigger-schedule = Schedule

# Task Node Config
task-title = Task Title
task-message = Task Message
task-instruction = AI Instruction
task-switch-type = Switch step type
task-type = Task Type
task-type-task = Task
task-type-approval = Approval
task-type-information = Information
task-type-acknowledge = Acknowledge
task-type-function = Function
task-type-ai_agent = EveryAI Agent
task-type-ai_task_expert = Enterprise Agent
task-kind = Step Kind
task-kind-user = User Step
task-kind-system = System Step

# Task links / attachments
task-links-title = Links
task-links-subtitle = Attach documents and add helpful references.
task-links-add = Add link
task-links-empty = No links configured yet.
task-links-item = Link
task-links-kind = Kind
task-links-kind-document = Document
task-links-kind-link = Link
task-links-document-source = Document from previous step
task-links-document-source-placeholder = Select a file field…
task-links-document-empty-hint = No file uploads found in earlier steps.
task-links-link-type = Link type
task-links-link-type-knowledge = Knowledgebase
task-links-link-type-policy = Policy article
task-links-link-type-external = External URL
task-links-picker-knowledge = Knowledgebase article
task-links-picker-policy = Policy article
task-links-picker-placeholder = Select content…
task-links-picker-search = Search content…
task-links-name = Name
task-links-name-placeholder = e.g. Contract, Policy, FAQ
task-links-url = URL
task-links-url-placeholder = https://example.com
task-links-document-url = Document reference (expression)
task-links-document-url-placeholder = {{ $steps.step_0.formData.fileField }}

# Enterprise Agent parameter mapping
task-input-params = Input parameters
task-input-params-loading = Loading parameters...
task-input-params-empty = No parameters found.
task-input-params-system = System parameters
task-input-params-user = User parameters
task-input-params-pick = Select value
task-input-params-expression-placeholder = Type {{ to map flow data.
task-input-params-unmapped = Unmapped

# EveryAI Agent output schema
task-output-schema-title = Output schema
task-output-schema-desc = Define the structured output this agent produces for downstream steps.

# Task step type selector (signature)
task-type-group-human = User steps
task-type-group-ai = AI & Automations

# Assignment
assignment-due-label = Due time
assignment-due-description = Set how long assignees have to complete this task.
assignment-due-placeholder = e.g. 2
assignment-due-unit-minutes = Minutes
assignment-due-unit-hours = Hours
assignment-due-unit-days = Days
assignment-mode-label = Assignment Mode
assignment-mode-claim = Claim
assignment-mode-assign = Assign
assignment-mode-deferred = Deferred
assignment-mode-claimable = Claim
assignment-mode-auto = Assign
assignment-mode-runtime = Provided at execution
assignment-mode-desc-claim = Anyone in the selected audience can claim this task.
assignment-mode-desc-assign = An individual task is created for everyone in the selected audience.
assignment-mode-desc-deferred = Targets are resolved at runtime (advanced).
assignment-mode-desc-claimable = Users with the selected capabilities can claim this task.
assignment-mode-desc-auto = Assign automatically using a strategy (or at execution).
assignment-mode-desc-runtime = Assignees must be provided when starting execution.
assignment-audience-label = Audience
assignment-capabilities-label = Capabilities
assignment-runtime-hint = This step must be assigned when starting the flow.
assignment-assign-at-execution-label = Assign at execution
assignment-assign-at-execution-desc = Provide the assignee when starting the flow.
assignment-assign-at-execution-multi-label = Allow multiple assignees
assignment-assign-at-execution-multi-desc = Let the launcher select more than one assignee for this step.
assignment-allow-reassignment-label = Allow reassignment
assignment-allow-reassignment-desc = Assignee can reassign this task.

# Logic decisions
logic-description-simple = Pick a step value and compare it. First matching condition wins.
logic-description-advanced = Define conditions with flow context. First matching condition wins.
logic-field-label = Value
logic-default = Default outcome
logic-field-placeholder = Select value
logic-field-search = Search step data...
logic-field-empty = No matching values
logic-field-group-steps = Step data
flow-context-search = Search flow context...
flow-context-group = Flow context
logic-operator-label = Operator

# User decisions (USER mode)
decision-user-task-title-label = Task title
decision-user-task-message-label = Task message
decision-user-task-message-placeholder = Add a short message… Type {{ to insert data.
logic-value-label = Compare to
logic-value-placeholder = e.g. 1000 or 'approved'
logic-preview = Condition:

# Decision Node Config
decision-mode = Decision Mode
decision-mode-user = User Decision
decision-mode-ai = AI Decision
decision-mode-logic = Logic Decision
decision-branch-add = Add Branch
decision-default-branch = Default Branch
decision-confidence = Confidence Threshold
decision-escalation = Escalation
decision-policy = Decision Policy
decision-policy-optional-placeholder = Optional: select a policy...
decision-ai-executor-label = AI executor
decision-ai-executor-everyai = EveryAI
decision-ai-executor-everyai-desc = Use a decision instruction (with flow context) and let EveryAI pick the best branch.
decision-ai-executor-taskexpert = Enterprise Agent
decision-ai-executor-taskexpert-desc = Run the agent and route via mapping rules. If no rule matches, a human picks the branch.
decision-ai-type-label = Decision setup
decision-ai-type-policy = Policy-guided
decision-ai-type-policy-desc = Use a policy document as guidance for the decision.
decision-ai-type-expert = AI Expert
decision-ai-type-expert-desc = Select an AI expert from Prompt Manager to make the decision.
decision-ai-instructions-label = Decision instructions
decision-ai-instructions-desc = Add context or rules for the AI, including when it should escalate to a human fallback.
decision-ai-instructions-placeholder = e.g. Prefer branch A if the risk score is above the value from a previous step.
decision-escalation-how-title = How escalation works
decision-escalation-how-desc = If the AI requests escalation, returns invalid output, or the result cannot be mapped to a branch, a user decision task is created and the user selects the next branch.
decision-escalation-due-label = Escalated decision due in
decision-human-fallback-title = Human fallback
decision-human-fallback-desc = Configure who gets the fallback decision task and what the user sees when the AI cannot decide.
decision-human-instructions-label = Fallback task message
decision-human-instructions-desc = Required. This is shown to the user when a human needs to pick the branch. You can insert flow context.
decision-human-instructions-placeholder = e.g. The AI could not decide. Please choose the best branch based on the available information.
decision-ai-taskexpert-mapping-label = Mapping rules
decision-ai-taskexpert-mapping-desc = Define rules that map the agent output to a branch.
decision-ai-taskexpert-picker-desc = Select which agent should execute for this decision.
decision-ai-taskexpert-picker-placeholder = Select an agent...
decision-ai-taskexpert-picker-search = Search agents...
decision-ai-taskexpert-picker-empty = No agents found.
decision-ai-taskexpert-params-desc = Map each prompt parameter explicitly to the flow context that should be sent to the selected agent.
decision-ai-taskexpert-reasoning-label = Reasoning output mapping
decision-ai-taskexpert-reasoning-desc = Optional. Select which output field should be used as reasoning for the human fallback.
decision-ai-taskexpert-reasoning-placeholder = Select output field (optional)
decision-ai-taskexpert-reasoning-none = None
decision-due-label = Decision due in
decision-due-placeholder = e.g. 2
decision-due-unit-minutes = Minutes
decision-due-unit-hours = Hours
decision-due-unit-days = Days

# Fork/Join Config
fork-branches = Parallel Branches
fork-add-branch = Add Branch
join-condition = Join Condition
join-wait-all = Wait for All
join-wait-any = Wait for Any

# Rework / Go-Back
rework-title = Rework Actions
rework-on-reject = On Reject
rework-send-back-to = Send back to
rework-reason-required = Require reason
rework-preserve-data = Preserve form data
rework-max-iterations = Max iterations

# Simulation
sim-title = Simulation
sim-start = Start Simulation
sim-stop = Stop
sim-pause = Pause
sim-resume = Resume
sim-provide-input = Provide Input
sim-completed = Simulation completed
sim-step-log = Step Log
sim-mock-data = Mock Data

# Validation
validation-title = Validation
validation-no-start = Flow must have a start node
validation-no-end = Flow must have an end node
validation-orphan-nodes = Orphan nodes detected
validation-fork-no-join = Fork node has no matching join
validation-decision-branches = Decision must have at least 2 branches
validation-disconnected = Some nodes are not connected
validation-decision-must-select-agent = Decision "{ $label }" must select an Enterprise Agent prompt
validation-decision-unmapped-agent-params = Decision "{ $label }" must map all Enterprise Agent prompt parameters before publish: { $params }

# Add step panel
add-step-tip-advanced-mode = Switch to Advanced mode to unlock Function Tasks and Enterprise Agent steps.

# Task step type selector descriptions
task-step-type-ai-task-expert-description = Enterprise Agent prompt step.

# Decision Enterprise Agent mapping suggestions
decision-ai-taskexpert-mapping-suggestion-description = From the selected agent output schema.
