# Navigation
back_to_overview = Înapoi la prezentare generală
go_back = Înapoi

# Error states
content_id_required = ID-ul conținutului este necesar
content_not_found = Conținut negăsit
error_loading_content = Eroare la încărcarea conținutului
error_loading_answers = Eroare la încărcarea răspunsurilor

# Questions & Answers
add_answer = Adaugă răspuns
no_answers_yet = Încă nu există răspunsuri. Fii primul!
answered_by = răspuns de
answer = Răspuns
answers = Răspunsuri
best_answer = Cel mai bun răspuns
accepted_answer = Răspuns acceptat

# Comments
add_comment = Adaugă un comentariu...
comment = comentariu
comments = comentarii
no_comments_yet = Încă nu există comentarii
unknown = Necunoscut


# Policy Control Center
policy_badge = Politică
policy_version = Versiunea { $version }
policy_owner = Owner: { $owner }
policy_effective_range = Valabil: { $from } → { $to }
policy_effective_from = Valabil de la { $from }
policy_effective_until = Valabil pana la { $to }
policy_counter_acknowledgements = Confirmări: { $count }
policy_counter_experts = Experți conectați: { $count }
policy_counter_flows = Fluxuri conectate: { $count }

policy_action_send_ack = Trimite pentru confirmare
policy_action_send_approval = Trimite pentru aprobare
policy_action_create_expert = Creează Expert Task din politică
policy_action_generate_flow = Generează flux din politică
policy_action_send_ack_short = Trimite confirmare
policy_action_send_approval_short = Trimite pentru aprobare
policy_action_create_expert_short = Creaza Expert Task
policy_action_generate_flow_short = Genereaza flux
policy_action_ask_everyai = Întreabă EveryAI

policy_last_updated = Ultima actualizare
policy_sidebar_active_since = Activ de
policy_metric_execution = Executie
policy_metric_executions = Executii
policy_metric_version = Versiune
policy_metric_versions = Versiuni
policy_metric_day_active = Zi activ
policy_metric_days_active = Zile activ
policy_unit_year = an
policy_unit_years = ani
policy_unit_month = luna
policy_unit_months = luni
policy_unit_day = zi
policy_unit_days = zile

# Sidebar
policy_sidebar_impact = Impact
policy_sidebar_signal_acks = Campanii
policy_sidebar_signal_experts = Experti
policy_sidebar_signal_flows = Fluxuri
policy_sidebar_signal_runs = Executii
policy_sidebar_signal_approvals = Aprobari
policy_sidebar_actions = Actiuni
policy_sidebar_action_ack_desc = Porneste un flux de confirmare pentru un public selectat.
policy_sidebar_action_approval_desc = Trimite aceasta politica pentru revizuire si aprobare de catre aprobatori desemnati.
policy_sidebar_action_expert_desc = Creaza un Expert Task cu aceasta politica drept sursa de cunostinte.
policy_sidebar_action_flow_desc = Genereaza sau conecteaza fluxuri de automatizare derivate din aceasta politica.
policy_sidebar_action_everyai_desc = Solicita EveryAI sa analizeze si sa propuna imbunatatiri.
policy_sidebar_details = Detalii
policy_sidebar_meta_owner = Responsabil
policy_sidebar_meta_version = Versiune
policy_sidebar_meta_effective = Valabil
policy_sidebar_meta_updated = Actualizat
policy_sidebar_meta_created = Creat

# Sidebar card versiune
policy_sidebar_version_title = Versiune
policy_sidebar_version_id = ID versiune
policy_sidebar_root_id = ID radacina
policy_version_status_draft = Ciorna
policy_version_status_active = Activ
policy_version_copy_id = Copiaza ID versiune
policy_version_id_copied = ID versiune copiat
policy_action_create_new_version = Creaza versiune noua
policy_new_version_coming_soon = Creaza versiune noua
policy_new_version_coming_soon_desc = Aceasta actiune va crea o noua ciorna a acestei politici. In curand.

policy_tab_policy = Politică
policy_tab_impact = Impact
policy_tab_execution = Executie

