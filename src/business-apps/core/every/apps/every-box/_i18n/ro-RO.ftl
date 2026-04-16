# EveryBox Translations - Romanian

# Main Component
every-box-title = EveryBox
every-box-blink-button = Blink
every-box-tab-inflows = Intrări
every-box-tab-outflows = Ieșiri
every-box-blink-description = Creați și atribuiți rapid o sarcină
every-box-search-placeholder = Căutare...
every-box-sort-label = Sortare
every-box-sort-newest = Cele mai noi
every-box-sort-oldest = Cele mai vechi
every-box-sort-priority = Prioritate
every-box-refresh-label = Reîmprospătare
every-box-due-filter-label = Termen
every-box-due-filter-any = Oricare
every-box-due-filter-overdue = Întârziat
every-box-due-filter-due-soon = Scadent în <24h
every-box-due-filter-has = Are termen
every-box-due-filter-none = Fără termen

# Filters Dropdown
filters-dropdown-label = Filtre
filters-all = Toate
filters-blinks = Blinks
filters-approvals = Aprobări
filters-completed = Finalizate
filters-active-count = { $count } active

# Detail Panel
detail-panel-empty = Selectați o sarcină pentru a vedea detaliile
detail-panel-empty-flow = Selectați un flux de lucru pentru a vedea detaliile

# Inbox View
inbox-search-placeholder = Căutare sarcini...
inbox-clear-search = Șterge căutarea
inbox-filter-all = Toate
inbox-filter-blinks = Blinks
inbox-filter-approvals = Aprobări
inbox-filter-completed = Finalizate
inbox-new-tasks-title = Sarcini noi disponibile
inbox-new-tasks-button = Încarcă sarcini noi
inbox-new-tasks-description = Au sosit sarcini noi. Apăsați pentru a le vedea.
inbox-new-completed-tasks-description = Au sosit sarcini finalizate noi. Apăsați pentru a le vedea.
inbox-error-title = Eroare la încărcarea sarcinilor
inbox-showing-tasks = Afișare {$current} din {$total}{$hasMore} sarcini
inbox-load-more = Încarcă mai multe
inbox-loading-more = Se încarcă mai multe sarcini...

# Inbox Empty States
inbox-empty-no-results = Nu s-au găsit sarcini pentru "{$query}"
inbox-empty-no-blinks = Nu există sarcini Blink momentan
inbox-empty-no-approvals = Nu există sarcini de aprobare momentan
inbox-empty-no-completed = Nu există sarcini finalizate încă
inbox-empty-no-tasks = Nu aveți sarcini atribuite momentan

# Outbox View
outbox-search-placeholder = Căutare fluxuri de lucru...
outbox-clear-search = Șterge căutarea
outbox-filter-all = Toate
outbox-filter-blinks = Blinks
outbox-filter-requests = Cereri
outbox-error-title = Eroare la încărcarea fluxurilor
outbox-error-unable = Nu s-au putut încărca fluxurile
outbox-error-server = Serverul are probleme de performanță. Aceasta este o problemă cunoscută.
outbox-try-again = Încearcă din nou

# Outbox Empty States
outbox-empty-no-results = Nu s-au găsit fluxuri pentru "{$query}"
outbox-empty-no-blinks = Nu ați trimis niciun blink încă
outbox-empty-no-requests = Nu ați inițiat nicio cerere încă
outbox-empty-no-workflows = Nu ați inițiat niciun flux de lucru încă

# Empty State Titles
empty-state-inbox-title = InFlows Gol
empty-state-outbox-title = Niciun flux de lucru pornit
empty-state-completed-title = Nicio sarcină finalizată

# Quick Task Modal
blink-created-success = Blink "{$title}" creat cu succes!
blink-created-error = Nu s-a putut crea Blink: {$error}
blink-upload-error = Nu s-au putut încărca atașamentele: {$error}

# TaskCard Component
task-card-overdue = Întârziat
task-card-due-soon = Scadent în curând
task-card-due = Scadent {$date}
task-card-due-in-hours = Scadent în {$hours}h
task-card-overdue-hours = Întârziat {$hours}h
task-card-due-in-days = Scadent în {$days}z
task-card-overdue-days = Întârziat {$days}z
task-card-tooltip-due-hours = Scadent în {$hours} ore
task-card-tooltip-due-days = Scadent în {$days} zile
task-card-tooltip-overdue-hours = Întârziat: {$hours} ore
task-card-tooltip-overdue-days = Întârziat: {$days} zile
task-card-blink = Blink
task-card-unknown-creator = Necunoscut
task-card-untitled = Sarcină fără titlu
task-card-pinned = Fixată

