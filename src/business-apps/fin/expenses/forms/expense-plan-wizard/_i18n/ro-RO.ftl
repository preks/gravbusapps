# Expense Plan Wizard - Romanian (transl.txt add_items_to_plan / modify_expense_request / create_expense_plan / approve_expense_request)

# Items screen
subtitle = Cheltuieli
expense-items-counter = Elemente de Cheltuială Estimate
add-position-btn = Adăugați Element de Cheltuială
add-items-button = Adăugați Elemente de Cheltuială Estimate
total-text = Cheltuieli Estimate
loading-text = Se încarcă...

# Wizard footer (items step)
cancel-items-button = Anulare
save-button = Salvare
submit-button = Următorul

# Item card fallbacks (expense_item_request_card)
no-expense-group = Lipsă grup de cheltuieli
no-cost-center = Lipsă Centru de Cost

# Errors
error-fetch-items-payload = Eroare la citirea articolelor din payload

# Wizard shell
toast-action-canceled = Acțiunea a fost anulată.
discard-plan-error = Nu s-a putut renunța la planul de cheltuieli
invalid-profile-title = Problemă de validare
wizard-btn-submit = Trimiteți
wizard-back-text = Înapoi
wizard-edit-text = Editează
wizard-btn-cancel = Anulați
wizard-btn-confirm = Confirmați
title-input-placeholder = Introduceți titlul
current-title-custom-rule = Vă rugăm să introduceţi un scop
maximum-characters-title-error-message = Limită maximă atinsă: Titlul poate avea cel mult 50 de caractere.
trip-details-title = Detalii Delegație
advance-payment-title = Plată în Avans
summary-title = Rezumat

# Load / context
missing-employee-id = Lipsește ID-ul angajatului
error-fetching-expense-data = Eroare la preluarea datelor privind cheltuielile
missing-expense-rule-message = Nu există nicio regulă setată pentru utilizatorul dvs., vă rugăm să contactați administratorul.
error-employee-rule = Eroare la preluarea regulii privind cheltuielile angajatului
error-missing-user-info = Lipsesc informații despre utilizator
error-load-trip-data = Eroare la încărcarea datelor inițiale de călătorie
missing-plan-data = Date ale planului lipsă

# Trip screen
trip-start-location = Locație de Pornire
trip-departure = Plecare
trip-start-input-label = Locație de Pornire
trip-start-date-label = Dată de Început
trip-end-date-label = Data Sosirii
trip-start-time-label = Ora de Începere
trip-destination = Destinație
trip-departure-date = Data Plecării
trip-departure-time = Ora de plecare
trip-add-destination = Adăugați Destinație
trip-end-location = Destinație Finală
trip-arrival = Sosire
trip-end-input-label = Destinație Finală
trip-arrival-date = Data Sosirii
trip-arrival-time = Ora Sosirii
trip-skip-advance-payment-label = Solicitǎ Plata în Avans

# Trip overlap warnings
trip-overlap-absences-error = Data selectată se suprapune cu un eveniment existent: { $employeeAbsence } de la { $absenceRequestTimeStampStart } la { $absenceRequestTimeStampEnd }. Vă rugăm să modificați data.
trip-overlap-request-error = Data selectată se suprapune cu un eveniment existent: Cererea de cheltuieli { $requestTitle } de la { $requestTimeStampStart } la { $requestTimeStampEnd }. Vă rugăm să modificați data.
trip-overlap-request-draft-warning = Data selectată se suprapune cu un eveniment în stadiu de schiță: Cererea de cheltuieli { $requestTitle } de la { $requestTimeStampStart } la { $requestTimeStampEnd }. Vă rugăm să verificați înainte de trimitere dacă sunt necesare ajustări.
trip-overlap-plan-error = Data selectată se suprapune cu un eveniment existent: Planul de cheltuieli { $planTitle } de la { $planTimeStampStart } la { $planTimeStampEnd }. Vă rugăm să modificați data.
trip-overlap-plan-draft-warning = Data selectată se suprapune cu un eveniment planificat: Planul de cheltuieli { $planTitle } de la { $planTimeStampStart } la { $planTimeStampEnd }. Vă rugăm să verificați dacă sunt necesare ajustări înainte de trimitere.

# Weekday names (allowance list / getDayName)
wizard-weekday-sunday = Duminică
wizard-weekday-monday = Luni
wizard-weekday-tuesday = Marți
wizard-weekday-wednesday = Miercuri
wizard-weekday-thursday = Joi
wizard-weekday-friday = Vineri
wizard-weekday-saturday = Sâmbătă

# Payment screen
process-error-data-fetch = Eroare obținere date
payment-method-direct-deposit = Depunere Directă
payment-method-cash-payment = Plată în Numerar
payment-valid-number = Vă rugăm să introduceți un număr valid
payment-method-select-error = Vă rugăm să selectați o metodă de plată
payment-advance-custom-rule = Valoarea plății în avans nu poate fi mai mare decât valoarea cheltuielilor estimate și a alocațiilor și trebuie să folosească aceeași monedă
payment-amount-label = Sumă
payment-amount-custom-rule = Vă rugăm să introduceți suma
payment-currency-label = Monedă
payment-currency-custom-rule = Vă rugăm să selectați o monedă
payment-currency-placeholder = Selectați Moneda
payment-method-label = Metodă de plată
payment-method-placeholder = Selectați Metoda
payment-estimated-expenses-label = Cheltuieli Estimate
payment-allowances-label = Diurne
payment-advance-payment-label = Plată în Avans

# Summary screen
summary-no-code = Fără cod
summary-plan-creation = Plan de creare:
summary-no-start-date = Fără dată de începere
summary-no-creation-date = Fără dată de creare
summary-no-end-date = Fără dată de încheiere
summary-allowances-section = Diurne
summary-no-allowances = Nicio diurnă generată
summary-expense-items-section = Elemente de Cheltuială Estimate
summary-no-estimated-items = Nu sunt adăugate elemente de cheltuieli estimate
summary-non-reimbursable-amount = Sumă Nerambursabilă
summary-reimbursable-amount = Sumă Rambursabilă
