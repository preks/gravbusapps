title = Konfiguration des Leistungszyklus
subtitle = Leistungsbeurteilungszyklen erstellen und verwalten

tab-cycles = Leistungszeitraum
tab-performance = Überprüfungszyklus
tab-rating-scales = Bewertungsskalen
tab-values = Werte

button-add = Hinzufügen
button-cancel = Abbrechen
button-save = Speichern
button-start = Starten
button-activate = Aktivieren
button-deactivate = Deaktivieren
button-complete = Abschließen
button-delete = Löschen
button-manual-run = Manuell starten

table-name = Name
table-dates = Überprüfungsdaten
table-type = Typ
table-scale = Skala
table-participants = Teilnehmer
table-status = Status
status-completed = Abgeschlossen
status-in-progress = In Bearbeitung
cycle-already-started = "{ $name }" wurde bereits gestartet.
table-evaluation-period = Leistungszeitraum
table-actions = Aktionen
empty-no-cycles = Noch keine Zyklen erstellt.
performance-period-description = Der bewertete Arbeitszeitraum. Beispiel: Leistungszeitraum: 1. Jan – 31. Dez 2025.
review-cycle-description = Der Zeitraum für Feedback, Managerbewertung und Kalibrierung. Beispiel: Überprüfungszyklus: 15. Jan – 20. Feb 2026.
empty-no-values = Noch keine Werte definiert.

modal-create-title = Neuen Zyklus erstellen
modal-edit-title = Zyklus bearbeiten
modal-description = Details für den Leistungszyklus konfigurieren.

field-name = Name
field-start-date = Ausführung Startdatum
field-end-date = Ausführung Enddatum
field-frequency = Häufigkeit/Typ
field-rating-scale = Bewertungsskala
label-evaluation-participants = Bewertungsteilnehmer
field-evaluation-period-start = Bewerteter Zeitraum Beginn
field-evaluation-period-end = Bewerteter Zeitraum Ende
field-values = Werte
field-title = Titel
field-description = Beschreibung
field-active = Aktiv

placeholder-name = z. B. 2026 jährliche Leistungsbewertung
placeholder-select-cycle = Zyklus auswählen
placeholder-select-frequency = Häufigkeit wählen
placeholder-select-scale = Bewertungsskala wählen
placeholder-no-scales = Keine Skalen. Im Tab „Bewertungsskalen" hinzufügen.
placeholder-no-values = Keine Werte. Im Tab „Werte" hinzufügen.

# Bewertungsskala-Modal
scale-title-add = Bewertungsskala hinzufügen
scale-title-edit = Bewertungsskala bearbeiten
scale-description = Benannte Bewertungsskala und ihre Reihenfolge definieren.
scale-field-name = Name
scale-field-values = Werte (geordnet)
scale-placeholder-value = Wert eingeben (z. B. 1 oder A)
scale-placeholder-name = z. B. 1–5, 1–10, A–E
scale-field-length = Skalenlänge (2–10)
scale-field-display = Darstellung
scale-display-numeric = Numerisch (1..N)
scale-display-letters = Buchstaben (A..)
scale-display-stars = Sterne (★)
scale-display-custom = Benutzerdefinierte Bezeichnungen
scale-display-placeholder = Darstellungsart auswählen
scale-field-custom-labels = Benutzerdefinierte Bezeichnungen (geordnet)
scale-custom-label-placeholder-prefix = Bezeichnung für
scale-button-add = Hinzufügen
scale-preview = Vorschau

# Teilnehmer
participant-self = Selbst
participant-peer = Kollege
participant-manager = Vorgesetzter
participant-hr-team = HR Team

# Häufigkeit
frequency-annual = Jährlich
frequency-quarterly = Vierteljährlich
frequency-monthly = Monatlich

