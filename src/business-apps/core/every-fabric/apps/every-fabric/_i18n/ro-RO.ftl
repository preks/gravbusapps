enterprise-agent-title = { -platform-ai-agent-product.label }
enterprise-agent-subtitle = IA ta care planifică, cercetează și execută — în fundal

enterprise-agent-nav-chat = Chat
enterprise-agent-nav-activity = Activitate
enterprise-agent-nav-memory = Memorie
enterprise-agent-nav-trace = Trace

enterprise-agent-new-session = Sarcină nouă
enterprise-agent-input-placeholder = Descrie-ți obiectivul. Agentul se ocupă de rest.
enterprise-agent-send = Rulează
enterprise-agent-stop = Oprește
enterprise-agent-reply = Răspuns

enterprise-agent-status-running = Lucrează…
enterprise-agent-status-completed = Finalizat
enterprise-agent-status-failed = Eșuat
enterprise-agent-status-waiting = Așteaptă răspunsul tău

enterprise-agent-plan-title = Plan
enterprise-agent-plan-progress = { $done } din { $total } pași
enterprise-agent-plan-current = În curs: { $step }

enterprise-agent-tool-call = { $tool }
enterprise-agent-tool-cached = (din cache)
enterprise-agent-tool-duration = { $ms }ms

enterprise-agent-reflection-complete = Verificarea calității a trecut
enterprise-agent-reflection-gaps = Agentul a găsit lacune și continuă…

enterprise-agent-interrupt-title = Agentul are nevoie de răspunsul tău
enterprise-agent-interrupt-reply-placeholder = Răspunsul tău…

enterprise-agent-final-summary = Rezumat
enterprise-agent-final-findings = Constatări
enterprise-agent-final-actions = Acțiuni efectuate
enterprise-agent-final-recommendations = Recomandări
enterprise-agent-final-cost = Cost: ${ $cost }
enterprise-agent-final-duration = { $duration }
enterprise-agent-final-export = Exportă

enterprise-agent-memory-this-session = Această sesiune
enterprise-agent-memory-past = Din sesiuni anterioare
enterprise-agent-memory-workspace = Cunoștințe workspace
enterprise-agent-memory-add-placeholder = Spune-i agentului ceva de reținut…

enterprise-agent-welcome-heading = Ce ai dori să realizezi?
enterprise-agent-welcome-subtitle = Descrie orice obiectiv. Agentul planifică, cercetează și execută — chiar și în timp ce lucrezi la altceva.

enterprise-agent-background-running = { $count ->
    [one] { $count } agent lucrează în fundal
   *[other] { $count } agenți lucrează în fundal
}
enterprise-agent-background-waiting = Agentul așteaptă răspunsul tău

shell-session-load-error = Această sesiune nu a putut fi încărcată
shell-try-again = Încearcă din nou
shell-back-to-landing = Înapoi la pagina principală
shell-opening-session = Se deschide sesiunea...
shell-session-not-found = Sesiunea nu a fost găsită

# Centralized product / category nouns
brand-attribution = NEWWORK { -platform-ai-agent-product.label-plural }
brand-product-plural = { -platform-ai-agent-product.label-plural }
nav-digital-workforce = { -platform-ai-agent-fleet.label }
workforce-hero-title = { -platform-ai-agent-fleet.label }
workforce-label = { -platform-ai-agent-fleet.label }
skills-screen-title = { -platform-ai-agent-product.label }
trace-explorer-agent-mesh = { -platform-ai-agent-network.label }
# Sidebar-only labels — override generic terminology in the left island.
sidebar-brand-product = EveryFabric
sidebar-nav-agent-os = { -platform-ai-agent-network.label }
sidebar-nav-memory = Memorie
workspace-open-agent-os-aria = Deschide { -platform-ai-agent-network.label }
agents-specialist-description = Specialiști potriviți cu sarcina pe care { -platform-ai-agent-product.label } îi activează automat în funcție de cererea ta. Nu pot fi configurați sau rulați direct.
agent-config-runs-live-in-workforce = Cazurile, rulările și trace-urile pentru acest Worker se află în { -platform-ai-agent-fleet.label }.
agent-config-view-activity-in-workforce = Vezi activitatea live în { -platform-ai-agent-fleet.label }

# Workforce hero
workforce-hero-subtitle = Workerii tăi guvernați. Reacționează la declanșatoare, respectă politicile, folosesc abilități și escaladează către oameni când e nevoie.
workforce-hero-working-now = { $count } lucrează acum
workforce-hero-test-webhook-enabled-tooltip = Declanșează un webhook cu conținut de mesaj personalizat
workforce-hero-test-webhook-disabled-tooltip = Niciun agent nu are un declanșator webhook activat
workforce-hero-test-webhook = Testează webhook
workforce-hero-hire = Angajează
workforce-kpi-active = Agenți activi
workforce-kpi-paused = În pauză
workforce-kpi-triggers = Declanșatoare active
workforce-kpi-credits = Credite / 7z

# Workforce filters
workforce-filters-search-placeholder = Caută după nume, rol, departament…
workforce-filters-aria-label = Filtrează agenții workforce
workforce-filter-all = Toate
workforce-filter-active = Activ
workforce-filter-paused = În pauză

# Live status
workforce-live-pill-default = Live

# Common actions
action-close = Închide
action-cancel = Anulează
action-save = Salvează
action-working = Lucrează…
action-reset = Resetează
action-add = Adaugă

# Hire options
hire-options-title = Angajează un agent workforce
hire-options-subtitle = Începe de la un agent gata făcut sau creează-l pe al tău.
hire-options-marketplace-title = Angajează din marketplace
hire-options-marketplace-description = Răsfoiește agenți gata făcuți cu abilități, instrumente și guvernanță incluse.
hire-options-create-title = Creează de la zero
hire-options-create-description = Definește un agent nou-nouț cu rol, instrucțiuni și autonomie proprii.

# Value scoreboard
value-scoreboard-title = Valoare de business
value-scoreboard-window = săptămâna aceasta
value-scoreboard-estimated-note = „Estimat” folosește ipotezele de valoare ale workspace-ului
value-kpi-cases = Cazuri gestionate
value-kpi-time-saved = Timp economisit
value-kpi-sla = Atingere SLA
value-kpi-deflection = Rată de deflectare
value-kpi-cost = Cost pe caz
value-kpi-governance = Acoperire guvernanță
value-hint-runs-total = { $runs } rulări în total
value-hint-baseline = ~{ $minutes } min/caz valoare de referință
value-hint-sla = { $under }/{ $measured } · { $target }
value-hint-deflection = { $autonomous } autonome / { $cases } cazuri
value-hint-cost = { $cost } cheltuiți
value-hint-governance = { $audited }/{ $runs } auditate · { $stops } opriri guardrail
value-sla-target-minutes = { $minutes } min țintă
value-sla-target-seconds = { $seconds } sec țintă
value-kpi-estimated = Estimat
value-kpi-estimated-tooltip = Derivat din ipotezele de valoare ale workspace-ului

# Run source
source-manual = Rulare manuală
source-schedule = Programat
source-webhook = Webhook
source-inbound-email = E-mail primit
source-unknown = Sursă necunoscută

# Command center
command-center-title = Centru de comandă
command-center-empty = Nimic în desfășurare acum. Rulările noi vor apărea aici pe măsură ce încep și se termină.
command-center-stat-running = în curs
command-center-stat-waiting = în așteptare
command-center-stat-pending = în coadă
command-center-done-today = finalizate azi

# Run detail header
run-detail-back = Înapoi
run-detail-refreshing = Se actualizează
run-detail-fact-agent = Agent
run-detail-fact-trigger = Declanșator
run-detail-fact-started = Început
run-detail-fact-duration = Durată
run-detail-fact-credits = Credite

# Run detail screen
run-detail-loading = Se încarcă rularea…
run-detail-not-found = Rularea nu a fost găsită.
run-detail-load-error = Detaliile rulării nu au putut fi încărcate.

# Run detail tabs
run-tab-overview = Prezentare generală
run-tab-actions = Acțiuni și înregistrări
run-tab-flows = Flow-uri
run-tab-diagnostics = Diagnostic

# Overview tab
run-overview-task = Sarcină
run-overview-empty-input = (gol)
run-overview-awaiting-approval = În așteptarea aprobării umane
run-overview-signin-required = Este necesară autentificarea pentru a examina și trimite acest draft de e-mail.
run-overview-subject = Subiect:
run-overview-output = Rezultat
run-overview-no-output = (încă niciun rezultat)
run-overview-artifacts = Artefacte

# Actions & records tab
run-actions-title = Înregistrări și acțiuni
run-actions-empty = Această rulare nu a atins nicio înregistrare.

# Flows tab
run-flows-empty = Această rulare nu a declanșat niciun workflow.
run-flows-view-map = Hartă
run-flows-view-list = Listă
run-flows-view-timeline = Cronologie

# Diagnostics tab
run-diag-trace = Trace
run-diag-cost = Cost
run-diag-credits = { $credits } credite Newwork
run-diag-total-tokens = { $tokens } token în total

# Run context links
run-context-records = Înregistrări
run-context-policies = Politici
run-context-open = Deschide { $label }: { $display }

# Config section shell
section-unsaved = Modificări nesalvate
section-saved = Salvat
section-saving = Se salvează…

# Autonomy section
autonomy-title = Autonomie
autonomy-description = Cât de mult poate decide agentul singur + instrucțiunile de sistem personalizate pe care le urmează.
autonomy-aria-level = Nivel de autonomie
autonomy-opt-draft-only-label = Asistiv
autonomy-opt-draft-only-hint = Caută, rezumă, clasifică și redactează. Nu face modificări în sistem.
autonomy-opt-approval-label = Necesită aprobare
autonomy-opt-approval-hint = Pregătește acțiuni și le trimite unui om înainte de execuție.
autonomy-opt-delegated-label = Delegat
autonomy-opt-delegated-hint = Execută acțiuni cu risc redus în limitele stabilite și escaladează excepțiile.
autonomy-opt-autonomous-label = Autonom
autonomy-opt-autonomous-hint = Rulează cap-coadă în limite validate. Necesită cel puțin un canal de escaladare.
autonomy-instructions-label = Instrucțiuni
autonomy-instructions-suffix = (adăugate la promptul de sistem)

# Budget section
budget-title = Buget
budget-description = Limite soft de credite aplicate la rulare. 1 credit = 1.000 de tokenuri în total.
budget-daily = Credite zilnice
budget-weekly = Credite săptămânale
budget-monthly = Credite lunare
budget-no-limit = Fără limită
budget-when-exceeded = La depășire
budget-aria-exceeded = Comportament la depășirea bugetului
budget-opt-pause-label = Pauză
budget-opt-pause-hint = Blochează rulările noi odată ce bugetul este epuizat.
budget-opt-escalate-label = Escaladează
budget-opt-escalate-hint = Direcționează următoarea rulare către owner-ul uman.
budget-opt-warn-label = Doar avertizare
budget-opt-warn-hint = Înregistrează un avertisment, dar continuă rularea.

# Escalation section
escalation-title = Escaladare
escalation-description = Cum predă agentul munca înapoi oamenilor. Agenții complet autonomi și bugetele „escaladează” necesită cel puțin un canal.
escalation-owner-label = ID utilizator owner
escalation-queue-label = Coadă de tichete
escalation-queue-placeholder = ex. ops-tier-1
escalation-notify-label = E-mailuri de notificare
escalation-email-placeholder = ops@acme.com
escalation-confidence-label = Prag de încredere ({ $value })
escalation-confidence-hint = Agentul escaladează dacă încrederea autoevaluată pentru următoarea acțiune scade sub acest prag.
escalation-blocked-label = Intenții blocate
escalation-intent-placeholder = ex. cancel_contract
escalation-remove = Elimină { $value }

# Triggers section
trigger-section-title = Declanșatoare
trigger-section-desc = Ce face acest agent să pornească fără un chat.
trigger-type-manual = Manual
trigger-type-manual-hint = Operatorul pornește agentul din interfață.
trigger-type-schedule = Programare
trigger-type-schedule-hint = Rulează după un program cron sau interval fix.
trigger-type-webhook = Webhook
trigger-type-webhook-hint = Un sistem extern trimite POST pentru a porni o rulare.
trigger-type-inbound-email = E-mail primit
trigger-type-inbound-email-hint = E-mailurile noi către o căsuță pornesc o rulare.
trigger-new = Declanșator nou
trigger-type-aria = Tip de declanșator
trigger-name-placeholder = Nume opțional
trigger-cron-placeholder = cron ex. 0 8 * * MON
trigger-interval-placeholder = sau interval (minute)
trigger-subject-filter-title = Filtru subiect (opțional)
trigger-subject-filter-desc = Redirecționează doar e-mailurile al căror subiect corespunde. Lasă gol pentru a redirecționa toate.
trigger-subject-filter-mode-aria = Mod filtru subiect
trigger-subject-mode-contains = Conține
trigger-subject-mode-prefix = Începe cu
trigger-subject-mode-regex = Regex
trigger-case-sensitive = Sensibil la majuscule
trigger-subject-patterns-placeholder = Un tipar pe linie, ex. ticket, [support]
trigger-secret-placeholder = Secret partajat opțional
trigger-create-error = Crearea declanșatorului a eșuat.
trigger-create-submit = Creează declanșator
trigger-creating = Se creează…
trigger-empty = Niciun declanșator încă — adaugă un program, o căsuță poștală sau un webhook pentru ca acest agent să devină proactiv.
trigger-disable = Dezactivează
trigger-enable = Activează
trigger-delete-aria = Șterge declanșatorul { $name }
trigger-webhook-url-missing = URL-ul webhook nu a fost furnizat de backend. Reîncarcă declanșatorul pentru a-l completa.
trigger-webhook-url-label = URL webhook
trigger-test = Testează
trigger-webhook-post-secret = Trimite un corp JSON cu antetul X-Workforce-Signature: sha256=<HMAC-SHA256 al corpului folosind secretul tău>.
trigger-webhook-post-nosecret = Trimite un corp JSON. Opțional: configurează un secret pentru a cere un antet X-Workforce-Signature.
trigger-no-mailbox-configured = Nicio căsuță poștală configurată.
trigger-inbound-mailbox-label = Căsuță poștală de intrare
trigger-inbound-forward-hint = Redirecționează mesajele aici de la furnizorul tău de e-mail. Routerul pornește agentul o dată pentru fiecare destinatar potrivit.
trigger-last-fired = Ultima declanșare { $time }
trigger-copy-aria = Copiază în clipboard
trigger-mode-contains = conține
trigger-mode-prefix = începe cu
trigger-mode-regex = corespunde
trigger-forwards-all = redirecționează toate
trigger-filter-summary = filtru: { $mode } { $patterns }
trigger-cfg-cron = cron: { $cron }
trigger-cfg-interval = la fiecare { $minutes } min
trigger-cfg-not-configured = neconfigurat
trigger-cfg-no-mailbox = nicio căsuță
trigger-cfg-secret-set = secret setat
trigger-cfg-no-secret = niciun secret
trigger-err-schedule = Declanșatoarele programate au nevoie fie de 'cron', fie de 'interval_minutes'.
trigger-err-interval = 'interval_minutes' trebuie să fie un număr întreg pozitiv.
trigger-err-mailbox = Selectează o căsuță poștală conectată pentru declanșatoarele de e-mail primit.

