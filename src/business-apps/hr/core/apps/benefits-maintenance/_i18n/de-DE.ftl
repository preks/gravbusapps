# Benefits Maintenance
page-title = Benefit-Verwaltung
page-description = Verwalten Sie Unternehmens-Benefits, Verfügbarkeit nach Standort, berechtigte Gruppen und Anbieter.

# Tabs
tab-benefits = Benefits
tab-providers = Anbieter
tab-employee-assignments = Mitarbeiterzuweisungen
tab-pending-approvals = Ausstehende Genehmigungen

# Create action
action-create-benefit = Benefit erstellen

# Filters
filter-search-placeholder = Benefits suchen...
filter-location = Standort
filter-location-all = Alle
filter-legal-entity = Unternehmen
filter-visibility = Sichtbarkeit
filter-visibility-all = Alle
filter-visibility-public = Öffentlich
filter-visibility-private = Individuell
filter-status = Status
filter-status-all = Alle
filter-status-active = Aktiv
filter-status-draft = Entwurf
filter-status-archived = Archiviert
filter-more = Weitere Filter
action-export = Exportieren
action-settings = Einstellungen

# Table columns
col-benefit = Benefit
col-code = Code
col-locations = Standorte
col-legal-entity = Unternehmen
col-visibility = Sichtbarkeit
col-value = Wert
col-company-contribution = Arbeitgeberbeitrag
col-period = Zeitraum
col-currency = Währung
col-status = Status
col-actions = Aktionen
col-name = Name
col-description = Beschreibung
col-display-order = Reihenfolge
col-providers = Anbieter

# Status
status-active = Aktiv
status-draft = Entwurf
status-archived = Archiviert
status-inactive = Inaktiv

# Periods
period-monthly = Monatlich
period-yearly = Jährlich
period-one-time = Einmalig

# Benefit visibility
visibility-public = Öffentlich
visibility-private = Individuell

# Pagination
pagination-showing = Zeige { $from } bis { $to } von { $total } Benefits
pagination-per-page = { $count } / Seite

# Empty states
empty-title = Keine Benefits gefunden
empty-description = Es sind noch keine Benefit-Arten konfiguriert. Erstellen Sie Ihre erste Benefit-Art.
empty-no-results = Keine Benefits entsprechen Ihren aktuellen Filtern.

# Detail panel
detail-close = Schließen
detail-tab-details = Details
detail-tab-providers = Anbieter
detail-tab-assignments = Zuweisungen
detail-tab-history = Verlauf
detail-section-basic = Basisinformationen
detail-section-availability = Verfügbarkeit
detail-section-value = Benefit-Wert
detail-section-catalog = Kataloginformationen
detail-field-code = Code
detail-field-description = Beschreibung
detail-field-display-order = Anzeigereihenfolge
detail-field-status = Status
detail-field-active-from = Aktiv ab
detail-field-active-to = Aktiv bis
detail-field-countries = Länder / Standorte
detail-field-legal-entity = Unternehmen
detail-field-visibility = Sichtbarkeit
detail-field-value = Wert
detail-field-period = Zeitraum
detail-field-employee-contribution = Mitarbeiterbeitrag
detail-field-currency = Währung
detail-field-catalog = Katalog
detail-field-version = Version
detail-field-entry-id = Eintrags-ID
action-edit-benefit = Benefit bearbeiten
action-archive-benefit = Benefit archivieren
action-reactivate-benefit = Benefit reaktivieren
action-edit = Bearbeiten

# Benefit Type Dialog
dialog-create-title = Benefit erstellen
dialog-edit-title = Benefit bearbeiten
field-code = Code
field-code-placeholder = z.B. MEAL_VOUCHER
field-name = Name
field-name-placeholder = Name der Benefit-Art
field-description = Beschreibung
field-description-placeholder = Optionale Beschreibung
field-country = Land / Standort
field-country-placeholder = Länder auswählen
field-legal-entity = Unternehmen
field-legal-entity-placeholder = Unternehmen auswählen...
field-legal-entity-hint = Währung wird automatisch aus dem Unternehmen übernommen
field-value = Wert
field-value-placeholder = z.B. 500
field-period = Zeitraum
field-currency = Währung
field-currency-placeholder = z.B. EUR
field-currency-hint = Automatisch basierend auf dem Unternehmen
field-visibility = Sichtbarkeit
field-visibility-hint = Öffentliche Benefits sind für alle Mitarbeiter sichtbar. Individuelle Benefits sind nur für HR Backoffice sichtbar.
field-icon = Symbol
field-icon-placeholder = Symbol auswählen...
field-icon-search = Symbole suchen...
field-icon-no-results = Keine Symbole gefunden
field-employee-monthly-contribution = Monatlicher Mitarbeiterbeitrag
field-employee-monthly-contribution-placeholder = z.B. 50
field-employee-monthly-contribution-hint = Standard-Monatsbetrag, den der Mitarbeiter zu diesem Benefit beiträgt
field-display-order = Anzeigereihenfolge
field-display-order-placeholder = z.B. 10