# Bewertungsskalen-Tabelle
empty-no-rating-scales = Noch keine Bewertungsskalen definiert.
scale-saved-to-database = Bewertungsskala "{ $name }" gespeichert.
scale-deleted-to-database = Bewertungsskala "{ $name }" gelöscht.
cycle-saved-to-database = Leistungszyklus "{ $name }" gespeichert.
cycle-activated-to-database = "{ $name }" aktiviert.
cycle-deactivated-to-database = "{ $name }" deaktiviert.
cycle-completed-to-database = "{ $name }" als abgeschlossen markiert.
cycle-deleted-to-database = "{ $name }" gelöscht.
cycle-started = Zyklus wird gestartet: { $name }
cycle-start-rating-scale-required = Eine Bewertungsskala ist erforderlich, bevor "{ $name }" gestartet werden kann. Bitte bearbeiten Sie den Zyklus und wählen Sie eine Bewertungsskala aus.
value-saved-to-database = Firmenwert "{ $title }" gespeichert.
value-deleted-to-database = "{ $title }" gelöscht.
value-activated-to-database = "{ $title }" aktiviert.
value-deactivated-to-database = "{ $title }" deaktiviert.
table-values = Werte
button-edit = Bearbeiten

# Werte-Modal
values-modal-title-add = Wert hinzufügen
values-modal-title-edit = Wert bearbeiten
values-modal-description = Firmenwert und Beschreibung definieren.

# Bestätigungsdialog „Zyklus starten"
start-confirm-title = Leistungsbeurteilung starten
start-confirm-description-with-cycle = Möchten Sie die Leistungsbeurteilung für „{ $name }" wirklich starten? Damit wird der Bewertungsablauf eingeleitet.
start-confirm-description-generic = Möchten Sie diese Leistungsbeurteilung wirklich starten?
start-confirm-select-cycle = Zyklus auswählen *
manual-run-cycle-already-started = Dieser Zyklus wurde bereits gestartet.
start-confirm-run-for-label = Bewertung starten für
start-confirm-run-for-employee = Mitarbeiter
start-confirm-run-for-team = Team
start-confirm-select-employee = Mitarbeiter auswählen *
start-confirm-placeholder-employee = Mitarbeiter für die Bewertung auswählen...
start-confirm-placeholder-loading-employees = Mitarbeiter werden geladen...
start-confirm-select-teams = Teams auswählen *
start-confirm-placeholder-loading = Teams werden geladen...
start-confirm-placeholder-teams = Teams für die Bewertung auswählen
start-confirm-search-teams = Teams suchen...
start-confirm-empty-teams = Keine Teams gefunden
start-confirm-button = Bewertung starten

start-button-tooltip = Start ist nur innerhalb des Überprüfungszeitraums aktiv

# Bestätigungsdialog „Zyklus abschließen"
complete-confirm-title = Leistungszyklus abschließen
complete-confirm-description = Möchten Sie „{ $name }" wirklich als abgeschlossen markieren?
complete-confirm-progress = Dieser Zyklus hat { $percent }% der Bewertungen abgeschlossen ({ $completed } von { $total }).
complete-confirm-warning = Einige Bewertungen sind noch in Bearbeitung.
complete-confirm-all-done = Alle Bewertungen in diesem Zyklus wurden abgeschlossen.
complete-confirm-button = Zyklus abschließen
complete-confirm-view-tracking = In Leistungsverfolgung anzeigen

# Fehler
values-error-cannot-deactivate-active-cycle = Wert kann nicht deaktiviert werden, solange er in einem aktiven Zyklus verwendet wird.
cycles-error-no-rating-scales = Mindestens eine Bewertungsskala wird für das Erstellen eines Zyklus benötigt.
cycles-error-no-company-values = Mindestens ein Unternehmenswert wird für das Erstellen eines Zyklus benötigt.
cycles-error-dates-overlap = Die Zyklusdaten dürfen sich nicht mit einem bestehenden Zyklus überschneiden. Bitte wählen Sie ein Startdatum nach dem Ende bestehender Zyklen.
cycles-error-eval-period-overlap = Der Bewertungszeitraum überschneidet sich mit einem bestehenden Zyklus. Bitte wählen Sie Daten, die nicht mit anderen Bewertungszeiträumen in Konflikt stehen.
error-activate-out-of-period = Zyklus kann nicht aktiviert werden. Das heutige Datum liegt außerhalb des Zykluszeitraums.
