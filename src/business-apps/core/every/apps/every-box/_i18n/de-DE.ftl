# EveryBox Translations - German

# Main Component
every-box-title = EveryBox
every-box-blink-button = Blink
every-box-tab-inflows = Eingang
every-box-tab-outflows = Ausgang
every-box-blink-description = Schnelle Aufgabe erstellen und zuweisen
every-box-hero-tagline = Ihr zentrales Postfach für Aufgaben und Workflows
every-box-search-placeholder = Suchen...
every-box-sort-label = Sortieren
every-box-sort-newest = Neueste zuerst
every-box-sort-oldest = Älteste zuerst
every-box-sort-priority = Priorität
every-box-refresh-label = Aktualisieren
every-box-due-filter-label = Fälligkeit
every-box-due-filter-any = Alle
every-box-due-filter-overdue = Überfällig
every-box-due-filter-due-soon = Fällig in <24h
every-box-due-filter-has = Mit Fälligkeitsdatum
every-box-due-filter-none = Ohne Fälligkeitsdatum

# Filters Dropdown
filters-dropdown-label = Filter
filters-all = Alle
filters-blinks = Blinks
filters-approvals = Genehmigungen
filters-completed = Erledigt
filters-active-count = { $count } aktiv

# Detail Panel
detail-panel-empty = Wählen Sie eine Aufgabe aus, um Details anzuzeigen
detail-panel-empty-flow = Wählen Sie einen Workflow aus, um Details anzuzeigen

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
inbox-loading-more = Lade weitere Aufgaben...
inbox-no-task-selected = Keine Aufgabe ausgewählt
inbox-select-task-prompt = Wählen Sie eine Aufgabe aus der Liste aus, um Details anzuzeigen
inbox-task-no-title = Aufgabe ohne Titel

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
outbox-no-flow-selected = Kein Workflow ausgewählt
outbox-select-flow-prompt = Wählen Sie einen Workflow aus der Liste aus, um Details anzuzeigen

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
task-card-due-in-hours = Fällig in {$hours}h
task-card-overdue-hours = Überfällig {$hours}h
task-card-due-in-days = Fällig in {$days}d
task-card-overdue-days = Überfällig {$days}d
task-card-tooltip-due-hours = Fällig in {$hours} Stunden
task-card-tooltip-due-days = Fällig in {$days} Tagen
task-card-tooltip-overdue-hours = Überfällig: {$hours} Stunden
task-card-tooltip-overdue-days = Überfällig: {$days} Tage

# Task meta actions (Everybox-service)
task-meta-pin = Anheften
task-meta-unpin = Lösen
task-meta-mark-unread = Als ungelesen markieren
task-meta-priority = Priorität
task-meta-priority-none = Keine
task-meta-priority-high = Hoch
task-meta-priority-medium = Mittel
task-meta-priority-low = Niedrig
task-card-blink = Blink
task-card-unknown-creator = Unbekannt
task-card-untitled = Aufgabe ohne Titel
task-card-pinned = Angeheftet
task-card-cancel-vacation-request = Urlaubsantrag stornieren
task-card-cancel-sick-leave-request = Krankmeldung stornieren
task-card-cancel-special-leave-request = Sonderurlaubsantrag stornieren
task-card-cancel-request-for-type = Antrag auf "{$absenceType}" stornieren
task-card-cancel-absence-request = Abwesenheitsantrag stornieren

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
task-dialog-no-screen-available = Für diese Aufgabe ist noch kein Formular konfiguriert. Bitte wenden Sie sich an Ihren Administrator.

# CompletedView Component
completed-search-placeholder = Erledigte Aufgaben suchen...
completed-error-title = Fehler beim Laden der erledigten Aufgaben
completed-empty-search = Keine erledigten Aufgaben gefunden für "{$query}"
completed-empty-default = Noch keine erledigten Aufgaben
completed-showing = Zeige {$current} von {$total} erledigten Aufgaben
completed-load-more = Mehr laden