# Inbound mailbox picker
mailbox-signin-required = Autentifică-te pentru a încărca căsuțele poștale conectate.
mailbox-load-error = Încărcarea căsuțelor poștale conectate a eșuat.
mailbox-select-aria = Căsuță poștală conectată
mailbox-loading = Se încarcă căsuțele poștale…
mailbox-select-placeholder = Selectează o căsuță poștală conectată
mailbox-refresh-aria = Reîmprospătează căsuțele poștale conectate
mailbox-empty-prefix = Nicio căsuță poștală conectată încă.
mailbox-connect-link = Conectează o căsuță poștală în aplicația Email
mailbox-empty-suffix = apoi reîmprospătează.
mailbox-forwarding-hint = Redirecționarea este dezactivată pentru această căsuță. Activează "Redirecționează către { -platform-ai-agent-fleet.label }" pentru ea în aplicația Email, altfel acest declanșator nu va primi e-mailuri.
mailbox-footer-hint = Pot fi folosite doar căsuțele poștale pe care le-ai conectat. Adresa este preluată din contul verificat.

# Common: remove chip / item
action-remove = Elimină { $value }

# Role & ownership fields
roleown-role-label = Rol
roleown-department-label = Departament
roleown-owner-label = ID utilizator proprietar
roleown-owner-placeholder = Persoana responsabilă pentru escaladări
roleown-section-title = Rol și proprietate
roleown-section-desc = Rolul, departamentul și persoana responsabilă pentru { -platform-ai-agent.inline }.

# Identity section
identity-section-title = Identitate
identity-section-desc = Cum este identificat acest { -platform-ai-agent.inline } în implementările sale.
identity-identifier-label = Identificator (doar citire)
identity-display-name-label = Nume afișat
identity-description-label = Descriere

# Orgchart registration section
orgchart-section-title = Identitate în organigramă
orgchart-section-desc = Atașează acest { -platform-ai-agent.inline } la organigramă. { -platform-ai-agent.label-plural } înregistrate rulează lucrările primite și programate sub propria identitate, în loc de contul de serviciu partajat.
orgchart-err-503 = Crearea utilizatorilor Keycloak este dezactivată pe acest tenant (KEYCLOAK_USER_CREATION_ENABLED). Creează utilizatorul manual și lipește ID-ul său mai jos.
orgchart-err-409 = Un utilizator Keycloak sau un angajat cu această identitate există deja. Lipește ID-ul utilizatorului Keycloak existent mai jos pentru a-l lega în schimb.
orgchart-unlink-error = Deconectarea identității din organigramă a eșuat
orgchart-unit-members-count = { $count ->
    [one] { $count } membru
   *[other] { $count } membri
}
orgchart-registered-badge = Înregistrat în organigramă
orgchart-org-unit-label = Unitate org.:
orgchart-employee-label = Angajat:
orgchart-keycloak-label = Utilizator Keycloak:
orgchart-since-label = Din:
orgchart-first-name = Prenume
orgchart-last-name = Nume
orgchart-job-position = Funcție
orgchart-job-position-placeholder = ex. Agent serviciu clienți
orgchart-org-unit = Unitate organizațională
orgchart-org-unit-placeholder = Implicit: echipa Asistenți virtuali
orgchart-org-unit-search = Caută unități organizaționale…
orgchart-org-unit-empty = Nu s-au găsit unități organizaționale
orgchart-org-unit-hint = Unde apare { -platform-ai-agent.inline } în organigramă. Lasă gol pentru a folosi echipa implicită "Asistenți virtuali".
orgchart-existing-user-id = ID utilizator Keycloak existent (opțional)
orgchart-existing-user-id-placeholder = Lasă gol pentru a crea automat un utilizator nou
orgchart-unlink = Deconectează identitatea
orgchart-registering = Se înregistrează…
orgchart-register = Înregistrează în organigramă

# Knowledge section
knowledge-section-title = Cunoștințe
knowledge-section-desc = Politici, contracte și alte referințe pe care { -platform-ai-agent-product.inline } le poate citi în timpul lucrului.
knowledge-source-policy = Politică
knowledge-source-contract = Contract
knowledge-source-knowledge = Sursă de cunoștințe
knowledge-source-skill = Abilitate
knowledge-source-url = URL
knowledge-source-type-aria = Tip sursă de cunoștințe
knowledge-ref-id-placeholder = ID referință sau URL
knowledge-title-placeholder = Titlu opțional
knowledge-empty = Încă nicio referință de cunoștințe.
knowledge-open-policy = Deschide politica într-o filă nouă (ID: { $id })

# Skills & policies section
skills-section-title = Abilități și politici
skills-section-desc = Abilități și politici de intranet atașate acestui { -platform-ai-agent-product.inline }.
skills-resolving = Se rezolvă detaliile abilității…
skills-attached-tools = Instrumente atașate
skills-no-tools = Această abilitate nu atașează niciun instrument.
skills-label = Abilități
skills-skill-id-placeholder = ID abilitate
skills-policies-desc = Atașează politici de intranet pe care { -platform-ai-agent-product.inline } le poate citi la rulare. Valorile implicite ale spațiului de lucru sunt moștenite automat; elimină-le pe cele care nu sunt relevante pentru acest { -platform-ai-agent-product.inline }.

# Customer 360 surface section
customer360-section-title = Customer 360
customer360-section-desc = Afișează rulările de e-mail primite ale acestui { -platform-ai-agent-product.inline } în tabul CRM Customer 360 Primite, asociate clientului care a scris.
customer360-toggle-title = Afișează rulările primite în Customer 360
customer360-toggle-desc = E-mailurile primite pe care le gestionează acest { -platform-ai-agent-product.inline } apar în fluxul Customer 360 Primite. Lasă dezactivat pentru { -platform-ai-agent-product.inline-plural } ale căror e-mailuri nu trebuie să apară în CRM.

# Agent tile / deck
tile-status-active = Activ
tile-status-paused = Întrerupt
tile-best-match = Cea mai bună potrivire
tile-working = Lucrează
tile-specialist-fallback = Specialist workforce
tile-no-description = Încă nu există descriere.
tile-open-agent = Deschide { $name }
tile-triggers-stat = { $active }/{ $total } declanșatoare
tile-last-run-stat = Ultima rulare { $time }
tile-credits-stat = { $credits } credite / 7 zile
tile-pause = Întrerupe
tile-pausing = Se întrerupe…
tile-activate = Activează
tile-activating = Se activează…
tile-archive-aria = Elimină din workforce

# Recent runs panel
recent-runs-title = Rulări recente
recent-runs-desc = Cele mai recente sesiuni deep-agent atribuite acestui { -platform-ai-agent-product.inline }. Apasă pe o rulare pentru trace-ul complet.
recent-runs-refresh-aria = Reîmprospătează rulările
recent-runs-refresh = Reîmprospătează
recent-runs-loading = Se încarcă rulările…
recent-runs-empty-title = Încă nicio rulare
recent-runs-empty-desc = Pornește o rulare de test manuală sau așteaptă ca un declanșator să programeze una.
recent-runs-empty-input = (intrare goală)
recent-runs-credits = { $credits } credite

# Agent detail screen
detail-back-aria = Înapoi la workforce
detail-loading-title = Se încarcă agentul…
detail-no-role = Niciun rol setat
detail-publish-marketplace = Publică în tenant
detail-test-run = Rulare de test
detail-tab-overview = Prezentare generală
detail-tab-runs = Rulări
detail-tab-inbox = Inbox
detail-tab-trace = Trace
detail-tab-config = Configurare
detail-dismiss = Închide
detail-loading-agent = Se încarcă agentul workforce…
detail-webhook-fail = Trimiterea webhook a eșuat.
detail-publish-fail = Publicarea a eșuat

# Test run modal
testrun-title = Rulare de test pentru { $name }
testrun-desc = Pornește o rulare manuală folosind configurația curentă a { -platform-ai-agent-product.inline }. Util pentru a repeta un job programat sau a verifica instrucțiunile înainte de live.
testrun-demo-email = E-mail primit exemplu
testrun-custom-task = Sarcină personalizată (scrie mai jos)
testrun-expected = Așteptat: { $path }
testrun-demo-hint = Alege unul dintre scenariile demo de asigurări pentru a precompleta sarcina cu Subiect, De la, Către și corp.
testrun-task = Sarcină
testrun-task-placeholder = ex. „Triază cele mai recente întrebări de poliță neatribuite din coada de suport și redactează un răspuns."
testrun-task-hint = Ce ar trebui să facă { -platform-ai-agent-product.inline } acum? Va folosi instrucțiunile, abilitățile și politicile sale.
testrun-trigger-label = Atribuie declanșatorului (opțional)
testrun-trigger-none = Test ad-hoc (fără declanșator)
testrun-trigger-hint = Atribuie această rulare unui declanșator real ca să apară în istoricul lui.
testrun-starting = Se pornește…
testrun-submit = Rulează acum

# Hire modal
hire-title-default = Activează un Worker
hire-subtitle-default = Activează un Worker proactiv. Poți configura declanșatoare, abilități, escaladare și buget în pasul următor.
hire-display-name = Nume afișat
hire-name-placeholder = ex. Specialist triaj daune
hire-stored-as = Stocat ca
hire-name-hint = Litere, cifre și spații sunt în regulă — vom converti acest lucru într-un identificator.
hire-role = Rol
hire-role-placeholder = ex. Agent daune
hire-department = Departament
hire-department-placeholder = ex. Insurance Ops
hire-short-description = Descriere scurtă
hire-description-placeholder = O propoziție pe care echipa o va vedea pe cardul workforce
hire-instructions = Instrucțiuni
hire-instructions-optional = (opțional)
hire-instructions-placeholder = Cum ar trebui să se comporte { -platform-ai-agent-product.inline }? Ex. Verifică întotdeauna biblioteca de politici înainte de a răspunde. Escaladează la un om dacă încrederea < 0,7.
hire-autonomy = Autonomie
hire-autonomy-aria = Nivel de autonomie
hire-creating = Se angajează…
hire-submit = Angajează { -platform-ai-agent-product.inline }
hire-error = Agentul workforce nu a putut fi angajat.

# Agent deck
deck-best-matches-for = Cele mai bune potriviri pentru „{ $query }“

# Overview tab
overview-kpi-today = Astăzi
overview-kpi-week = Săptămâna aceasta
overview-kpi-month = Luna aceasta
overview-kpi-credits = credite
overview-kpi-runs = { $count ->
    [one] { $count } rulare
   *[other] { $count } rulări
}
overview-view-all-runs = Vezi toate rulările

# Runs tab
runs-search-placeholder = Caută subiect sau expeditor…
runs-filter-all-statuses = Toate statusurile
runs-filter-running = În curs
runs-filter-completed = Finalizat
runs-filter-failed = Eșuat
runs-filter-cancelled = Anulat
runs-filter-waiting-human = Așteaptă om
runs-filter-all-sources = Toate sursele
runs-filter-manual = Manual
runs-filter-schedule = Programat
runs-filter-webhook = Webhook
runs-filter-inbound-email = E-mail primit
runs-refresh = Reîmprospătează
runs-loading = Se încarcă rulările…
runs-empty = Nici o rulare nu corespunde acestor filtre.
runs-page = Pagina { $page } din { $totalPages } · { $total } total
runs-prev = Înapoi
runs-next = Înainte
runs-row-credits = { $credits } credite

# Inbox tab
inbox-search-placeholder = Caută subiect sau expeditor…
inbox-loading = Se încarcă inboxul…
inbox-empty-title = Încă nu există e-mailuri primite pentru acest { -platform-ai-agent-product.inline }.
inbox-empty-desc = Configurează un declanșator de e-mail primit și redirecționează mesajele către acea cutie poștală pentru a porni coada.
inbox-col-from = De la
inbox-col-subject = Subiect
inbox-col-received = Primit
inbox-col-status = Status
inbox-col-credits = Credite
inbox-open-run-aria = Deschide detaliile rulării pentru { $subject }

