title = Teamvergütung
subtitle = Teamgehälter, Boni und Leistungen einsehen und vergleichen.
loading = Teamdaten werden geladen...

select-company-placeholder = Unternehmen wählen…
empty-select-company-hint = Wählen Sie ein Unternehmen, um die Teamvergütung zu laden.
error-companies-load = Die Unternehmensliste konnte nicht geladen werden. {$message}
error-performance-cycles-query-title = Leistungszyklus-Verzeichnis nicht verfügbar
error-performance-cycles-query = Die Liste der Leistungszyklen konnte nicht geladen werden. {$message}
error-performance-scores-title = Leistungsbewertungen nicht verfügbar
error-performance-scores = Leistungsbewertungen für Teammitglieder konnten nicht geladen werden. {$message}
error-salary-budget-title = Team-Gehaltsbudget konnte nicht geladen werden
error-title = Etwas ist schiefgelaufen
table-section-title = Teammitglieder
manager-team-context-card-title = Teamvergütung
manager-team-budget-allocation-card-title = Verbleibendes Budget
budget-summary-total-available = Verfügbares Gesamtbudget
budget-summary-placeholder-value = -
budget-summary-placeholder-footer = Summiert Gehaltsbudgets für die OEs Ihrer Teammitglieder im neuesten Unternehmensbudgetplan, sofern Zeilen existieren (sonst OE Ihrer Position, falls Mitglieder keine OE haben).
table-empty = Keine Teammitglieder entsprechen den aktuellen Filtern.
team-summary = { $count ->
  [one] 1 Teammitglied
  *[other] {$count} Teammitglieder
}

search-placeholder = Suchen...
filter-sheet-title = Filter
filter-sheet-description = Liste nach Teammitglied, Jahresgehalt oder letzter Gehaltserhöhung eingrenzen.

save-drafts = Entwürfe speichern
submit-proposals = Vorschläge einreichen
submitted-count = {$count} eingereicht
draft-count = {$count} Entwürfe

submit-confirm-title = Vorschläge einreichen
submit-confirm-description = Sie sind dabei, {$count} Entwurfsvorschläge zur Überprüfung einzureichen. Diese Aktion kann nicht rückgängig gemacht werden.
submit-confirm-ok = Ja, einreichen
submit-confirm-cancel = Abbrechen

over-budget-warning = Ihre Gehaltserhöhungsvorschläge überschreiten das zugewiesene Budget. Bitte überprüfen Sie dies vor dem Einreichen.

col-employee = Mitarbeiter
col-level = Stufe
col-tenure = Betriebszugehörigkeit
col-current-salary = Aktuelles Gehalt
col-band-position = Bandposition
col-performance = Leistung
performance-score-out-of = {$score} / {$max}
table-cell-empty = {" - "}
col-last-raise = Letzte Erhöhung
col-proposed-increase = Vorgeschlagene Erhöhung
col-proposed-bonus = Vorgeschlagener Bonus
col-justification = Begründung
col-bonuses-ytd = Boni YTD

tenure-never-raise = Nie
tenure-this-month = Diesen Monat
profile-header-year = Jahr
profile-header-years = Jahre
profile-header-month = Monat
profile-header-months = Monate
salary-monthly-suffix = /Mon.
hire-unknown = Unbekannt
hire-tooltip = Eingestellt: {$date}

compa-no-band = Keine Gehaltsbanddaten
compa-ratio-label = CR: {$ratio}

filters-toggle-aria = Filter ein- oder ausblenden
search-toggle-aria = Team durchsuchen
filter-employee-group = Mitarbeiter
filter-salary-group = Jahresgehalt
filter-salary-min-label = Minimum (jährlich)
filter-salary-max-label = Maximum (jährlich)
filter-salary-min-placeholder = Min.
filter-salary-max-placeholder = Max.
filter-last-raise-group = Letzte Erhöhung
filter-last-raise-from-placeholder = Von
filter-last-raise-to-placeholder = Bis
filter-range-open = beliebig
filter-pill-salary-range = Gehalt: {$min} – {$max}
filter-pill-last-raise-range = Letzte Erhöhung: {$from} – {$to}
filter-pill-last-raise-from = Letzte Erhöhung ab {$from}
filter-pill-last-raise-to = Letzte Erhöhung bis {$to}
filter-pill-search = Suche: „{$q}“
filter-remove-search-aria = Suche entfernen
filter-remove-pill-aria = Filter entfernen
filter-clear-all = Alle Filter löschen

pagination-range = {$from}–{$to} von {$total} Mitgliedern
pagination-item-suffix = Mitglieder
pagination-rows-per-page = Zeilen pro Seite
pagination-page = Seite {$current} von {$total}
pagination-prev-aria = Vorherige Seite
pagination-next-aria = Nächste Seite

manager-team-distribution-method-section = Wie soll der Erhöhungspool aufgeteilt werden?