# UniversalCflowTaskDetails Component
task-details-related-links = Verwandte Links
task-details-meeting-links = Meeting-Links
task-details-related-to = Verknüpft mit
task-details-meeting-recording-notice = Aufzeichnung und Transkription. Durch Ihre Teilnahme willigen Sie ein, einbezogen zu werden.
task-details-meeting-participants = Teilnehmer
task-details-meeting-participants-with-count = Teilnehmer ({$count})
task-details-meeting-organiser = Organisator
task-details-meeting-invitation-title-with-count = Meeting-Einladung: {$count} Teilnehmer
task-details-meeting-participants-show-more = {$count} weitere anzeigen
task-details-meeting-participants-show-less = Weniger anzeigen
task-details-meeting-please-respond = Bitte antworten Sie auf diese Einladung.
task-details-meeting-participant-view-profile = Profil anzeigen
task-details-meeting-status-pending = Ausstehend
task-details-meeting-status-accepted = Angenommen
task-details-meeting-status-declined = Abgelehnt
task-details-meeting-status-tentative = Vielleicht
task-details-attachments = Anhänge ({$count})
document-approval-review-card-label = Dokument zur Prüfung
document-approval-review-card-fallback-name = Dokument
document-approval-review-card-snapshot-badge = Snapshot
document-approval-review-card-description = Sehen Sie den schreibgeschützten Snapshot hier an oder öffnen Sie das Dokument in der Documents-App. Genehmigung oder Ablehnung erfolgt in dieser Aufgabe.
document-approval-review-open-here = Hier ansehen
document-approval-review-open-external = In Documents-App öffnen
document-approval-review-open-external-tooltip = Öffnet das Dokument in der Documents-App (separate Ansicht)
document-approval-review-dialog-description = Schreibgeschützter Snapshot der zur Genehmigung eingereichten Version. Genehmigen oder ablehnen Sie in der Aufgabe, nicht in dieser Vorschau.
document-approval-outcome-review-card-label-approved = Genehmigte Version
document-approval-outcome-review-card-label-rejected = Abgelehnte Version
document-approval-outcome-review-card-description-approved = Sehen Sie die genau genehmigte Version an. Öffnen Sie sie hier oder in der Documents-App.
document-approval-outcome-review-card-description-rejected = Sehen Sie die genau abgelehnte Version an. Öffnen Sie sie hier oder in der Documents-App.
document-approval-outcome-review-card-snapshot-badge-approved = Genehmigt
document-approval-outcome-review-card-snapshot-badge-rejected = Abgelehnt
document-approval-outcome-review-open-here = Version ansehen
document-approval-outcome-review-dialog-description = Schreibgeschützter Snapshot der geprüften Version. Diese Vorschau zeigt das Dokument zum Zeitpunkt der Prüfung.
task-details-form = Formular
task-due-date-label = Fällig
task-start-date-label = Beginnt
task-details-read-only = Nur lesen
task-details-form-loading = Wird geladen...
task-details-add-comment = Kommentar hinzufügen
task-details-optional = (Optional)
task-details-rejection-comment-hint = erforderlich zur Ablehnung
task-details-rejection-comment-missing = Bitte geben Sie einen Kommentar zur Ablehnung dieses Dokuments an.
task-details-comment-placeholder = Kommentar eingeben...
task-details-comment-placeholder-reject = Begründen Sie die Ablehnung…
task-details-blink-info = Dies ist eine schnelle Blink-Aufgabe. Sie können sie hier direkt abschließen.
task-details-blink-instruction-hint = Öffnen Sie den Link unten, um Ihre zugewiesene Kopie zu öffnen, füllen Sie sie aus und kehren Sie hierher zurück, um abzuschließen.
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

# Due Date Labels
due-date-days-overdue = { $days ->
    [one] { $days }T überfällig
   *[other] { $days }T überfällig
}
due-date-hours-overdue = { $hours ->
    [one] { $hours }Std überfällig
   *[other] { $hours }Std überfällig
}
due-date-hours-left = { $hours ->
    [one] { $hours }Std übrig
   *[other] { $hours }Std übrig
}
due-date-days-left = { $days ->
    [one] { $days }T übrig
   *[other] { $days }T übrig
}