# Provider Dialog
dialog-create-provider-title = Anbieter erstellen
dialog-edit-provider-title = Anbieter bearbeiten
field-parent-benefit = Übergeordnete Benefit-Art
field-parent-benefit-placeholder = Benefit-Art auswählen...
field-provider-name = Anbietername
field-provider-name-placeholder = z.B. Allianz, Edenred

# Country filter
country-filter-label = Land
country-filter-placeholder = Land auswählen...
country-filter-all = Alle Länder
country-loading = Länder werden geladen...

# Form actions
btn-cancel = Abbrechen
btn-create = Erstellen
btn-save = Speichern
btn-creating = Wird erstellt...
btn-saving = Wird gespeichert...

# Toasts
toast-created = Benefit "{ $name }" erfolgreich erstellt
toast-updated = Benefit "{ $name }" erfolgreich aktualisiert
toast-deactivated = Benefit "{ $name }" archiviert
toast-activated = Benefit "{ $name }" aktiviert
toast-provider-created = Anbieter "{ $name }" erfolgreich erstellt
toast-provider-updated = Anbieter "{ $name }" erfolgreich aktualisiert
toast-provider-deleted = Anbieter "{ $name }" gelöscht
toast-provider-activated = Anbieter "{ $name }" reaktiviert
toast-error = Ein Fehler ist aufgetreten: { $message }
toast-copied = In Zwischenablage kopiert

# Validation
validation-code-required = Code ist erforderlich
validation-name-required = Name ist erforderlich
validation-country-required = Mindestens ein Land ist erforderlich
validation-legal-entity-required = Unternehmen ist erforderlich
validation-value-required = Wert ist erforderlich
validation-parent-benefit-required = Übergeordnete Benefit-Art ist erforderlich
validation-currency-missing = Das ausgewählte Unternehmen hat keine Währung konfiguriert. Bitte aktualisieren Sie zuerst die Unternehmensdaten.

# Providers tab (standalone)
providers-title = Alle Anbieter
providers-search-placeholder = Anbieter suchen...
providers-col-provider = Anbieter
providers-col-parent = Übergeordnetes Benefit
providers-empty = Keine Anbieter gefunden
providers-no-available = Keine nicht verknüpften Anbieter verfügbar
action-create-provider = Neuer Anbieter
action-add-provider = Anbieter hinzufügen
action-select-provider = Anbieter auswählen...
action-archive-provider = Anbieter archivieren
action-reactivate-provider = Anbieter reaktivieren
toast-provider-linked = Anbieter "{ $name }" erfolgreich verknüpft
toast-provider-unlinked = Anbieter "{ $name }" getrennt
action-back = Zurück
action-view-providers = Anbieter anzeigen
action-refresh = Aktualisieren

# KPI Cards - Benefits tab
kpi-section-title = Benefit-Übersicht
kpi-available-benefits = Verfügbare Benefits
kpi-private-benefits = Individuelle Benefits
kpi-employees-with-benefits = Mitarbeiter mit Benefits
kpi-avg-per-employee = Durchschn. Benefits / Mitarbeiter
kpi-trend-vs-last-month = ggü. Vormonat
kpi-available-footer = Aktive Benefits, die das Unternehmen anbietet
kpi-private-footer = Individuelle Benefits, die nur von HR zugewiesen werden können
kpi-employees-footer = Mitarbeiter mit mind. einem aktiven Benefit
kpi-avg-footer = Durchschnittliche Benefits pro Mitarbeiter

# KPI Cards - Providers tab
kpi-providers-count = Anzahl Anbieter
kpi-providers-footer = Über { $count } Benefits
kpi-providers-avg = Durchschn. Anbieter / Benefit
kpi-providers-avg-footer = Durchschnittliche Anbieter pro Benefit-Art

