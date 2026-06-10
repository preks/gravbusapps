# Expense Plan Wizard - German (transl.txt add_items_to_plan / modify_expense_request / create_expense_plan / approve_expense_request)

# Items screen
subtitle = Ausgaben
expense-items-counter = Geschätzte Spesenposten
add-position-btn = Spesenposten hinzufügen
add-items-button = Geschätzte Spesenposten hinzufügen
total-text = Geschätzte Ausgaben
loading-text = Laden...

# Wizard footer (items step)
cancel-items-button = Abbrechen
save-button = Speichern
submit-button = Weiter

# Item card fallbacks (expense_item_request_card)
no-expense-group = Keine Spesengruppe
no-cost-center = Keine Kostenstelle

# Errors
error-fetch-items-payload = Fehler beim Abrufen von Posten aus der Payload

# Wizard shell
toast-action-canceled = Die Aktion wurde abgebrochen.
invalid-profile-title = Problem der Validierung
wizard-btn-submit = Einreichen
wizard-back-text = Zurück
wizard-edit-text = Bearbeiten
wizard-btn-cancel = Abbrechen
wizard-btn-confirm = Bestätigen
title-input-placeholder = Titel eingeben
current-title-custom-rule = Bitte einen Titel eingeben
maximum-characters-title-error-message = Maximale Grenze erreicht: Der Titel darf nur bis zu 50 Zeichen lang sein.
trip-details-title = Reisedetails
advance-payment-title = Vorschuss
summary-title = Übersicht

# Load / context
missing-employee-id = Fehlende Mitarbeiter-ID
error-fetching-expense-data = Fehler beim Abrufen von Ausgabendaten
missing-expense-rule-message = Für Ihren Benutzer gibt es keine Regel. Bitte wenden Sie sich an Ihren Administrator.
error-employee-rule = Fehler beim Abrufen der Mitarbeiterausgabenregel
error-missing-user-info = Fehlende Benutzerinformationen
error-load-trip-data = Fehler beim Laden der ursprünglichen Reisedaten
missing-plan-data = Fehlende Plandaten

# Trip screen
trip-start-location = Abfahrtsort
trip-departure = Abreise
trip-start-input-label = Abfahrtsort
trip-start-date-label = Startdatum
trip-end-date-label = Ankunftsdatum
trip-start-time-label = Startzeit
trip-destination = Reiseziel
trip-departure-date = Datum der Abreise
trip-departure-time = Abfahrtszeit
trip-add-destination = Reiseziel hinzufügen
trip-end-location = Zielort
trip-arrival = Ankunft
trip-end-input-label = Zielort
trip-arrival-date = Ankunftsdatum
trip-arrival-time = Ankunftszeit
trip-skip-advance-payment-label = Vorschuss beantragen

# Trip overlap warnings
trip-overlap-absences-error = Das ausgewählte Datum überschneidet sich mit einem bestehenden Eintrag: { $employeeAbsence } von { $absenceRequestTimeStampStart } bis { $absenceRequestTimeStampEnd }. Bitte passen Sie das Datum an.
trip-overlap-request-error = Das ausgewählte Datum überschneidet sich mit einem bestehenden Eintrag: Spesenantrag { $requestTitle } von { $requestTimeStampStart } bis { $requestTimeStampEnd }. Bitte passen Sie das Datum an.
trip-overlap-request-draft-warning = Das ausgewählte Datum überschneidet sich mit einem Entwurf: Spesenantrag { $requestTitle } von { $requestTimeStampStart } bis { $requestTimeStampEnd }. Bitte überprüfen Sie vor dem Absenden, ob Anpassungen erforderlich sind.
trip-overlap-plan-error = Das ausgewählte Datum überschneidet sich mit einem bestehenden Eintrag: Spesenplan { $planTitle } von { $planTimeStampStart } bis { $planTimeStampEnd }. Bitte passen Sie das Datum an.
trip-overlap-plan-draft-warning = Das ausgewählte Datum überschneidet sich mit einem geplanten Eintrag: Spesenplan { $planTitle } von { $planTimeStampStart } bis { $planTimeStampEnd }. Bitte überprüfen Sie vor dem Absenden, ob Anpassungen erforderlich sind.

# Weekday names (allowance list / getDayName)
wizard-weekday-sunday = Sonntag
wizard-weekday-monday = Montag
wizard-weekday-tuesday = Dienstag
wizard-weekday-wednesday = Mittwoch
wizard-weekday-thursday = Donnerstag
wizard-weekday-friday = Freitag
wizard-weekday-saturday = Samstag

# Payment screen
process-error-data-fetch = Fehler beim Abrufen von Daten
payment-method-direct-deposit = Überweisung
payment-method-cash-payment = Barzahlung
payment-valid-number = Bitte geben Sie eine gültige Zahl ein
payment-method-select-error = Bitte auswählen
payment-advance-custom-rule = Der Betrag der Vorschusszahlung darf nicht höher sein als der Betrag der geschätzten Spesen und Zulagen und sie müssen dieselbe Währung haben.
payment-amount-label = Betrag
payment-amount-custom-rule = Bitte geben Sie den Betrag ein
payment-currency-label = Währung
payment-currency-custom-rule = Bitte auswählen
payment-currency-placeholder = Währung auswählen
payment-method-label = Zahlungsmethode
payment-method-placeholder = Methode auswählen
payment-estimated-expenses-label = Geschätzte Ausgaben
payment-allowances-label = Pauschalen
payment-advance-payment-label = Vorschuss

# Summary screen
summary-no-code = Kein Code
summary-plan-creation = Planerstellung:
summary-no-start-date = Kein Startdatum
summary-no-creation-date = Kein Erstellungsdatum
summary-no-end-date = Kein Enddatum
summary-allowances-section = Pauschalen
summary-no-allowances = Keine Pauschalen erstellt
summary-expense-items-section = Geschätzte Spesenposten
summary-no-estimated-items = Keine geschätzten Spesenposten hinzugefügt
summary-non-reimbursable-amount = Nicht erstattungsfähiger Betrag
summary-reimbursable-amount = Erstattungsfähiger Betrag