# Trace tab
trace-inbound-email-header = E-mail primit · { $time }
trace-from = De la
trace-no-subject = (fără subiect)
trace-loading-runs = Se încarcă rulările…
trace-no-runs-hint = Încă nu există rulări. Pornește o rulare de test din antet pentru a vedea un trace.
trace-view-timeline = Cronologie
trace-view-mesh = Mesh
trace-streaming-live = Se transmite activitate live…
trace-title = Trace rulare
trace-desc = Alege o rulare pentru a vedea fiecare decizie a { -platform-ai-agent-product.inline } — apeluri de instrumente, invocări de sub-agenți, aprobări și pauze HITL.
trace-back-to-list = ← Înapoi la lista de rulări
trace-reload = Reîncarcă
trace-loading-run = Se încarcă rularea…
trace-load-fail = Rularea nu a putut fi încărcată.
trace-empty-events = Nu au fost înregistrate evenimente trace pentru această rulare.
trace-picker-credits = { $credits } credite
trace-cat-tool = Instrument
trace-cat-decision = Decizie
trace-cat-policy = Politică
trace-cat-hitl = Așteaptă om
trace-cat-approval = Aprobare
trace-cat-cost = Cost
trace-cat-skill = Abilitate
trace-cat-thinking = Gândire
trace-cat-message = Mesaj
trace-cat-status = Status
trace-cat-system = Sistem
trace-chose = Ales: { $choice }
trace-confidence = încredere { $percent }%
trace-why = De ce:
trace-alternatives = Alternative luate în considerare
trace-actor-by = de { $name }
trace-show-raw = Arată brut
trace-hide-raw = Ascunde brut
trace-open-policy-title = Deschide politica într-un tab nou (ID: { $id })

# Run mesh view
mesh-live-activity = Activitate live
mesh-no-activity = Încă nu s-a înregistrat activitate.

# Dashboard charts
chart-credit-title = Credite și cost (7 zile)
chart-credit-subtitle = { $credits } credite · ~{ $usd } estimat
chart-credit-empty = Încă nu există utilizare în această perioadă.
chart-credits-label = Credite

chart-outcome-title = Rezultate rulări
chart-outcome-none-finished = Încă nu există rulări finalizate
chart-outcome-success-runs = { $rate }% succes · { $runs } rulări
chart-outcome-empty = Încă nu există rulări în această perioadă.
chart-outcome-completed = Finalizat
chart-outcome-failed = Eșuat
chart-outcome-cancelled = Anulat
chart-outcome-success-label = succes

chart-source-title = De unde vine munca
chart-source-desc = Ultimele 30 de zile, grupate după sursa declanșatorului.
chart-source-empty = Încă nu există rulări în ultimele 30 de zile.
chart-source-runs-label = Rulări

# Test webhook modal
testwebhook-title = Testează webhook
testwebhook-desc = Declanșează calea triggerului webhook (nu o rulare manuală). { -platform-ai-agent-product.inline } primește mesajul tău ca payload webhook.
testwebhook-close-aria = Închide
testwebhook-empty = Niciun { -platform-ai-agent-product.inline } nu are un trigger webhook activ. Adaugă unul în Config → Triggers.
testwebhook-agent-label = { -platform-ai-agent-product.inline }
testwebhook-trigger-label = Trigger webhook
testwebhook-subject-label = Subiect
testwebhook-message-label = Mesaj
testwebhook-message-placeholder = ex. „Clientul John Doe raportează că dauna #12345 a fost respinsă incorect. Te rugăm să verifici și să răspunzi.”
testwebhook-message-hint = Trimis ca body webhook. { -platform-ai-agent-product.inline } vede subiectul și mesajul în șirul său de sarcină.
testwebhook-default-subject = Test webhook
testwebhook-sending = Se trimite…
testwebhook-submit = Trimite webhook

# Archived agents panel
archived-title = { -platform-ai-agent-product.inline-plural } arhivate
archived-desc = { -platform-ai-agent-product.inline-plural } workforce șterse ușor. Restaurarea le readuce în pauză ca să le poți revizui înainte de reactivare.
archived-refresh-aria = Reîmprospătează { -platform-ai-agent-product.inline-plural } arhivate
archived-loading = Se încarcă { -platform-ai-agent-product.inline-plural } arhivate…
archived-empty-title = Niciun { -platform-ai-agent-product.inline } arhivat
archived-empty-desc = Când arhivezi un { -platform-ai-agent-product.inline }, apare aici ca să îl poți restaura.
archived-meta = Arhivat { $time }
archived-meta-by = Arhivat { $time } de { $user }
archived-restoring = Se restaurează…
archived-restore = Restaurează

# Live activity feed
live-activity-title = Activitate live
live-activity-running-count = { $count } în curs
live-activity-empty = Nici o rulare în desfășurare acum.

# Agent marketplace
marketplace-modal-title = Marketplace { -platform-ai-agent-product.inline }
marketplace-modal-subtitle = Angajează { -platform-ai-agent-product.inline-plural } gata făcuți cu abilități, instrumente și guvernanță incluse.
marketplace-manage-catalog = Gestionează catalogul
marketplace-select-multiple = Selectează mai multe
marketplace-done-selecting = Gata cu selecția
marketplace-close-aria = Închide
marketplace-search-placeholder = Caută după rol, abilitate sau instrument…
marketplace-offline-catalog = Se folosește catalogul offline: { $error }
marketplace-loading-catalog = Se încarcă catalogul…
marketplace-empty-search = Niciun { -platform-ai-agent-product.inline } nu corespunde căutării
marketplace-selected-count = { $count } selectate
marketplace-installing = Se instalează…
marketplace-install-selected = Instalează selectate ({ $count })
marketplace-error-install-failed = Instalarea a eșuat
marketplace-error-preflight-failed = Verificarea prealabilă a eșuat
marketplace-error-offline-cannot-publish = Selectează pachete din catalog care există în această implementare ({ -platform-ai-agent-product.inline-plural } demo offline nu pot fi publicate).
marketplace-card-skills-count = { $count } abilități
marketplace-card-tools-count = { $count } instrumente
marketplace-card-installs-count = { $installs } instalări
marketplace-card-selected = Selectat
marketplace-card-select = Selectează
marketplace-card-view-profile = Vezi profilul
marketplace-detail-back = Înapoi la marketplace
marketplace-detail-rating-installs = { $rating } · { $installs } instalări
marketplace-detail-section-skills = Abilități
marketplace-detail-section-tools = Instrumente și integrări
marketplace-detail-section-governance = Guvernanță
marketplace-detail-section-triggers = Reacționează la
marketplace-detail-section-pricing = Prețuri
marketplace-detail-bundled-skills = { $count } abilități incluse în pachet
marketplace-detail-tools-wired = { $count } instrumente conectate prin abilități
marketplace-detail-hire-note-legacy = Pornește în pauză pentru revizuirea ta.
marketplace-detail-hire-note-package = Instalează imediat { -platform-ai-agent-product.inline }, abilități și instrumente.
marketplace-detail-hire-button = Angajează { $name }
marketplace-install-summary-title = Rezumat instalare
marketplace-install-summary-stats = { $succeeded } reușite · { $failed } eșuate · { $total } total
marketplace-install-summary-agent-id = ID agent: { $agentId }
marketplace-needs-configuration = Necesită configurare: { $items }
marketplace-done = Gata
marketplace-preflight-title-ready = Gata de angajare
marketplace-preflight-title-check = Verificare compatibilitate
marketplace-preflight-all-ready = Toate pachetele selectate au trecut verificările prealabile.
marketplace-preflight-issues-found =
    { $count ->
        [one] { $count } problemă găsită înainte de instalare.
       *[other] { $count } probleme găsite înainte de instalare.
    }
marketplace-preflight-missing-tools = Instrumente lipsă: { $tools }
marketplace-preflight-missing-functions = Funcții lipsă: { $functions }
marketplace-preflight-install-now = Instalează acum
marketplace-preflight-install-anyway = Instalează oricum
marketplace-publish-agent-description = Listează { $agentName } într-un marketplace pentru clienți. Pot angaja după publicare.
marketplace-publish-agent-success = { $name } publicat
marketplace-publish-agent-success-meta = Disponibil pe { $target } · id pachet { $packageId } · { $skillCount } abilități · { $toolCount } instrumente
marketplace-target-tenant-url = URL tenant țintă
marketplace-target-url-placeholder = https://client.exemplu.ro/prompt-manager
marketplace-target-bearer-token = Token bearer țintă
marketplace-target-token-placeholder = Lipește tokenul de acces al tenantului
marketplace-package-id-optional = ID pachet (opțional)
marketplace-package-id-placeholder = Generat automat din numele agentului
marketplace-category-label = Categorie
marketplace-category-placeholder = general
marketplace-publisher-label = Editor
marketplace-publisher-placeholder = newwork
marketplace-publishing = Se publică…
marketplace-push-description =
    { $count ->
        [one] Listează { $count } { -platform-ai-agent-product.inline } selectat într-un marketplace pentru clienți.
       *[other] Listează { $count } { -platform-ai-agent-product.inline-plural } selectați într-un marketplace pentru clienți.
    }
marketplace-push-success =
    { $count ->
        [one] { $count } pachet publicat
       *[other] { $count } pachete publicate
    }
marketplace-push-failed =
    { $count ->
        [one] { $count } pachet eșuat
       *[other] { $count } pachete eșuate
    }
marketplace-push-failed-item = { $name }: { $error }
marketplace-manage-loading = Se încarcă catalogul…
marketplace-manage-description = Pachete publicate vizibile în marketplace-ul de angajare al acestui tenant. Anularea publicării elimină o listare.
marketplace-manage-empty = Încă nu există pachete publicate.
marketplace-manage-package-meta = { $packageId } · { $category } · { $skillCount } abilități · { $toolCount } instrumente · { $installCount } instalări
marketplace-manage-unpublish = Anulează publicarea
marketplace-manage-error-load = Încărcarea catalogului a eșuat
marketplace-manage-error-unpublish = Anularea publicării a eșuat
marketplace-pack-hr = Resurse umane
marketplace-pack-crm = Relații cu clienții
marketplace-pack-service = Servicii pentru clienți
marketplace-pack-finance = Finanțe
marketplace-pack-erp = ERP și achiziții
marketplace-pack-general = General

# Run approval sections (flow, email, structured)
approval-awaiting-title = Așteaptă aprobare umană
approval-comment-placeholder = Adaugă un comentariu (opțional)
approval-approve = Aprobă
approval-reject = Respinge
approval-submitting = Se trimite…
approval-flow-missing-task-id = Această sarcină de aprobare nu are ID și nu poate fi acționată aici.
approval-flow-missing-user = Utilizatorul tău nu a putut fi rezolvat pentru a înregistra decizia.
approval-flow-submit-fail = Decizia nu a putut fi trimisă.
approval-flow-empty-proposal = Nu au fost capturate modificări propuse pentru revizuire.
approval-email-signin = Autentificare necesară pentru a trimite e-mail.
approval-email-submit-fail = E-mailul nu a putut fi trimis.
approval-structured-signin = Autentificare necesară pentru a răspunde.
approval-structured-submit-fail = Răspunsul nu a putut fi trimis.

# Run entity links & domain actions
entity-records-actions-title = Înregistrări și acțiuni
entity-case-assigned = Caz atribuit
entity-action-search-label = Căutare
entity-action-search-desc = A căutat o înregistrare existentă
entity-action-create-label = Creare
entity-action-create-desc = A creat o înregistrare nouă
entity-action-update-label = Actualizare
entity-action-update-desc = A actualizat o înregistrare existentă
entity-action-timeline-label = Cronologie
entity-action-timeline-desc = A citit istoricul înregistrării
entity-action-note-label = Notă
entity-action-note-desc = A adăugat o notă
entity-action-task-label = Sarcină
entity-action-task-desc = A înregistrat o sarcină de urmărire
entity-action-flow-label = Flow
entity-action-flow-desc = A pornit un flux de lucru
entity-action-fallback-desc = Apel instrument
entity-label-account = Cont
entity-label-contact = Contact
entity-record-id-label = { $label }: { $value }
entity-workflow-fallback = Flux de lucru

# Flow action details (run detail)
flow-step-progress = Pasul { $current } din { $total }
flow-steps-complete = { $total } din { $total } pași
flow-template-id-chip = template_id: { $id }

# CRM actions (run detail)
crm-actions-title = Acțiuni CRM
crm-action-search-label = Căutare
crm-action-search-desc = A căutat o înregistrare CRM existentă
crm-action-create-label = Creare
crm-action-create-desc = A creat o înregistrare CRM nouă
crm-action-update-label = Actualizare
crm-action-update-desc = A actualizat o înregistrare CRM existentă
crm-action-timeline-label = Cronologie
crm-action-timeline-desc = A citit istoricul CRM
crm-action-note-label = Notă
crm-action-note-desc = A adăugat o notă CRM
crm-action-task-label = Sarcină
crm-action-task-desc = A înregistrat o sarcină CRM de urmărire
crm-action-fallback-desc = Apel instrument CRM
crm-record-note = Notă CRM
crm-record-task = Sarcină CRM
crm-record-account = Cont
crm-record-contact = Contact

# Run audit timeline
audit-trail-title = Pista de audit
audit-trail-loading = Se încarcă pista de audit…
audit-trail-load-fail = Pista de audit nu a putut fi încărcată.
audit-trail-empty = Nu există intrări de audit pentru această rulare.
audit-trail-by = de { $actor }
audit-trail-system = sistem

# Policies used (run detail)
policies-title = Politici

# Workforce AI composer
composer-trigger-label = Găsește agentul workforce potrivit pentru sarcină
composer-collapse-aria = Restrânge
composer-input-placeholder = Descrie munca… ex. răspunde la e-mailuri de daune primite
composer-find = Găsește
composer-ai-badge = AI
composer-sample-claims = Răspunde la e-mailuri de daune de asigurare primite
composer-sample-triage = Triază tichete de suport conform politicilor noastre
composer-sample-leads = Califică lead-uri noi cu regulile noastre ICP
composer-sample-expenses = Reconciliază rapoarte de cheltuieli pentru finanțe

# Credit sparkline (agent config)
sparkline-title = Credite folosite (7 zile)
sparkline-summary = { $credits } credite · { $runs } rulări
sparkline-aria-label = Utilizare credite pe zi
sparkline-bar-title = { $date }: { $credits } credite

# Per-agent credits chart
per-agent-chart-title = Credite pe agent
per-agent-chart-subtitle = Top consumatori săptămâna aceasta.
per-agent-chart-empty = Încă nu există utilizare de agenți.