# Sectiuni tab Impact
policy_impact_send_section = Trimite
policy_impact_send_description = Trimite aceasta politica pentru confirmare sau aprobare catre un public selectat.
policy_impact_monitoring_section = Monitorizare
policy_impact_monitoring_description = Urmareste statusul confirmarilor si aprobarilor trimise.
policy_impact_open_approval_monitoring = Deschide monitorizarea aprobarilor
policy_impact_analysis_section = Analiza & Feedback

# Sectiuni tab Executie
policy_execution_experts_section = Experti Task asociati
policy_execution_flows_section = Flow Templates asociate

policy_feature_coming_soon = Această capabilitate va fi disponibilă în curând
policy_acknowledgements_placeholder = Pornește o campanie de confirmare din această politică pentru a urmări finalizarea și follow-up-urile.
policy_experts_placeholder = Creează sau conectează experți Task care folosesc această politică drept sursă de cunoștințe.
policy_flows_placeholder = Genereaza sau conecteaza Fluxuri derivate din aceasta politica.
policy_insights_placeholder = Vezi semnalele de execuție și feedback-ul, apoi creează o versiune îmbunătățită a politicii.

# Acknowledgements (Flow Engine)
policy_ack_title = Trimite pentru confirmare
policy_ack_description = Pornește un flux de confirmare pentru o audiență selectată.
policy_ack_message_label = Mesaj (opțional)
policy_ack_message_placeholder = Adaugă context pentru angajați (ce s-a schimbat, ce urmează)...
policy_ack_due_label = Data scadenței (opțional)
policy_ack_audience_label = Audiență

policy_ack_cancel = Anulează
policy_ack_send = Trimite
policy_ack_sending = Se trimite...

policy_ack_success = Campania de confirmare a pornit
policy_ack_error = Nu s-a putut porni campania de confirmare
policy_ack_assignment_missing = Te rog selectează o audiență
policy_ack_initiator_missing = Lipsește identitatea utilizatorului (inițiator)

policy_ack_template_name_prefix = Confirmare politică
policy_ack_template_description = Șablon de confirmare generat pentru o politică
policy_ack_step_title = Confirmă: { $title }
policy_ack_link_open_policy = Deschide politica
policy_ack_open_outbox = Deschide monitorizarea (Outbox)

# Common
retry = Încearcă din nou

# Mark as policy (admin)
mark_as_policy_title = Marcheaza ca politica
mark_as_policy_description = Adauga metadate de politica acestui entry pentru a aparea in Policy Hub si Policy Control Center.
mark_as_policy_action = Marcheaza ca politica
mark_as_policy_success = Entry marcat ca politica
mark_as_policy_error = Nu s-a putut marca entry-ul ca politica

# Policy experts
policy_experts_error_title = Nu s-au putut încărca experții
policy_experts_count = { $count } { $count ->
    [one] Agent
   *[other] Agenți
}
policy_experts_empty = Încă nu există experți conectați. Creează unul pentru a operaționaliza această politică.

# Create expert dialog
cancel = Anulare
policy_create_expert_dialog_title = Creează expert de sarcini
policy_create_expert_name_label = Nume
policy_create_expert_desc_label = Descriere
policy_create_expert_instructions_label = Instrucțiuni personalizate (opțional)
policy_create_expert_instructions_placeholder = Adaugă orientări specifice domeniului, restricții sau context...
policy_create_expert_knowledge_label = Sursă de cunoștințe
policy_create_expert_submit = Creează expert
policy_create_expert_success = Expertul a fost creat
policy_create_expert_error = Nu s-a putut crea expertul
policy_create_expert_advanced = Deschide în modul expert pentru configurare completă

# Policy executions
policy_executions_title = Executii recente (folosind aceasta politica)
policy_executions_error_title = Nu s-au putut incarca executiile
policy_executions_open_monitoring = Deschide monitorizarea
policy_executions_count = Rulari: { $count }
policy_executions_empty = Nu exista executii inca. Dupa ce expertii folosesc aceasta politica, vor aparea aici.
policy_executions_tool_calls = { $count } tool calls
policy_executions_unknown_expert = Expert necunoscut
policy_executions_open = Deschide