# KPI Cards - Employee Assignments tab
kpi-assignments-employees = Mitarbeiter mit Benefits
kpi-assignments-employees-footer = Im aktuellen Zeitraum
kpi-assignments-total = Aktive Benefits gesamt
kpi-assignments-total-footer = Über alle Mitarbeiter
kpi-assignments-avg = Durchschn. Benefits / Mitarbeiter
kpi-assignments-avg-footer = Durchschnittliche aktive Benefits pro Mitarbeiter

# KPI Cards - Pending Approvals tab
kpi-pending-total = Ausstehende Genehmigungen
kpi-pending-total-footer = Anfragen ausstehend
kpi-pending-employees = Anfragende Mitarbeiter
kpi-pending-employees-footer = Mitarbeiter mit ausstehenden Anfragen

# Employee Assignments tab
assignments-section-all = Alle Benefits
assignments-search-placeholder = Mitarbeiter, Benefits suchen...
assignments-filter-title = Benefits filtern
assignments-filter-description = Mitarbeiterzuweisungen eingrenzen
assignments-empty = Keine Mitarbeiterzuweisungen für diesen Zeitraum gefunden.
assignments-detail-title = Benefit-Details
assignments-exporting = Wird exportiert...
filter-benefits-title = Benefits filtern
filter-group-legal-entity = Unternehmen
filter-group-provider = Anbieter
filter-group-status = Status
assignments-kpi-employees = Mitarbeiter
assignments-kpi-active = Aktive Zuweisungen
assignments-kpi-active-footer = Gesamtzahl aktiver Benefit-Zuweisungen
assignments-kpi-avg = Durchschn. / Mitarbeiter
assignments-kpi-avg-footer = Durchschnittliche Benefits pro Mitarbeiter

# Shared column headers
col-employee = Mitarbeiter
col-benefit-type = Benefit-Art
col-provider = Anbieter
col-monthly-amount = Monatlicher Betrag
col-yearly-amount = Jährlicher Betrag
col-employee-contribution = Mitarbeiterbeitrag
col-start-date = Startdatum
col-end-date = Enddatum

# Status labels
status-approved = Genehmigt
status-pending = Ausstehend
status-activation = Aktivierung
status-deactivation = Deaktivierung
status-unknown = Unbekannt
status-cancelled = Storniert

# Benefit detail sheet sections
section-benefit = Benefit-Informationen
section-amounts = Beträge
section-period = Zeitraum
section-notes = Notizen
field-type = Typ
field-provider = Anbieter
field-monthly-amount = Monatlicher Betrag
field-yearly-amount = Jährlicher Betrag
field-employee-monthly-contrib = Mitarbeiterbeitrag (monatlich)
field-start-date = Startdatum
field-end-date = Enddatum

# Month navigation
month-nav-previous = Vorheriger Monat
month-nav-next = Nächster Monat
month-nav-today = Heute

# Export
export-sheet-name = Benefits { $month }

# Pending Approvals tab
pending-description = Überprüfen und verwalten Sie ausstehende Benefit-Aktivierungsanfragen von Mitarbeitern.
pending-no-requests = Derzeit keine ausstehenden Benefit-Anfragen.
pending-error-loading = Fehler beim Laden der ausstehenden Genehmigungen. Bitte versuchen Sie es erneut.
pending-col-employee = Mitarbeiter
pending-col-benefit-type = Benefit-Art
pending-col-provider = Anbieter
pending-col-amount = Betrag
pending-col-start-date = Startdatum
pending-col-requested-at = Angefragt
pending-col-status = Status
pending-col-actions = Aktionen
pending-action-approve = Genehmigen
pending-action-reject = Ablehnen
pending-approve-title = Benefit-Anfrage genehmigen
pending-reject-title = Benefit-Anfrage ablehnen
pending-confirm-approve = Möchten Sie das Benefit { $benefitType } für { $employeeName } wirklich genehmigen?
pending-confirm-reject = Möchten Sie das Benefit { $benefitType } für { $employeeName } wirklich ablehnen?
pending-reason-placeholder = Kommentar oder Grund hinzufügen (erforderlich bei Ablehnung)...
pending-reason-required = Bei Ablehnung ist ein Grund erforderlich.
pending-processing = Wird verarbeitet...
pending-toast-approved = Benefit-Anfrage erfolgreich genehmigt
pending-toast-rejected = Benefit-Anfrage abgelehnt

# Legacy / backward-compat keys
types-search-placeholder = Suchen...
types-empty = Keine Einträge gefunden
action-delete = Löschen