manager-team-save-allocations = Verteilen
manager-team-submit-proposals-toolbar = Vorschläge einreichen
manager-team-save-dialog-title = Vorschläge einreichen
manager-team-save-dialog-description = Diese Aktion kann nicht rückgängig gemacht werden. Wählen Sie, welche Teammitglieder einbezogen werden sollen.
manager-team-save-dialog-select-all = Alle auswählen
manager-team-save-dialog-select-none = Auswahl leeren
manager-team-save-dialog-none-selected = Mindestens ein Teammitglied auswählen.
manager-team-save-dialog-no-pool = Für Ihr Teambudget gibt es keinen Gehaltserhöhungspool; Zuweisungen können nicht gespeichert werden.
manager-team-save-dialog-custom-exceeds-pool-selected = Die Summe der ausgewählten benutzerdefinierten Zuweisungen übersteigt den Erhöhungspool. Bitte Beträge anpassen oder Auswahl reduzieren.
manager-team-save-dialog-checkbox-aria = { $name } beim Speichern einbeziehen
manager-team-save-dialog-cancel = Abbrechen
manager-team-save-dialog-confirm = Einreichen
manager-team-save-dialog-saving = Wird eingereicht…
manager-team-save-saving = Wird gespeichert…
manager-team-save-no-token = Zum Speichern müssen Sie angemeldet sein.
manager-team-save-no-employee = Zum Speichern wird Ihr Mitarbeiterprofil benötigt.
manager-team-save-missing-plan-ou = Für die Organisationseinheit von {$name} fehlt eine Gehaltsbudget-Zeile in diesem Plan. Bitte zuerst das Unternehmensbudget vervollständigen.
manager-team-save-missing-budget-context = Der Teambudget-Kontext ist noch nicht geladen. Warten Sie, bis das Budget geladen ist, oder laden Sie die Seite neu, und versuchen Sie es erneut.
manager-team-save-custom-exceeds-pool = Die benutzerdefinierten Zuweisungen übersteigen den Erhöhungspool. Bitte Beträge anpassen.
manager-team-save-error = Zuweisungen konnten nicht gespeichert werden. {$message}
manager-team-save-error-generic = Beim Speichern ist ein Fehler aufgetreten.
manager-team-review-submitted-proposals = Eingereichte Vorschläge prüfen ({$count})
manager-team-review-submitted-proposals-aria = Freigabe öffnen für {$count} eingereichte Vorschläge
manager-team-submit-proposals = Vorschläge einreichen
manager-team-submitting = Wird eingereicht…
manager-team-submit-no-drafts = Verwenden Sie „Vorschläge einreichen“ und wählen Sie mindestens ein Teammitglied im Dialog aus.
manager-team-submit-error = Vorschläge konnten nicht eingereicht werden. {$message}
manager-team-submit-missing-row-version = Budgetzeilen-Version für die Einreichung konnte nicht geladen werden. Seite aktualisieren und erneut versuchen.
manager-team-proposals-readonly-hint = Die Vorschläge wurden zur Prüfung eingereicht. Bearbeitung ist deaktiviert.

supervisor-review-no-auth = Sie müssen angemeldet sein, um Vorschläge zu genehmigen oder zurückzusenden.
supervisor-review-no-submitted = Es gibt keine eingereichten Vorschläge für diese Aktion.
supervisor-review-error-generic = Etwas ist schiefgelaufen. Bitte erneut versuchen.
supervisor-review-card-title = Freigabe durch Vorgesetzte
supervisor-review-loading = Vorschläge werden geladen…
supervisor-review-submitted-count = { $count ->
  [zero] Keine eingereichten Vorschläge zur Prüfung.
  [one] 1 eingereichter Vorschlag zur Prüfung.
  *[other] {$count} eingereichte Vorschläge zur Prüfung.
}
supervisor-review-busy = Wird ausgeführt…
supervisor-review-approve-selected = Ausgewählte genehmigen
supervisor-review-none-selected = Wählen Sie mindestens einen Vorschlag aus.
supervisor-review-selection-hint = Genehmigen oder zurücksenden Sie nur eingereichte Zeilen. Entwürfe sind zur Orientierung sichtbar und hier nicht auswählbar.
supervisor-review-draft-in-table = { $count ->
  [one] 1 Zuweisung ist noch ein Entwurf (in dieser Liste schreibgeschützt).
  *[other] {$count} Zuweisungen sind noch Entwürfe (in dieser Liste schreibgeschützt).
}
supervisor-review-select-all-aria = Alle eingereichten Vorschläge auswählen
supervisor-review-row-select-aria = Vorschlag für { $name } auswählen
supervisor-review-row-draft-checkbox-aria = { $name } — Entwurf (kann hier nicht genehmigt oder zurückgesendet werden)
supervisor-review-col-employee = Mitarbeitende
supervisor-review-col-increase-pct = Erhöhung %
supervisor-review-col-increase-amount = Erhöhungsbetrag
supervisor-review-col-new-salary = Vorgeschlagenes Gehalt
supervisor-review-col-status = Status
supervisor-review-col-justification = Begründung
budget-plan-status-unknown = Unbekannt
budget-plan-status-draft = Entwurf
budget-plan-status-submitted = Eingereicht
budget-plan-status-approved = Genehmigt
budget-plan-status-rejected = Abgelehnt
budget-plan-status-sent-back = Zurückgesendet
budget-plan-status-executed = Ausgeführt
supervisor-review-employee-unknown = Mitarbeitende (nicht in Teamliste)
supervisor-review-table-section-title = Vorschläge
supervisor-review-table-search-placeholder = Suche nach Name, Beträgen oder Status…
supervisor-review-table-empty-filtered = Keine Vorschläge entsprechen Ihrer Suche.
supervisor-review-table-empty-none = Keine Vorschläge zum Anzeigen.
supervisor-review-send-back = Zurücksenden
supervisor-review-send-back-notes-required = Bitte Notizen für das Team hinzufügen, bevor Sie zurücksenden.
supervisor-review-send-back-title = An Team zurücksenden
supervisor-review-send-back-placeholder = Erklären Sie, was das Team ändern soll…
supervisor-review-send-back-cancel = Abbrechen
supervisor-review-send-back-confirm = Zurücksenden
supervisor-review-back-to-team = Zur Teamvergütung
supervisor-review-back-to-department-submissions = Zu Abteilungseinreichungen
