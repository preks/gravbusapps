# Conversion Result Step Translations (German - Germany)

# Step Header
conversion-result-step-title = Schritt 3: Prüfen und importieren

# Action Buttons
download-json-button = Datendatei herunterladen
start-over-button = Neu starten
import-more-button = Mehr importieren
done-button = Fertig
continue-ownership-button = Weiter zu Eigentumsbeziehungen
skip-ownership-button = Eigentum überspringen

# Success Messages
import-success-title = Import wird verarbeitet
import-success-message = Ihre { $count } { $entityType } werden im Hintergrund importiert.
import-success-email-hint = Wir senden Ihnen eine E-Mail, wenn der Import abgeschlossen ist.
conversion-success-message = { $count } { $entityType } sind bereit zum Import

# Campaign
campaign-label = Kampagne: { $name }

# Preview Section
preview-title = Vorschau (Erste { $count } { $entityType })
preview-more-text = ... und { $count } weitere { $entityType }

# Preview Badges
industry-badge = Branche
size-badge = Größe

# Extraction Warnings Section
extraction-warnings-title = Import-Warnungen

# Ownership Summary Section
ownership-summary-title = Eigentumsbeziehungen
ownership-summary-description = { $count } Eigentumsbeziehung(en) erkannt. Für { $unresolvedCount } Beziehung(en) fehlt noch eine aufgelöste Unternehmens-ID.
ownership-summary-unknown-company = Unbekanntes Unternehmen
ownership-summary-owned-by = Im Besitz von: { $names }
ownership-summary-owns = Besitzt: { $names }
ownership-summary-more = ... und { $count } weitere Unternehmenszeile(n) mit Eigentumsbeziehungen
ownership-company-unresolved-suffix =  (Nicht aufgelöst)

# Executive Summary Section
executive-summary-title = Unternehmensführung
executive-summary-description = { $count } Führungskraft/-kräfte erkannt. { $resolvedCount } aufgelöst, { $unresolvedCount } nicht aufgelöst.
executive-summary-unknown-company = Unbekanntes Unternehmen
executive-summary-executives = Führungskräfte: { $names }
executive-summary-executives-label = Führungskräfte:
executive-summary-type = Typ: { $type }
executive-summary-more = ... und { $count } weitere Unternehmenszeile(n) mit Führungskräften
executive-source-employee-suffix = (Mitarbeiter)
executive-source-contact-suffix = (Kontakt)
executive-source-unresolved-suffix = (Nicht aufgelöst)
executive-source-unresolved-tooltip = Es wurde kein passender Mitarbeiter oder Investment-Kontakt im System gefunden, daher wird diese Führungskraft nicht importiert.

# Stakeholder Summary Section
stakeholder-summary-title = Unternehmens-Stakeholder
stakeholder-summary-description = { $count } Stakeholder erkannt. { $contactCount } als Investment-Kontakt, { $accountCount } als Investment-Konto, { $externalCount } extern.
stakeholder-summary-unknown-company = Unbekanntes Unternehmen
stakeholder-summary-stakeholders = Stakeholder: { $names }
stakeholder-summary-more = ... und { $count } weitere Unternehmenszeile(n) mit Stakeholdern
stakeholder-source-contact-suffix = (Investment-Kontakt)
stakeholder-source-account-suffix = (Investment-Konto)
stakeholder-source-external-suffix = (Extern)

# Data Quality Section
data-quality-warnings-title = Datenqualitätswarnungen
show-less-button = Weniger anzeigen
more-warnings-text = ... und { $count } weitere Warnungen
all-fields-good-message = Alles sieht gut aus – bereit zum Importieren!

# Import Button
import-button = { $count } { $entityType } importieren
importing-button = Wird importiert...

# CSV-Qualität
csv-quality-warning-title = Spaltenausrichtungsproblem erkannt
csv-quality-warning-message = { $shiftedRows } von { $totalRows } Zeilen haben möglicherweise falsch ausgerichtete Spalten. Sie können versuchen, sie automatisch zu korrigieren – einige Werte können sich ändern.
csv-quality-repair-button = Automatisch korrigieren und Daten extrahieren
csv-quality-repairing-button = Wird korrigiert...
csv-quality-residual-message = { $shiftedRows } Zeile(n) konnten nicht vollständig korrigiert werden. Diese Zeilen können fehlende oder verschobene Werte enthalten.
csv-quality-success-message = Alle Zeilen wurden erfolgreich korrigiert.