# Glass workforce sphere
glass-sphere-heading = Workforce activ
glass-sphere-value-one = { $count } agent online
glass-sphere-value-other = { $count } agenți online
glass-sphere-credits-unit = credite / lună

# Flow detail panel & map
flow-detail-empty = Această acțiune nu a returnat un id de workflow.
flow-field-initiated-by = Inițiat de
flow-field-progress = Progres
flow-field-started = Început
flow-field-completed = Finalizat
flow-field-who = Cine
flow-field-claimed = Preluat
flow-field-duration = Durată
flow-field-due-sla = Scadență / SLA
flow-steps-title = Pași
flow-steps-loading = Se încarcă pașii…
flow-steps-empty = Încă nu au fost raportați pași.
flow-step-results = Rezultate
flow-step-results-loading = Se încarcă rezultatele…
flow-step-captured-data = Date capturate
flow-step-result-empty = Nu au fost capturate rezultate pentru acest pas încă.
flow-step-result-empty-review = Nu există rezultat de pas capturat pentru acest nod.
flow-step-data-empty = Nu au fost capturate date.
flow-live-badge = Live
flow-live-updating = Se actualizează
flow-legend-status = Status:
flow-legend-current = Curent
flow-legend-completed = Finalizat
flow-legend-failed = Eșuat
flow-legend-pending = În așteptare
flow-replay-restart-aria = Repornește redarea
flow-replay-prev-aria = Pasul anterior
flow-replay-toggle-pause = Pauză redare
flow-replay-toggle-play = Redă
flow-replay-next-aria = Pasul următor
flow-replay-position-aria = Poziție redare
flow-progress-steps = { $completed }/{ $total } pași
flow-progress-summary-complete = { $total } din { $total } pași
flow-progress-summary = Pasul { $current } din { $total }
flow-progress-summary-pct = Pasul { $current } din { $total } · { $percent }%
flow-map-replaying-path = Se redă calea parcursă de acest flow
flow-map-completed-path = Cale de execuție finalizată
flow-map-live-path = Cale de execuție live
flow-map-step-of = Pasul { $current } din { $total }
flow-map-step-of-titled = Pasul { $current } din { $total } · { $title }
flow-map-fullscreen-enter = Intră în ecran complet
flow-map-fullscreen-exit = Ieși din ecran complet
flow-map-unavailable-title = Harta flow indisponibilă
flow-map-unavailable-desc = Acest workflow nu are referință de șablon, deci diagrama nu poate fi afișată.
flow-map-step-detail-close = Închide detaliile pasului
flow-map-step-detail-empty = Nu există rezultat de pas capturat pentru acest nod.
flow-node-start = Start
flow-node-end = Sfârșit
flow-node-step = Pas
flow-not-available = Indisponibil

# Sidebar
sidebar-search-label = Caută sesiuni
sidebar-search-clear-aria = Șterge căutarea
sidebar-search-loading-aria = Se caută sesiuni
sidebar-matching-sessions-one = 1 sesiune potrivită
sidebar-matching-sessions-many = { $count } sesiuni potrivite
sidebar-recents-label = Recente
sidebar-recents-loading = Se încarcă sesiunile…
sidebar-recents-empty = Încă nu există sesiuni. Pornește una din compozitor.
sidebar-recents-empty-search = Nici o sesiune nu corespunde căutării sau filtrelor.
sidebar-recents-load-more-loading = Se încarcă sesiuni mai vechi…
sidebar-recents-load-more-search = Încarcă mai multe potriviri
sidebar-recents-load-more = Încarcă sesiuni mai vechi
sidebar-group-today = Azi
sidebar-group-yesterday = Ieri
sidebar-group-earlier = Mai devreme
sidebar-signed-in = Autentificat
sidebar-scheduled-tasks = Sarcini programate
sidebar-settings = Setări
sidebar-new-session = Sesiune nouă
sidebar-live-label = Live
sidebar-status-waiting = Așteaptă
sidebar-status-pending = În așteptare
sidebar-status-running = Rulează
sidebar-untitled-task = Sarcină fără titlu
sidebar-stop-session = Oprește sesiunea
sidebar-untitled-session = Sesiune fără titlu
sidebar-status-done = Finalizat
sidebar-status-failed = Eșuat
sidebar-status-cancelled = Anulat
sidebar-delete-session = Șterge sesiunea

# Chat
chat-attachment-index-failed = Indexare eșuată: { $name }
chat-attachment-indexing = Se indexează: { $name }
chat-attachment-ready-prefix = Gata
chat-attachment-upload-failed = Încărcare eșuată: { $name }
chat-attachment-ready-pending = Gata: { $name } (se va încărca la trimitere)
chat-attachment-uploading = Se încarcă { $name }…
chat-attachment-indexing-pending = Se indexează { $name }…
chat-attachment-preview-open = Deschide
chat-attachment-preview-download = Descarcă
chat-attachment-preview-aria = Deschide previzualizare mai mare pentru { $name }
chat-attachment-remove = Elimină { $name }
chat-email-status-sent = E-mail trimis
chat-email-status-drafted = Salvat ca ciornă
chat-email-status-cancelled = Anulat
chat-email-status-error = Trimitere eșuată
chat-email-status-completed = Finalizat
chat-email-review-title = Revizuiește și trimite e-mailul
chat-email-field-from = De la
chat-email-field-to = Către
chat-email-field-cc = Cc
chat-email-field-bcc = Bcc
chat-email-add-cc-bcc = Adaugă Cc / Bcc
chat-email-subject-placeholder = Subiect
chat-email-body-placeholder = Scrie mesajul…
chat-email-signature-label = Semnătură
chat-email-use-account-signature = Folosește semnătura contului
chat-email-signature-placeholder = -- \nNumele tău
chat-email-recipient-placeholder = Tastează un nume sau e-mail…
chat-email-searching = Se caută…
chat-email-no-employees-hint = Niciun angajat potrivit. Apasă Enter pentru a adăuga e-mail direct.
chat-email-loading-accounts = Se încarcă conturile…
chat-email-no-accounts = Niciun cont de e-mail conectat. Conectează unul în setările de e-mail pentru a trimite.
chat-email-accounts-error = Conturile nu au putut fi încărcate: { $error }
chat-email-default-account = (implicit)
chat-email-validation-recipients = Adaugă cel puțin un destinatar.
chat-email-validation-subject = Subiectul este obligatoriu.
chat-email-validation-pick-account = Alege un cont de e-mail de la care să trimiți.
chat-email-validation-no-account = Niciun cont de e-mail conectat.
chat-email-no-subject = Fără subiect
chat-email-save-draft = Salvează ciorna
chat-email-sending = Se trimite…
chat-email-send = Trimite
chat-email-remove-recipient = Elimină { $address }
chat-email-remove-attachment = Elimină atașamentul { $name }
chat-activity-aria = Progres agent
chat-agent-working = Agentul lucrează…

# Landing
landing-greeting-with-name = Salut { $name }, ce
landing-greeting = Ce
landing-heading-suffix = ai dori să faci?
landing-subtitle = Atribuie o sarcină, întreabă orice sau continuă un flux de lucru.
landing-input-placeholder = Descrie o sarcină, un subiect de cercetare sau întreabă orice…
landing-input-reply-prefix = Răspunsul tău la: "{ $text }"
landing-input-working = Agentul lucrează…
landing-input-reply = Răspunde sau oferă feedback…
landing-input-uploading = Se încarcă atașamentul…
landing-input-indexing = Se indexează atașamentul, aproape gata…
landing-input-hint = Enter pentru trimitere, Shift+Enter pentru linie nouă
landing-input-starting = Se pornește sesiunea…
landing-stop-aria = Oprește
landing-connectors-count = { $count } conectori
landing-composer-add-title = Adaugă
landing-composer-panel-title = Adaugă la această sesiune
landing-composer-panel-subtitle = Alege un agent, atașează fișiere sau conectează date.
landing-composer-section-agents = Lucrează cu un agent
landing-composer-clear = Șterge
landing-composer-agent-search = Caută agenți…
landing-composer-agents-empty = Niciun agent disponibil.
landing-composer-agents-no-match = Niciun agent nu corespunde căutării.
landing-composer-section-files = Fișiere & imagini
landing-composer-upload-title = Adaugă poze & fișiere
landing-composer-upload-desc = PDF-uri, imagini și documente
landing-composer-section-connectors = Conectori
landing-composer-connectors-active = { $count } active
landing-composer-connectors-empty-hint = Conectează surse de date externe
landing-composer-connectors-none = Niciun conector disponibil.
landing-composer-manage-connections = Gestionează conexiunile
landing-agent-chip-label = Agent
landing-agent-chip-title = Lucrează cu { $name }
landing-model-label = Model
landing-model-fallback = Model
landing-model-aria = Model: { $model }
landing-model-aria-with-effort = Model: { $model }, { $effort }
landing-reasoning-label = Raționament
landing-effort-none = Niciunul
landing-effort-low = Scăzut
landing-effort-medium = Mediu
landing-effort-high = Ridicat

# Trace explorer
trace-explorer-tab-tools = Instrumente ({ $count })
trace-explorer-tab-sources = Surse ({ $count })
trace-explorer-tab-cost = Cost
trace-explorer-section-execution = Prezentare execuție
trace-explorer-stat-runtime = Durată totală
trace-explorer-stat-events = Evenimente procesate
trace-explorer-stat-tool-calls = Apeluri instrument
trace-explorer-stat-decisions = Decizii
trace-explorer-section-llm-cost = Cost LLM
trace-explorer-stat-tokens = Tokeni folosiți
trace-explorer-stat-estimated-cost = Cost estimat
trace-explorer-budget-pct = { $pct }% din buget
trace-explorer-budget-consumed = Buget consumat
trace-explorer-cost-pending = Datele de cost apar după finalizarea sesiunii
trace-explorer-section-participants = Participanți
trace-explorer-stat-subagents = Sub-agenți
trace-explorer-stat-experts = Experți
trace-explorer-stat-skills = Abilități
trace-explorer-tools-empty = Niciun apel de instrument în această sesiune
trace-explorer-col-tool = Instrument
trace-explorer-col-calls = Apeluri
trace-explorer-col-total-time = Timp total
trace-explorer-col-failures = Eșecuri
trace-explorer-col-status = Stare
trace-explorer-status-ok = OK
trace-explorer-sources-empty = Niciun participant detectat
trace-explorer-col-participant = Participant
trace-explorer-col-kind = Tip
trace-explorer-col-invocations = Invocări
trace-explorer-col-duration = Durată
trace-explorer-kind-orchestrator = Every
trace-explorer-kind-subagent = Sub-agent
trace-explorer-kind-expert = Expert
trace-explorer-kind-skill = Abilitate
trace-explorer-kind-tool = Instrument
trace-explorer-status-done = Finalizat
trace-explorer-status-failed = Eșuat
trace-explorer-status-running = Rulează
trace-explorer-status-idle = Inactiv
trace-explorer-detail-seq = Seq
trace-explorer-detail-offset = Offset
trace-explorer-detail-duration = Durată
trace-explorer-detail-summary = Rezumat

# Renderers — final answer
renderer-final-hide-full-response = Ascunde răspunsul complet
renderer-final-show-full-response = Arată răspunsul complet
renderer-final-duration = Durată:
renderer-final-tasks = Sarcini:
renderer-final-export = Exportă
renderer-final-status-completed = Finalizat
renderer-final-actions-taken = Acțiuni efectuate

# Renderers — expert call
renderer-expert-agent-label = Agent
renderer-expert-subagent-fallback = Sub-agent
renderer-expert-status-working = În lucru
renderer-expert-status-failed = Eșuat
renderer-expert-status-completed = Finalizat

# Renderers — plan
renderer-plan-title = Plan
renderer-plan-steps = { $done } / { $total } pași

# Renderers — reflection
renderer-reflection-passed = Verificarea calității a trecut
renderer-reflection-gaps = Agentul a găsit lacune și continuă…

# Renderers — tool call / result
renderer-tool-call-input = Intrare
renderer-tool-call-result-preview = Previzualizare rezultat
renderer-tool-call-cached = din cache
renderer-tool-result-label = Rezultat
renderer-tool-result-sources = Surse
renderer-tool-result-showing-rows = Se afișează 10 din { $total } rânduri
renderer-tool-result-subject = Subiect:
renderer-tool-result-to = Către:
renderer-tool-email-failed = E-mail eșuat
renderer-tool-email-cancelled = E-mail anulat
renderer-tool-email-drafted = E-mail salvat ca ciornă
renderer-tool-email-sent = E-mail trimis
renderer-tool-email-composed = E-mail compus

# Renderers — preview block
renderer-preview-status-pending = În așteptare
renderer-preview-status-in-progress = În desfășurare
renderer-preview-status-done = Finalizat
renderer-preview-status-failed = Eșuat
renderer-preview-status-skipped = Omis
renderer-preview-view-live = Vezi live în panoul lateral
renderer-preview-view-live-title = Deschide panoul live Case Panel în bara laterală

# Renderers — action card
renderer-action-open = Deschide
renderer-action-details = Detalii
renderer-action-show-tech-refs = Arată referințele tehnice

# Renderers — deliverables / artifacts
renderer-doc-type-document = Document
renderer-doc-type-slides = Prezentare
renderer-doc-type-note = Notă
renderer-doc-created = { $type } creat
renderer-doc-view-canvas = Click pentru a vizualiza pe canvas
renderer-doc-view = Vezi
renderer-pdf-ready = PDF gata
renderer-file-ready = Fișier gata
renderer-download = Descarcă
renderer-download-ellipsis = …
renderer-pdf-unavailable = PDF indisponibil — lipsește sesiunea sau ID-ul atașamentului.
renderer-pdf-download-error = PDF-ul nu a putut fi descărcat: { $detail }
renderer-file-unavailable = Fișier indisponibil — lipsește sesiunea sau ID-ul atașamentului.
renderer-file-download-error = Fișierul nu a putut fi descărcat: { $detail }
renderer-artifact-open = Deschide
renderer-artifact-open-full = Deschide vizualizarea completă
renderer-artifact-open-new-tab = Deschide în tab nou
renderer-artifact-download-png = Descarcă ca PNG
renderer-artifact-saving-png = Se salvează PNG…
renderer-chart-load-error = Datele graficului nu au putut fi încărcate.
renderer-artifact-size-kb = { $size } KB

