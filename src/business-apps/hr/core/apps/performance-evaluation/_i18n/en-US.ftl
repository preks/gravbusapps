title = Performance Cycle Configuration
subtitle = Create and manage performance evaluation cycles

tab-cycles = Cycles
tab-performance = Performance Cycles
tab-rating-scales = Rating Scales
tab-values = Values

button-add = Add
button-cancel = Cancel
button-save = Save
button-start = Start
button-activate = Activate
button-deactivate = Deactivate
button-complete = Complete
button-delete = Delete
button-manual-run = Manual Run

table-name = Name
table-dates = Execution Dates
table-type = Type
table-scale = Scale
table-participants = Participants
table-status = Status
status-completed = Completed
status-in-progress = In Progress
cycle-already-started = "{ $name }" has already been started.
table-evaluation-period = Evaluated Period
table-actions = Actions
empty-no-cycles = No cycles created yet.
empty-no-values = No values defined yet.

modal-create-title = Create New Cycle
modal-edit-title = Edit Cycle
modal-description = Configure details for the performance cycle.

field-name = Name
field-start-date = Execution Start Date
field-end-date = Execution End Date
field-frequency = Frequency/Type
field-rating-scale = Rating Scale
label-evaluation-participants = Evaluation Participants
field-evaluation-period-start = Evaluated Period Start
field-evaluation-period-end = Evaluated Period End
field-values = Values
field-title = Title
field-description = Description
field-active = Active

placeholder-name = e.g., 2026 Annual Performance
placeholder-select-cycle = Select cycle
placeholder-select-frequency = Select a frequency
placeholder-select-scale = Select a rating scale
placeholder-no-scales = No scales. Add from Rating Scales tab.
placeholder-no-values = No values. Add from Values tab.

# Rating scale modal
scale-title-add = Add Rating Scale
scale-title-edit = Edit Rating Scale
scale-description = Define a named rating scale and its ordered values.
scale-field-name = Name
scale-field-values = Values (ordered)
scale-placeholder-name = e.g., 1–5, 1–10, A–E
scale-field-length = Scale length (2–10)
scale-field-display = Display
scale-display-numeric = Numeric (1..N)
scale-display-letters = Letters (A..)
scale-display-stars = Stars (★)
scale-display-custom = Custom labels
scale-display-placeholder = Choose display style
scale-field-custom-labels = Custom labels (ordered)
scale-custom-label-placeholder-prefix = Label for
scale-button-add = Add
scale-preview = Preview

# Participants
participant-self = Self
participant-peer = Peer
participant-manager = Manager
participant-hr-team = HR Team

# Frequency
frequency-annual = Annual
frequency-quarterly = Quarterly
frequency-monthly = Monthly

# Rating scales table
empty-no-rating-scales = No rating scales defined yet.
scale-saved-to-database = Rating scale "{ $name }" saved.
scale-deleted-to-database = Rating scale "{ $name }" deleted.
cycle-saved-to-database = Performance cycle "{ $name }" saved.
cycle-activated-to-database = "{ $name }" activated.
cycle-deactivated-to-database = "{ $name }" deactivated.
cycle-completed-to-database = "{ $name }" marked as completed.
cycle-deleted-to-database = "{ $name }" deleted.
cycle-started = Starting cycle: { $name }
cycle-start-rating-scale-required = A rating scale is required before starting "{ $name }". Please edit the cycle and select a rating scale.
value-saved-to-database = Company value "{ $title }" saved.
value-deleted-to-database = "{ $title }" deleted.
value-activated-to-database = "{ $title }" activated.
value-deactivated-to-database = "{ $title }" deactivated.
table-values = Values
button-edit = Edit

# Values modal
values-modal-title-add = Add Value
values-modal-title-edit = Edit Value
values-modal-description = Define a company value and its description.

# Start cycle confirm modal
start-confirm-title = Start Performance Evaluation
start-confirm-description-with-cycle = Are you sure you want to start the performance evaluation for "{ $name }"? This will initiate the evaluation flow.
start-confirm-description-generic = Are you sure you want to start this performance evaluation?
start-confirm-select-cycle = Select Cycle *
start-confirm-run-for-label = Run evaluation for
start-confirm-run-for-employee = Employee
start-confirm-run-for-team = Team
start-confirm-select-employee = Select employee *
start-confirm-placeholder-employee = Select employee to run evaluation for...
start-confirm-placeholder-loading-employees = Loading employees...
start-confirm-select-teams = Select Teams *
start-confirm-placeholder-loading = Loading teams...
start-confirm-placeholder-teams = Select teams to start evaluation for
start-confirm-search-teams = Search teams...
start-confirm-empty-teams = No teams found
start-confirm-button = Start Evaluation

# Errors
values-error-cannot-deactivate-active-cycle = Cannot deactivate value while it is used in an active cycle.
cycles-error-no-rating-scales = At least one rating scale is required to create a cycle.
cycles-error-no-company-values = At least one company value is required to create a cycle.
cycles-error-dates-overlap = Cycle dates cannot overlap with an existing cycle. Please choose a start date after the end of existing cycles.
cycles-error-eval-period-overlap = Evaluation period overlaps with an existing cycle. Please choose dates that do not conflict with other evaluation periods.
error-activate-out-of-period = Cannot activate cycle. Today's date is outside the cycle period.

