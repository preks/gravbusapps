# Flow Studio Traduceri (Română)

# App
app-title = Flow Studio
app-description = Proiectați și configurați fluxuri de lucru vizual
app-eyebrow = Create

# Studio navigation
studio-back-to-list = Înapoi la listă
studio-discard-title = Renunțați la modificări?
studio-discard-desc = Aveți modificări nesalvate. Ieșiți fără salvare și renunțați la ele.
studio-discard-cancel = Continuă editarea
studio-discard-confirm = Renunță și închide
studio-save-name-title = Denumiți flow-ul înainte de salvare
studio-save-name-description = Oferiți acestui flow un nume clar pentru a putea fi salvat și găsit mai târziu.
studio-save-name-label = Nume flow
studio-save-name-placeholder = ex. Onboarding angajat
studio-save-name-validation = Introduceți un nume pentru flow înainte de salvare.
studio-save-name-cancel = Anulează
studio-save-name-confirm = Salvează flow-ul

# Labels / Tags
labels-title = Etichete
labels-tab-categories = Categorii
labels-tab-custom = Etichete personalizate
labels-app = Aplicație
labels-app-placeholder = Selectați o aplicație
labels-service-category = Categorie serviciu
labels-service-category-placeholder = Selectați o categorie de serviciu
labels-dwp-category = Categorie Digital Workplace
labels-dwp-category-placeholder = Selectați o categorie Digital Workplace
labels-none = Nicio selecție
labels-preview = Previzualizare
labels-custom-title = Etichete personalizate
labels-custom-description = Adăugați etichete cheie/valoare pentru filtrare și organizare.
labels-custom-add = Adaugă etichetă
labels-key = Cheie
labels-key-placeholder = ex. solution
labels-value = Valoare
labels-value-placeholder = ex. compliance
labels-cancel = Anulează
labels-save = Salvează
labels-error-duplicate = Cheie duplicată: {$key}

# List
list-title = Flows
list-subtitle = Răsfoiți și deschideți șabloane de flow existente
list-search = Caută
list-search-placeholder = Caută flows...
list-sort = Sortare
list-sort-name-asc = Nume (A–Z)
list-sort-name-desc = Nume (Z–A)
list-sort-version-desc = Versiune (mare → mic)
list-sort-steps-desc = Pași (mare → mic)
list-create = Creează flow
list-empty-title = Nu au fost găsite flows
list-empty-subtitle = Ajustați căutarea sau creați un flow nou.
list-col-name = Nume
list-col-app = Categorie
list-col-created-by = Creator
list-col-updated = Ultima actualizare
list-col-type = Tip
list-col-version = Versiune
list-col-steps = Pași
list-col-labels = Etichete
list-untitled = Fără titlu
list-no-id = Fără ID
list-error-title = Nu s-au putut încărca flows
list-retry = Reîncearcă
list-pager-summary = {$from}–{$to} din {$total}
list-pager-empty = Niciun rezultat
list-prev = Înapoi
list-next = Înainte

# Mode Toggle
mode-simple = Simplu
mode-advanced = Avansat
mode-toggle-label = Mod Designer
mode-simple-description = Design simplificat pentru utilizatori de business
mode-advanced-description = Design complet pentru utilizatori experți

# Canvas
canvas-empty-title = Începeți construirea fluxului
canvas-empty-description = Trageți noduri din paletă sau faceți clic pentru a adăuga
canvas-zoom-in = Mărește
canvas-zoom-out = Micșorează
canvas-fit-view = Potrivire vizualizare
canvas-auto-layout = Aranjare automată

# Node Palette
palette-title = Noduri
palette-start = Start
palette-task = Sarcină
palette-approval = Aprobare
palette-decision = Decizie
palette-fork = Împărțire paralelă
palette-join = Unificare paralelă
palette-end = Sfârșit

# Toolbar
toolbar-save = Salvează
toolbar-publish = Publică
toolbar-simulate = Simulează
toolbar-undo = Anulează
toolbar-redo = Refă
toolbar-delete = Șterge
toolbar-duplicate = Duplică

# Config Panels
config-panel-title = Configurare
config-general = General
config-form = Formular
config-assignment = Atribuire
config-conditions = Condiții
config-branches = Ramuri
config-events = Automatizare
config-parameters = Parametri
config-rework = Reluare

# Start Node Config
start-trigger-type = Tip declanșator
start-trigger-manual = Formular manual
start-trigger-webhook = Webhook
start-trigger-event = Eveniment
start-trigger-schedule = Programare

# Task Node Config
task-title = Titlu sarcină
task-message = Mesaj sarcină
task-instruction = Instrucțiune AI
task-switch-type = Schimbă tipul pasului
task-type = Tip sarcină
task-type-task = Sarcină
task-type-approval = Aprobare
task-type-information = Informație
task-type-acknowledge = Confirmare
task-type-function = Funcție
task-type-ai_agent = Agent EveryAI
task-type-ai_task_expert = Expert sarcină AI
task-kind = Tip pas
task-kind-user = Pas utilizator
task-kind-system = Pas sistem