# Renderers — references rail
renderer-references-title = Referințe
renderer-ref-category-person = Persoane
renderer-ref-category-hr = HR & Org
renderer-ref-category-crm = CRM
renderer-ref-category-finance = Finanțe
renderer-ref-category-investment = Investiții
renderer-ref-category-document = Documente
renderer-ref-category-content = Conținut
renderer-ref-category-workflow = Fluxuri de lucru
renderer-ref-category-platform-page = Pagini
renderer-ref-category-other = Altele

# Renderers — reference cards (fields)
renderer-ref-field-owner = Proprietar
renderer-ref-field-location = Locație
renderer-ref-field-size = Dimensiune
renderer-ref-field-revenue = Venit
renderer-ref-field-phone = Telefon
renderer-ref-field-website = Website
renderer-ref-field-department = Departament
renderer-ref-field-company = Companie
renderer-ref-field-joined = Alăturat
renderer-ref-field-email = E-mail
renderer-ref-field-account = Cont
renderer-ref-field-opportunity = Oportunitate
renderer-ref-field-source = Sursă
renderer-ref-field-rating = Evaluare
renderer-ref-field-region = Regiune
renderer-ref-field-ai-score = Scor AI
renderer-ref-field-amount = Sumă
renderer-ref-field-close = Închidere
renderer-ref-field-win = Câștig
renderer-ref-field-forecast = Prognoză
renderer-ref-field-ai-grade = Notă AI
renderer-ref-field-updated = Actualizat
renderer-ref-field-pages = Pagini
renderer-ref-field-slides = Diapozitive
renderer-ref-field-rows = Rânduri
renderer-ref-field-sheets = Foi
renderer-ref-field-steps = Pași
renderer-ref-field-version = Versiune
renderer-ref-field-started = Început
renderer-ref-field-organizer = Organizator
renderer-ref-field-attendees = Participanți
renderer-ref-field-progress = Progres

renderer-ref-type-document = Document
renderer-ref-type-spreadsheet = Foaie de calcul
renderer-ref-type-presentation = Prezentare
renderer-ref-type-note = Notă
renderer-ref-type-workflow = Flux de lucru
renderer-ref-type-workflow-template = Șablon flux
renderer-ref-type-meeting = Întâlnire
renderer-ref-type-conversation = Conversație
renderer-ref-type-untitled-note = Notă fără titlu

renderer-ref-status-draft = Ciornă
renderer-ref-status-pinned = Fixat
renderer-ref-status-archived = Arhivat
renderer-ref-reports-to = Raportează la

renderer-ref-intent-manager = Manager
renderer-ref-intent-reports-to = Raportează la
renderer-ref-intent-team-member = Membru echipă
renderer-ref-intent-owner = Proprietar

renderer-ref-count-page = { $count ->
    [one] { $count } pagină
   *[other] { $count } pagini
}
renderer-ref-count-slide = { $count ->
    [one] { $count } diapozitiv
   *[other] { $count } diapozitive
}
renderer-ref-count-sheet = { $count ->
    [one] { $count } foaie
   *[other] { $count } foi
}
renderer-ref-count-row = { $count ->
    [one] { $count } rând
   *[other] { $count } rânduri
}
renderer-ref-count-step = { $count ->
    [one] { $count } pas
   *[other] { $count } pași
}
renderer-ref-count-attendee = { $count ->
    [one] { $count } participant
   *[other] { $count } participanți
}

renderer-ref-progress-steps = { $completed } din { $total } { $total ->
    [one] pas
   *[other] pași
}
renderer-ref-participant-count = { $count } { $count ->
    [one] participant
   *[other] participanți
}
renderer-ref-unread-count = { $count } necitite
renderer-ref-version = v{ $version }

renderer-ref-time-just-now = chiar acum
renderer-ref-time-minutes-ago = acum { $count } min
renderer-ref-time-hours-ago = acum { $count } h
renderer-ref-time-yesterday = ieri
renderer-ref-time-days-ago = acum { $count } z

# Renderers — tool permission
renderer-permission-hide-fields = Ascunde câmpurile suplimentare
renderer-permission-show-fields = Arată încă { $count } { $count ->
    [one] câmp
   *[other] câmpuri
}
renderer-permission-click-choose = Click pentru a alege altă opțiune
renderer-permission-click-edit = Click pentru a edita
renderer-permission-suggested = Sugerat
renderer-permission-suggested-title = Pre-completat de asistent — verificați și ajustați dacă e necesito. Nu este obligatoriu.
renderer-permission-required = Obligatoriu
renderer-permission-suggested-hint = Pre-completat de asistent
renderer-permission-editing = Editare
renderer-permission-click-adjust = Click pe orice câmp pentru a-l ajusta înainte de aprobare.
renderer-permission-approve-multi = Aprobă { $count } acțiuni
renderer-permission-review-multi = Revizuiți fiecare acțiune mai jos. Rulează doar după aprobare.
renderer-permission-approve-run = Aprobă și rulează
renderer-permission-save-run = Salvează modificările și rulează
renderer-permission-modify = Modifică
renderer-permission-cancel-changes = Anulează modificările
renderer-permission-reject = Respinge
renderer-permission-runs-after = Rulează doar după aprobare.
renderer-permission-decision-submitted = Decizie trimisă
renderer-permission-rejected = Respins
renderer-permission-changes-submitted = Modificări trimise
renderer-permission-approved = Aprobat

# Renderers — structured input form
renderer-form-field-required = Acest câmp este obligatoriu
renderer-form-field-invalid = Format invalid
renderer-form-ai-will-generate = AI va genera
renderer-form-let-ai-generate = Lasă AI să genereze
renderer-form-select-placeholder = Selectează...
renderer-form-ai-generate-field = AI va genera acest câmp
renderer-form-collapse-aria = Restrânge formularul trimis
renderer-form-ai-generate-count = AI va genera { $count } câmp(uri)
renderer-form-continue-ai = Continuă cu AI
renderer-form-submit = Trimite
renderer-form-summary-ai = { $label }: generat de AI

# Settings
settings-title = Setări
settings-tab-agents = Agenți
settings-tab-skills = Abilități
settings-tab-tools = Instrumente
settings-page-agent-studio = Agent Studio
settings-sidebar-aria = Secțiuni setări

settings-section-configuration = Configurare
settings-section-memory = { enterprise-agent-nav-memory }
settings-section-policies = Politici implicite
settings-section-metrics = Utilizare și metrici

settings-configuration-title = Configurare
settings-memory-toggle-label = { enterprise-agent-nav-memory }
settings-memory-toggle-desc = Reține preferințele și contextul între sesiuni
settings-auto-approve-label = Mod auto-aprobare
settings-auto-approve-desc = Permite agentului să continue fără confirmare pentru acțiunile care în mod normal necesită aprobare
settings-dev-mode-label = Mod dezvoltator
settings-dev-mode-desc = Afișează selectorul de model, exploratorul de trace și instrumentele de debug
settings-reflection-mode-label = Mod reflecție
settings-reflection-mode-desc = Controlează dacă agentul își revizuiește munca înainte de finalizare
settings-reflection-adaptive = Adaptiv
settings-reflection-always = Întotdeauna
settings-reflection-disabled = Dezactivat

settings-memory-title = { enterprise-agent-nav-memory }
settings-memory-namespace-preferences = Preferințe
settings-memory-namespace-domain = Fapte de domeniu
settings-memory-namespace-skills = Modele
settings-memory-namespace-episodes = Jurnal
settings-memory-empty-preferences = Nicio preferință salvată încă. Adaugă ce vrei să rețină agentul, de ex. „răspunde scurt și direct”.
settings-memory-empty-domain = Niciun fapt de domeniu încă. Agentul înregistrează aici automat fapte reutilizabile după sesiuni (de ex. „Q1 se termină pe 31 martie”).
settings-memory-empty-skills = Niciun model încă. Agentul salvează aici automat „ce flux de lucru a funcționat pentru ce sarcină” după sesiuni.
settings-memory-empty-episodes = Nicio intrare în jurnal încă. După fiecare sesiune, agentul înregistrează la ce ați lucrat împreună, etichetat pe temă și dată.
settings-memory-search-placeholder = Caută { $namespace }...
settings-memory-all-topics = Toate temele
settings-memory-entry-count = { $count ->
    [one] 1 intrare
   *[other] { $count } intrări
}
settings-memory-entries-episodes-suffix = · jurnal al sesiunilor anterioare
settings-memory-entries-auto-suffix = · învățat automat după sesiuni
settings-memory-delete-aria = Șterge memoria: { $title }
settings-memory-relative-today = Azi
settings-memory-relative-yesterday = Ieri
settings-memory-relative-days = acum { $days } zile
settings-memory-relative-weeks = acum { $weeks } săpt.

settings-preferences-intro = Acestea se aplică fiecărei sarcini. Agentul le citește la începutul fiecărei sesiuni, astfel nu trebuie să te repeți.
settings-pref-response-length = Lungime răspuns
settings-pref-tone = Ton
settings-pref-format = Format
settings-pref-expertise = Nivel de expertiză
settings-pref-language = Limbă
settings-pref-language-none = Fără preferință
settings-pref-custom-instructions = Instrucțiuni personalizate
settings-pref-custom-placeholder = Orice altceva pe care agentul ar trebui să-l țină mereu cont.
settings-pref-option-concise = Concis
settings-pref-option-balanced = Echilibrat
settings-pref-option-detailed = Detaliat
settings-pref-option-professional = Profesional
settings-pref-option-friendly = Prietenos
settings-pref-option-direct = Direct
settings-pref-option-casual = Casual
settings-pref-option-prose = Proză
settings-pref-option-bullets = Puncte
settings-pref-option-tables = Tabele când e util
settings-pref-option-steps = Pas cu pas
settings-pref-option-beginner = Prietenos pentru începători
settings-pref-option-expert = Expert (sari peste bază)
settings-pref-lang-english = Engleză
settings-pref-lang-german = Germană
settings-pref-lang-french = Franceză
settings-pref-lang-spanish = Spaniolă
settings-pref-lang-italian = Italiană
settings-pref-lang-portuguese = Portugheză
settings-pref-lang-dutch = Olandeză

settings-profile-about = Despre tine
settings-profile-desc = Generat din înregistrarea ta de angajat, astfel încât agenții enterprise să înțeleagă rolul, echipa, managerul și abilitățile tale.
settings-profile-regenerate = Regenerează
settings-profile-status-missing = Încă negenerat
settings-profile-status-generating = Se generează din datele angajatului...
settings-profile-status-ready = Generat din datele angajatului
settings-profile-status-failed = Generarea a eșuat
settings-profile-status-edited = Editat de tine
settings-profile-updated = Actualizat { $date }
settings-profile-placeholder = Memoria profilului tău va apărea aici după generarea din datele angajatului.
settings-profile-loading = Se încarcă memoria profilului...
settings-profile-error-load = Memoria profilului nu a putut fi încărcată.
settings-profile-error-save = Memoria profilului nu a putut fi salvată.
settings-profile-error-regenerate = Generarea profilului nu a putut fi pornită.

settings-policies-title = Politici implicite
settings-policies-intro = Politici intranet mereu active. Fiecare agent din acest workspace le poate lista și citi oricând într-o conversație — fără configurare per agent.
settings-policies-empty = Nicio politică implicită atașată încă. Apasă Adaugă politică pentru a atașa politici intranet pe care fiecare agent din acest workspace le poate citi.
settings-policies-add = Adaugă politică
settings-policies-updated = Actualizat { $date }
settings-policies-open-title = Deschide într-un tab nou (ID: { $id })
settings-policies-remove-aria = Elimină politica { $title }
settings-policies-error-load = Politicile implicite nu au putut fi încărcate
settings-policies-error-save = Politicile implicite nu au putut fi salvate

settings-metrics-title = Utilizare și metrici
settings-metrics-range-7d = 7 zile
settings-metrics-range-30d = 30 zile
settings-metrics-range-all = Tot timpul
settings-metrics-total-sessions = Total sesiuni
settings-metrics-tokens = Tokeni folosiți
settings-metrics-cost = Cost est.
settings-metrics-duration = Durată medie
settings-metrics-by-status = După stare

settings-skills-title = Abilități enterprise
settings-skills-intro = Abilitățile sunt detectate automat pe baza sarcinii tale. Setează o abilitate de rezervă când detectarea automată nu găsește o potrivire sigură.
settings-skills-all = Toate
settings-skills-empty = Nicio abilitate disponibilă
settings-skills-fallback = Rezervă
settings-skills-installs = { $count } instalări
settings-skills-remove-fallback = Elimină ca rezervă
settings-skills-set-fallback = Setează ca rezervă
settings-skills-install = Instalează abilitatea
settings-skills-collapse = Restrânge
settings-skills-details = Detalii
settings-skills-setup = { $time } configurare
settings-skills-setup-steps = Pași de configurare

settings-tools-loading = Se încarcă instrumentele...
settings-tools-error-load = Instrumentele nu au putut fi încărcate
settings-tools-empty = Niciun instrument configurat încă.
settings-tools-intro = Instrumente disponibile agenților enterprise, grupate pe domeniu de business.
settings-tools-hint = Numele bold este ce vede agentul; insigna monospace este referința skill persistată. Indiciul gri mic „via …” arată sursa fiecărui instrument.
settings-tools-search-placeholder = Caută instrumente — nume, descriere, categorie, etichetă…
settings-tools-category = Categorie
settings-tools-category-all = Toate ({ $count })
settings-tools-no-match = Niciun instrument nu corespunde filtrelor curente.
settings-tools-via = via { $source }
settings-tools-disabled = Dezactivat
settings-tools-auth-required = Autentificare necesară
settings-tools-no-auth = Fără autentificare
settings-tools-hitl = HITL
settings-tools-artifacts = Artefacte
settings-tools-integrations-title = Integrări de instrumente configurate
settings-tools-builtin = Integrat
settings-tools-active = Activ
settings-tools-inactive = Inactiv
settings-tools-toggle-error-disable = Nu s-a putut dezactiva { $name }
settings-tools-toggle-error-enable = Nu s-a putut activa { $name }