# AI Features
ai-search-placeholder = Intelligente Suche...
ai-search-toggle = Intelligente Suche
ai-search-toggle-tooltip = KI-gestützte semantische Suche verwenden
ai-search-results-title = Suchergebnisse
ai-search-mode-semantic = KI-Ergebnisse
ai-search-mode-lexical = Textergebnisse
ai-search-no-results = Keine passenden Aufgaben gefunden
ai-search-error = Suche fehlgeschlagen. Bitte versuchen Sie es erneut.
ai-summary-title = Zusammenfassung
ai-summary-loading = Zusammenfassung wird erstellt...
ai-summary-error = Zusammenfassung konnte nicht erstellt werden
ai-summary-regenerate = Neu erstellen
ai-summary-cached = Zwischengespeichert
ai-suggestions-title = Vorgeschlagene Aktionen
ai-suggestions-loading = Vorschläge werden erstellt...
ai-suggestions-error = Vorschläge konnten nicht erstellt werden
ai-suggestions-retry = Erneut versuchen
ai-suggestions-copy = Kopieren
ai-suggestions-apply = Anwenden
ai-urgency-label = Dringlichkeit
ai-urgency-high = Hoch
ai-urgency-medium = Mittel
ai-urgency-low = Niedrig
ai-priority-suggested = Vorgeschlagene Priorität
ai-priority-apply = Priorität anwenden
ai-clustering-group-by = Nach Kategorie gruppieren
ai-clustering-group-label = { $cluster }
ai-clustering-uncategorized = Nicht kategorisiert

# AI Assistant
ai-assistant-suggest = Vorschlagen
ai-assistant-suggest-tooltip = KI-vorgeschlagene Antwort erhalten
ai-assistant-improve = Verbessern
ai-assistant-improve-tooltip = Ihren Entwurf verbessern
ai-assistant-tone = Tonfall
ai-assistant-tone-tooltip = Den Tonfall Ihrer Nachricht anpassen
ai-assistant-expand = Erweitern
ai-assistant-expand-tooltip = Mehr Details hinzufügen
ai-assistant-shorten = Kürzen
ai-assistant-shorten-tooltip = Prägnanter formulieren
ai-assistant-custom = Benutzerdefiniert
ai-assistant-custom-tooltip = Eigene Anweisungen geben
ai-assistant-custom-label = Was soll die KI tun?
ai-assistant-custom-placeholder = z. B. höflicher formulieren...
ai-assistant-apply = Anwenden
ai-assistant-suggested-reply = Vorgeschlagene Antwort
ai-assistant-use-this = Übernehmen
ai-assistant-dismiss = Verwerfen
ai-assistant-placeholder = Antwort verfassen...
ai-assistant-send = Senden
ai-assistant-cancel = Abbrechen
ai-assistant-ai-assisted = KI-unterstützt
ai-assistant-applied = Angewendet
ai-assistant-draft-helper = KI-Schreibassistent
ai-assistant-draft-placeholder = Nutzen Sie KI, um Ihre Antwort zu verfassen...
ai-assistant-copy = Kopieren
ai-assistant-copied = In Zwischenablage kopiert

# AI Predictions
ai-prediction-helpful = War das hilfreich?
ai-feedback-helpful = Ja, das war hilfreich
ai-feedback-not-helpful = Nein, das war nicht hilfreich
ai-feedback-thanks = Danke für Ihr Feedback!
ai-prediction-likely-approve = Wahrscheinlich genehmigen
ai-prediction-likely-reject = Wahrscheinlich ablehnen
ai-prediction-likely-delegate = Wahrscheinlich delegieren
ai-prediction-likely-defer = Wahrscheinlich zurückstellen
ai-prediction-needs-review = Prüfung erforderlich
ai-prediction-high-priority = Hohe Priorität
ai-prediction-medium-priority = Mittlere Priorität
ai-prediction-low-priority = Niedrige Priorität
ai-prediction-confidence = { $percent } % Konfidenz
ai-relationship-context = Beziehungskontext
ai-decision-history = Basierend auf Ihrem Entscheidungsverlauf