# Task links / attachments
task-links-title = Linkuri
task-links-subtitle = Atașați documente și adăugați referințe utile.
task-links-add = Adaugă link
task-links-empty = Nu există linkuri configurate încă.
task-links-item = Link
task-links-kind = Tip
task-links-kind-document = Document
task-links-kind-link = Link
task-links-document-source = Document din pas anterior
task-links-document-source-placeholder = Selectați un câmp fișier…
task-links-document-empty-hint = Nu au fost găsite încărcări de fișiere în pașii anteriori.
task-links-link-type = Tip link
task-links-link-type-knowledge = Bază de cunoștințe
task-links-link-type-policy = Articol de politici
task-links-link-type-external = URL extern
task-links-picker-knowledge = Articol din baza de cunoștințe
task-links-picker-policy = Articol de politici
task-links-picker-placeholder = Selectați conținut…
task-links-picker-search = Căutați conținut…
task-links-name = Nume
task-links-name-placeholder = ex. Contract, Politică, FAQ
task-links-url = URL
task-links-url-placeholder = https://exemplu.ro
task-links-document-url = Referință document (expresie)
task-links-document-url-placeholder = {{ $steps.step_0.formData.fileField }}

# AI Task Expert parameter mapping
task-input-params = Parametri de intrare
task-input-params-loading = Se încarcă parametrii...
task-input-params-empty = Nu au fost găsiți parametri.
task-input-params-system = Parametri de sistem
task-input-params-user = Parametri utilizator
task-input-params-pick = Selectați valoarea
task-input-params-expression-placeholder = Tastați {{ pentru a mapa date din flux.
task-input-params-unmapped = Nemapat

# EveryAI Agent output schema
task-output-schema-title = Schemă de ieșire
task-output-schema-desc = Definiți ieșirea structurată produsă de acest agent pentru pașii următori.

# Task step type selector (signature)
task-type-group-human = Pași utilizator
task-type-group-ai = AI & Automatizări

# Assignment
assignment-due-label = Timp limită
assignment-due-description = Stabiliți cât timp au destinatarii să finalizeze această sarcină.
assignment-due-placeholder = ex. 2
assignment-due-unit-minutes = Minute
assignment-due-unit-hours = Ore
assignment-due-unit-days = Zile
assignment-mode-label = Mod de atribuire
assignment-mode-claim = Preluare
assignment-mode-assign = Atribuire
assignment-mode-deferred = Amânat
assignment-mode-claimable = Preluare
assignment-mode-auto = Atribuire
assignment-mode-runtime = Furnizat la execuție
assignment-mode-desc-claim = Oricine din audiența selectată poate prelua această sarcină.
assignment-mode-desc-assign = Se creează o sarcină individuală pentru fiecare persoană din audiența selectată.
assignment-mode-desc-deferred = Țintele sunt rezolvate la rulare (avansat).
assignment-mode-desc-claimable = Utilizatorii cu capabilitățile selectate pot prelua această sarcină.
assignment-mode-desc-auto = Atribuie automat printr-o strategie (sau la execuție).
assignment-mode-desc-runtime = Destinatarii trebuie furnizați la pornirea execuției.
assignment-audience-label = Audiență
assignment-capabilities-label = Capabilități
assignment-runtime-hint = Acest pas trebuie atribuit la pornirea fluxului.
assignment-assign-at-execution-label = Atribuie la execuție
assignment-assign-at-execution-desc = Furnizați destinatarul la pornirea fluxului.
assignment-assign-at-execution-multi-label = Permite mai mulți destinatari
assignment-assign-at-execution-multi-desc = Permite launcher-ului să selecteze mai mulți destinatari pentru acest pas.
assignment-allow-reassignment-label = Permite reasignarea
assignment-allow-reassignment-desc = Destinatarul poate reasigna această sarcină.

# Logic decisions
logic-description-simple = Alegeți o valoare din pași și comparați-o. Prima condiție potrivită câștigă.
logic-description-advanced = Definiți condiții cu context de flux. Prima condiție potrivită câștigă.
logic-field-label = Valoare
logic-default = Ramură implicită
logic-field-placeholder = Selectați valoarea
logic-field-search = Căutați în datele pașilor...
logic-field-empty = Nicio valoare găsită
logic-field-group-steps = Datele pașilor
flow-context-search = Căutați în contextul flow-ului...
flow-context-group = Context flow
logic-operator-label = Operator

# User decisions (USER mode)
decision-user-task-title-label = Titlu sarcină
decision-user-task-message-label = Mesaj sarcină
decision-user-task-message-placeholder = Adăugați un mesaj scurt… Tastează {{ pentru a insera date.

logic-value-label = Compară cu
logic-value-placeholder = ex. 1000 sau 'approved'
logic-preview = Condiție:

# User decisions (USER mode)
decision-user-task-title-label = Titlu sarcină
decision-user-task-message-label = Mesaj sarcină
decision-user-task-message-placeholder = Adăugați un mesaj scurt… Tastează {{ pentru a insera date.

# Decision Node Config
decision-mode = Mod decizie
decision-mode-user = Decizie utilizator
decision-mode-ai = Decizie IA
decision-mode-logic = Decizie logică
decision-branch-add = Adaugă ramură
decision-default-branch = Ramură implicită
decision-confidence = Prag de încredere
decision-escalation = Escaladare
decision-policy = Politică de decizie
decision-policy-optional-placeholder = Opțional: selectează o politică...
decision-ai-executor-label = Executor IA
decision-ai-executor-everyai = EveryAI
decision-ai-executor-everyai-desc = Folosește instrucțiuni de decizie (cu context de flux) și lasă EveryAI să aleagă ramura potrivită.
decision-ai-executor-taskexpert = AI Task Expert
decision-ai-executor-taskexpert-desc = Rulează Task Expert și rutează prin reguli de mapare. Dacă nicio regulă nu se potrivește, un om alege ramura.
decision-ai-type-label = Configurare decizie
decision-ai-type-policy = Ghidat de politică
decision-ai-type-policy-desc = Folosiți un document de politică drept ghid pentru decizie.
decision-ai-type-expert = Expert IA
decision-ai-type-expert-desc = Selectați un expert IA din Prompt Manager pentru a lua decizia.
decision-ai-instructions-label = Instrucțiuni de decizie
decision-ai-instructions-desc = Adăugați context sau reguli pentru IA, inclusiv când ar trebui să escaladeze către fallback-ul uman.
decision-ai-instructions-placeholder = ex. Preferă ramura A dacă scorul de risc este peste valoarea dintr-un pas anterior.
decision-escalation-how-title = Cum funcționează escaladarea
decision-escalation-how-desc = Dacă IA cere escaladare, returnează ieșire invalidă sau rezultatul nu poate fi mapat la o ramură, se creează o sarcină de decizie pentru utilizator și acesta selectează ramura următoare.
decision-escalation-due-label = Decizia escaladată este scadentă în
decision-human-fallback-title = Fallback uman
decision-human-fallback-desc = Configurează cine primește sarcina de decizie fallback și ce vede utilizatorul când IA nu poate decide.
decision-human-instructions-label = Mesajul sarcinii fallback
decision-human-instructions-desc = Obligatoriu. Este afișat când un om trebuie să aleagă ramura. Poți insera context de flux.
decision-human-instructions-placeholder = ex. IA nu a putut decide. Te rugăm să alegi cea mai potrivită ramură.
decision-ai-taskexpert-mapping-label = Reguli de mapare
decision-ai-taskexpert-mapping-desc = Definește reguli care mapează ieșirea Task Expert către o ramură.
decision-ai-taskexpert-picker-desc = Selectează ce Task Expert trebuie să ruleze pentru această decizie.
decision-ai-taskexpert-picker-placeholder = Selectează un Task Expert...
decision-ai-taskexpert-picker-search = Caută Task Experts...
decision-ai-taskexpert-picker-empty = Nu s-au găsit Task Experts.
decision-ai-taskexpert-params-desc = Mapează explicit fiecare parametru al promptului la contextul de flux care trebuie trimis către Task Expert-ul selectat.
decision-ai-taskexpert-reasoning-label = Mapare ieșire pentru justificare
decision-ai-taskexpert-reasoning-desc = Opțional. Selectează câmpul din ieșire care va fi folosit ca justificare pentru fallback-ul uman.
decision-ai-taskexpert-reasoning-placeholder = Selectează câmpul (opțional)
decision-ai-taskexpert-reasoning-none = Niciunul
decision-due-label = Decizia este scadentă în
decision-due-placeholder = ex. 2
decision-due-unit-minutes = Minute
decision-due-unit-hours = Ore
decision-due-unit-days = Zile

# Fork/Join Config
fork-branches = Ramuri paralele
fork-add-branch = Adaugă ramură
join-condition = Condiție de unificare
join-wait-all = Așteaptă toate
join-wait-any = Așteaptă oricare

# Rework / Go-Back
rework-title = Reluare
rework-on-reject = La respingere
rework-send-back-to = Trimite înapoi la
rework-reason-required = Motiv obligatoriu
rework-preserve-data = Păstrează datele formularului
rework-max-iterations = Iterații maxime

# Simulation
sim-title = Simulare
sim-start = Pornește simularea
sim-stop = Oprește
sim-pause = Pauză
sim-resume = Continuă
sim-provide-input = Furnizează date
sim-completed = Simulare finalizată
sim-step-log = Jurnal pași
sim-mock-data = Date de test

# Validation
validation-title = Validare
validation-no-start = Fluxul trebuie să aibă un nod de start
validation-no-end = Fluxul trebuie să aibă un nod de sfârșit
validation-orphan-nodes = Noduri orfane detectate
validation-fork-no-join = Nodul de împărțire nu are un nod de unificare corespunzător
validation-decision-branches = Decizia trebuie să aibă cel puțin 2 ramuri
validation-disconnected = Unele noduri nu sunt conectate
