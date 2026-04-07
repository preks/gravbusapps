title = Compensații echipă
subtitle = Vizualizați și comparați salariile, bonusurile și beneficiile echipei. Alegeți o companie pentru a încărca echipa.
loading = Se încarcă datele echipei...

select-company-placeholder = Selectați compania…
empty-select-company-hint = Selectați o companie pentru a încărca datele de compensare ale echipei.
error-companies-load = Nu s-a putut încărca lista de companii. {$message}
error-performance-cycles-query-title = Directorul ciclurilor de performanță nu este disponibil
error-performance-cycles-query = Nu s-a putut încărca lista ciclurilor de performanță din director. {$message}
error-performance-scores-title = Scorurile de performanță nu sunt disponibile
error-performance-scores = Nu s-au putut încărca scorurile de performanță pentru membrii echipei. {$message}
error-salary-budget-title = Nu s-a putut încărca bugetul salarial al echipei
error-title = A apărut o problemă
table-section-title = Membri echipă
manager-team-context-card-title = Compensații echipă
manager-team-budget-allocation-card-title = Buget rămas
budget-summary-total-available = Buget total disponibil
budget-summary-placeholder-value = -
budget-summary-placeholder-footer = Însumează bugetele salariale pentru unitățile organizaționale ale membrilor echipei în cel mai recent plan de buget al companiei, dacă există rânduri (altfel unitatea din poziția dvs. dacă membrii nu au UO).
table-empty = Niciun membru al echipei nu corespunde filtrelor curente.
team-summary = { $count ->
  [one] 1 membru al echipei
  *[other] {$count} membri ai echipei
}

search-placeholder = Caută...
filter-sheet-title = Filtre
filter-sheet-description = Restrângeți lista după membru, salariu anual sau data ultimei măriri.

save-drafts = Salvează ciorne
submit-proposals = Trimite propunerile
submitted-count = {$count} trimise
draft-count = {$count} ciorne

submit-confirm-title = Trimite propunerile
submit-confirm-description = Sunteți pe cale să trimiteți {$count} propuneri ciornă pentru revizuire. Această acțiune nu poate fi anulată.
submit-confirm-ok = Da, trimite
submit-confirm-cancel = Anulează

over-budget-warning = Propunerile dvs. de creștere salarială depășesc bugetul alocat. Vă rugăm să revizuiți înainte de trimitere.

col-employee = Angajat
col-level = Nivel
col-tenure = Vechime
col-current-salary = Salariu curent
col-band-position = Poziția în bandă
col-performance = Performanță
performance-score-out-of = {$score} / {$max}
table-cell-empty = {" - "}
col-last-raise = Ultima mărire
col-proposed-increase = Creștere propusă
col-proposed-bonus = Bonus propus
col-justification = Justificare
col-bonuses-ytd = Bonusuri YTD

tenure-never-raise = Niciodată
tenure-this-month = Luna aceasta
profile-header-year = an
profile-header-years = ani
profile-header-month = lună
profile-header-months = luni
salary-monthly-suffix = /lună
hire-unknown = Necunoscut
hire-tooltip = Angajat: {$date}

compa-no-band = Fără date bandă salarială
compa-ratio-label = CR: {$ratio}

filters-toggle-aria = Afișează sau ascunde filtrele
search-toggle-aria = Caută în echipă
filter-employee-group = Angajat
filter-salary-group = Salariu anual
filter-salary-min-label = Minimum (anual)
filter-salary-max-label = Maximum (anual)
filter-salary-min-placeholder = Min.
filter-salary-max-placeholder = Max.
filter-last-raise-group = Ultima mărire
filter-last-raise-from-placeholder = De la
filter-last-raise-to-placeholder = Până la
filter-range-open = Oricare
filter-pill-salary-range = Salariu: {$min} – {$max}
filter-pill-last-raise-range = Ultima mărire: {$from} – {$to}
filter-pill-last-raise-from = Ultima mărire de la {$from}
filter-pill-last-raise-to = Ultima mărire până la {$to}
filter-pill-search = Căutare: „{$q}”
filter-remove-search-aria = Elimină căutarea
filter-remove-pill-aria = Elimină filtrul
filter-clear-all = Șterge toate filtrele