settings-flow-bindings-title = Legături companion flow
settings-flow-bindings-desc = Ce instrumente de lookup are nevoie fiecare flow de scriere mai întâi. Modificările aici suprascriu baza derivată din schemă pentru toți.
settings-flow-bindings-error-load = Legăturile flow nu au putut fi încărcate
settings-flow-bindings-error-save = Legăturile pentru { $flow } nu au putut fi salvate
settings-flow-bindings-source-edited = editat
settings-flow-bindings-source-override = suprascriere cod
settings-flow-bindings-self-contained = autonom
settings-flow-bindings-no-companions = Fără companioni. Adaugă unul sau salvează ca autonom.
settings-flow-bindings-remove-aria = Elimină companionul
settings-flow-bindings-reset = Resetează la generat
settings-flow-bindings-clear = Șterge tot
settings-necessity-required = obligatoriu
settings-necessity-recommended = recomandat
settings-necessity-conditional = condițional

settings-skill-studio-title = Skill Studio
settings-skill-studio-search-placeholder = Caută abilități...
settings-skill-studio-new = Abilitate nouă
settings-skill-studio-dismiss = Închide
settings-skill-studio-empty = Nicio abilitate găsită
settings-skill-studio-clear-search = Șterge căutarea
settings-skill-studio-count = { $shown } din { $total } abilități
settings-skill-studio-active = Activ
settings-skill-studio-inactive = Inactiv
settings-skill-studio-files-count = { $count } fișiere
settings-skill-studio-tools-count = { $count } instrumente
settings-skill-studio-edit-title = Editează abilitatea
settings-skill-studio-new-title = Abilitate nouă
settings-skill-studio-field-name = Nume
settings-skill-studio-field-name-placeholder = Nume abilitate
settings-skill-studio-field-category = Categorie
settings-skill-studio-field-category-placeholder = ex. crm, finance, general
settings-skill-studio-field-description = Descriere
settings-skill-studio-field-description-placeholder = Descriere scurtă
settings-skill-studio-field-tags = Etichete (separate prin virgulă)
settings-skill-studio-field-tags-placeholder = crm, sales, automation
settings-skill-studio-field-compatibility = Compatibilitate
settings-skill-studio-field-compatibility-placeholder = ex. prompt-manager>=0.9.0
settings-skill-studio-field-content = Conținut (Markdown)
settings-skill-studio-field-content-placeholder = # Instrucțiuni skill...
settings-skill-studio-save-changes = Salvează modificările
settings-skill-studio-create = Creează abilitatea
settings-skill-studio-saving = Se salvează…
settings-skill-studio-delete-confirm = Ștergi abilitatea „{ $name }”?
settings-skill-studio-category-label = Categorie: { $category }
settings-skill-studio-label-description = Descriere
settings-skill-studio-label-version = Versiune:
settings-skill-studio-label-status = Stare:
settings-skill-studio-label-created-by = Creat de:
settings-skill-studio-label-updated-by = Actualizat de:
settings-skill-studio-label-content = Conținut
settings-skill-studio-files-title = Fișiere atașate
settings-skill-studio-upload = Încarcă fișier
settings-skill-studio-uploading = Se încarcă…
settings-skill-studio-no-files = Niciun fișier atașat.
settings-skill-studio-tools-title = Instrumente
settings-skill-studio-assign-tools = Atribuie instrumente
settings-skill-studio-select-tools = Selectează instrumente
settings-skill-studio-assign = Atribuie
settings-skill-studio-no-tools = Niciun instrument disponibil.

settings-action-enable = Activează
settings-action-disable = Dezactivează
settings-action-loading = Se încarcă…
settings-action-edit = Editează

# Workspace — panou dreapta, previzualizare live, cronologie sesiune
workspace-panel-close = Închide panoul workspace
workspace-panel-open = Deschide panoul workspace
workspace-follow-ups-title = Sugestii de continuare
workspace-follow-ups-dismiss = Închide sugestiile de continuare
workspace-reopen-clarification-show = Afișează opțiunile
workspace-artifact-type-slides = slide-uri
workspace-artifact-type-document = document
workspace-artifact-type-note = notă
workspace-artifact-type-pdf = PDF
workspace-artifact-type-html = tablou de bord HTML
workspace-artifact-type-chart = grafic
workspace-retry-preview-with-title = Încercarea anterioară de a genera { $label } „{ $title }” a eșuat. Încercați din nou.
workspace-retry-preview = Încercarea anterioară de a genera { $label } a eșuat. Încercați din nou.
workspace-session-timeline-title = Cronologie sesiune
workspace-session-timeline-latest = Ultima { $time }
workspace-session-timeline-event-count = { $count } evenimente
workspace-timeline-empty = Evenimentele sesiunii vor apărea aici…
workspace-decisions-empty = Deciziile agentului vor apărea aici pe măsură ce sesiunea progresează…
workspace-activity-empty = Activitatea instrumentelor va apărea aici…
workspace-delegated-task = Lucrează la o sarcină delegată
workspace-delegated-to = Delegat către { $agent }
workspace-delegated-subagent = Delegat către sub-agent
workspace-skill-badge = Abilitate: { $name }
workspace-decision-skill = Abilitate
workspace-decision-tool-routing = Rutare instrument
workspace-decision-routing = Rutare
workspace-decision-reflection = Reflecție
workspace-decision-hitl = Om în buclă
workspace-decision-human-input = Input uman
workspace-decision-plan = Plan
workspace-decisions-title = Decizii
workspace-decisions-no-branch = Încă nu există puncte de ramificare
workspace-decisions-branch-singular = { $count } punct de ramificare
workspace-decisions-branch-plural = { $count } puncte de ramificare
workspace-plan-waiting = Se așteaptă startul
workspace-plan-progress = { $done } din { $total } finalizate
workspace-plan-finalizing = Se finalizează răspunsul…
workspace-documents-title = Documente workspace
workspace-artifacts-title = Artefacte
workspace-latest-summary = Cel mai recent: { $name }
workspace-artifact-view = Vizualizare
workspace-artifact-download = Descărcare
workspace-experts-title = Experți enterprise
workspace-experts-summary-running = { $running } în curs · { $done } finalizate
workspace-experts-summary-running-failed = { $running } în curs · { $done } finalizate · { $failed } eșuate
workspace-experts-summary-done-failed = { $done } finalizate · { $failed } eșuate
workspace-experts-summary-done = { $done } finalizate
workspace-expert-default = Expert enterprise
workspace-expert-market = Cercetare de piață
workspace-expert-hr = Operațiuni HR
workspace-expert-compensation = Compensații
workspace-expert-finance = Finanțe
workspace-expert-workflow = Design flux
workspace-expert-writing = Redactare
workspace-expert-data = Analiză date
workspace-expert-it = Suport IT
workspace-debug-trace-title = Trace debug (doar dev)
workspace-debug-trace-failed-load = Încărcarea trace-ului a eșuat
workspace-debug-trace-loading = Se încarcă trace-ul…
workspace-debug-trace-no-steps = Încă nu există pași în trace
workspace-debug-trace-step-singular = { $count } pas în trace
workspace-debug-trace-step-plural = { $count } pași în trace
workspace-debug-trace-loading-detail = Se încarcă trace-ul de debug...
workspace-debug-filter-all = toate
workspace-debug-filter-decisions = decizii
workspace-debug-filter-tools = instrumente
workspace-debug-filter-hitl = hitl
workspace-debug-filter-errors = erori
workspace-debug-filter-artifacts = artefacte
workspace-debug-refresh = Reîmprospătare
workspace-debug-refreshing = Se reîmprospătează…
workspace-debug-export = Export
workspace-debug-analyzing = Se analizează...
workspace-debug-explanation-cached = Explicație (din cache)
workspace-debug-explanation-ready = Explicație gata
workspace-debug-analyze-failed = Analiza a eșuat
workspace-debug-explain-session = Explică această sesiune
workspace-debug-copied = Copiat!
workspace-debug-copy-failed = Copierea a eșuat
workspace-debug-copy-context = Copiază contextul de debug
workspace-debug-ai-analysis = Analiză AI
workspace-debug-rerun = Reexecută
workspace-debug-cached-at = din cache { $time }
workspace-debug-root-cause = Cauză principală
workspace-debug-affected-layer = Strat afectat
workspace-debug-evidence = Dovezi
workspace-debug-code-locations = Locații cod
workspace-debug-suggested-fix = Remediere sugerată
workspace-debug-test-command = Comandă test
workspace-debug-analyzer-disabled = Analizorul AI este dezactivat. Setați DEEP_AGENT_AI_ANALYZER_ENABLED=true pe prompt-manager.
workspace-debug-analyzer-error = Eroare analizor: { $message }
workspace-debug-slow-phases = Faze lente
workspace-debug-failed-tools = Instrumente eșuate
workspace-debug-repeated-tools = Apeluri repetate de instrumente
workspace-debug-langsmith-project = Proiect LangSmith
workspace-debug-langsmith-open = deschide
workspace-debug-status-unknown = necunoscut
workspace-debug-parallel = paralel
workspace-debug-shortlist = Listă scurtă ({ $count })
workspace-case-title = Caz
workspace-case-steps = { $completed }/{ $total } pași
workspace-case-all-closed = Toate cazurile închise
workspace-case-owner = Responsabil
workspace-case-due = Scadență
workspace-case-open-workflow = Deschide fluxul
workspace-case-partial = Parțial
workspace-status-skipped = Omis
workspace-clarification-aria = Clarificare agent
workspace-clarification-dismiss = Respinge
workspace-clarification-custom = Scrie propriul răspuns
workspace-clarification-enter-hint = Enter pentru trimitere
workspace-clarification-placeholder = Tastați răspunsul și apăsați Enter…
workspace-clarification-keyboard-hint = Enter pentru trimitere, Shift+Enter pentru linie nouă
workspace-clarification-send = Trimite
workspace-fallback-yes = Da
workspace-fallback-no = Nu
workspace-live-preview-title = Previziune live
workspace-chart-unavailable = Date grafic indisponibile
workspace-html-path-unavailable = Calea artefactului HTML indisponibilă.
workspace-pdf-preview-failed = Previziunea PDF a eșuat: { $error }
workspace-pdf-reference-missing = Referința PDF lipsește.
workspace-pdf-loading = Se încarcă PDF-ul…
workspace-pdf-attached = { $fileName } · atașat acestei sesiuni
workspace-pdf-download = Descarcă PDF
workspace-preview-collapse = Restrânge previziunea
workspace-preview-expand = Extinde previziunea
workspace-generating-label = Se generează { $label }...
workspace-transforming-layout = Se transformă în layout vizual...
workspace-generating-content = Se generează conținutul...
workspace-slides-preparing = { $count } slide-uri - se pregătește layout-ul...
workspace-slides-generating = { $count } slide-uri - se generează...
workspace-error-slides = Nu am putut finaliza slide-urile
workspace-error-document = Nu am putut finaliza documentul
workspace-error-note = Nu am putut finaliza nota
workspace-error-chart = Nu am putut finaliza graficul
workspace-error-html = Nu am putut finaliza pagina
workspace-error-pdf = Nu am putut finaliza PDF-ul
workspace-error-generic = Nu am putut finaliza
workspace-error-body = Ceva nu a mers bine la generare. Încercați din nou într-un moment.
workspace-try-again = Încearcă din nou
workspace-hide-technical = Ascunde detaliile tehnice
workspace-show-technical = Afișează detaliile tehnice
workspace-hide-grid = Ascunde grila
workspace-show-all = Afișează tot
workspace-prev-slide = Slide anterior
workspace-next-slide = Slide următor
workspace-draft-review = Ciornă - Revizuiește înainte de salvare
workspace-draft-delete = Șterge
workspace-draft-discard = Renunță
workspace-draft-save-failed = Salvarea a eșuat
workspace-draft-retry = Reîncearcă
workspace-draft-done = Gata
workspace-draft-discard-delete = Șterge ciorna din Documente
workspace-draft-discard-dismiss = Închide previziunea
workspace-document-generating = Se generează
workspace-document-saved-badge = Salvat în Documente
workspace-document-badge = Document
workspace-canvas-copy = Copiază
workspace-canvas-open-documents = Deschide în Documente
workspace-canvas-open-tooltip = Editările după prima salvare trebuie făcute în aplicația Documente
workspace-canvas-saved = Salvat
workspace-canvas-save-failed = Eșuat
workspace-canvas-persisted-banner = Salvat în Documente. Deschideți documentul pentru editare cu colaborare în timp real.
workspace-canvas-generating-doc = Se generează documentul...
workspace-canvas-no-content = Fără conținut
workspace-canvas-writing = Scrie...
workspace-canvas-edit-hint = Faceți clic pe conținut pentru a edita
workspace-artifact-viewer-aria = Vizualizator artefact
workspace-artifact-load-failed = Încărcarea a eșuat: { $error }
workspace-artifact-download-instead = Descarcă în schimb
workspace-skill-auto = auto
workspace-skill-auto-tooltip = Detectat automat pe baza sarcinii dvs.
workspace-skill-version-loaded = v{ $version } încărcat
workspace-skill-version-draft = v{ $version } încărcat (ciorna este v{ $draft })
workspace-connector-connected = Conectat: { $names }
workspace-connector-more = +{ $count } mai multe
workspace-avatar-unknown = Necunoscut
workspace-avatar-employee = Avatar angajat
workspace-task-no-plan = Încă nu există plan
workspace-task-steps-pending = Pașii vor apărea când agentul pornește
workspace-step-aria = Pasul { $number }: { $label }. { $status }
workspace-collaboration-title = Colaborare agenți
workspace-collaboration-tree-view = Vizualizare arbore
workspace-collaboration-timeline-view = Vizualizare cronologie
workspace-collaboration-done = { $count } finalizate
workspace-collaboration-running = { $count } în curs
workspace-collaboration-failed = { $count } eșuate
workspace-chart-empty = Nu există date de grafic
workspace-chart-other = Altele
workspace-chart-total = Total
workspace-chart-no-data-points = Nu există puncte de date pentru acest grafic.
workspace-chart-unsupported-preview = Previziune grafic nesuportată sau goală.
workspace-timeline-tool = Instrument
workspace-presentation-type = prezentare
# Agents (phase2-rest)
agents-toolbar-subtitle = Creează agenți, configurează capacitățile lor și alege unde rulează.
agents-create-button = Creează agent sau worker
agents-search-placeholder = Caută agenți activi și arhivați...
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
agents-config-error-description-thin = Description is too thin — add at least { $min } characters describing what the agent does. It is how the agent gets discovered and chosen.
agents-config-error-system-prompt-short = System prompt is too short — add at least { $min } characters describing the agent's identity, capabilities, and constraints.
agents-save-saving = Saving…
agents-save-saved = Saved
agents-avatar-alt = { $label } avatar
agents-avatar-generating = Generating…
agents-avatar-regenerate = Regenerate
agents-avatar-generate = Generate avatar
agents-avatar-removing = Removing…
agents-avatar-remove = Remove avatar
agents-compliance-title-pass = Meets the Agent Authoring Standard
agents-compliance-title-warn = Almost there — a few improvements recommended
agents-compliance-title-fail = This agent is incomplete and may not work
agents-compliance-checks-count = { $done }/{ $total } checks
agents-description-chip-min-chars = At least { $min } characters
agents-description-chip-not-just-name = More than the name
agents-description-chip-specific = Specific
agents-description-required = A real description is required — it's how this agent gets discovered and chosen.
agents-char-count-min = { $count } chars (min { $min })
agents-system-prompt-chip-identity = Identity ("You are …")
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
agents-create-submitting = Creating…
agents-create-loading-setup = Loading setup…
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
agents-create-visibility-workspace = Workspace — anyone in this workspace
agents-create-visibility-private = Private — only me
agents-create-workforce-toggle = Activate as a Worker
agents-create-workforce-toggle-desc = Creates the same agent with a paused Worker deployment so Passport and Activation can be completed before it runs.
agents-create-field-role = Role
agents-create-field-department = Department
agents-create-field-autonomy = Autonomy
agents-create-passport-skip = Skip this step unless the agent needs Worker identity, ownership, governance, and runtime controls.
agents-create-activation-paused = The Worker deployment is created paused. Finish Passport and Activation in Studio before it runs.
agents-create-activation-no-worker = No Worker runtime will be created. You can activate this agent as a Worker later from Studio.
agents-create-loading-defaults = Loading workspace and model defaults…
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
agents-create-identifier-auto = Letters, digits, and spaces are fine — we automatically convert it to an identifier.
agents-create-name-hint = A clear, human name. We derive the internal identifier automatically.
agents-create-specialty-hint = What domain or function does this agent own? Used for discovery and routing.
agents-create-policies-title = Company policies
agents-create-policies-optional = Optional
agents-create-policies-selected = { $count } selected
agents-create-policies-search = Search EveryPages policies…
agents-create-policies-loading = Loading policies…
agents-create-policies-load-error = Couldn't load policies. You can still create the agent and attach them later.
agents-create-policies-empty-search = No policies match your search.
agents-create-policies-empty = No company policies published yet.
agents-create-policy-untitled = Untitled policy
agents-create-description-check-min = At least { $min } characters
agents-create-description-check-not-name = More than just the name
agents-create-description-check-specific = Specific (uses real domain words)
agents-create-description-required = A real description is required — it's how this agent gets discovered and chosen.
agents-create-prompt-check-identity = Declares identity ("You are …")
agents-create-prompt-check-constraints = States hard rules (MUST / NEVER / Refuse)
agents-create-prompt-check-structure = Has structure (capabilities, constraints, output)
agents-create-prompt-check-substantial = Substantial enough (not a one-liner)
agents-create-prompt-required = A real system prompt is required (at least { $min } characters). Use the template to start.
agents-autonomy-draft-only = Assistive — drafts and recommends, makes no system changes
agents-autonomy-approval-required = Approval Required — prepares actions, routes to a human first
agents-autonomy-auto-low-risk = Delegated — acts on low-risk steps, escalates exceptions
agents-autonomy-full-auto = Autonomous — runs end-to-end within validated boundaries
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
agents-deploy-activating = Activating…
agents-deploy-error-role-required = Role is required to activate a Worker deployment.
agents-deploy-error-failed = Failed to activate Worker deployment.
agents-passport-empty-title = Not a Worker yet
agents-passport-empty-desc = Activate this agent as a Worker to give it a role, an owner, and governance.
agents-passport-empty-label = No Passport configuration available.
agents-activation-empty-title = No Worker runtime yet
agents-activation-empty-desc = Activate this agent as a Worker in Deployment before configuring autonomy, triggers, and live activity.
agents-activation-empty-label = No runtime configuration available.
agents-skill-search-placeholder = Search skills…
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
agents-policies-modal-search = Search policies by title…
agents-policies-modal-loading = Loading policies…
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
skills-browse-search = Caută abilități…
skills-browse-loading = Loading…
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
skills-browse-archived-loading = Loading archived…
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
skills-editor-attach-files = Attach files…
skills-editor-revert = Revert
skills-editor-publish = Publish v{ $version }
skills-editor-save-draft = Save draft
skills-editor-saving = Saving…
skills-create-title = Create new skill
skills-create-cancel-aria = Cancel creation
skills-create-name = Skill name
skills-create-description = Description
skills-create-instructions = Instructions
skills-create-will-save-as = Will be saved as
skills-create-tools = Tools
skills-create-add-tool = Add Tool to Skill
skills-create-attach-files = Attach files…
skills-create-cancel = Cancel
skills-create-submit = Create
skills-create-creating = Creating…
skills-add-tools-title = Add Tool to Skill
skills-add-tools-search = Search tools…
skills-add-tools-category = Category
skills-add-tools-all = All ({ $count })
skills-add-tools-loading = Loading tools…
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
skills-add-tools-loading-params = Loading parameters…
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
skills-version-loading = Loading versions…
skills-version-empty = No versions yet
skills-version-restore = Restore
skills-version-publish = Publish
skills-browse-loading-files = Se încarcă fișierele…
skills-browse-no-aux-files = Încă nu există fișiere auxiliare.
skills-browse-add-files = Adaugă fișiere
skills-tool-companions-hint = Adaugă aceste instrumente ca agentul să poată rezolva ID-uri/valori înainte de acțiune.
agents-skill-picker-error-load = Nu s-au putut încărca datele skill-ului
agents-skill-picker-error-pin = Versiunea fixată pentru { $skillId } nu este publicată. Alege Ultima publicată sau o versiune publicată.
agents-skill-picker-error-save = Nu s-au putut salva atribuirile de skill-uri
skills-source-functions = Instrumente
skills-source-native = Nativ
skills-source-flowbot = FlowBot
skills-source-mcp = MCP
skills-source-builtin = Integrat
skills-category-hr = HR & angajați
skills-category-crm = CRM
skills-category-irm = Investiții
skills-category-office = Office & intranet
skills-category-flow = Fluxuri & automatizări
skills-category-flowbot-actions = Acțiuni business
skills-category-expert = Experți
skills-category-create-expert = Creează expert
skills-category-documents = Documente
skills-category-knowledge = Cunoștințe
skills-category-email = E-mail
skills-category-meeting = Întâlniri
skills-category-calendar = Calendar
skills-category-analytics = Analize
skills-category-commerce = Comerț
skills-category-service = Service Desk
skills-category-charts = Grafice
skills-category-web = Web
skills-category-mcp = Conectori MCP
skills-category-structured-connectors = Date structurate
skills-category-unstructured-connectors = Date nestructurate
skills-category-control = Control & aprobare
skills-category-memory = Memorie
skills-category-session-documents = Documente sesiune
skills-category-policies = Politici
skills-category-graphql = GraphQL (avansat)
skills-category-uncategorized = Altele