# Task meta actions (Everybox-service)
task-meta-pin = Fixează
task-meta-unpin = Anulează fixarea
task-meta-mark-unread = Marchează ca necitit
task-meta-priority = Prioritate
task-meta-priority-none = Niciuna
task-meta-priority-high = Ridicată
task-meta-priority-medium = Medie
task-meta-priority-low = Scăzută

# FlowCard Component
flow-card-blink = Blink
flow-card-service-request = Cerere de serviciu
flow-card-expenses = Cheltuieli
flow-card-absences = Absențe
flow-card-assignee-progress = {$completed} din {$total} finalizate
flow-card-progress = Progres
flow-card-steps = {$current} din {$total} pași
flow-card-started = Început {$date}
flow-card-completed = Finalizat {$date}

# TaskDetailHeader Component
task-detail-header-employee-avatar = Avatar angajat
task-detail-header-employee = Angajat

# TaskDetailFooter Component
task-footer-claim = Preia sarcina
task-footer-complete = Finalizează sarcina
task-footer-approve = Aprobă
task-footer-acknowledge = Confirmă

# Task Completion Details
task-completion-details-title = Detalii finalizare
task-approval-details-title = Detalii aprobare
task-acknowledge-details-title = Detalii confirmare
task-completion-completed-by = Finalizat de
task-completion-completed-at = Finalizat la
task-completion-outcome = Rezultat
task-completion-comment = Comentariu
task-completion-outcome-completed = Finalizat
task-completion-outcome-approved = Aprobat
task-completion-outcome-rejected = Respins
task-completion-outcome-acknowledged = Confirmat
task-footer-reject = Respinge
task-footer-reassign = Reatribuie
task-footer-unclaim = Eliberează
task-details-task-claimed = Sarcina a fost preluată cu succes!
task-details-task-unclaimed = Sarcina a fost eliberată cu succes!

# FlowDetailDialog Component
flow-detail-loading = Se încarcă...
flow-detail-in-progress = În curs • Început {$date}
flow-detail-completed-at = Finalizat {$date}
flow-detail-assignee-progress = Progres responsabil
flow-detail-overall-progress = Progres general
flow-detail-steps-count = {$current} din {$total} pași
flow-detail-completed-count = {$completed} din {$total} finalizate
flow-detail-started = Început
flow-detail-completed = Finalizat
flow-detail-initiated-by = Inițiat de
flow-detail-template = Șablon
flow-detail-assignee-status = Status responsabil
flow-detail-assignee = Responsabil
flow-detail-flow-steps = Pași flux de lucru
flow-detail-step = Pasul {$number}: {$title}
flow-detail-assigned-to = Atribuit către: {$name}
flow-detail-completed-by = Finalizat de: {$name}

# TaskDetailDialog Component
task-dialog-completed-success = ✓ Sarcină finalizată cu succes!
task-dialog-blink-completed-success = ✓ Blink finalizat cu succes!
task-dialog-complete-error = Sarcina nu a putut fi finalizată: {$error}
task-dialog-loading = Se încarcă detaliile sarcinii...
task-dialog-close = Închide
task-dialog-completing = Se finalizează...
task-dialog-complete-task = Finalizează sarcina
task-dialog-missing-user-info = Nu se poate finaliza sarcina: lipsesc informațiile utilizatorului.
task-dialog-lowcoder-screen = Ecran Lowcoder

# CompletedView Component
completed-search-placeholder = Căutare sarcini finalizate...
completed-error-title = Eroare la încărcarea sarcinilor finalizate
completed-empty-search = Nu s-au găsit sarcini finalizate pentru "{$query}"
completed-empty-default = Nu există sarcini finalizate încă
completed-showing = Afișare {$current} din {$total} sarcini finalizate
completed-load-more = Încarcă mai multe

