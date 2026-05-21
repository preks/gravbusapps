hr-admin-cockpit-page-title = HR Admin Cockpit
hr-admin-cockpit-page-description = Datenqualität & Vollständigkeit

tab-overview = Übersicht
tab-issues = Probleme

issues-title = Mitarbeiterdaten-Probleme
issues-subtitle = Fehlende oder unvollständige Mitarbeiterdatensätze prüfen und beheben, gefiltert nach Schweregrad und Kategorie.

company-filter-all = Alle Unternehmen
company-filter-label = Unternehmensfilter

section-key-metrics = Kennzahlen

kpi-overall-completion = Gesamtausfüllungsrate
kpi-overall-footer = Über { $employees } Mitarbeiter und { $areas } Pflichtdatenbereiche
kpi-employees-missing = Mitarbeiter mit fehlenden Daten
kpi-employees-missing-footer = Mindestens ein Pflichtfeld unvollständig
kpi-payroll-blockers = Kritische Gehaltsabrechnungsblocker
kpi-payroll-blockers-trend = Handlungsbedarf
kpi-payroll-blockers-footer = Eindeutige Mitarbeiter ohne Steuer-ID und/oder Bankkonto

section-data-completion = Datenvollständigkeit – Übersicht
data-completion-subtitle = Pflichtfelder der Mitarbeiter im ausgewählten Unternehmensbereich
data-completion-header-required = Erforderliche Mitarbeiterdaten
data-completion-header-completion = Vollständigkeit
data-completion-header-missing = Fehlend
data-completion-row-aria = { $category }: { $rate }% vollständig, { $missing } Mitarbeiter fehlend
data-completion-row-tooltip = { $category }: { $missing } Mitarbeiter mit fehlenden Pflichtdaten

category-legal-entity = Rechtliche Einheit
category-location = Standort
category-cost-center = Kostenstelle
category-job-position = Stelle
category-working-conditions = Arbeitsbedingungen
category-working-hours = Arbeitszeit
category-tax = Steuerinformationen
category-payroll-bank = Gehalts-Bankkonto

section-breakdown = Wo Daten fehlen (nach Rechtlicher Einheit & Standort)
breakdown-subtitle = % der Mitarbeiter mit fehlenden Daten
breakdown-legend-low = 0–25 %
breakdown-legend-medium = 26–50 %
breakdown-legend-high = 51–75 %
breakdown-legend-critical = 76–100 %
breakdown-legend-none = Keine Daten
breakdown-col-legal-entity = Rechtliche Einheit
breakdown-col-all-locations = Alle Standorte

section-job-architecture = Jobarchitektur – Vollständigkeit
ja-stat-positions = Stellen
ja-stat-with-profiles = Mit Jobprofilen
ja-stat-with-descriptions = Mit Beschreibungen
ja-stat-with-skills = Mit Kompetenzen
ja-stat-sub-total = Gesamt
ja-missing-profiles = Fehlende Profile
ja-missing-descriptions = Fehlende Jobbeschreibungen
ja-missing-skills = Fehlende Kompetenzen

ja-drawer-positions-title = Stellen ohne Profile
ja-drawer-descriptions-title = Jobprofile ohne Jobbeschreibung
ja-drawer-skills-title = Jobprofile ohne Kompetenzen

section-recommended-actions = Empfohlene Maßnahmen
recommended-actions-subtitle = Aufgaben mit dem größten Einfluss
recommended-affected = { $count } Mitarbeiter betroffen

action-bank-title = Gehalts-Bankdaten vervollständigen
action-bank-desc = Mitarbeiter können nicht ohne gültiges Bankkonto bezahlt werden.
action-tax-title = Steuer-IDs vervollständigen
action-tax-desc = Steuernummern sind für die gesetzliche Gehaltsabrechnung erforderlich.
action-location-title = Standorte zuweisen
action-location-desc = Standort fehlt bei aktiven Zuordnungen.
action-jp-profile-title = Jobprofile mit Stellen verknüpfen
action-jp-profile-desc = Stellen ohne Profile stören die Jobarchitektur-Governance.
action-jprof-desc-title = Jobprofilbeschreibungen hinzufügen
action-jprof-desc-desc = Profile ohne Beschreibungen im Geltungsbereich.
action-jprof-skills-title = Kompetenzen mit Jobprofilen verknüpfen
action-jprof-skills-desc = Kompetenzrahmen erfordern verknüpfte Kompetenzen je Profil.

section-top-urgent = Dringendste Datensätze
top-urgent-subtitle = Dringendste offene Aufgaben
top-urgent-col-record = Datensatz
top-urgent-col-legal-entity = Rechtseinheit
top-urgent-col-missing = Fehlende Felder
top-urgent-col-severity = Schweregrad
top-urgent-col-action = Aktion
top-urgent-btn-review = Prüfen
top-urgent-view-all-issues = Alle { $count } Probleme anzeigen

