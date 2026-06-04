# Customer 360

app-title = Customer 360
overline-account = ACCOUNT
overline-contact = CONTACT

# Tabs
tab-overview = Overview
tab-details = Details
tab-scoring-satisfaction = Scoring & Satisfaction
tab-contracts = Contracts
tab-service-tickets = Service Tickets
tab-service-cases = Service Cases
tab-transactions-fibu = Transactions & Fibu
tab-journal = Journal
tab-agent = Agent

# KPI header
kpi-score = Score
kpi-satisfaction = Satisfaction
kpi-active-contracts = Active Contracts
kpi-open-tickets = Open Tickets
kpi-open-invoices = Open Invoices
kpi-lifetime-value = Lifetime Value

# States
placeholder-description = This area is coming soon.
not-found = Customer not found
no-customer = No customer selected
back = Back
error-title = Something went wrong

# Overview
overview-snapshot-title = At a glance
overview-open-cases = Open Cases
overview-recent-activity = Recent activity
overview-ask-agent-title = Ask the agent
overview-ask-agent-description = Hand this customer over to the Every Fabric agent for analysis and next-best actions.
overview-ask-agent-cta = Open agent

# Journal
journal-title = Journal
journal-untitled = Untitled entry
journal-empty-title = No activity yet
journal-empty-description = Activities, notes and tasks for this customer will appear here.

# Details / Relationships
relationships-contacts-title = Contacts
relationships-accounts-title = Accounts
relationships-unknown-contact = Unknown contact
relationships-unknown-account = Unknown account
relationships-empty-title = No relationships
relationships-empty-description = Linked contacts and accounts will appear here.

# Contracts
contracts-untitled = Untitled contract
contracts-expires = Expires { $date }
contracts-empty-title = No contracts
contracts-empty-description = Documents typed as contracts will appear here.

# Service tickets
tickets-untitled = Untitled ticket
tickets-priority = Priority: { $priority }
tickets-empty-title = No service tickets
tickets-empty-description = Tickets opened for this customer will appear here.

# Service cases & reclamations
cases-title = Cases
cases-untitled = Untitled case
cases-empty-title = No cases
cases-empty-description = Service cases grouping multiple flows will appear here.
reclamations-title = Reclamations
reclamations-untitled = Untitled reclamation
reclamations-empty-title = No reclamations
reclamations-empty-description = Complaints and reclamations will appear here.

# Scoring & satisfaction
scoring-title = Scoring
scoring-ai-score = AI score
scoring-grade = Grade
scoring-icp-score = ICP score
scoring-empty-title = No score yet
scoring-empty-description = AI / ICP scoring from related records will appear here.
satisfaction-title = Satisfaction
satisfaction-csat = CSAT
satisfaction-nps = NPS
satisfaction-last-survey = Last survey
satisfaction-empty-title = No satisfaction data
satisfaction-empty-description = CSAT / NPS will appear here once the backend metric is connected.

# Transactions & Fibu
fibu-awaiting-description = Awaiting the NewWork Connect (Fibu) integration. Data will appear here once it is enabled.
fibu-balance-title = Financial overview
fibu-balance-empty-title = No balance data
fibu-balance-empty-description = Open, overdue and lifetime value will appear here.
fibu-open-amount = Open amount
fibu-overdue-amount = Overdue
fibu-lifetime-value = Lifetime value
fibu-invoices-title = Invoices
fibu-invoices-empty-title = No invoices
fibu-invoices-empty-description = Invoices from Fibu will appear here.
fibu-transactions-title = Transactions
fibu-transactions-empty-title = No transactions
fibu-transactions-empty-description = Transaction history from Fibu will appear here.

# Agent handoff
agent-panel-title = Ask the AI agent
agent-panel-description = Hand { $name } off to the AI workforce with full 360° context.
agent-context-title = What gets shared
agent-context-hint = The agent receives the customer type, ID and a compact snapshot summary (scores, satisfaction, contracts, tickets, cases, invoices and balance). No personal data beyond the name is shared.
agent-ask-button = Ask the agent
agent-workforce-button = Open Enterprise Workforce

