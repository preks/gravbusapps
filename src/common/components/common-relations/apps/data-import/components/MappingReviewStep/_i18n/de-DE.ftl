# Mapping Review Step Translations (German - Germany)

# Step Header
mapping-review-step-title = Schritt 2: Spaltenzuordnungen prüfen

# Buttons
start-over-button = Neu starten
convert-button = Weiter mit { $count } { $entityType }
convert-button-no-count = Weiter mit { $entityType }
converting-button = Daten werden vorbereitet...

# Summary Section
ai-detected-summary = Wir haben { $sourceCount } Spalten in Ihrer Datei gefunden und { $mappedCount } davon zugeordnet.
unmapped-fields-warning = { $count } Spalten benötigen noch eine Zuordnung

# Section Titles
mapped-fields-title = Zugeordnete Spalten
unmapped-fields-title = Nicht zugeordnete Spalten ({ $count })
relationship-columns-title = Beziehungsspalten
relationship-hint-company-columns = Fügen Sie eine Spalte mit dem Unternehmensnamen sowie „Owned By“- und/oder „Owns“-Spalten hinzu. Trennen Sie mehrere Unternehmensnamen mit Semikolons.
relationship-hint-percentages = Prozentangaben wie „Beta Holdings (50%)“ werden in Eigentumsspalten unterstützt.
relationship-hint-owner-vs-owned-by = Hinweis: „Owner“ (bzw. „Owner Employee“) ist der zuständige Mitarbeiter in unserer Firma und wird als Person aufgelöst. „Owned By“ ist die Muttergesellschaft, die dieses Unternehmen besitzt, und wird als Investment Company aufgelöst — tragen Sie dort Firmennamen ein, keine Personen.
relationship-hint-executives = „Executives“ enthält Personennamen (mehrere mit Semikolons trennen). Jeder Name wird zuerst gegen Mitarbeiter, dann gegen Investment Contacts abgeglichen; nicht gefundene Namen werden übersprungen.
relationship-hint-executive-type = „Executive Type“ gilt für alle Führungskräfte in einer Zeile (z. B. CEO, CFO) und muss einem Eintrag im Katalog `LegalEntityExecutiveType` entsprechen.
relationship-hint-stakeholders = „Stakeholders“ erwartet Einträge der Form `Name, Typ`, getrennt durch Semikolons (z. B. `Mike, Audit; Anna, Legal`). Jeder Name wird zuerst gegen Investment Contacts, dann gegen Investment Accounts abgeglichen; ohne Treffer wird der Eintrag als externer Stakeholder übernommen.

# Field Labels
source-field-label = Ihre Spalte
target-field-label = Wird zugeordnet zu
type-label = Typ
select-field-placeholder = Feld auswählen
search-field-placeholder = Felder suchen...
no-fields-found = Keine Felder gefunden

# Type Values
type-catalog = Katalog
type-direct = Direkt

# Unmapped Section
click-to-add-hint = Klicken Sie auf eine Spalte, um eine Zuordnung hinzuzufügen

# Error State
no-analysis-data = Es wurde noch keine Datei analysiert. Laden Sie zuerst eine Datei hoch und analysieren Sie sie.
