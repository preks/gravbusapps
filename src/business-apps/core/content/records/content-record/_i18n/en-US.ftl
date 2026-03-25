# Navigation
back_to_overview = Back to overview
go_back = Go Back

# Error states
content_id_required = Content ID is required
content_not_found = Content not found
error_loading_content = Error loading content
error_loading_answers = Error loading answers

# Questions & Answers
add_answer = Add Answer
no_answers_yet = No answers yet. Be the first to answer!
answered_by = answered by
answer = Answer
answers = Answers
best_answer = Best Answer
accepted_answer = Accepted Answer

# Comments
add_comment = Add a comment...
comment = comment
comments = comments
no_comments_yet = No comments yet
unknown = Unknown


# Policy Control Center
policy_badge = Policy
policy_version = Version { $version }
policy_owner = Owner: { $owner }
policy_effective_range = Effective: { $from } → { $to }
policy_effective_from = Effective from { $from }
policy_effective_until = Effective until { $to }
policy_counter_acknowledgements = Acknowledgements: { $count }
policy_counter_experts = Linked Experts: { $count }
policy_counter_flows = Linked Flows: { $count }

policy_action_send_ack = Send for acknowledgement
policy_action_send_approval = Send for approval
policy_action_create_expert = Create Task Expert from policy
policy_action_generate_flow = Generate Flow from policy
policy_action_send_ack_short = Send acknowledgement
policy_action_send_approval_short = Send for approval
policy_action_create_expert_short = Create Task Expert
policy_action_generate_flow_short = Generate Flow
policy_action_ask_everyai = Ask EveryAI

policy_last_updated = Last updated
policy_sidebar_active_since = Active since
policy_metric_execution = Execution
policy_metric_executions = Executions
policy_metric_version = Version
policy_metric_versions = Versions
policy_metric_day_active = Day active
policy_metric_days_active = Days active
policy_unit_year = year
policy_unit_years = years
policy_unit_month = month
policy_unit_months = months
policy_unit_day = day
policy_unit_days = days

# Sidebar
policy_sidebar_impact = Impact
policy_sidebar_signal_acks = Campaigns
policy_sidebar_signal_experts = Experts
policy_sidebar_signal_flows = Flows
policy_sidebar_signal_runs = Executions
policy_sidebar_signal_approvals = Approvals
policy_sidebar_actions = Actions
policy_sidebar_action_ack_desc = Launch an acknowledgement workflow for a selected audience.
policy_sidebar_action_approval_desc = Send this policy for review and approval by designated approvers.
policy_sidebar_action_expert_desc = Create a Task Expert using this policy as a knowledge source.
policy_sidebar_action_flow_desc = Generate or link automation Flows derived from this policy.
policy_sidebar_action_everyai_desc = Ask EveryAI to analyze and suggest improvements.
policy_sidebar_details = Details
policy_sidebar_meta_owner = Owner
policy_sidebar_meta_version = Version
policy_sidebar_meta_effective = Effective
policy_sidebar_meta_updated = Updated
policy_sidebar_meta_created = Created

# Sidebar version card
policy_sidebar_version_title = Version
policy_sidebar_version_id = Version ID
policy_sidebar_root_id = Root ID
policy_version_status_draft = Draft
policy_version_status_active = Active
policy_version_copy_id = Copy version ID
policy_version_id_copied = Version ID copied
policy_action_create_new_version = Create new version
policy_new_version_coming_soon = Create new version
policy_new_version_coming_soon_desc = This action will create a new draft version of this policy. Coming soon.

policy_tab_policy = Policy
policy_tab_impact = Impact
policy_tab_execution = Execution

# Impact tab sections
policy_impact_send_section = Send
policy_impact_send_description = Send this policy for acknowledgement or approval to a selected audience.
policy_impact_monitoring_section = Monitoring
policy_impact_monitoring_description = Track the status of sent acknowledgements and approvals.
policy_impact_open_approval_monitoring = Open approval monitoring
policy_impact_analysis_section = Analysis & Feedback