# Policy flows
policy_flows_error_title = Nu s-au putut încărca fluxurile
policy_flows_count = { $count } { $count ->
    [one] Flow Template
   *[other] Flow Templates
}
policy_flows_empty = Încă nu există Flow Templates conectate. Generează unul pentru a operaționaliza această politică.
policy_flows_outdated = Învechit

policy_flows_generate_missing_policy = Politica nu este disponibilă
policy_flows_review_updates = Revizuiește actualizările
policy_flows_generate_update = Generează actualizare (draft)

# Policy insights
policy_insights_loading = Se încarcă semnalele...
policy_insights_experts = Experți: { $count }
policy_insights_flows = Fluxuri: { $count }
policy_insights_ack_campaigns = Campanii de confirmare: { $count }
policy_insights_executions = Executii: { $count }
policy_insights_open_monitoring = Deschide monitorizarea
policy_insights_open_executions = Deschide executiile
policy_insights_analyze = Analizează & propune actualizare
policy_insights_create_new_version = Creează versiune nouă
policy_insights_recent_feedback = Feedback recent
policy_insights_loading_feedback = Se încarcă feedback-ul...
policy_insights_no_feedback = Încă nu există feedback.
policy_insights_note = Sfat: Conectează experți și fluxuri pentru insight-uri mai bogate aici.

policy_translate = Traduce
policy_translating = Se traduce…
policy_show_original = Arată originalul

# Dialog aprobare politica
policy_approval_title = Trimite pentru aprobare
policy_approval_description = Trimite aceasta politica pentru revizuire si aprobare. Aprobatorii vor primi o sarcina in inbox.
policy_approval_message_label = Mesaj (optional)
policy_approval_message_placeholder = Adauga context sau instructiuni pentru aprobatori…
policy_approval_due_label = Data scadenței (opțional)
policy_approval_approvers_label = Aprobatori
policy_approval_link_open_policy = Deschide politica
policy_approval_cancel = Anuleaza
policy_approval_send = Trimite pentru aprobare
policy_approval_sending = Se trimite…
policy_approval_success = Cererea de aprobare a fost trimisa
policy_approval_error = Cererea de aprobare nu a putut fi trimisa
policy_approval_initiator_missing = Nu se poate trimite pentru aprobare — utilizator neidentificat.
policy_approval_assignment_missing = Selectati cel putin un aprobator.
policy_approval_template_name_prefix = Aprobare politica
policy_approval_template_description = Cerere de aprobare pentru un document de politica.
policy_approval_step_title = Revizuiti si aprobati: { $title }

policy_approval_status_pending = Aprobare în așteptare
policy_approval_status_approved = Aprobat
policy_approval_status_rejected = Necesită revizuire

policy_sidebar_approval_pending_hint = Aprobare in asteptare
policy_sidebar_approval_required_hint = Aprobare necesara mai intai
policy_sidebar_rework_needed_hint = Necesita revizuire - retrimite pentru aprobare
policy_action_activate = Activeaza politica
policy_sidebar_action_activate_desc = Publica aceasta politica dupa aprobarea cu succes
policy_activate_success = Politica activata cu succes
policy_activate_error = Nu s-a putut activa politica

policy_execution_workflows_section = Aprobari si confirmari
policy_kpi_expert_executions = Executii experti
policy_kpi_flow_executions = Flow Runs
policy_execution_workflows_desc = Fluxuri de aprobare si confirmare asociate acestei politici.
policy_workflows_count = { $count } { $count ->
    [one] Flow
   *[other] Flows
}
policy_workflows_open_outbox = Deschide casuta de iesire
policy_workflows_empty = Nu au fost pornite fluxuri de lucru pentru aceasta politica.
policy_workflows_no_user = Autentificati-va pentru a vedea fluxurile de lucru.
policy_workflows_type_approval = Aprobare
policy_workflows_type_acknowledgement = Confirmare

policy_metric_linked_flow = Flux
policy_metric_linked_flows = Fluxuri
policy_metric_linked_expert = Expert
policy_metric_linked_experts = Experti
