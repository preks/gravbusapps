# EveryBox Translations - German

# Main Component
every-box-title = EveryBox
every-box-blink-button = Blink
every-box-tab-inflows = Eingang
every-box-tab-outflows = Ausgang
every-box-blink-description = Schnelle Aufgabe erstellen und zuweisen

# Inbox View
inbox-search-placeholder = Aufgaben suchen...
inbox-clear-search = Suche löschen
inbox-filter-all = Alle
inbox-filter-blinks = Blinks
inbox-filter-approvals = Genehmigungen
inbox-filter-completed = Erledigt
inbox-new-tasks-title = Neue Aufgaben verfügbar
inbox-new-tasks-button = Neue Aufgaben laden
inbox-new-tasks-description = Neue Aufgaben sind eingegangen. Klicken Sie zum Aktualisieren.
inbox-new-completed-tasks-description = Neue erledigte Aufgaben sind eingegangen. Klicken Sie zum Aktualisieren.
inbox-error-title = Fehler beim Laden der Aufgaben
inbox-showing-tasks = Zeige {$current} von {$total}{$hasMore} Aufgaben
inbox-load-more = Mehr laden

# Inbox Empty States
inbox-empty-no-results = Keine Aufgaben gefunden für "{$query}"
inbox-empty-no-blinks = Keine Blink-Aufgaben vorhanden
inbox-empty-no-approvals = Keine Genehmigungsaufgaben vorhanden
inbox-empty-no-completed = Noch keine erledigten Aufgaben
inbox-empty-no-tasks = Ihnen sind derzeit keine Aufgaben zugewiesen

# Outbox View
outbox-search-placeholder = Workflows suchen...
outbox-clear-search = Suche löschen
outbox-filter-all = Alle
outbox-filter-blinks = Blinks
outbox-filter-requests = Anträge
outbox-error-title = Fehler beim Laden der Workflows
outbox-error-unable = Workflows konnten nicht geladen werden
outbox-error-server = Der Server hat Leistungsprobleme. Dies ist ein bekanntes Backend-Problem.
outbox-try-again = Erneut versuchen

# Outbox Empty States
outbox-empty-no-results = Keine Workflows gefunden für "{$query}"
outbox-empty-no-blinks = Noch keine Blinks gesendet
outbox-empty-no-requests = Noch keine Anträge gestellt
outbox-empty-no-workflows = Sie haben noch keine Workflows gestartet

# Empty State Titles
empty-state-inbox-title = InFlows Leer
empty-state-outbox-title = Keine Workflows gestartet
empty-state-completed-title = Keine erledigten Aufgaben

# Quick Task Modal
blink-created-success = Blink "{$title}" erfolgreich erstellt!
blink-created-error = Blink konnte nicht erstellt werden: {$error}
blink-upload-error = Anhänge konnten nicht hochgeladen werden: {$error}

# TaskCard Component
task-card-overdue = Überfällig
task-card-due-soon = Bald fällig
task-card-due = Fällig {$date}
task-card-blink = Blink
task-card-unknown-creator = Unbekannt
task-card-untitled = Aufgabe ohne Titel

# FlowCard Component
flow-card-blink = Blink
flow-card-service-request = Serviceanfrage
flow-card-expenses = Ausgaben
flow-card-absences = Abwesenheiten
flow-card-assignee-progress = {$completed} von {$total} erledigt
flow-card-progress = Fortschritt
flow-card-steps = {$current} von {$total} Schritten
flow-card-started = Gestartet {$date}
flow-card-completed = Abgeschlossen {$date}

# TaskDetailHeader Component
task-detail-header-employee-avatar = Mitarbeiter-Avatar
task-detail-header-employee = Mitarbeiter

# TaskDetailFooter Component
task-footer-claim = Aufgabe übernehmen
task-footer-complete = Aufgabe abschließen
task-footer-approve = Genehmigen
task-footer-acknowledge = Bestätigen

# Task Completion Details
task-completion-details-title = Abschlussdetails
task-approval-details-title = Genehmigungsdetails
task-acknowledge-details-title = Bestätigungsdetails
task-completion-completed-by = Abgeschlossen von
task-completion-completed-at = Abgeschlossen am
task-completion-outcome = Ergebnis
task-completion-comment = Kommentar
task-completion-outcome-completed = Abgeschlossen
task-completion-outcome-approved = Genehmigt
task-completion-outcome-rejected = Abgelehnt
task-completion-outcome-acknowledged = Bestätigt
task-footer-reject = Ablehnen
task-footer-reassign = Neu zuweisen
task-footer-unclaim = Freigeben
task-details-task-claimed = Aufgabe erfolgreich übernommen!
task-details-task-unclaimed = Aufgabe erfolgreich freigegeben!