# Execution tab sections
policy_execution_experts_section = Linked Task Experts
policy_execution_flows_section = Linked Flow Templates

policy_feature_coming_soon = This capability will be enabled soon
policy_acknowledgements_placeholder = Start an acknowledgement campaign from this policy to track completion and follow-ups.
policy_experts_placeholder = Create or link Task Experts that use this policy as a knowledge source.
policy_flows_placeholder = Generate or link Flows derived from this policy.
policy_insights_placeholder = See execution signals and feedback, then create an improved policy version.

# Acknowledgements (Flow Engine)
policy_ack_title = Send for acknowledgement
policy_ack_description = Launch an acknowledgement workflow for a selected audience.
policy_ack_message_label = Message (optional)
policy_ack_message_placeholder = Add context for employees (what changed, what to do next)...
policy_ack_due_label = Due date (optional)
policy_ack_audience_label = Audience

policy_ack_cancel = Cancel
policy_ack_send = Send
policy_ack_sending = Sending...

policy_ack_success = Acknowledgement campaign started
policy_ack_error = Failed to start acknowledgement campaign
policy_ack_assignment_missing = Please select an audience
policy_ack_initiator_missing = Missing user identity (initiator)

policy_ack_template_name_prefix = Policy acknowledgement
policy_ack_template_description = Generated acknowledgement template for a policy
policy_ack_step_title = Acknowledge: { $title }
policy_ack_link_open_policy = Open policy
policy_ack_open_outbox = Open monitoring (Outbox)

# Common
retry = Retry

# Mark as policy (admin)
mark_as_policy_title = Mark as policy
mark_as_policy_description = Add policy metadata to this entry so it shows up in the Policy Hub and Policy Control Center.
mark_as_policy_action = Mark as policy
mark_as_policy_success = Entry marked as policy
mark_as_policy_error = Failed to mark entry as policy

# Policy experts
policy_experts_error_title = Failed to load Experts
policy_experts_count = { $count } { $count ->
    [one] Task Expert
   *[other] Task Experts
}
policy_experts_empty = No linked Experts yet. Create one to operationalize this policy.

# Create expert dialog
cancel = Cancel
policy_create_expert_dialog_title = Create Task Expert
policy_create_expert_name_label = Name
policy_create_expert_desc_label = Description
policy_create_expert_instructions_label = Custom instructions (optional)
policy_create_expert_instructions_placeholder = Add domain-specific guidance, constraints, or context...
policy_create_expert_knowledge_label = Knowledge source
policy_create_expert_submit = Create expert
policy_create_expert_success = Task Expert created
policy_create_expert_error = Failed to create expert
policy_create_expert_advanced = Open in expert mode for full configuration

# Policy executions
policy_executions_title = Recent executions (using this policy)
policy_executions_error_title = Failed to load executions
policy_executions_open_monitoring = Open monitoring
policy_executions_count = Runs: { $count }
policy_executions_empty = No executions found yet. Once Experts use this policy, runs will show up here.
policy_executions_tool_calls = { $count } tool calls
policy_executions_unknown_expert = Unknown expert
policy_executions_open = Open

# Policy flows
policy_flows_error_title = Failed to load Flows
policy_flows_count = { $count } { $count ->
    [one] Flow Template
   *[other] Flow Templates
}
policy_flows_empty = No linked Flow Templates yet. Generate one to operationalize this policy.
policy_flows_outdated = Outdated

policy_flows_generate_ai = Generate with AI
policy_flows_open_creator = Open Flow Creator
policy_flows_generating = Generating...
policy_flows_generate_success = Flow created
policy_flows_generate_error = Failed to generate Flow
policy_flows_generate_missing_policy = Policy content is missing
policy_flows_generated_name_prefix = Policy Flow
policy_flows_generated_description = Generated Flow derived from a policy
policy_flows_review_updates = Review updates
policy_flows_generate_update = Generate draft update
policy_flows_generating_update = Generating update...
policy_flows_update_draft_suffix = Update draft
policy_flows_update_success = Draft update created
policy_flows_update_error = Failed to generate draft update

