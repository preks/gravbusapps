# Benefits Maintenance
page-title = Leistungsverwaltung
page-description = Verwalten Sie Unternehmensleistungen, Verfügbarkeit nach Standort, berechtigte Gruppen und Anbieter.

# Tabs
tab-benefits = Leistungen
tab-providers = Anbieter
tab-employee-assignments = Mitarbeiterzuweisungen
tab-pending-approvals = Ausstehende Genehmigungen

# Create action
action-create-benefit = Leistung erstellen

# Filters
filter-search-placeholder = Leistungen suchen...
filter-location = Standort
filter-location-all = Alle
filter-legal-entity = Gesellschaft
filter-visibility = Sichtbarkeit
filter-visibility-all = Alle
filter-visibility-public = Öffentlich
filter-visibility-private = Privat
filter-status = Status
filter-status-all = Alle
filter-status-active = Aktiv
filter-status-draft = Entwurf
filter-status-archived = Archiviert
filter-more = Weitere Filter
action-export = Exportieren
action-settings = Einstellungen

# Table columns
col-benefit = Leistung
col-code = Code
col-locations = Standorte
col-legal-entity = Gesellschaft
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
visibility-private = Privat

# Pagination
pagination-showing = Zeige { $from } bis { $to } von { $total } Leistungen
pagination-per-page = { $count } / Seite

# Empty states
empty-title = Keine Leistungen gefunden
empty-description = Es sind noch keine Leistungsarten konfiguriert. Erstellen Sie Ihre erste Leistungsart.
empty-no-results = Keine Leistungen entsprechen Ihren aktuellen Filtern.

# Detail panel
detail-close = Schließen
detail-tab-details = Details
detail-tab-providers = Anbieter
detail-tab-assignments = Zuweisungen
detail-tab-history = Verlauf
detail-section-basic = Basisinformationen
detail-section-availability = Verfügbarkeit
detail-section-value = Leistungswert
detail-section-catalog = Kataloginformationen
detail-field-code = Code
detail-field-description = Beschreibung
detail-field-display-order = Anzeigereihenfolge
detail-field-status = Status
detail-field-active-from = Aktiv ab
detail-field-active-to = Aktiv bis
detail-field-countries = Länder / Standorte
detail-field-legal-entity = Gesellschaft
detail-field-visibility = Sichtbarkeit
detail-field-value = Wert
detail-field-period = Zeitraum
detail-field-employee-contribution = Mitarbeiterbeitrag
detail-field-currency = Währung
detail-field-catalog = Katalog
detail-field-version = Version
detail-field-entry-id = Eintrags-ID
action-edit-benefit = Leistung bearbeiten
action-archive-benefit = Leistung archivieren
action-edit = Bearbeiten

# Benefit Type Dialog
dialog-create-title = Leistung erstellen
dialog-edit-title = Leistung bearbeiten
field-code = Code
field-code-placeholder = z.B. MEAL_VOUCHER
field-name = Name
field-name-placeholder = Name der Leistungsart
field-description = Beschreibung
field-description-placeholder = Optionale Beschreibung
field-country = Land / Standort
field-country-placeholder = Länder auswählen
field-legal-entity = Gesellschaft
field-legal-entity-placeholder = Gesellschaft auswählen...
field-legal-entity-hint = Währung wird automatisch aus der Gesellschaft übernommen
field-value = Wert
field-value-placeholder = z.B. 500
field-period = Zeitraum
field-currency = Währung
field-currency-placeholder = z.B. EUR
field-currency-hint = Automatisch basierend auf der Gesellschaft
field-visibility = Sichtbarkeit
field-visibility-hint = Öffentliche Leistungen sind für alle Mitarbeiter sichtbar. Private Leistungen sind nur für HR Backoffice sichtbar.
field-icon = Symbol
field-icon-placeholder = Symbol auswählen...
field-icon-search = Symbole suchen...
field-icon-no-results = Keine Symbole gefunden
field-employee-monthly-contribution = Monatlicher Mitarbeiterbeitrag
field-employee-monthly-contribution-placeholder = z.B. 50
field-employee-monthly-contribution-hint = Standard-Monatsbetrag, den der Mitarbeiter zu dieser Leistung beiträgt
field-display-order = Anzeigereihenfolge
field-display-order-placeholder = z.B. 10

# Provider Dialog
dialog-create-provider-title = Anbieter erstellen
dialog-edit-provider-title = Anbieter bearbeiten
field-parent-benefit = Übergeordnete Leistungsart
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
toast-created = Leistung "{ $name }" erfolgreich erstellt
toast-updated = Leistung "{ $name }" erfolgreich aktualisiert
toast-deactivated = Leistung "{ $name }" archiviert
toast-activated = Leistung "{ $name }" aktiviert
toast-provider-created = Anbieter "{ $name }" erfolgreich erstellt
toast-provider-updated = Anbieter "{ $name }" erfolgreich aktualisiert
toast-provider-deleted = Anbieter "{ $name }" gelöscht
toast-error = Ein Fehler ist aufgetreten: { $message }
toast-copied = In Zwischenablage kopiert

# Validation
validation-code-required = Code ist erforderlich
validation-name-required = Name ist erforderlich
validation-country-required = Mindestens ein Land ist erforderlich
validation-legal-entity-required = Gesellschaft ist erforderlich
validation-value-required = Wert ist erforderlich
validation-currency-missing = Die ausgewählte Gesellschaft hat keine Währung konfiguriert. Bitte aktualisieren Sie zuerst die Gesellschaftsdaten.