# Memory lens (phase2-rest)
memory-lens-back-aria = Back to workspace
memory-lens-title = Ce știm despre tine
memory-lens-dev-badge = dev
memory-lens-subtitle = Tot ce agentul îți amintește — profil, preferințe, fapte învățate, modele și jurnal.
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
memory-lens-profile-empty = No profile brief yet. It is generated from your workspace facts and recent sessions — use Regenerate to build one.
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
memory-lens-facet-search-topic = Search topics…
memory-lens-facet-search-entity = Search people & things…
memory-lens-facet-no-match = No matches.
memory-lens-facet-count = { $count } { $unit }(s)
memory-lens-references-open = Open
memory-lens-graph-loading = Mapping your memory…
memory-lens-graph-empty-title = Nothing to map yet
memory-lens-graph-empty-desc = Memories will appear here once the agent has learned enough to connect topics, people, and facts.
memory-lens-graph-click-explore = Click a node to explore connections.
memory-lens-graph-controls-search = Search graph…
memory-lens-graph-controls-clear-aria = Clear search
memory-lens-graph-controls-fit-aria = Fit graph to view
memory-lens-graph-controls-searching = Searching…
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
memory-lens-graph-detail-loading = Loading…
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
trace-lens-subtitle = Debugger în stil LangSmith — instrumente, sub-agenți, experți, abilități și decizii în ordinea execuției.
trace-lens-refresh = Refresh
trace-lens-copied = Copied
trace-lens-copy-cursor = Copy for Cursor
trace-lens-copy = Copy
trace-lens-workforce = Workforce
trace-lens-workforce-source = Workforce · { $source }
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
trace-lens-filter-placeholder = Filter steps…
trace-lens-show-events = Show events
trace-lens-steps-count = { $count } steps
trace-lens-select-run = Select a run to inspect its trace.
trace-lens-loading = Loading trace…
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
agent-mesh-scope-company = Companie
agent-mesh-scope-user = Sesiuni utilizator
agent-mesh-scope-me = Sesiunile mele
agent-mesh-scope-session = Sesiune curentă
agent-mesh-scope-desc-company = Toate sesiunile din spațiul de lucru
agent-mesh-scope-desc-user = Sesiuni pentru un utilizator selectat
agent-mesh-scope-desc-me = Toate sesiunile tale
agent-mesh-scope-desc-session = Vizualizare live sau reluare a sesiunii
agent-mesh-scope-title-company = { -platform-ai-agent-network.label } companie
agent-mesh-scope-title-user = { -platform-ai-agent-network.label } utilizator
agent-mesh-scope-title-user-named = { -platform-ai-agent-network.label } pentru { $name }
agent-mesh-scope-title-me = { -platform-ai-agent-network.label } meu
agent-mesh-scope-title-session = { -platform-ai-agent-network.label } sesiune
agent-mesh-scope-subtitle-company = Toți { -platform-ai-agent-product.inline-plural }, skill-urile și tool-urile din spațiul de lucru
agent-mesh-scope-subtitle-user = { -platform-ai-agent-product.inline-plural }, skill-uri și tool-uri folosite de acest utilizator
agent-mesh-scope-subtitle-me = { -platform-ai-agent-product.inline-plural }, skill-uri și tool-uri în sesiunile tale
agent-mesh-scope-subtitle-session = Cum se conectează { -platform-ai-agent-product.inline-plural } · reia decizia care a produs răspunsul
agent-mesh-empty-title = Nicio sesiune selectată
agent-mesh-empty-desc = Deschide sau pornește o sesiune Every Fabric pentru a vedea { -platform-ai-agent-network.label } live — { -platform-ai-agent-product.inline-plural }, skill-uri și tool-uri conectate prin mesaje.
agent-mesh-back-landing = Înapoi la pagina principală
agent-mesh-loading-trace = Se încarcă urmele sesiunii…
agent-mesh-decision-default-title = Simulare decizie sesiune
agent-mesh-loading-data = Se încarcă datele mesh…
agent-mesh-error-load = Nu s-au putut încărca datele mesh
agent-mesh-empty-activity-title = Încă nu există activitate
agent-mesh-empty-activity-company = Nu au fost înregistrate sesiuni în spațiul de lucru.
agent-mesh-empty-activity-scope = Nu s-au găsit sesiuni pentru acest domeniu.
agent-mesh-view-graph = Graf
agent-mesh-view-cards = Carduri
agent-mesh-layer-agents = { -platform-ai-agent-product.label-plural }
agent-mesh-layer-skills = Skill-uri
agent-mesh-layer-tools = Tool-uri și conectori
agent-mesh-layers-title = Straturi
agent-mesh-layers-edge-labels = Etichete muchii
agent-mesh-status-online = { $agents } { $agents ->
    [one] agent
   *[other] agenți
} online · { $tools } { $tools ->
    [one] tool
   *[other] tool-uri
} accesibile
agent-mesh-breadcrumb-nav-aria = Navigare mesh
agent-mesh-breadcrumb-user-fallback = Utilizator { $id }…
agent-mesh-breadcrumb-session-fallback = Sesiune { $id }…
agent-mesh-back-previous = Înapoi la vizualizarea mesh anterioară
agent-mesh-back-workspace = Înapoi la spațiul de lucru
agent-mesh-back-shortcut = Înapoi (Backspace)
agent-mesh-back-previous-view = Înapoi la vizualizarea anterioară
agent-mesh-trace-explorer = Trace Explorer
agent-mesh-view-changed = Vizualizare schimbată la { $title }
agent-mesh-fullscreen-enter = Intră în ecran complet
agent-mesh-fullscreen-exit = Ieși din ecran complet
agent-mesh-fullscreen-shortcut-esc = { $label } (F sau Esc)
agent-mesh-fullscreen-shortcut = { $label } (F)
agent-mesh-scope-aria = Domeniu mesh
agent-mesh-layers-aria = Straturi mesh
agent-mesh-search-placeholder = Caută agenți, skill-uri, tool-uri…
agent-mesh-search-aria = Caută noduri mesh
agent-mesh-search-clear = Șterge căutarea
agent-mesh-search-no-matches = Niciun rezultat pentru „{ $query }“
agent-mesh-node-orchestrator = orchestrator
agent-mesh-node-agent = { -platform-ai-agent-product.inline }
agent-mesh-node-skill = skill
agent-mesh-node-tool = tool
agent-mesh-view-2d = Comută la vizualizare 2D
agent-mesh-view-3d = Comută la vizualizare 3D
agent-mesh-toggle-layers = Comută panoul de straturi
agent-mesh-live-hud-title = Activitate live vizibilă în acest mesh
agent-mesh-live-hud-sessions = { $count } live
agent-mesh-live-hud-agents = { $count } agenți
agent-mesh-live-hud-tools = { $count } tool-uri
agent-mesh-replay-aria = Cronologie reluare
agent-mesh-replay-pause = Pauză reluare
agent-mesh-replay-play = Redă reluarea
agent-mesh-replay-restart = Repornește reluarea
agent-mesh-replay-seek = Caută în cronologia reluării
agent-mesh-replay-events = { $count } { $count ->
    [one] eveniment
   *[other] evenimente
}
agent-mesh-replay-live = Live
agent-mesh-decision-aria = Simulare decizie
agent-mesh-decision-heading = Simulare decizie
agent-mesh-decision-replay-summary = Reia cum a fost asamblat răspunsul · { $agents } { $agents ->
    [one] agent
   *[other] agenți
} · { $tools } { $tools ->
    [one] apel tool
   *[other] apeluri tool
}
agent-mesh-decision-stat-runtime = { $duration } durată
agent-mesh-decision-stat-tokens = { $tokens } tokeni
agent-mesh-decision-stat-cost = ${ $cost } cost
agent-mesh-decision-stat-count = { $count } decizii
agent-mesh-decision-empty = Încă nu există decizii sau evenimente.
agent-mesh-decision-conf = conf { $percent }%
agent-mesh-overview-title = Prezentare generală
agent-mesh-overview-agents = Agenți
agent-mesh-overview-tools = Tool-uri
agent-mesh-overview-sessions = Sesiuni
agent-mesh-overview-users = Utilizatori
agent-mesh-overview-top-agents = Top agenți
agent-mesh-overview-top-skills = Top skill-uri
agent-mesh-overview-top-tools = Top tool-uri
agent-mesh-overview-no-agents = Niciun agent înregistrat
agent-mesh-overview-no-skills = Niciun skill înregistrat
agent-mesh-overview-no-tools = Niciun tool înregistrat
agent-mesh-overview-active-users = Utilizatori activi
agent-mesh-overview-recent-sessions = Sesiuni recente
agent-mesh-overview-user-sessions = { $count } sesiuni
agent-mesh-edge-view-message = Vezi mesajul între agenți
agent-mesh-edge-view-message-title = Click pentru mesajul complet
agent-mesh-edge-message-aria = mesaj { $kind }
agent-mesh-edge-close = Închide detaliul mesajului
agent-mesh-edge-status = Status
agent-mesh-edge-no-body = (Niciun conținut de mesaj înregistrat.)
agent-mesh-edge-unknown-source = Sursă necunoscută
agent-mesh-edge-unknown-target = Țintă necunoscută
agent-mesh-edge-sessions = Sesiuni ({ $count })
agent-mesh-edge-kind-delegation = Delegare
agent-mesh-edge-kind-tool-call = Apel tool
agent-mesh-edge-kind-expert-call = Apel expert
agent-mesh-edge-kind-skill-load = Încărcare skill
agent-mesh-edge-kind-completion = Finalizare
agent-mesh-node-detail-aria = Detaliu nod: { $label }
agent-mesh-node-detail-close = Închide detaliul
agent-mesh-node-detail-status = Status
agent-mesh-node-detail-invocations = Invocări
agent-mesh-node-detail-duration = Durată
agent-mesh-node-detail-first-seen = Prima apariție
agent-mesh-node-detail-used-by = Folosit de { $count } { $count ->
    [one] utilizator
   *[other] utilizatori
}
agent-mesh-node-detail-sessions = { $count } { $count ->
    [one] sesiune
   *[other] sesiuni
}
agent-mesh-node-detail-inbound = Intrare ({ $count })
agent-mesh-node-detail-outbound = Ieșire ({ $count })
agent-mesh-node-detail-skills = Skill-uri ({ $count })
agent-mesh-node-detail-auto-detected = Detectat automat
agent-mesh-node-skills-aria = { $count } { $count ->
    [one] skill
   *[other] skill-uri
}
agent-mesh-node-live-sessions = { $count } sesiuni live
agent-mesh-glass-heading = Agenți companie
agent-mesh-glass-value = { $count } { $count ->
    [one] agent
   *[other] agenți
}