# FlowDetailDialog Component
flow-detail-loading = Wird geladen...
flow-detail-in-progress = In Bearbeitung • Gestartet {$date}
flow-detail-completed-at = Abgeschlossen {$date}
flow-detail-assignee-progress = Bearbeiter-Fortschritt
flow-detail-overall-progress = Gesamtfortschritt
flow-detail-steps-count = {$current} von {$total} Schritten
flow-detail-completed-count = {$completed} von {$total} erledigt
flow-detail-started = Gestartet
flow-detail-completed = Abgeschlossen
flow-detail-initiated-by = Gestartet von
flow-detail-template = Vorlage
flow-detail-assignee-status = Bearbeiter-Status
flow-detail-assignee = Bearbeiter
flow-detail-flow-steps = Workflow-Schritte
flow-detail-step = Schritt {$number}: {$title}
flow-detail-assigned-to = Zugewiesen an: {$name}
flow-detail-completed-by = Abgeschlossen von: {$name}
flow-detail-id = ID: {$id}

# TaskDetailDialog Component
task-dialog-completed-success = ✓ Aufgabe erfolgreich abgeschlossen!
task-dialog-blink-completed-success = ✓ Blink erfolgreich abgeschlossen!
task-dialog-complete-error = Aufgabe konnte nicht abgeschlossen werden: {$error}
task-dialog-loading = Aufgabendetails werden geladen...
task-dialog-close = Schließen
task-dialog-completing = Wird abgeschlossen...
task-dialog-complete-task = Aufgabe abschließen
task-dialog-missing-user-info = Aufgabe kann nicht abgeschlossen werden: Benutzerinformationen fehlen.
task-dialog-lowcoder-screen = Lowcoder-Bildschirm

# CompletedView Component
completed-search-placeholder = Erledigte Aufgaben suchen...
completed-error-title = Fehler beim Laden der erledigten Aufgaben
completed-empty-search = Keine erledigten Aufgaben gefunden für "{$query}"
completed-empty-default = Noch keine erledigten Aufgaben
completed-showing = Zeige {$current} von {$total} erledigten Aufgaben
completed-load-more = Mehr laden

# UniversalCflowTaskDetails Component
task-details-related-to = Verknüpft mit
task-details-attachments = Anhänge ({$count})
task-details-form = Formular
task-details-read-only = Nur lesen
task-details-form-loading = Wird geladen...
task-details-add-comment = Kommentar hinzufügen
task-details-optional = (Optional)
task-details-comment-placeholder = Kommentar eingeben...
task-details-blink-info = Dies ist eine schnelle Blink-Aufgabe. Sie können sie hier direkt abschließen.
task-details-unknown = Unbekannt
task-details-untitled = Aufgabe ohne Titel
task-details-claim-coming = Übernahme-Funktion kommt bald
task-details-reassign-coming = Neuzuweisung-Funktion kommt bald
task-details-unclaim-coming = Freigabe-Funktion kommt bald
task-details-unknown-action = Unbekannte Aktion: {$action}
task-details-action-error = Aktion nicht möglich: Aufgaben-ID oder Benutzer-ID fehlt
task-details-task-rejected = ✓ Aufgabe erfolgreich abgelehnt!
task-details-action-failed = Aufgabe konnte nicht {$action} werden

# ErrorBoundary Component
error-boundary-title = Etwas ist schiefgelaufen
error-boundary-message = Ein unerwarteter Fehler ist aufgetreten
error-boundary-try-again = Erneut versuchen

# RemoteScreenLoader Component
remote-screen-failed = Bildschirm konnte nicht geladen werden
remote-screen-retry = Erneut versuchen

# LowcoderScreenLoader Component
lowcoder-screen-failed = Lowcoder-Bildschirm konnte nicht geladen werden
lowcoder-screen-error-title = Bildschirm kann nicht geladen werden
close = Schließen

# TeamAbsenceCalendar Component
absence-status-approved = Genehmigt
absence-status-pending = Ausstehend
absence-status-rejected = Abgelehnt
absence-calendar-title = Team-Abwesenheitskalender
absence-calendar-description = Teamabwesenheiten während dieses Zeitraums anzeigen
absence-calendar-pending-mobile = Hervorgehobene Karte wartet auf Genehmigung
absence-calendar-pending-desktop = Die hervorgehobene Zeile wartet auf Ihre Genehmigung
absence-calendar-error-title = Fehler beim Laden der Teamabwesenheiten
absence-calendar-no-members = Keine Teammitglieder gefunden
absence-calendar-no-absences = Keine Teamabwesenheiten während dieses Zeitraums
absence-calendar-team-member = Teammitglied
absence-calendar-daily-breakdown = Tägliche Aufschlüsselung
absence-calendar-more = +{$count} weitere
absence-calendar-pending-approval = Genehmigung ausstehend
absence-calendar-pending-tooltip = Diese Abwesenheit wartet auf Genehmigung

# Validation Messages
validation-field-required = {$field} ist erforderlich
validation-field-number-invalid = {$field} muss eine gültige Zahl sein
task-details-validation-error-title = Bitte füllen Sie alle erforderlichen Felder aus

# Task Formatters
formatter-today = Heute
formatter-yesterday = Gestern
formatter-status-scheduled = Geplant
formatter-status-in-progress = In Bearbeitung
formatter-status-completed = Abgeschlossen
formatter-status-failed = Fehlgeschlagen
formatter-flow-running = Läuft
formatter-flow-completed = Abgeschlossen
formatter-flow-failed = Fehlgeschlagen
formatter-flow-terminated = Beendet
formatter-priority-normal = Normal
formatter-priority-high = Hoch
formatter-priority-medium = Mittel
formatter-priority-low = Niedrig