# Policy insights
policy_insights_loading = Loading signals...
policy_insights_experts = Experts: { $count }
policy_insights_flows = Flows: { $count }
policy_insights_ack_campaigns = Ack campaigns: { $count }
policy_insights_executions = Executions: { $count }
policy_insights_open_monitoring = Open monitoring
policy_insights_open_executions = Open executions
policy_insights_analyze = Analyze & propose update
policy_insights_create_new_version = Create new version
policy_insights_recent_feedback = Recent feedback
policy_insights_loading_feedback = Loading feedback...
policy_insights_no_feedback = No feedback yet.
policy_insights_note = Tip: Link Experts and Flows to see richer insights here.

policy_translate = Translate
policy_translating = Translating…
policy_show_original = Show original

# Policy approval dialog
policy_approval_title = Send for Approval
policy_approval_description = Send this policy for review and approval. Approvers will receive a task in their inbox.
policy_approval_message_label = Message (optional)
policy_approval_message_placeholder = Add context or instructions for the approvers…
policy_approval_due_label = Due date (optional)
policy_approval_approvers_label = Approvers
policy_approval_link_open_policy = Open policy
policy_approval_cancel = Cancel
policy_approval_send = Send for Approval
policy_approval_sending = Sending…
policy_approval_success = Approval request sent
policy_approval_error = Failed to send approval request
policy_approval_initiator_missing = Cannot send for approval — user not identified.
policy_approval_assignment_missing = Please select at least one approver.
policy_approval_template_name_prefix = Policy Approval
policy_approval_template_description = Approval request for a policy document.
policy_approval_step_title = Review and approve: { $title }

policy_approval_status_pending = Approval pending
policy_approval_status_approved = Approved
policy_approval_status_rejected = Needs rework

policy_sidebar_approval_pending_hint = Approval is pending
policy_sidebar_approval_required_hint = Approval required first
policy_sidebar_rework_needed_hint = Rework needed - re-send for approval
policy_action_activate = Activate policy
policy_sidebar_action_activate_desc = Publish this policy after successful approval
policy_activate_success = Policy activated successfully
policy_activate_error = Failed to activate policy

policy_execution_workflows_section = Approvals & Acknowledgements
policy_kpi_expert_executions = Task Expert Runs
policy_kpi_flow_executions = Flow Runs
policy_execution_workflows_desc = Approval and acknowledgement workflows linked to this policy.
policy_workflows_count = { $count } { $count ->
    [one] Flow
   *[other] Flows
}
policy_workflows_open_outbox = Open outbox
policy_workflows_empty = No workflows have been started for this policy yet.
policy_workflows_no_user = Sign in to view policy workflows.
policy_workflows_type_approval = Approval
policy_workflows_type_acknowledgement = Acknowledgement

policy_generate_flow_dialog_title = Generating Flow
policy_generate_flow_choose_title = Generate Flow
policy_generate_flow_choose_desc = You already have linked Flows. Would you like to update an existing one or create a new Flow?
policy_generate_flow_update_version = Update to new version (currently v{ $version })
policy_generate_flow_create_new = Create new Flow
policy_generate_flow_create_new_desc = Generate a fresh Flow from this policy
policy_generate_flow_updated = Flow updated
policy_generate_flow_phase_loading = Checking linked Flows...
policy_generate_flow_phase_analyzing = Analyzing policy content...
policy_generate_flow_phase_generating = AI is building the workflow...
policy_generate_flow_phase_saving = Saving Flow...
policy_generate_flow_phase_done = Flow ready
policy_generate_flow_phase_error = Generation failed
policy_generate_flow_patience = This may take a moment
policy_generate_flow_open_creator = Open in Flow Creator
policy_generate_flow_close = Close
retry = Retry

policy_metric_linked_flow = Flow
policy_metric_linked_flows = Flows
policy_metric_linked_expert = Expert
policy_metric_linked_experts = Experts