# Scheduled tasks (phase2-rest)
scheduled-title = Sarcini programate
scheduled-back-aria = Înapoi
scheduled-refresh-aria = Reîmprospătează
scheduled-close = Închide
scheduled-new-task = Sarcină nouă
scheduled-editing = Editare program
scheduled-title-placeholder = Titlul programului
scheduled-task-placeholder = Sarcina agentului la fiecare recurență
scheduled-repeat = Repetă
scheduled-frequency-once = O dată
scheduled-frequency-daily = Zilnic
scheduled-frequency-weekly = Săptămânal
scheduled-frequency-monthly = Lunar
scheduled-save-template = Salvează ca șablon
scheduled-saving-template = Se salvează…
scheduled-create-once = Programează sarcina
scheduled-create-recurring = Creează program recurent
scheduled-saving = Se salvează…
scheduled-creating = Se creează…
scheduled-save-changes = Salvează modificările
scheduled-tab-all = Toate
scheduled-tab-pending = În așteptare
scheduled-tab-sent = Trimise
scheduled-tab-failed = Eșuate
scheduled-tab-cancelled = Anulate
scheduled-try-again = Încearcă din nou
scheduled-empty-title = Încă nu există sarcini programate
scheduled-empty-desc = Începe de la un șablon de mai jos sau cere agentului în chat să programeze una.
scheduled-status-pending = În așteptare
scheduled-status-firing = Se trimite…
scheduled-status-fired = Trimis
scheduled-status-cancelled = Anulat
scheduled-status-failed = Eșuat
scheduled-badge-agent-run = Rulare agent
scheduled-badge-recurring = Recurent
scheduled-subtitle-agent-session = Sesiune durabilă { -platform-ai-agent-product.inline }
scheduled-subtitle-assignees = { $count } { $count ->
    [one] responsabil
   *[other] responsabili
}
scheduled-open-result = Deschide rezultatul
scheduled-run-now = Rulează acum
scheduled-edit-aria = Editează
scheduled-cancel = Anulează
scheduled-disable = Dezactivează
scheduled-enable = Activează
scheduled-retry = Reîncearcă
scheduled-delete = Șterge
scheduled-keep = Păstrează
scheduled-delete-aria = Șterge
scheduled-collapse = Restrânge
scheduled-expand = Extinde
scheduled-detail-message = Mesaj
scheduled-detail-assignees = Responsabili ({ $count })
scheduled-detail-result = Rezultat
scheduled-detail-open-session = Deschide sesiunea agentului pentru a vedea rezultatul
scheduled-detail-recurrence = Recurență
scheduled-detail-recurrence-next = { $label } · următoarea rulare { $when }
scheduled-detail-run-history = Istoric rulări
scheduled-detail-triggered = Declanșat
scheduled-detail-open = Deschide
scheduled-detail-inbox = Livrat în inbox
scheduled-detail-inbox-summary = { $count } { $count ->
    [one] sarcină
   *[other] sarcini
} livrate în inbox-ul responsabilului{ $plural }
scheduled-detail-last-attempt = Ultima încercare:
scheduled-detail-sent-at = Trimis la:
scheduled-detail-id = ID: { $id }
scheduled-templates-quick-start = Start rapid
scheduled-templates-delete-aria = Șterge șablonul
scheduled-err-task-required = Adaugă sarcina pe care agentul trebuie să o ruleze.
scheduled-err-datetime-required = Alege o dată și oră viitoare.
scheduled-err-datetime-future = Ora programată trebuie să fie în viitor.
scheduled-err-save-failed = Modificările nu au putut fi salvate.
scheduled-err-template-task = Adaugă sarcina înainte de a o salva ca șablon.
scheduled-err-template-save = Șablonul nu a putut fi salvat.
scheduled-err-create-failed = Programul nu a putut fi creat.
scheduled-dispatch-err-auth-label = Autentificare eșuată
scheduled-dispatch-err-unavailable-label = Serviciu indisponibil
scheduled-dispatch-err-timeout-label = Timp expirat
scheduled-dispatch-err-assignee-label = Responsabil invalid
scheduled-dispatch-err-unknown-label = Eșuat
scheduled-dispatch-err-auth-msg = Autentificarea la flow engine a eșuat (token lipsă sau respins). Verifică credențialele service-account și reîncearcă.
scheduled-dispatch-err-unavailable-msg = Flow engine nu a putut fi contactat. Verifică dacă serviciul rulează.
scheduled-dispatch-err-timeout-msg = Flow engine nu a răspuns la timp. Reîncearcă când este accesibil.
scheduled-dispatch-err-assignee-msg = Un responsabil nu a putut fi rezolvat. Verifică dacă încă există.
scheduled-dispatch-err-unknown-msg = Sarcina nu a putut fi livrată.
scheduled-dispatch-details = Detalii
scheduled-dispatch-hide-details = Ascunde detaliile

# Error boundary (phase2-rest)
error-boundary-title = Every Fabric s-a oprit la randare
error-boundary-unknown = Eroare de randare necunoscută
error-boundary-retry = Reîncarcă spațiul de lucru

# Artifacts (phase2-rest)
artifact-replay-animation = Redă animația
artifact-replay-label = Redă
artifact-chart-empty = Nu există conținut pentru grafic.

# Connectors (phase2-rest)
connectors-picker-title = Conectori
connectors-picker-loading = Se încarcă conectorii…
connectors-picker-empty = Nu există conectori disponibili.
connectors-picker-close-aria = Închide

# Forms (phase2-rest)
forms-employee-search-placeholder = Caută și selectează angajat…
forms-employee-change = Schimbă
forms-employee-auth-required = Autentificare necesară pentru căutarea angajaților
forms-employee-error = Eroare: { $error }
forms-employee-searching = Se caută angajați…
forms-employee-no-match = Nu s-au găsit angajați care să corespundă căutării
forms-employee-start-typing = Începe să tastezi pentru a căuta angajați

# Trace explorer timeline (phase2-rest)
trace-explorer-timeline-empty = Nu există încă date pentru cronologie
trace-explorer-timeline-truncated = Se afișează { $shown } din { $total } cadre
trace-explorer-bar-running = în curs
trace-explorer-legend-tool = Apel instrument
trace-explorer-legend-subagent = Delegare
trace-explorer-legend-expert = Expert
trace-explorer-legend-decision = Decizie
trace-explorer-legend-skill = Abilitate
trace-explorer-legend-hitl = Input uman
trace-explorer-legend-step = Pas
trace-explorer-legend-terminal = Terminal
trace-explorer-legend-capability-missing = Lipsă
trace-explorer-legend-artifact = Artefact
trace-explorer-legend-other = Altele

# Glass card sphere (phase2-rest)
glass-card-status-running = În execuție
glass-card-status-active = Activ
glass-card-status-renewing = Reînnoire
glass-card-status-trial = Probă
glass-card-status-paused = Pauză

# Artifacts toolbar & renderers (phase2-rest)
artifact-type-html = HTML
artifact-type-document = Document
artifact-type-markdown = Markdown
artifact-type-slide = Diapozitive
artifact-type-chart = Grafic
artifact-type-table = Tabel
artifact-type-diagram = Diagramă
artifact-type-app-preview = Previzualizare aplicație
artifact-type-code = Cod
artifact-type-unknown = Fișier
artifact-view-preview = Previzualizare
artifact-view-code = Cod
artifact-copy-content = Copiază conținutul
artifact-copy = Copiază
artifact-copied = Copiat!
artifact-download = Descarcă
artifact-download-png = Descarcă ca PNG
artifact-open-tab = Deschide în tab nou
artifact-close-viewer = Închide vizualizatorul
artifact-table-empty = Nu există conținut de tabel disponibil.
artifact-table-no-rows = Nu există rânduri de tabel disponibile.
artifact-app-preview-desc = Sursă de previzualizare a aplicației generate. Execuția interactivă este dezactivată în vizualizatorul de artefacte; revizuiește sau descarcă sursa.
artifact-loading-document = Se încarcă documentul…
artifact-loading-diagram = Se încarcă diagrama…
artifact-loading-slides = Se încarcă diapozitivele…
artifact-slides-empty = Nu s-au găsit diapozitive.
artifact-slide-notes = Note

# Sidebar navigation (phase2-rest completion)
sidebar-nav-aria = Navigare { -platform-ai-agent-product.label-plural }
sidebar-section-workspace = Spațiu de lucru
sidebar-section-active-session = Sesiune activă
sidebar-badge-new = NOU
sidebar-expand-tooltip = Extinde bara laterală
sidebar-collapse-tooltip = Restrânge bara laterală

# Final answer compact summaries (phase2-rest completion)
renderer-compact-summary-single = Am creat { $type } „{ $title }”. Poți să-l revizuiești pe canvas, să-l rafinezi cu instrucțiuni ulterioare sau să-l salvezi în documente.
renderer-compact-summary-multi = Am creat { $count } elemente: { $titles }. Poți să le revizuiești pe canvas sau să le salvezi în spațiul de lucru.
renderer-dashboard-ready = Panou gata — vezi vizualizarea mai jos.

# Agent mesh 3D node (phase2-rest completion)
agent-mesh-node-live-badge = •{ $count } live