# Providers tab (standalone)
providers-title = Alle Anbieter
providers-search-placeholder = Anbieter suchen...
providers-col-provider = Anbieter
providers-col-parent = Übergeordnete Leistung
providers-empty = Keine Anbieter gefunden
providers-no-available = Keine nicht verknüpften Anbieter verfügbar
action-create-provider = Neuer Anbieter
action-add-provider = Anbieter hinzufügen
action-select-provider = Anbieter auswählen...
toast-provider-linked = Anbieter "{ $name }" erfolgreich verknüpft
toast-provider-unlinked = Anbieter "{ $name }" getrennt
action-back = Zurück
action-view-providers = Anbieter anzeigen
action-refresh = Aktualisieren

# KPI Cards - Benefits tab
kpi-section-title = Leistungsübersicht
kpi-available-benefits = Verfügbare Leistungen
kpi-private-benefits = Private Leistungen
kpi-employees-with-benefits = Mitarbeiter mit Leistungen
kpi-avg-per-employee = Durchschn. Leistungen / Mitarbeiter
kpi-trend-vs-last-month = ggü. Vormonat
kpi-available-footer = Aktive Leistungen, die das Unternehmen anbietet
kpi-private-footer = Leistungen, die nur von HR zugewiesen werden können
kpi-employees-footer = Mitarbeiter mit mind. einer aktiven Leistung
kpi-avg-footer = Durchschnittliche Leistungen pro Mitarbeiter

# KPI Cards - Providers tab
kpi-providers-count = Anzahl Anbieter
kpi-providers-footer = Über { $count } Leistungen
kpi-providers-avg = Durchschn. Anbieter / Leistung
kpi-providers-avg-footer = Durchschnittliche Anbieter pro Leistungstyp

# KPI Cards - Employee Assignments tab
kpi-assignments-employees = Mitarbeiter mit Leistungen
kpi-assignments-employees-footer = Im aktuellen Zeitraum
kpi-assignments-total = Aktive Leistungen gesamt
kpi-assignments-total-footer = Über alle Mitarbeiter
kpi-assignments-avg = Durchschn. Leistungen / Mitarbeiter
kpi-assignments-avg-footer = Durchschnittliche aktive Leistungen pro Mitarbeiter

# KPI Cards - Pending Approvals tab
kpi-pending-total = Ausstehende Genehmigungen
kpi-pending-total-footer = Anfragen ausstehend
kpi-pending-employees = Anfragende Mitarbeiter
kpi-pending-employees-footer = Mitarbeiter mit ausstehenden Anfragen

# Employee Assignments tab
assignments-section-all = Alle Leistungen
assignments-search-placeholder = Mitarbeiter, Leistungen suchen...
assignments-filter-title = Leistungen filtern
assignments-filter-description = Mitarbeiterzuweisungen eingrenzen
assignments-empty = Keine Mitarbeiterzuweisungen für diesen Zeitraum gefunden.
assignments-detail-title = Leistungsdetails
assignments-exporting = Wird exportiert...
filter-benefits-title = Leistungen filtern
filter-group-legal-entity = Rechtseinheit
filter-group-provider = Anbieter
filter-group-status = Status
assignments-kpi-employees = Mitarbeiter
assignments-kpi-active = Aktive Zuweisungen
assignments-kpi-active-footer = Gesamtzahl aktiver Leistungszuweisungen
assignments-kpi-avg = Durchschn. / Mitarbeiter
assignments-kpi-avg-footer = Durchschnittliche Leistungen pro Mitarbeiter

# Shared column headers
col-employee = Mitarbeiter
col-benefit-type = Leistungsart
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
section-benefit = Leistungsinformationen
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
export-sheet-name = Leistungen { $month }

# Pending Approvals tab
pending-description = Überprüfen und verwalten Sie ausstehende Leistungsaktivierungsanfragen von Mitarbeitern.
pending-no-requests = Derzeit keine ausstehenden Leistungsanfragen.
pending-error-loading = Fehler beim Laden der ausstehenden Genehmigungen. Bitte versuchen Sie es erneut.
pending-col-employee = Mitarbeiter
pending-col-benefit-type = Leistungstyp
pending-col-provider = Anbieter
pending-col-amount = Betrag
pending-col-start-date = Startdatum
pending-col-requested-at = Angefragt
pending-col-status = Status
pending-col-actions = Aktionen
pending-action-approve = Genehmigen
pending-action-reject = Ablehnen
pending-approve-title = Leistungsanfrage genehmigen
pending-reject-title = Leistungsanfrage ablehnen
pending-confirm-approve = Möchten Sie die Leistung { $benefitType } für { $employeeName } wirklich genehmigen?
pending-confirm-reject = Möchten Sie die Leistung { $benefitType } für { $employeeName } wirklich ablehnen?
pending-reason-placeholder = Kommentar oder Grund hinzufügen (erforderlich bei Ablehnung)...
pending-reason-required = Bei Ablehnung ist ein Grund erforderlich.
pending-processing = Wird verarbeitet...
pending-toast-approved = Leistungsanfrage erfolgreich genehmigt
pending-toast-rejected = Leistungsanfrage abgelehnt

# Legacy / backward-compat keys
types-search-placeholder = Suchen...
types-empty = Keine Einträge gefunden
action-delete = Löschen