# Home — shell
home-title = Customer 360
home-description = Your whole book of business — health, risk and what needs attention now.
home-tab-cockpit = Cockpit
home-tab-worklist = Attention
home-tab-explorer = Customers
home-tab-inbound = Inbound
home-tab-renewals = Renewals
home-tab-analytics = Analytics
home-tab-agent = Agent
home-provisional-note = Health scores are provisional — derived from CRM fields (owner, lifecycle) until the customer-service aggregation backend is connected. Tickets, satisfaction and finances will replace these heuristics.

# Home — cockpit
cockpit-total-customers = Customers
cockpit-accounts = Accounts
cockpit-contacts = Contacts
cockpit-needs-attention = Needs attention
cockpit-needs-attention-footer = Across your portfolio
cockpit-unassigned = Unassigned
cockpit-avg-csat = Avg CSAT
cockpit-overdue = Overdue
cockpit-attention-title = Needs attention now
cockpit-view-worklist = View worklist

# Home — attention worklist
worklist-intro = Customers ranked by composite risk — low satisfaction, open complaints, overdue invoices, expiring contracts, open tickets and ownership gaps.
worklist-title = Attention worklist
worklist-empty-title = Nothing needs attention
worklist-empty-description = Customers that cross the risk threshold will appear here, highest priority first.

# Attention reasons
attention-reason-low-csat = Low satisfaction
attention-reason-open-reclamation = Open complaint
attention-reason-overdue-invoice = Overdue invoice
attention-reason-expiring-contract = Expiring contract
attention-reason-open-tickets = Open tickets
attention-reason-no-owner = No owner
attention-reason-prospective = Prospect

# Home — explorer
explorer-column-customer = Customer
explorer-column-type = Type
explorer-column-status = Status
explorer-column-owner = Owner
explorer-column-health = Health
explorer-column-attention = Attention
explorer-column-reasons = Reasons
explorer-owner-assigned = Assigned
explorer-owner-unassigned = Unassigned
explorer-segment-all = All
explorer-segment-accounts = Accounts
explorer-segment-contacts = Contacts
explorer-segment-attention = Needs attention
explorer-search-placeholder = Search customers…

# Home — inbound triage
inbound-title = Inbound triage
inbound-description = Incoming emails and tickets, automatically matched to the right customer — so you always know who is writing.
inbound-step-receive = An email or ticket arrives
inbound-step-match = We match it to a customer
inbound-step-context = Full 360° context is attached
inbound-step-draft = The agent drafts a reply
inbound-agent-button = Draft a reply with the agent
inbound-agent-prompt = Help me triage an inbound customer message: identify the customer, summarize their situation and draft a reply.
inbound-stream-title = Inbound stream
inbound-stream-empty-title = No inbound items yet
inbound-stream-empty-description = Matched emails and tickets will appear here once the customer-service inbound endpoint is connected.

# Home — renewals & lifecycle
renewals-expiring-title = Expiring contracts
renewals-expiring-empty-title = No expiring contracts
renewals-expiring-empty-description = Contracts approaching their end date will appear here once the contract aggregation backend provides expiry dates.
renewals-lifecycle-title = Prospects to activate
renewals-lifecycle-empty-title = No prospects
renewals-lifecycle-empty-description = Prospective customers to nurture toward activation will appear here.

# Home — analytics
analytics-customers = Customers
analytics-band-high = High
analytics-band-medium = Medium
analytics-band-low = Low
analytics-composition-title = Portfolio composition
analytics-composition-hint = Accounts vs contacts across your book of business.
analytics-attention-title = Attention distribution
analytics-attention-hint = How many customers fall into each risk band.

# Home — portfolio agent
portfolio-agent-title = Customer 360 Analyst
portfolio-agent-description = Let the AI workforce monitor your whole book of business and triage what needs attention.
portfolio-agent-context-title = What gets shared
portfolio-agent-context-hint = The agent receives portfolio counts and the top at-risk customers (type, ID and score only). It loads full detail per customer via the getCustomer360 tool.
portfolio-agent-triage-button = Let the agent triage
portfolio-agent-focus-title = Current focus
portfolio-agent-focus-hint = The customers the agent will prioritize first.