section-records-attention = Datensätze, die Aufmerksamkeit erfordern
records-search-placeholder = Mitarbeiter suchen...
records-filter-title = Datensätze filtern
records-filter-description = Nach Schweregrad, fehlenden Feldern, Rechtlicher Einheit oder Standort eingrenzen.
records-clear-focus = Fokusfilter löschen
records-empty = Keine Datensätze entsprechen den aktuellen Filtern.

col-employee = Mitarbeiter
col-legal-entity = Rechtliche Einheit
col-location = Standort
col-missing-fields = Fehlende Felder
col-severity = Schweregrad

filter-severity = Schweregrad
filter-severity-critical = Kritisch
filter-severity-warning = Warnung
filter-missing-fields = Fehlende Felder
filter-legal-entity = Rechtliche Einheit
filter-location = Standort

detail-employee-details = Mitarbeiterdetails
detail-legal-entity = Rechtliche Einheit
detail-location = Standort
detail-severity = Schweregrad
detail-missing-data = Fehlende Daten ({ $count })
detail-completeness-checklist = Vollständigkeits-Checkliste
detail-status-ok = OK
detail-status-missing = Fehlend

flow-update-working-conditions = Arbeitsbedingungen aktualisieren
flow-update-working-hours = Arbeitszeit aktualisieren
flow-update-tax-details = Steuerdaten aktualisieren
flow-update-bank-account = Bankkonto aktualisieren

profile-sheet-title = Jobprofildetails
profile-section-basic = Grundinformationen
profile-label-name = Name
profile-label-code = Code
profile-label-description = Beschreibung
profile-label-job-function = Jobfunktion
profile-label-job-level = Joblevel
profile-section-skills = Erforderliche Kompetenzen und Level
profile-skill-level = Level { $level }
profile-skill-level-unspecified = Level nicht angegeben
profile-btn-edit = Bearbeiten
profile-btn-close = Schließen

issue-legal-entity = Rechtliche Einheit nicht zugewiesen
issue-location = Standort fehlt
issue-cost-center = Kostenstelle fehlt
issue-job-position = Stelle fehlt
issue-working-conditions = Arbeitsbedingungen unvollständig
issue-working-hours = Arbeitszeit fehlt
issue-tax = Steuerinformationen unvollständig
issue-payroll-bank = Bankkonto fehlt
issue-jp-no-profile = Stelle hat kein Jobprofil
issue-jp-no-description = Jobprofil ohne Beschreibung
issue-jp-no-skills = Jobprofil hat keine Kompetenzen

hint-legal-entity = Weisen Sie ein Unternehmen / eine rechtliche Einheit auf der aktiven Zuordnung zu.
hint-location = Wählen Sie einen Standort für die Mitarbeiterzuordnung aus.
hint-cost-center = Weisen Sie eine Kostenstelle auf der Zuordnung zu.
hint-job-position = Verknüpfen Sie eine Stelle.
hint-working-conditions = Vertragsart, Beschäftigungsart und Eintrittsdatum ausfüllen.
hint-working-hours = Wochen- oder tägliche Arbeitszeit definieren.
hint-tax = Steuer-IDs für die Gehaltsabrechnung hinzufügen.
hint-payroll-bank = Ein Gehalts-Bankkonto hinzufügen.
hint-jp-no-profile = Diese Stelle mit einem Jobprofil in MDM / Jobstrukturen verbinden.
hint-jp-no-description = Eine Jobprofilbeschreibung oder lokalisierte Beschreibung hinzufügen.
hint-jp-no-skills = Mindestens eine Kompetenz mit dem Jobprofil verknüpfen.

severity-critical = Kritisch
severity-warning = Warnung
severity-info = Info

checklist-legal-entity = Rechtliche Einheit zugewiesen
checklist-location = Standort zugewiesen
checklist-cost-center = Kostenstelle zugewiesen
checklist-job-position = Stelle zugewiesen
checklist-working-conditions = Arbeitsbedingungen vollständig
checklist-working-hours = Arbeitszeit erfasst
checklist-tax = Steuerdaten vorhanden
checklist-payroll-bank = Bankkonto vorhanden

empty-no-data = Keine Daten
empty-adjust-filters = Filter anpassen.
empty-no-breakdown = Keine Aufschlüsselung
empty-no-employees = Keine Mitarbeiterdaten im Geltungsbereich.
empty-no-actions = Keine Maßnahmen
empty-healthy = Datensatz sieht gut aus.
empty-no-items = Keine Einträge
empty-all-complete = Alle Datensätze sind vollständig.

btn-show-more = Mehr anzeigen
btn-show-less = Weniger anzeigen

employee-not-assigned = Nicht zugewiesen

unknown-company = Unbekanntes Unternehmen
unknown-location = Unbekannter Standort
unknown-label = Unbekannt
unknown-skill = Unbekannte Kompetenz

error-no-structure = Keine aktive Organisationsstruktur gefunden.
error-load-failed = Datenqualitäts-Dataset konnte nicht geladen werden
error-load-filters = Filter konnten nicht geladen werden.