# UniversalCflowTaskDetails Component
task-details-related-links = Link-uri asociate
task-details-meeting-links = Link-uri întâlnire
task-details-related-to = Legat de
task-details-meeting-recording-notice = Înregistrare și transcriere. Prin participare, acceptați includerea.
task-details-meeting-participants = Participanți
task-details-meeting-participants-with-count = Participanți ({$count})
task-details-meeting-organiser = Organizator
task-details-meeting-invitation-title-with-count = Invitație la întâlnire: {$count} participanți
task-details-meeting-participants-show-more = Arată încă {$count}
task-details-meeting-participants-show-less = Arată mai puțin
task-details-meeting-please-respond = Vă rugăm să răspundeți la această invitație.
task-details-meeting-participant-view-profile = Vezi profilul
task-details-meeting-status-pending = În așteptare
task-details-meeting-status-accepted = Acceptat
task-details-meeting-status-declined = Refuzat
task-details-meeting-status-tentative = Poate
task-details-attachments = Atașamente ({$count})
document-approval-review-card-label = Document în examinare
document-approval-review-card-fallback-name = Document
document-approval-review-card-snapshot-badge = Snapshot
document-approval-review-card-description = Previzualizează snapshot-ul read-only aici sau deschide documentul în aplicația Documents. Aprobă sau respinge din acest task.
document-approval-review-open-here = Examinează aici
document-approval-review-open-external = Deschide în aplicația Documents
document-approval-review-open-external-tooltip = Deschide documentul în aplicația Documents (vizualizare separată)
document-approval-review-dialog-description = Snapshot read-only al versiunii trimise spre aprobare. Aprobarea sau respingerea se face din task, nu din această previzualizare.
task-details-form = Formular
task-due-date-label = Scadență
task-start-date-label = Începe
task-details-read-only = Doar citire
task-details-form-loading = Se încarcă...
task-details-add-comment = Adaugă comentariu
task-details-optional = (Opțional)
task-details-rejection-comment-hint = necesar pentru respingere
task-details-rejection-comment-missing = Adăugați un comentariu care explică de ce respingeți acest document.
task-details-comment-placeholder = Introduceți comentariul...
task-details-comment-placeholder-reject = Explicați de ce respingeți…
task-details-blink-info = Aceasta este o sarcină Blink rapidă. O puteți finaliza direct de aici.
task-details-blink-instruction-hint = Deschideți linkul de mai jos pentru a accesa copia dvs. alocată, completați-o și reveniți aici pentru a trimite.
task-details-unknown = Necunoscut
task-details-untitled = Sarcină fără titlu
task-details-claim-coming = Funcția de preluare va fi disponibilă în curând
task-details-reassign-coming = Funcția de reatribuire va fi disponibilă în curând
task-details-unclaim-coming = Funcția de eliberare va fi disponibilă în curând
task-details-unknown-action = Acțiune necunoscută: {$action}
task-details-action-error = Nu se poate efectua acțiunea: lipsește ID-ul sarcinii sau al utilizatorului
task-details-task-rejected = ✓ Sarcină respinsă cu succes!
task-details-action-failed = Nu s-a putut {$action} sarcina

# ErrorBoundary Component
error-boundary-title = Ceva nu a funcționat corect
error-boundary-message = A apărut o eroare neașteptată
error-boundary-try-again = Încearcă din nou

# RemoteScreenLoader Component
remote-screen-failed = Ecranul nu a putut fi încărcat
remote-screen-retry = Reîncearcă

# LowcoderScreenLoader Component
lowcoder-screen-failed = Ecranul Lowcoder nu a putut fi încărcat
lowcoder-screen-error-title = Nu se poate încărca ecranul
close = Închide

# TeamAbsenceCalendar Component
absence-status-approved = Aprobat
absence-status-pending = În așteptare
absence-status-rejected = Respins
absence-calendar-title = Calendar absențe echipă
absence-calendar-description = Vizualizați absențele echipei în această perioadă
absence-calendar-pending-mobile = Cardul evidențiat așteaptă aprobare
absence-calendar-pending-desktop = Rândul evidențiat așteaptă aprobarea dvs.
absence-calendar-error-title = Eroare la încărcarea absențelor echipei
absence-calendar-no-members = Nu s-au găsit membri în echipă
absence-calendar-no-absences = Nu există absențe ale echipei în această perioadă
absence-calendar-team-member = Membru echipă
absence-calendar-daily-breakdown = Defalcare zilnică
absence-calendar-more = +{$count} în plus
absence-calendar-pending-approval = Aprobare în așteptare
absence-calendar-pending-tooltip = Această absență așteaptă aprobare

# Validation Messages
validation-field-required = {$field} este obligatoriu
validation-field-number-invalid = {$field} trebuie să fie un număr valid
task-details-validation-error-title = Vă rugăm să completați toate câmpurile obligatorii

# Task Formatters
formatter-today = Astăzi
formatter-yesterday = Ieri
formatter-status-scheduled = Programat
formatter-status-in-progress = În desfășurare
formatter-status-completed = Finalizat
formatter-status-failed = Eșuat
formatter-flow-running = În execuție
formatter-flow-completed = Finalizat
formatter-flow-failed = Eșuat
formatter-flow-terminated = Terminat
formatter-priority-normal = Normal
formatter-priority-high = Ridicat
formatter-priority-medium = Mediu
formatter-priority-low = Scăzut

# Due Date Labels
due-date-days-overdue = { $days ->
    [one] { $days }z întârziere
   *[other] { $days }z întârziere
}
due-date-hours-overdue = { $hours ->
    [one] { $hours }h întârziere
   *[other] { $hours }h întârziere
}
due-date-hours-left = { $hours ->
    [one] { $hours }h rămase
   *[other] { $hours }h rămase
}
due-date-days-left = { $days ->
    [one] { $days }z rămase
   *[other] { $days }z rămase
}