pagination-range = {$from}–{$to} din {$total} membri
pagination-item-suffix = membri
pagination-rows-per-page = Rânduri pe pagină
pagination-page = Pagina {$current} din {$total}
pagination-prev-aria = Pagina anterioară
pagination-next-aria = Pagina următoare

manager-team-distribution-method-section = Cum ar trebui împărțit fondul de creștere?

manager-team-save-allocations = Distribuie
manager-team-save-dialog-title = Salvează alocările în planul de buget
manager-team-save-dialog-description = Alegeți membrii echipei. Doar persoanele bifate sunt salvate cu creșterea din previzualizare și rândul corect de buget pe unitatea organizațională din plan; ceilalți rămân nemodificați.
manager-team-save-dialog-select-all = Selectează toți
manager-team-save-dialog-select-none = Golește selecția
manager-team-save-dialog-none-selected = Selectați cel puțin un membru al echipei.
manager-team-save-dialog-no-pool = Nu există fond de creștere salarială pentru bugetul echipei; alocările nu pot fi salvate.
manager-team-save-dialog-custom-exceeds-pool-selected = Suma alocărilor personalizate selectate depășește fondul de creștere. Ajustați sumele sau debifați persoane.
manager-team-save-dialog-checkbox-aria = Include pe { $name } la salvare
manager-team-save-dialog-cancel = Anulează
manager-team-save-dialog-confirm = Salvează
manager-team-save-dialog-saving = Se salvează…
manager-team-save-saving = Se salvează…
manager-team-save-no-token = Trebuie să fiți autentificat pentru a salva.
manager-team-save-no-employee = Profilul dvs. de angajat este necesar pentru salvare.
manager-team-save-missing-plan-ou = Nu există rând de buget salarial în acest plan pentru unitatea organizațională a lui {$name}. Completați mai întâi bugetul companiei.
manager-team-save-custom-exceeds-pool = Alocările personalizate depășesc fondul de creștere. Ajustați sumele înainte de salvare.
manager-team-save-error = Nu s-au putut salva alocările. {$message}
manager-team-save-error-generic = A apărut o problemă la salvare.
manager-team-submit-proposals = Trimite propunerile
manager-team-submitting = Se trimite…
manager-team-submit-no-drafts = Salvați cel puțin o alocare în planul de buget înainte de trimitere. Folosiți Distribuie, apoi salvați în dialog.
manager-team-submit-error = Nu s-au putut trimite propunerile. {$message}
manager-team-proposals-readonly-hint = Propunerile au fost trimise spre revizuire. Editarea este dezactivată.

supervisor-review-no-auth = Trebuie să fiți autentificat pentru a aproba sau a trimite înapoi propunerile.
supervisor-review-no-submitted = Nu există propuneri trimise pentru această acțiune.
supervisor-review-error-generic = A apărut o problemă. Încercați din nou.
supervisor-review-card-title = Revizuire supervizor
supervisor-review-submitted-count = { $count ->
  [zero] Nicio propunere trimisă de revizuit.
  [one] 1 propunere trimisă de revizuit.
  *[other] {$count} propuneri trimise de revizuit.
}
supervisor-review-busy = Se procesează…
supervisor-review-approve-all = Aprobă toate
supervisor-review-send-back = Trimite înapoi
supervisor-review-send-back-notes-required = Adăugați note pentru echipă înainte de trimiterea înapoi.
supervisor-review-send-back-title = Trimite înapoi către echipă
supervisor-review-send-back-placeholder = Explicați ce ar trebui să schimbe echipa…
supervisor-review-send-back-cancel = Anulează
supervisor-review-send-back-confirm = Trimite înapoi
supervisor-review-back-to-team = Înapoi la compensarea echipei
