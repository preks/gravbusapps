enterprise-agent-title = { -platform-ai-agent-product.label }
enterprise-agent-subtitle = Deine KI, die im Hintergrund plant, recherchiert und ausführt

enterprise-agent-nav-chat = Chat
enterprise-agent-nav-activity = Aktivität
enterprise-agent-nav-memory = Speicher
enterprise-agent-nav-trace = Trace

enterprise-agent-new-session = Neue Aufgabe
enterprise-agent-input-placeholder = Beschreibe dein Ziel. Den Rest erledigt der Agent.
enterprise-agent-send = Ausführen
enterprise-agent-stop = Stopp
enterprise-agent-reply = Antwort

enterprise-agent-status-running = Arbeitet…
enterprise-agent-status-completed = Abgeschlossen
enterprise-agent-status-failed = Fehlgeschlagen
enterprise-agent-status-waiting = Wartet auf dich

enterprise-agent-plan-title = Plan
enterprise-agent-plan-progress = { $done } von { $total } Schritten
enterprise-agent-plan-current = Aktuell: { $step }

enterprise-agent-tool-call = { $tool }
enterprise-agent-tool-cached = (zwischengespeichert)
enterprise-agent-tool-duration = { $ms }ms

enterprise-agent-reflection-complete = Qualitätsprüfung bestanden
enterprise-agent-reflection-gaps = Agent hat Lücken gefunden und fährt fort…

enterprise-agent-interrupt-title = Agent benötigt deine Eingabe
enterprise-agent-interrupt-reply-placeholder = Deine Antwort…

enterprise-agent-final-summary = Zusammenfassung
enterprise-agent-final-findings = Erkenntnisse
enterprise-agent-final-actions = Durchgeführte Aktionen
enterprise-agent-final-recommendations = Empfehlungen
enterprise-agent-final-cost = Kosten: ${ $cost }
enterprise-agent-final-duration = { $duration }
enterprise-agent-final-export = Exportieren

enterprise-agent-memory-this-session = Diese Sitzung
enterprise-agent-memory-past = Aus früheren Sitzungen
enterprise-agent-memory-workspace = Workspace-Wissen
enterprise-agent-memory-add-placeholder = Sag dem Agenten etwas, das er sich merken soll…

enterprise-agent-welcome-heading = Was möchtest du erreichen?
enterprise-agent-welcome-subtitle = Beschreibe ein beliebiges Ziel. Der Agent plant, recherchiert und führt aus — auch während du an anderem arbeitest.

enterprise-agent-background-running = { $count ->
    [one] { $count } Agent arbeitet im Hintergrund
   *[other] { $count } Agenten arbeiten im Hintergrund
}
enterprise-agent-background-waiting = Agent wartet auf dich

shell-session-load-error = Diese Sitzung konnte nicht geladen werden
shell-try-again = Erneut versuchen
shell-back-to-landing = Zurück zur Startseite
shell-opening-session = Sitzung wird geöffnet...
shell-session-not-found = Sitzung nicht gefunden

# Centralized product / category nouns
brand-attribution = NEWWORK { -platform-ai-agent-product.label-plural }
brand-product-plural = { -platform-ai-agent-product.label-plural }
nav-digital-workforce = { -platform-ai-agent-fleet.label }
workforce-hero-title = { -platform-ai-agent-fleet.label }
workforce-label = { -platform-ai-agent-fleet.label }
skills-screen-title = { -platform-ai-agent-product.label }
trace-explorer-agent-mesh = { -platform-ai-agent-network.label }
# Sidebar-only labels — override generic terminology in the left island.
sidebar-brand-product = EveryFabric
sidebar-nav-agent-os = { -platform-ai-agent-network.label }
sidebar-nav-memory = Gedächtnis
workspace-open-agent-os-aria = { -platform-ai-agent-network.label } öffnen
agents-specialist-description = Aufgabenbezogene Spezialisten, die der { -platform-ai-agent-product.label } automatisch auf Basis deiner Anfrage aktiviert. Sie können nicht direkt konfiguriert oder ausgeführt werden.
agent-config-runs-live-in-workforce = Fälle, Ausführungen und Traces für diesen Worker findest du in der { -platform-ai-agent-fleet.label }.
agent-config-view-activity-in-workforce = Live-Aktivität in der { -platform-ai-agent-fleet.label } ansehen

# Workforce hero
workforce-hero-subtitle = Deine gesteuerten Worker. Sie reagieren auf Trigger, befolgen Richtlinien, nutzen Skills und eskalieren bei Bedarf an Menschen.
workforce-hero-working-now = { $count } arbeiten gerade
workforce-hero-test-webhook-enabled-tooltip = Webhook-Trigger mit eigenem Nachrichteninhalt auslösen
workforce-hero-test-webhook-disabled-tooltip = Kein Agent hat einen aktivierten Webhook-Trigger
workforce-hero-test-webhook = Webhook testen
workforce-hero-hire = Einstellen
workforce-kpi-active = Aktive Agenten
workforce-kpi-paused = Pausiert
workforce-kpi-triggers = Aktive Trigger
workforce-kpi-credits = Credits / 7 T

# Workforce filters
workforce-filters-search-placeholder = Nach Name, Rolle, Abteilung suchen…
workforce-filters-aria-label = Workforce-Agenten filtern
workforce-filter-all = Alle
workforce-filter-active = Aktiv
workforce-filter-paused = Pausiert

# Live status
workforce-live-pill-default = Live

# Common actions
action-close = Schließen
action-cancel = Abbrechen
action-save = Speichern
action-working = Arbeitet…
action-reset = Zurücksetzen
action-add = Hinzufügen

# Hire options
hire-options-title = Workforce-Agent einstellen
hire-options-subtitle = Starte mit einem fertigen Agenten oder baue deinen eigenen.
hire-options-marketplace-title = Aus Marktplatz einstellen
hire-options-marketplace-description = Durchsuche fertige Agenten mit integrierten Skills, Tools und Governance.
hire-options-create-title = Von Grund auf erstellen
hire-options-create-description = Definiere einen brandneuen Agenten mit eigener Rolle, Anweisungen und Autonomie.

# Value scoreboard
value-scoreboard-title = Geschäftswert
value-scoreboard-window = diese Woche
value-scoreboard-estimated-note = „Geschätzt“ basiert auf den Wertannahmen des Workspace
value-kpi-cases = Bearbeitete Fälle
value-kpi-time-saved = Eingesparte Zeit
value-kpi-sla = SLA-Erfüllung
value-kpi-deflection = Deflection-Rate
value-kpi-cost = Kosten pro Fall
value-kpi-governance = Governance-Abdeckung
value-hint-runs-total = { $runs } Ausführungen insgesamt
value-hint-baseline = ~{ $minutes } Min./Fall Basiswert
value-hint-sla = { $under }/{ $measured } · { $target }
value-hint-deflection = { $autonomous } autonom / { $cases } Fälle
value-hint-cost = { $cost } ausgegeben
value-hint-governance = { $audited }/{ $runs } auditiert · { $stops } Guardrail-Stopps
value-sla-target-minutes = { $minutes } Min. Ziel
value-sla-target-seconds = { $seconds } Sek. Ziel
value-kpi-estimated = Geschätzt
value-kpi-estimated-tooltip = Abgeleitet aus den Wertannahmen des Workspace

# Run source
source-manual = Manuelle Ausführung
source-schedule = Geplant
source-webhook = Webhook
source-inbound-email = Eingehende E-Mail
source-unknown = Unbekannte Quelle

# Command center
command-center-title = Kommandozentrale
command-center-empty = Derzeit ist nichts in Bearbeitung. Neue Ausführungen erscheinen hier, sobald sie starten und enden.
command-center-stat-running = laufend
command-center-stat-waiting = warten
command-center-stat-pending = ausstehend
command-center-done-today = heute
command-center-section-needs-you = Erfordert Aktion
command-center-section-active = Aktiv
command-center-section-recently-done = Kürzlich erledigt
command-center-show-more = { $count } weitere anzeigen
command-center-show-less = Weniger anzeigen
command-center-outside-window = { $count } heute abgeschlossen · älter als das Live-4-Stunden-Fenster

# Run detail header
run-detail-back = Zurück
run-detail-refreshing = Wird aktualisiert
run-detail-fact-agent = Agent
run-detail-fact-trigger = Auslöser
run-detail-fact-started = Gestartet
run-detail-fact-duration = Dauer
run-detail-fact-credits = Credits

# Run detail screen
run-detail-loading = Ausführung wird geladen…
run-detail-not-found = Ausführung nicht gefunden.
run-detail-load-error = Ausführungsdetails konnten nicht geladen werden.

# Run detail tabs
run-tab-overview = Übersicht
run-tab-actions = Aktionen & Datensätze
run-tab-flows = Flows
run-tab-diagnostics = Diagnose

# Overview tab
run-overview-task = Aufgabe
run-overview-empty-input = (leer)
run-overview-awaiting-approval = Warten auf menschliche Freigabe
run-overview-signin-required = Zum Prüfen und Senden dieses E-Mail-Entwurfs ist eine Anmeldung erforderlich.
run-overview-subject = Betreff:
run-overview-output = Ausgabe
run-overview-no-output = (noch keine Ausgabe)
run-overview-artifacts = Artefakte

# Actions & records tab
run-actions-title = Datensätze & Aktionen
run-actions-empty = Diese Ausführung hat keine Datensätze berührt.

# Flows tab
run-flows-empty = Diese Ausführung hat keine Workflows ausgelöst.
run-flows-view-map = Karte
run-flows-view-list = Liste
run-flows-view-timeline = Zeitleiste

# Diagnostics tab
run-diag-trace = Trace
run-diag-cost = Kosten
run-diag-credits = { $credits } Newwork-Credits
run-diag-total-tokens = { $tokens } Token insgesamt

# Run context links
run-context-records = Datensätze
run-context-policies = Richtlinien
run-context-open = { $label } öffnen: { $display }

# Config section shell
section-unsaved = Nicht gespeicherte Änderungen
section-saved = Gespeichert
section-saving = Wird gespeichert…

# Autonomy section
autonomy-title = Autonomie
autonomy-description = Wie viel der Agent selbst entscheiden darf + die benutzerdefinierten Systemanweisungen, denen er folgt.
autonomy-aria-level = Autonomiegrad
autonomy-opt-draft-only-label = Unterstützend
autonomy-opt-draft-only-hint = Sucht, fasst zusammen, klassifiziert und erstellt Entwürfe. Nimmt keine Systemänderungen vor.
autonomy-opt-approval-label = Freigabe erforderlich
autonomy-opt-approval-hint = Bereitet Aktionen vor und leitet sie vor der Ausführung an einen Menschen weiter.
autonomy-opt-delegated-label = Delegiert
autonomy-opt-delegated-hint = Führt risikoarme Aktionen innerhalb von Schwellenwerten aus und eskaliert Ausnahmen.
autonomy-opt-autonomous-label = Autonom
autonomy-opt-autonomous-hint = Läuft Ende-zu-Ende innerhalb validierter Grenzen. Erfordert mindestens einen Eskalationskanal.
autonomy-instructions-label = Anweisungen
autonomy-instructions-suffix = (an den System-Prompt angehängt)

# Budget section
budget-title = Budget
budget-description = Weiche Credit-Limits, die zur Laufzeit durchgesetzt werden. 1 Credit = 1.000 Tokens insgesamt.
budget-daily = Tägliche Credits
budget-weekly = Wöchentliche Credits
budget-monthly = Monatliche Credits
budget-no-limit = Kein Limit
budget-when-exceeded = Bei Überschreitung
budget-aria-exceeded = Verhalten bei Budgetüberschreitung
budget-opt-pause-label = Pausieren
budget-opt-pause-hint = Neue Ausführungen blockieren, sobald das Budget aufgebraucht ist.
budget-opt-escalate-label = Eskalieren
budget-opt-escalate-hint = Die nächste Ausführung stattdessen an den menschlichen Owner weiterleiten.
budget-opt-warn-label = Nur warnen
budget-opt-warn-hint = Eine Warnung protokollieren, aber weiter ausführen.

# Escalation section
escalation-title = Eskalation
escalation-description = Wie der Agent Arbeit an Menschen zurückgibt. Vollautonome Agenten und „Eskalieren“-Budgets benötigen mindestens einen Kanal.
escalation-owner-label = Owner-Benutzer-ID
escalation-queue-label = Ticket-Queue
escalation-queue-placeholder = z. B. ops-tier-1
escalation-notify-label = Benachrichtigungs-E-Mails
escalation-email-placeholder = ops@acme.com
escalation-confidence-label = Konfidenzschwelle ({ $value })
escalation-confidence-hint = Der Agent eskaliert, wenn seine selbst eingeschätzte Konfidenz für die nächste Aktion darunter fällt.
escalation-blocked-label = Blockierte Intents
escalation-intent-placeholder = z. B. cancel_contract
escalation-remove = { $value } entfernen

# Triggers section
trigger-section-title = Trigger
trigger-section-desc = Was diesen Agenten ohne Chat starten lässt.
trigger-type-manual = Manuell
trigger-type-manual-hint = Operator startet den Agenten über die Benutzeroberfläche.
trigger-type-schedule = Zeitplan
trigger-type-schedule-hint = Läuft nach einem Cron-Zeitplan oder festen Intervall.
trigger-type-webhook = Webhook
trigger-type-webhook-hint = Externes System startet eine Ausführung per POST.
trigger-type-inbound-email = Eingehende E-Mail
trigger-type-inbound-email-hint = Neue E-Mails an ein Postfach starten eine Ausführung.
trigger-new = Neuer Trigger
trigger-type-aria = Trigger-Typ
trigger-name-placeholder = Optionaler Name
trigger-cron-placeholder = Cron z. B. 0 8 * * MON
trigger-interval-placeholder = oder Intervall (Minuten)
trigger-subject-filter-title = Betrefffilter (optional)
trigger-subject-filter-desc = Nur E-Mails weiterleiten, deren Betreff passt. Leer lassen, um alle weiterzuleiten.
trigger-subject-filter-mode-aria = Betrefffilter-Modus
trigger-subject-mode-contains = Enthält
trigger-subject-mode-prefix = Beginnt mit
trigger-subject-mode-regex = Regex
trigger-case-sensitive = Groß-/Kleinschreibung beachten
trigger-subject-patterns-placeholder = Ein Muster pro Zeile, z. B. ticket, [support]
trigger-secret-placeholder = Optionales gemeinsames Geheimnis
trigger-create-error = Trigger konnte nicht erstellt werden.
trigger-create-submit = Trigger erstellen
trigger-creating = Wird erstellt…
trigger-empty = Noch keine Trigger — füge einen Zeitplan, ein Postfach oder einen Webhook hinzu, damit dieser Agent proaktiv wird.
trigger-disable = Deaktivieren
trigger-enable = Aktivieren
trigger-delete-aria = Trigger { $name } löschen
trigger-webhook-url-missing = Webhook-URL wurde vom Backend nicht bereitgestellt. Lade den Trigger erneut, um sie zu befüllen.
trigger-webhook-url-label = Webhook-URL
trigger-test = Testen
trigger-webhook-post-secret = Sende einen JSON-Body mit Header X-Workforce-Signature: sha256=<HMAC-SHA256 des Bodys mit deinem Geheimnis>.
trigger-webhook-post-nosecret = Sende einen JSON-Body. Optional: Lege ein Geheimnis fest, um einen X-Workforce-Signature-Header zu verlangen.
trigger-no-mailbox-configured = Kein Postfach konfiguriert.
trigger-inbound-mailbox-label = Eingehendes Postfach
trigger-inbound-forward-hint = Leite Nachrichten hierher von deinem E-Mail-Anbieter weiter. Der Router startet den Agenten einmal pro passendem Empfänger.
trigger-last-fired = Zuletzt ausgelöst { $time }
trigger-copy-aria = In die Zwischenablage kopieren
trigger-mode-contains = enthält
trigger-mode-prefix = beginnt mit
trigger-mode-regex = passt auf
trigger-forwards-all = leitet alle weiter
trigger-filter-summary = Filter: { $mode } { $patterns }
trigger-cfg-cron = Cron: { $cron }
trigger-cfg-interval = alle { $minutes } Min.
trigger-cfg-not-configured = nicht konfiguriert
trigger-cfg-no-mailbox = kein Postfach
trigger-cfg-secret-set = Geheimnis gesetzt
trigger-cfg-no-secret = kein Geheimnis
trigger-err-schedule = Zeitplan-Trigger benötigen entweder 'cron' oder 'interval_minutes'.
trigger-err-interval = 'interval_minutes' muss eine positive ganze Zahl sein.
trigger-err-mailbox = Wähle ein verbundenes Postfach für Trigger für eingehende E-Mails.

# Inbound mailbox picker
mailbox-signin-required = Melde dich an, um deine verbundenen Postfächer zu laden.
mailbox-load-error = Verbundene Postfächer konnten nicht geladen werden.
mailbox-select-aria = Verbundenes Postfach
mailbox-loading = Postfächer werden geladen…
mailbox-select-placeholder = Verbundenes Postfach auswählen
mailbox-refresh-aria = Verbundene Postfächer aktualisieren
mailbox-empty-prefix = Noch keine verbundenen Postfächer.
mailbox-connect-link = Verbinde ein Postfach in der E-Mail-App
mailbox-empty-suffix = und aktualisiere dann.
mailbox-forwarding-hint = Die Weiterleitung ist für dieses Postfach deaktiviert. Aktiviere "Weiterleiten an { -platform-ai-agent-fleet.label }" dafür in der E-Mail-App, sonst empfängt dieser Trigger keine E-Mails.
mailbox-footer-hint = Es können nur Postfächer verwendet werden, die du verbunden hast. Die Adresse stammt aus dem verifizierten Konto.

# Common: remove chip / item
action-remove = { $value } entfernen

# Role & ownership fields
roleown-role-label = Rolle
roleown-department-label = Abteilung
roleown-owner-label = Eigentümer
roleown-department-unassigned = Nicht zugewiesen — im Organigramm-Identität festlegen
roleown-owner-unassigned = Kein Eigentümer zugewiesen
roleown-owner-placeholder = Für Eskalationen verantwortliche Person
roleown-section-title = Rolle & Eigentümerschaft
roleown-section-desc = Rolle, Abteilung und die verantwortliche Person für { -platform-ai-agent.inline }.

# Identity section
identity-section-title = Identität
identity-section-desc = Wie { -platform-ai-agent.inline } über seine Einsätze hinweg identifiziert wird.
identity-identifier-label = Bezeichner (schreibgeschützt)
identity-display-name-label = Anzeigename
identity-description-label = Beschreibung

# Orgchart registration section
orgchart-section-title = Orgchart-Identität
orgchart-section-desc = Verknüpfe { -platform-ai-agent.inline } mit dem Organigramm. Registrierte { -platform-ai-agent.inline-plural } führen eingehende und geplante Aufgaben unter ihrer eigenen Identität aus statt unter dem gemeinsamen Servicekonto.
orgchart-err-503 = Die Erstellung von Keycloak-Benutzern ist für diesen Mandanten deaktiviert (KEYCLOAK_USER_CREATION_ENABLED). Erstelle den Benutzer manuell und füge dessen ID unten ein.
orgchart-err-409 = Ein Keycloak-Benutzer oder Mitarbeiter mit dieser Identität existiert bereits. Füge die bestehende Keycloak-Benutzer-ID unten ein, um ihn stattdessen zu verknüpfen.
orgchart-unlink-error = Orgchart-Identität konnte nicht entkoppelt werden
orgchart-unit-members-count = { $count ->
    [one] { $count } Mitglied
   *[other] { $count } Mitglieder
}
orgchart-registered-badge = Im Organigramm registriert
orgchart-org-unit-label = Organisationseinheit:
orgchart-employee-label = Mitarbeiter:
orgchart-keycloak-label = Keycloak-Benutzer:
orgchart-since-label = Seit:
orgchart-first-name = Vorname
orgchart-last-name = Nachname
orgchart-job-position = Position
orgchart-job-position-placeholder = z. B. Kundenservice-Mitarbeiter
orgchart-org-unit = Organisationseinheit
orgchart-org-unit-placeholder = Standard: Team Virtuelle Assistenten
orgchart-org-unit-search = Organisationseinheiten suchen…
orgchart-org-unit-empty = Keine Organisationseinheiten gefunden
orgchart-org-unit-hint = Wo { -platform-ai-agent.inline } im Organigramm erscheint. Leer lassen, um das Standardteam "Virtuelle Assistenten" zu verwenden.
orgchart-existing-user-id = Bestehende Keycloak-Benutzer-ID (optional)
orgchart-existing-user-id-placeholder = Leer lassen, um automatisch einen neuen Benutzer zu erstellen
orgchart-unlink = Identität entkoppeln
orgchart-open = Im Organigramm öffnen
orgchart-registering = Wird registriert…
orgchart-register = Im Organigramm registrieren

# Knowledge section
knowledge-section-title = Wissen
knowledge-section-desc = Richtlinien, Verträge und andere Referenzen, die { -platform-ai-agent-product.inline } während der Arbeit lesen darf.
knowledge-source-policy = Richtlinie
knowledge-source-contract = Vertrag
knowledge-source-knowledge = Wissensquelle
knowledge-source-skill = Skill
knowledge-source-url = URL
knowledge-source-type-aria = Typ der Wissensquelle
knowledge-ref-id-placeholder = Referenz-ID oder URL
knowledge-title-placeholder = Optionaler Titel
knowledge-empty = Noch keine Wissensreferenzen.
knowledge-open-policy = Richtlinie in neuem Tab öffnen (ID: { $id })

# Connections section
connections-section-title = Verbindungen
connections-section-desc = Externe Verbindungen, die { -platform-ai-agent-product.inline } bei jedem Lauf aktiviert. Das Binden einer Verbindung (z. B. Salesforce) aktiviert deren Connector-Tools.
connections-empty = Keine Verbindungen zum Binden verfügbar.
connections-none-selected = Keine Verbindungen gebunden – Läufe nutzen keine Connector-Tools.
connections-loading = Verbindungen werden geladen…
connections-load-error = Verbindungen konnten nicht geladen werden.

# Skills & policies section
skills-section-title = Skills & Richtlinien
skills-section-desc = Skills und Intranet-Richtlinien, die { -platform-ai-agent-product.inline } zugeordnet sind.
skills-resolving = Skill-Details werden aufgelöst…
skills-attached-tools = Angehängte Tools
skills-no-tools = Dieser Skill hängt keine Tools an.
skills-label = Skills
skills-skill-id-placeholder = Skill-ID
skills-policies-desc = Hänge Intranet-Richtlinien an, die { -platform-ai-agent-product.inline } zur Laufzeit lesen kann. Workspace-Standards werden automatisch übernommen; entferne jene, die für { -platform-ai-agent-product.inline } nicht relevant sind.

# Customer 360 surface section
customer360-section-title = Customer 360
customer360-section-desc = Zeige die Eingangs-E-Mail-Ausführungen von { -platform-ai-agent-product.inline } im CRM-Tab "Customer 360 Eingang" an, zugeordnet zum Kunden, der geschrieben hat.
customer360-toggle-title = Eingehende Ausführungen in Customer 360 anzeigen
customer360-toggle-desc = Eingehende E-Mails, die { -platform-ai-agent-product.inline } bearbeitet, erscheinen im Customer-360-Eingangsstream. Deaktiviere dies für { -platform-ai-agent-product.inline-plural }, deren E-Mails nicht im CRM erscheinen sollen.

# Agent tile / deck
tile-status-active = Aktiv
tile-status-paused = Pausiert
tile-best-match = Beste Übereinstimmung
tile-working = Arbeitet
tile-specialist-fallback = Workforce-Spezialist
tile-no-description = Noch keine Beschreibung vorhanden.
tile-open-agent = { $name } öffnen
tile-triggers-stat = { $active }/{ $total } Trigger
tile-last-run-stat = Letzte Ausführung { $time }
tile-credits-stat = { $credits } Credits / 7 T.
tile-pause = Pausieren
tile-pausing = Wird pausiert…
tile-activate = Aktivieren
tile-activating = Wird aktiviert…
tile-archive-aria = Aus Workforce entfernen

# Recent runs panel
recent-runs-title = Letzte Ausführungen
recent-runs-desc = Neueste Deep-Agent-Sitzungen für { -platform-ai-agent-product.inline }. Klicke auf eine Ausführung für den vollständigen Trace.
recent-runs-refresh-aria = Ausführungen aktualisieren
recent-runs-refresh = Aktualisieren
recent-runs-loading = Ausführungen werden geladen…
recent-runs-empty-title = Noch keine Ausführungen
recent-runs-empty-desc = Starte einen manuellen Testlauf oder warte, bis ein Trigger eine Ausführung plant.
recent-runs-empty-input = (leere Eingabe)
recent-runs-credits = { $credits } Credits

# Agent detail screen
detail-back-aria = Zurück zur Workforce
detail-loading-title = Agent wird geladen…
detail-no-role = Keine Rolle festgelegt
detail-publish-marketplace = Im Mandanten veröffentlichen
detail-test-run = Testlauf
detail-tab-overview = Übersicht
detail-tab-runs = Ausführungen
detail-tab-inbox = Posteingang
detail-tab-trace = Trace
detail-tab-config = Konfiguration
detail-dismiss = Schließen
detail-loading-agent = Workforce-Agent wird geladen…
detail-webhook-fail = Webhook konnte nicht gesendet werden.
detail-publish-fail = Veröffentlichung fehlgeschlagen

# Test run modal
testrun-title = Testlauf für { $name }
testrun-desc = Startet einen manuellen Lauf mit der aktuellen Konfiguration von { -platform-ai-agent-product.inline }. Nützlich zum Proben eines geplanten Jobs oder zum Prüfen von Anweisungen vor dem Livegang.
testrun-demo-email = Beispiel-E-Mail (eingehend)
testrun-custom-task = Benutzerdefinierte Aufgabe (unten eingeben)
testrun-expected = Erwartet: { $path }
testrun-demo-hint = Wähle eines der Versicherungs-Demoszenarien, um die Aufgabe mit Betreff, Von, An und Text vorzufüllen.
testrun-task = Aufgabe
testrun-task-placeholder = z. B. „Die neuesten nicht zugewiesenen Policenfragen in der Support-Warteschlange triagieren und eine Antwort entwerfen."
testrun-task-hint = Was soll { -platform-ai-agent-product.inline } jetzt tun? Es nutzt seine festen Anweisungen, Skills und Richtlinien.
testrun-trigger-label = Trigger zuordnen (optional)
testrun-trigger-none = Ad-hoc-Test (kein Trigger)
testrun-trigger-hint = Ordne diese Ausführung einem echten Trigger zu, damit sie in dessen Verlauf erscheint.
testrun-starting = Wird gestartet…
testrun-submit = Jetzt ausführen

# Hire modal
hire-title-default = Worker aktivieren
hire-subtitle-default = Aktiviere einen proaktiven Worker. Trigger, Skills, Eskalation und Budget kannst du im nächsten Schritt einrichten.
hire-display-name = Anzeigename
hire-name-placeholder = z. B. Claims-Triage-Spezialist
hire-stored-as = Gespeichert als
hire-name-hint = Buchstaben, Ziffern und Leerzeichen sind in Ordnung — wir wandeln dies in einen Bezeichner um.
hire-role = Rolle
hire-role-placeholder = z. B. Claims-Agent
hire-department = Abteilung
hire-department-placeholder = z. B. Insurance Ops
hire-short-description = Kurzbeschreibung
hire-description-placeholder = Ein Satz, den das Team auf der Workforce-Karte sieht
hire-instructions = Anweisungen
hire-instructions-optional = (optional)
hire-instructions-placeholder = Wie soll sich { -platform-ai-agent-product.inline } verhalten? Z. B. Immer die Richtlinienbibliothek prüfen, bevor geantwortet wird. Bei Konfidenz < 0,7 an einen Menschen eskalieren.
hire-autonomy = Autonomie
hire-autonomy-aria = Autonomie-Stufe
hire-creating = Wird eingestellt…
hire-submit = { -platform-ai-agent-product.inline } einstellen
hire-error = Workforce-Agent konnte nicht eingestellt werden.

# Agent deck
deck-best-matches-for = Beste Treffer für „{ $query }“

# Overview tab
overview-kpi-today = Heute
overview-kpi-week = Diese Woche
overview-kpi-month = Dieser Monat
overview-kpi-credits = Credits
overview-kpi-runs = { $count ->
    [one] { $count } Lauf
   *[other] { $count } Läufe
}
overview-view-all-runs = Alle Läufe anzeigen

# Runs tab
runs-search-placeholder = Betreff oder Absender suchen…
runs-filter-all-statuses = Alle Status
runs-filter-running = Läuft
runs-filter-completed = Abgeschlossen
runs-filter-failed = Fehlgeschlagen
runs-filter-cancelled = Abgebrochen
runs-filter-waiting-human = Wartet auf Mensch
runs-filter-all-sources = Alle Quellen
runs-filter-manual = Manuell
runs-filter-schedule = Geplant
runs-filter-webhook = Webhook
runs-filter-inbound-email = Eingehende E-Mail
runs-refresh = Aktualisieren
runs-loading = Läufe werden geladen…
runs-empty = Keine Läufe entsprechen diesen Filtern.
runs-page = Seite { $page } von { $totalPages } · { $total } gesamt
runs-prev = Zurück
runs-next = Weiter
runs-row-credits = { $credits } Credits

# Inbox tab
inbox-search-placeholder = Betreff oder Absender suchen…
inbox-loading = Posteingang wird geladen…
inbox-empty-title = Noch keine eingehenden E-Mails für diesen { -platform-ai-agent-product.inline }.
inbox-empty-desc = Richte einen E-Mail-Trigger ein und leite Post an dieses Postfach weiter, um die Warteschlange zu starten.
inbox-col-from = Von
inbox-col-subject = Betreff
inbox-col-received = Empfangen
inbox-col-status = Status
inbox-col-credits = Credits
inbox-open-run-aria = Laufdetails öffnen für { $subject }

# Trace tab
trace-inbound-email-header = Eingehende E-Mail · { $time }
trace-from = Von
trace-no-subject = (kein Betreff)
trace-loading-runs = Läufe werden geladen…
trace-no-runs-hint = Noch keine Läufe verfügbar. Starte einen Testlauf über die Kopfzeile, um einen Trace zu sehen.
trace-view-timeline = Zeitachse
trace-view-mesh = Mesh
trace-streaming-live = Live-Aktivität wird gestreamt…
trace-title = Lauf-Trace
trace-desc = Wähle einen Lauf, um jede Entscheidung des { -platform-ai-agent-product.inline } zu sehen — Tool-Aufrufe, Sub-Agent-Aufrufe, Freigaben und HITL-Pausen.
trace-back-to-list = ← Zurück zur Laufliste
trace-reload = Neu laden
trace-loading-run = Lauf wird geladen…
trace-load-fail = Lauf konnte nicht geladen werden.
trace-empty-events = Für diesen Lauf wurden noch keine Trace-Ereignisse aufgezeichnet.
trace-picker-credits = { $credits } Credits
trace-cat-tool = Tool
trace-cat-decision = Entscheidung
trace-cat-policy = Richtlinie
trace-cat-hitl = Wartet auf Mensch
trace-cat-approval = Freigabe
trace-cat-cost = Kosten
trace-cat-skill = Skill
trace-cat-thinking = Denken
trace-cat-message = Nachricht
trace-cat-status = Status
trace-cat-system = System
trace-chose = Gewählt: { $choice }
trace-confidence = Konfidenz { $percent } %
trace-why = Warum:
trace-alternatives = Erwogene Alternativen
trace-actor-by = von { $name }
trace-show-raw = Rohdaten anzeigen
trace-hide-raw = Rohdaten ausblenden
trace-open-policy-title = Richtlinie in neuem Tab öffnen (ID: { $id })

# Run mesh view
mesh-live-activity = Live-Aktivität
mesh-no-activity = Noch keine Aktivität aufgezeichnet.

# Dashboard charts
chart-credit-title = Credits & Kosten (7 T.)
chart-credit-subtitle = { $credits } Credits · ~{ $usd } geschätzt
chart-credit-empty = Noch keine Nutzung in diesem Zeitraum.
chart-credits-label = Credits

chart-outcome-title = Laufergebnisse
chart-outcome-none-finished = Noch keine abgeschlossenen Läufe
chart-outcome-success-runs = { $rate } % Erfolg · { $runs } Läufe
chart-outcome-empty = Noch keine Läufe in diesem Zeitraum.
chart-outcome-completed = Abgeschlossen
chart-outcome-failed = Fehlgeschlagen
chart-outcome-cancelled = Abgebrochen
chart-outcome-success-label = Erfolg

chart-source-title = Woher die Arbeit kommt
chart-source-desc = Letzte 30 Tage, gruppiert nach Trigger-Quelle.
chart-source-empty = Noch keine Läufe in den letzten 30 Tagen.
chart-source-runs-label = Läufe

# Test webhook modal
testwebhook-title = Webhook testen
testwebhook-desc = Löst den Webhook-Trigger-Pfad aus (kein manueller Lauf). Der { -platform-ai-agent-product.inline } erhält deine Nachricht als Webhook-Payload.
testwebhook-close-aria = Schließen
testwebhook-empty = Keine { -platform-ai-agent-product.inline-plural } mit aktivem Webhook-Trigger. Füge einen unter Config → Triggers hinzu.
testwebhook-agent-label = { -platform-ai-agent-product.inline }
testwebhook-trigger-label = Webhook-Trigger
testwebhook-subject-label = Betreff
testwebhook-message-label = Nachricht
testwebhook-message-placeholder = z. B. „Kunde John Doe meldet, dass Schaden #12345 fälschlich abgelehnt wurde. Bitte prüfen und antworten.“
testwebhook-message-hint = Wird als Webhook-Body gesendet. Der { -platform-ai-agent-product.inline } sieht Betreff und Nachricht in seiner Aufgabe.
testwebhook-default-subject = Test-Webhook
testwebhook-sending = Wird gesendet…
testwebhook-submit = Webhook senden

# Archived agents panel
archived-title = Archivierte { -platform-ai-agent-product.inline-plural }
archived-desc = Weich gelöschte Workforce-{ -platform-ai-agent-product.inline-plural }. Wiederherstellen bringt sie pausiert zurück, damit du vor der Reaktivierung prüfen kannst.
archived-refresh-aria = Archivierte { -platform-ai-agent-product.inline-plural } aktualisieren
archived-loading = Archivierte { -platform-ai-agent-product.inline-plural } werden geladen…
archived-empty-title = Keine archivierten { -platform-ai-agent-product.inline-plural }
archived-empty-desc = Wenn du einen { -platform-ai-agent-product.inline } archivierst, erscheint er hier zur Wiederherstellung.
archived-meta = Archiviert { $time }
archived-meta-by = Archiviert { $time } von { $user }
archived-restoring = Wird wiederhergestellt…
archived-restore = Wiederherstellen

# Live activity feed
live-activity-title = Live-Aktivität
live-activity-running-count = { $count } laufen
live-activity-empty = Derzeit keine laufenden Ausführungen.

# Agent marketplace
marketplace-modal-title = { -platform-ai-agent-product.inline }-Marktplatz
marketplace-modal-subtitle = Stelle fertige { -platform-ai-agent-product.inline-plural } mit integrierten Skills, Tools und Governance ein.
marketplace-manage-catalog = Katalog verwalten
marketplace-select-multiple = Mehrere auswählen
marketplace-done-selecting = Auswahl abschließen
marketplace-close-aria = Schließen
marketplace-search-placeholder = Nach Rolle, Skill oder Tool suchen…
marketplace-offline-catalog = Offline-Katalog wird verwendet: { $error }
marketplace-loading-catalog = Katalog wird geladen…
marketplace-empty-search = Keine { -platform-ai-agent-product.inline-plural } entsprechen deiner Suche
marketplace-selected-count = { $count } ausgewählt
marketplace-installing = Installation läuft…
marketplace-install-selected = Ausgewählte installieren ({ $count })
marketplace-error-install-failed = Installation fehlgeschlagen
marketplace-error-preflight-failed = Preflight fehlgeschlagen
marketplace-error-offline-cannot-publish = Wähle Katalogpakete, die in dieser Umgebung existieren (Offline-Demo-{ -platform-ai-agent-product.inline-plural } können nicht veröffentlicht werden).
marketplace-card-skills-count = { $count } Skills
marketplace-card-tools-count = { $count } Tools
marketplace-card-installs-count = { $installs } Installationen
marketplace-card-selected = Ausgewählt
marketplace-card-select = Auswählen
marketplace-card-view-profile = Profil ansehen
marketplace-detail-back = Zurück zum Marktplatz
marketplace-detail-rating-installs = { $rating } · { $installs } Installationen
marketplace-detail-section-skills = Skills
marketplace-detail-section-tools = Tools & Integrationen
marketplace-detail-section-governance = Governance
marketplace-detail-section-triggers = Reagiert auf
marketplace-detail-section-pricing = Preise
marketplace-detail-bundled-skills = { $count } gebündelte Skills enthalten
marketplace-detail-tools-wired = { $count } Tools über Skills angebunden
marketplace-detail-hire-note-legacy = Startet pausiert zur Überprüfung.
marketplace-detail-hire-note-package = Installiert { -platform-ai-agent-product.inline }, Skills und Tools sofort.
marketplace-detail-hire-button = { $name } einstellen
marketplace-install-summary-title = Installationsübersicht
marketplace-install-summary-stats = { $succeeded } erfolgreich · { $failed } fehlgeschlagen · { $total } gesamt
marketplace-install-summary-agent-id = Agenten-ID: { $agentId }
marketplace-needs-configuration = Konfiguration erforderlich: { $items }
marketplace-done = Fertig
marketplace-preflight-title-ready = Bereit zur Einstellung
marketplace-preflight-title-check = Kompatibilitätsprüfung
marketplace-preflight-all-ready = Alle ausgewählten Pakete haben die Preflight-Prüfungen bestanden.
marketplace-preflight-issues-found =
    { $count ->
        [one] { $count } Problem vor der Installation gefunden.
       *[other] { $count } Probleme vor der Installation gefunden.
    }
marketplace-preflight-missing-tools = Fehlende Tools: { $tools }
marketplace-preflight-missing-functions = Fehlende Funktionen: { $functions }
marketplace-preflight-install-now = Jetzt installieren
marketplace-preflight-install-anyway = Trotzdem installieren
marketplace-publish-agent-description = { $agentName } in einem Kunden-Marktplatz listen. Nach der Veröffentlichung kann er eingestellt werden.
marketplace-publish-agent-success = { $name } veröffentlicht
marketplace-publish-agent-success-meta = Verfügbar auf { $target } · Paket-ID { $packageId } · { $skillCount } Skills · { $toolCount } Tools
marketplace-target-tenant-url = Ziel-Mandanten-URL
marketplace-target-url-placeholder = https://kunde.beispiel.de/prompt-manager
marketplace-target-bearer-token = Ziel-Bearer-Token
marketplace-target-token-placeholder = Mandanten-Zugriffstoken einfügen
marketplace-package-id-optional = Paket-ID (optional)
marketplace-package-id-placeholder = Automatisch aus Agentenname generiert
marketplace-category-label = Kategorie
marketplace-category-placeholder = general
marketplace-publisher-label = Herausgeber
marketplace-publisher-placeholder = newwork
marketplace-publishing = Veröffentlichung läuft…
marketplace-push-description =
    { $count ->
        [one] { $count } ausgewählten { -platform-ai-agent-product.inline } in einem Kunden-Marktplatz listen.
       *[other] { $count } ausgewählte { -platform-ai-agent-product.inline-plural } in einem Kunden-Marktplatz listen.
    }
marketplace-push-success =
    { $count ->
        [one] { $count } Paket veröffentlicht
       *[other] { $count } Pakete veröffentlicht
    }
marketplace-push-failed =
    { $count ->
        [one] { $count } Paket fehlgeschlagen
       *[other] { $count } Pakete fehlgeschlagen
    }
marketplace-push-failed-item = { $name }: { $error }
marketplace-manage-loading = Katalog wird geladen…
marketplace-manage-description = Veröffentlichte Pakete, die im Einstellungs-Marktplatz dieses Mandanten sichtbar sind. Veröffentlichung aufheben entfernt einen Eintrag.
marketplace-manage-empty = Noch keine veröffentlichten Pakete.
marketplace-manage-package-meta = { $packageId } · { $category } · { $skillCount } Skills · { $toolCount } Tools · { $installCount } Installationen
marketplace-manage-unpublish = Veröffentlichung aufheben
marketplace-manage-error-load = Katalog konnte nicht geladen werden
marketplace-manage-error-unpublish = Veröffentlichung aufheben fehlgeschlagen
marketplace-pack-hr = Personalwesen
marketplace-pack-crm = Kundenbeziehungen
marketplace-pack-service = Kundenservice
marketplace-pack-finance = Finanzen
marketplace-pack-erp = ERP & Beschaffung
marketplace-pack-general = Allgemein

# Run approval sections (flow, email, structured)
approval-awaiting-title = Wartet auf menschliche Freigabe
approval-comment-placeholder = Kommentar hinzufügen (optional)
approval-approve = Freigeben
approval-reject = Ablehnen
approval-submitting = Wird gesendet…
approval-flow-missing-task-id = Diese Freigabeaufgabe hat keine ID und kann hier nicht bearbeitet werden.
approval-flow-missing-user = Dein Benutzer konnte nicht aufgelöst werden, um die Entscheidung zu speichern.
approval-flow-submit-fail = Entscheidung konnte nicht gesendet werden.
approval-flow-empty-proposal = Keine vorgeschlagenen Änderungen zur Prüfung erfasst.
approval-email-signin = Anmeldung erforderlich, um E-Mail zu senden.
approval-email-submit-fail = E-Mail konnte nicht gesendet werden.
approval-structured-signin = Anmeldung erforderlich, um zu antworten.
approval-structured-submit-fail = Antwort konnte nicht gesendet werden.

# Run entity links & domain actions
entity-records-actions-title = Datensätze & Aktionen
entity-case-assigned = Fall zugewiesen
entity-action-search-label = Suche
entity-action-search-desc = Bestehenden Datensatz nachgeschlagen
entity-action-create-label = Erstellen
entity-action-create-desc = Neuen Datensatz erstellt
entity-action-update-label = Aktualisieren
entity-action-update-desc = Bestehenden Datensatz aktualisiert
entity-action-timeline-label = Verlauf
entity-action-timeline-desc = Datensatzverlauf gelesen
entity-action-note-label = Notiz
entity-action-note-desc = Notiz hinzugefügt
entity-action-task-label = Aufgabe
entity-action-task-desc = Folgeaufgabe protokolliert
entity-action-flow-label = Flow
entity-action-flow-desc = Workflow gestartet
entity-action-fallback-desc = Tool-Aufruf
entity-label-account = Konto
entity-label-contact = Kontakt
entity-record-id-label = { $label }: { $value }
entity-workflow-fallback = Workflow

# Flow action details (run detail)
flow-step-progress = Schritt { $current } von { $total }
flow-steps-complete = { $total } von { $total } Schritten
flow-template-id-chip = template_id: { $id }

# CRM actions (run detail)
crm-actions-title = CRM-Aktionen
crm-action-search-label = Suche
crm-action-search-desc = Bestehenden CRM-Datensatz nachgeschlagen
crm-action-create-label = Erstellen
crm-action-create-desc = Neuen CRM-Datensatz erstellt
crm-action-update-label = Aktualisieren
crm-action-update-desc = Bestehenden CRM-Datensatz aktualisiert
crm-action-timeline-label = Verlauf
crm-action-timeline-desc = CRM-Verlauf gelesen
crm-action-note-label = Notiz
crm-action-note-desc = CRM-Notiz hinzugefügt
crm-action-task-label = Aufgabe
crm-action-task-desc = CRM-Folgeaufgabe protokolliert
crm-action-fallback-desc = CRM-Tool-Aufruf
crm-record-note = CRM-Notiz
crm-record-task = CRM-Aufgabe
crm-record-account = Konto
crm-record-contact = Kontakt

# Run audit timeline
audit-trail-title = Prüfpfad
audit-trail-loading = Prüfpfad wird geladen…
audit-trail-load-fail = Prüfpfad konnte nicht geladen werden.
audit-trail-empty = Für diese Ausführung sind keine Prüfeinträge erfasst.
audit-trail-by = von { $actor }
audit-trail-system = System

# Policies used (run detail)
policies-title = Richtlinien

# Workforce AI composer
composer-trigger-label = Den passenden Workforce-Agenten für die Aufgabe finden
composer-collapse-aria = Einklappen
composer-input-placeholder = Arbeit beschreiben… z. B. eingehende Schaden-E-Mails beantworten
composer-find = Finden
composer-ai-badge = KI
composer-sample-claims = Eingehende Versicherungsschaden-E-Mails beantworten
composer-sample-triage = Support-Tickets anhand unserer Richtlinien triagieren
composer-sample-leads = Neue Leads mit unseren ICP-Regeln qualifizieren
composer-sample-expenses = Spesenberichte für die Finanzabteilung abgleichen

# Credit sparkline (agent config)
sparkline-title = Verbrauchte Credits (7 T.)
sparkline-summary = { $credits } Credits · { $runs } Ausführungen
sparkline-aria-label = Credit-Verbrauch nach Tag
sparkline-bar-title = { $date }: { $credits } Credits

# Per-agent credits chart
per-agent-chart-title = Credits nach Agent
per-agent-chart-subtitle = Top-Verbraucher diese Woche.
per-agent-chart-empty = Noch keine Agentennutzung.

# Glass workforce sphere
glass-sphere-heading = Aktive Workforce
glass-sphere-value-one = { $count } Agent online
glass-sphere-value-other = { $count } Agenten online
glass-sphere-credits-unit = Credits / Monat

# Flow detail panel & map
flow-detail-empty = Diese Aktion hat keine Workflow-ID zurückgegeben.
flow-field-initiated-by = Gestartet von
flow-field-progress = Fortschritt
flow-field-started = Gestartet
flow-field-completed = Abgeschlossen
flow-field-who = Wer
flow-field-claimed = Übernommen
flow-field-duration = Dauer
flow-field-due-sla = Fällig / SLA
flow-steps-title = Schritte
flow-steps-loading = Schritte werden geladen…
flow-steps-empty = Noch keine Schritte gemeldet.
flow-step-results = Ergebnisse
flow-step-results-loading = Ergebnisse werden geladen…
flow-step-captured-data = Erfasste Daten
flow-step-result-empty = Für diesen Schritt wurden noch keine Ergebnisse erfasst.
flow-step-result-empty-review = Für diesen Knoten wurde kein Schrittergebnis erfasst.
flow-step-data-empty = Keine Daten erfasst.
flow-live-badge = Live
flow-live-updating = Wird aktualisiert
flow-legend-status = Status:
flow-legend-current = Aktuell
flow-legend-completed = Abgeschlossen
flow-legend-failed = Fehlgeschlagen
flow-legend-pending = Ausstehend
flow-replay-restart-aria = Wiedergabe neu starten
flow-replay-prev-aria = Vorheriger Schritt
flow-replay-toggle-pause = Wiedergabe pausieren
flow-replay-toggle-play = Wiedergabe starten
flow-replay-next-aria = Nächster Schritt
flow-replay-position-aria = Wiedergabeposition
flow-progress-steps = { $completed }/{ $total } Schritte
flow-progress-summary-complete = { $total } von { $total } Schritten
flow-progress-summary = Schritt { $current } von { $total }
flow-progress-summary-pct = Schritt { $current } von { $total } · { $percent } %
flow-map-replaying-path = Pfad wird wiedergegeben, den dieser Flow genommen hat
flow-map-completed-path = Abgeschlossener Ausführungspfad
flow-map-live-path = Live-Ausführungspfad
flow-map-step-of = Schritt { $current } von { $total }
flow-map-step-of-titled = Schritt { $current } von { $total } · { $title }
flow-map-fullscreen-enter = Vollbild aktivieren
flow-map-fullscreen-exit = Vollbild beenden
flow-map-unavailable-title = Flow-Karte nicht verfügbar
flow-map-unavailable-desc = Dieser Workflow hat keine Template-Referenz, daher kann das Diagramm nicht angezeigt werden.
flow-map-step-detail-close = Schrittdetails schließen
flow-map-step-detail-empty = Für diesen Knoten wurde kein Schrittergebnis erfasst.
flow-node-start = Start
flow-node-end = Ende
flow-node-step = Schritt
flow-not-available = Nicht verfügbar

# Sidebar
sidebar-search-label = Sitzungen durchsuchen
sidebar-search-clear-aria = Suche löschen
sidebar-search-loading-aria = Sitzungen werden durchsucht
sidebar-matching-sessions-one = 1 passende Sitzung
sidebar-matching-sessions-many = { $count } passende Sitzungen
sidebar-recents-label = Zuletzt
sidebar-recents-loading = Sitzungen werden geladen…
sidebar-recents-empty = Noch keine Sitzungen. Starte eine über den Composer.
sidebar-recents-empty-search = Keine Sitzungen entsprechen deiner Suche oder den Filtern.
sidebar-recents-load-more-loading = Ältere Sitzungen werden geladen…
sidebar-recents-load-more-search = Weitere Treffer laden
sidebar-recents-load-more = Ältere Sitzungen laden
sidebar-group-today = Heute
sidebar-group-yesterday = Gestern
sidebar-group-earlier = Früher
sidebar-signed-in = Angemeldet
sidebar-scheduled-tasks = Geplante Aufgaben
sidebar-settings = Einstellungen
sidebar-new-session = Neue Sitzung
sidebar-live-label = Live
sidebar-status-waiting = Wartet
sidebar-status-pending = Ausstehend
sidebar-status-running = Läuft
sidebar-untitled-task = Unbenannte Aufgabe
sidebar-stop-session = Sitzung stoppen
sidebar-untitled-session = Unbenannte Sitzung
sidebar-status-done = Fertig
sidebar-status-failed = Fehlgeschlagen
sidebar-status-cancelled = Abgebrochen
sidebar-delete-session = Sitzung löschen

# Chat
chat-attachment-index-failed = Indizierung fehlgeschlagen: { $name }
chat-attachment-indexing = Indizierung: { $name }
chat-attachment-ready-prefix = Bereit
chat-attachment-upload-failed = Upload fehlgeschlagen: { $name }
chat-attachment-ready-pending = Bereit: { $name } (wird beim Senden hochgeladen)
chat-attachment-uploading = { $name } wird hochgeladen…
chat-attachment-indexing-pending = { $name } wird indiziert…
chat-attachment-preview-open = Öffnen
chat-attachment-preview-download = Herunterladen
chat-attachment-preview-aria = Größere Vorschau für { $name } öffnen
chat-attachment-remove = { $name } entfernen
chat-email-status-sent = E-Mail gesendet
chat-email-status-drafted = Als Entwurf gespeichert
chat-email-status-cancelled = Abgebrochen
chat-email-status-error = Senden fehlgeschlagen
chat-email-status-completed = Abgeschlossen
chat-email-review-title = E-Mail prüfen und senden
chat-email-field-from = Von
chat-email-field-to = An
chat-email-field-cc = Cc
chat-email-field-bcc = Bcc
chat-email-add-cc-bcc = Cc / Bcc hinzufügen
chat-email-subject-placeholder = Betreff
chat-email-body-placeholder = Nachricht schreiben…
chat-email-signature-label = Signatur
chat-email-use-account-signature = Kontosignatur verwenden
chat-email-signature-placeholder = -- \nDein Name
chat-email-recipient-placeholder = Name oder E-Mail eingeben…
chat-email-searching = Suche…
chat-email-no-employees-hint = Keine passenden Mitarbeitenden. Enter drücken, um E-Mail direkt hinzuzufügen.
chat-email-loading-accounts = Konten werden geladen…
chat-email-no-accounts = Keine E-Mail-Konten verbunden. Verbinde eines in den E-Mail-Einstellungen zum Senden.
chat-email-accounts-error = Konten konnten nicht geladen werden: { $error }
chat-email-default-account = (Standard)
chat-email-validation-recipients = Mindestens einen Empfänger hinzufügen.
chat-email-validation-subject = Betreff ist erforderlich.
chat-email-validation-pick-account = E-Mail-Konto zum Senden auswählen.
chat-email-validation-no-account = Kein E-Mail-Konto verbunden.
chat-email-no-subject = Kein Betreff
chat-email-save-draft = Entwurf speichern
chat-email-sending = Wird gesendet…
chat-email-send = Senden
chat-email-remove-recipient = { $address } entfernen
chat-email-remove-attachment = Anhang { $name } entfernen
chat-activity-aria = Agent-Fortschritt
chat-agent-working = Agent arbeitet…

# Landing
landing-greeting-with-name = Hallo { $name }, was
landing-greeting = Was
landing-heading-suffix = möchtest du tun?
landing-subtitle = Aufgabe zuweisen, etwas fragen oder einen Workflow fortsetzen.
landing-input-placeholder = Aufgabe, Recherchethema oder beliebige Frage beschreiben…
landing-input-reply-prefix = Deine Antwort auf: "{ $text }"
landing-input-working = Agent arbeitet…
landing-input-reply = Antworten oder Feedback geben…
landing-input-uploading = Anhang wird hochgeladen…
landing-input-indexing = Anhang wird indiziert, gleich fertig…
landing-input-hint = Enter zum Senden, Shift+Enter für Zeilenumbruch
landing-input-starting = Sitzung wird gestartet…
landing-stop-aria = Stoppen
landing-connectors-count = { $count } Connectors
landing-composer-add-title = Hinzufügen
landing-composer-panel-title = Zur Sitzung hinzufügen
landing-composer-panel-subtitle = Agent wählen, Dateien anhängen oder Daten verbinden.
landing-composer-section-agents = Mit einem Agent arbeiten
landing-composer-clear = Löschen
landing-composer-agent-search = Agenten suchen…
landing-composer-agents-empty = Keine Agenten verfügbar.
landing-composer-agents-no-match = Keine Agenten entsprechen deiner Suche.
landing-composer-section-files = Dateien & Bilder
landing-composer-upload-title = Fotos & Dateien hinzufügen
landing-composer-upload-desc = PDFs, Bilder und Dokumente
landing-composer-section-connectors = Connectors
landing-composer-connectors-active = { $count } aktiv
landing-composer-connectors-empty-hint = Externe Datenquellen verbinden
landing-composer-connectors-none = Keine Connectors verfügbar.
landing-composer-manage-connections = Verbindungen verwalten
landing-agent-chip-label = Agent
landing-agent-chip-title = Arbeitet mit { $name }
landing-model-label = Modell
landing-model-fallback = Modell
landing-model-aria = Modell: { $model }
landing-model-aria-with-effort = Modell: { $model }, { $effort }
landing-reasoning-label = Reasoning
landing-effort-none = Keine
landing-effort-low = Niedrig
landing-effort-medium = Mittel
landing-effort-high = Hoch

# Trace explorer
trace-explorer-tab-tools = Tools ({ $count })
trace-explorer-tab-sources = Quellen ({ $count })
trace-explorer-tab-cost = Kosten
trace-explorer-section-execution = Ausführungsübersicht
trace-explorer-stat-runtime = Gesamtlaufzeit
trace-explorer-stat-events = Verarbeitete Ereignisse
trace-explorer-stat-tool-calls = Tool-Aufrufe
trace-explorer-stat-decisions = Entscheidungen
trace-explorer-section-llm-cost = LLM-Kosten
trace-explorer-stat-tokens = Verwendete Tokens
trace-explorer-stat-estimated-cost = Geschätzte Kosten
trace-explorer-budget-pct = { $pct }% des Budgets
trace-explorer-budget-consumed = Budget verbraucht
trace-explorer-cost-pending = Kostendaten erscheinen nach Abschluss der Sitzung
trace-explorer-section-participants = Teilnehmende
trace-explorer-stat-subagents = Sub-Agenten
trace-explorer-stat-experts = Experten
trace-explorer-stat-skills = Skills
trace-explorer-tools-empty = Keine Tool-Aufrufe in dieser Sitzung
trace-explorer-col-tool = Tool
trace-explorer-col-calls = Aufrufe
trace-explorer-col-total-time = Gesamtzeit
trace-explorer-col-failures = Fehler
trace-explorer-col-status = Status
trace-explorer-status-ok = OK
trace-explorer-sources-empty = Keine Teilnehmenden erkannt
trace-explorer-col-participant = Teilnehmende
trace-explorer-col-kind = Art
trace-explorer-col-invocations = Aufrufe
trace-explorer-col-duration = Dauer
trace-explorer-kind-orchestrator = Every
trace-explorer-kind-subagent = Sub-Agent
trace-explorer-kind-expert = Experte
trace-explorer-kind-skill = Skill
trace-explorer-kind-tool = Tool
trace-explorer-status-done = Fertig
trace-explorer-status-failed = Fehlgeschlagen
trace-explorer-status-running = Läuft
trace-explorer-status-idle = Inaktiv
trace-explorer-detail-seq = Seq
trace-explorer-detail-offset = Offset
trace-explorer-detail-duration = Dauer
trace-explorer-detail-summary = Zusammenfassung

# Renderers — final answer
renderer-final-hide-full-response = Vollständige Antwort ausblenden
renderer-final-show-full-response = Vollständige Antwort anzeigen
renderer-final-duration = Dauer:
renderer-final-tasks = Aufgaben:
renderer-final-export = Exportieren
renderer-final-status-completed = Abgeschlossen
renderer-final-actions-taken = Durchgeführte Aktionen

# Renderers — expert call
renderer-expert-agent-label = Agent
renderer-expert-subagent-fallback = Sub-Agent
renderer-expert-status-working = In Arbeit
renderer-expert-status-failed = Fehlgeschlagen
renderer-expert-status-completed = Abgeschlossen

# Renderers — plan
renderer-plan-title = Plan
renderer-plan-steps = { $done } / { $total } Schritte

# Renderers — reflection
renderer-reflection-passed = Qualitätsprüfung bestanden
renderer-reflection-gaps = Agent hat Lücken gefunden und arbeitet weiter…

# Renderers — tool call / result
renderer-tool-call-input = Eingabe
renderer-tool-call-result-preview = Ergebnisvorschau
renderer-tool-call-cached = zwischengespeichert
renderer-tool-result-label = Ergebnis
renderer-tool-result-sources = Quellen
renderer-tool-result-showing-rows = Zeige 10 von { $total } Zeilen
renderer-tool-result-subject = Betreff:
renderer-tool-result-to = An:
renderer-tool-email-failed = E-Mail fehlgeschlagen
renderer-tool-email-cancelled = E-Mail abgebrochen
renderer-tool-email-drafted = E-Mail als Entwurf gespeichert
renderer-tool-email-sent = E-Mail gesendet
renderer-tool-email-composed = E-Mail erstellt

# Renderers — preview block
renderer-preview-status-pending = Ausstehend
renderer-preview-status-in-progress = In Bearbeitung
renderer-preview-status-done = Fertig
renderer-preview-status-failed = Fehlgeschlagen
renderer-preview-status-skipped = Übersprungen
renderer-preview-view-live = Live in Seitenleiste anzeigen
renderer-preview-view-live-title = Live-Case-Panel in der Seitenleiste öffnen

# Renderers — action card
renderer-action-open = Öffnen
renderer-action-details = Details
renderer-action-show-tech-refs = Technische Referenzen anzeigen

# Renderers — deliverables / artifacts
renderer-doc-type-document = Dokument
renderer-doc-type-slides = Präsentation
renderer-doc-type-note = Notiz
renderer-doc-created = { $type } erstellt
renderer-doc-view-canvas = Zum Anzeigen auf der Leinwand klicken
renderer-doc-view = Anzeigen
renderer-pdf-ready = PDF bereit
renderer-file-ready = Datei bereit
renderer-download = Herunterladen
renderer-download-ellipsis = …
renderer-pdf-unavailable = PDF nicht verfügbar — Sitzungs- oder Anhang-ID fehlt.
renderer-pdf-download-error = PDF konnte nicht heruntergeladen werden: { $detail }
renderer-file-unavailable = Datei nicht verfügbar — Sitzungs- oder Anhang-ID fehlt.
renderer-file-download-error = Datei konnte nicht heruntergeladen werden: { $detail }
renderer-artifact-open = Öffnen
renderer-artifact-open-full = Vollansicht öffnen
renderer-artifact-open-new-tab = In neuem Tab öffnen
renderer-artifact-download-png = Als PNG herunterladen
renderer-artifact-saving-png = PNG wird gespeichert…
renderer-chart-load-error = Diagrammdaten konnten nicht geladen werden.
renderer-artifact-size-kb = { $size } KB

# Renderers — references rail
renderer-references-title = Referenzen
renderer-ref-category-person = Personen
renderer-ref-category-hr = HR & Organisation
renderer-ref-category-crm = CRM
renderer-ref-category-finance = Finanzen
renderer-ref-category-investment = Investitionen
renderer-ref-category-document = Dokumente
renderer-ref-category-content = Inhalte
renderer-ref-category-workflow = Workflows
renderer-ref-category-platform-page = Seiten
renderer-ref-category-other = Sonstiges

# Renderers — reference cards (fields)
renderer-ref-field-owner = Eigentümer
renderer-ref-field-location = Standort
renderer-ref-field-size = Größe
renderer-ref-field-revenue = Umsatz
renderer-ref-field-phone = Telefon
renderer-ref-field-website = Website
renderer-ref-field-department = Abteilung
renderer-ref-field-company = Unternehmen
renderer-ref-field-joined = Beigetreten
renderer-ref-field-email = E-Mail
renderer-ref-field-account = Konto
renderer-ref-field-opportunity = Opportunity
renderer-ref-field-source = Quelle
renderer-ref-field-rating = Bewertung
renderer-ref-field-region = Region
renderer-ref-field-ai-score = KI-Score
renderer-ref-field-amount = Betrag
renderer-ref-field-close = Abschluss
renderer-ref-field-win = Gewinn
renderer-ref-field-forecast = Prognose
renderer-ref-field-ai-grade = KI-Note
renderer-ref-field-updated = Aktualisiert
renderer-ref-field-pages = Seiten
renderer-ref-field-slides = Folien
renderer-ref-field-rows = Zeilen
renderer-ref-field-sheets = Tabellenblätter
renderer-ref-field-steps = Schritte
renderer-ref-field-version = Version
renderer-ref-field-started = Gestartet
renderer-ref-field-organizer = Organisator
renderer-ref-field-attendees = Teilnehmer
renderer-ref-field-progress = Fortschritt

renderer-ref-type-document = Dokument
renderer-ref-type-spreadsheet = Tabelle
renderer-ref-type-presentation = Präsentation
renderer-ref-type-note = Notiz
renderer-ref-type-workflow = Workflow
renderer-ref-type-workflow-template = Workflow-Vorlage
renderer-ref-type-meeting = Meeting
renderer-ref-type-conversation = Unterhaltung
renderer-ref-type-untitled-note = Unbenannte Notiz

renderer-ref-status-draft = Entwurf
renderer-ref-status-pinned = Angepinnt
renderer-ref-status-archived = Archiviert
renderer-ref-reports-to = Berichtet an

renderer-ref-intent-manager = Manager
renderer-ref-intent-reports-to = Berichtet an
renderer-ref-intent-team-member = Teammitglied
renderer-ref-intent-owner = Eigentümer

renderer-ref-count-page = { $count ->
    [one] { $count } Seite
   *[other] { $count } Seiten
}
renderer-ref-count-slide = { $count ->
    [one] { $count } Folie
   *[other] { $count } Folien
}
renderer-ref-count-sheet = { $count ->
    [one] { $count } Tabellenblatt
   *[other] { $count } Tabellenblätter
}
renderer-ref-count-row = { $count ->
    [one] { $count } Zeile
   *[other] { $count } Zeilen
}
renderer-ref-count-step = { $count ->
    [one] { $count } Schritt
   *[other] { $count } Schritte
}
renderer-ref-count-attendee = { $count ->
    [one] { $count } Teilnehmer
   *[other] { $count } Teilnehmer
}

renderer-ref-progress-steps = { $completed } von { $total } { $total ->
    [one] Schritt
   *[other] Schritte
}
renderer-ref-participant-count = { $count } { $count ->
    [one] Teilnehmer
   *[other] Teilnehmer
}
renderer-ref-unread-count = { $count } ungelesen
renderer-ref-version = v{ $version }

renderer-ref-time-just-now = gerade eben
renderer-ref-time-minutes-ago = vor { $count } Min.
renderer-ref-time-hours-ago = vor { $count } Std.
renderer-ref-time-yesterday = gestern
renderer-ref-time-days-ago = vor { $count } T.

# Renderers — tool permission
renderer-permission-hide-fields = Zusätzliche Felder ausblenden
renderer-permission-show-fields = { $count } weitere { $count ->
    [one] Feld
   *[other] Felder
} anzeigen
renderer-permission-click-choose = Klicken, um eine andere Option zu wählen
renderer-permission-click-edit = Klicken zum Bearbeiten
renderer-permission-suggested = Vorgeschlagen
renderer-permission-suggested-title = Vom Assistenten vorausgefüllt — prüfen und bei Bedarf anpassen. Nicht erforderlich.
renderer-permission-required = Erforderlich
renderer-permission-suggested-hint = Vom Assistenten vorausgefüllt
renderer-permission-editing = Bearbeitung
renderer-permission-click-adjust = Klicken Sie auf ein Feld, um es vor der Genehmigung anzupassen.
renderer-permission-approve-multi = { $count } Aktionen genehmigen
renderer-permission-review-multi = Prüfen Sie jede Aktion unten. Sie werden erst nach Ihrer Genehmigung ausgeführt.
renderer-permission-approve-run = Genehmigen und ausführen
renderer-permission-save-run = Änderungen speichern und ausführen
renderer-permission-modify = Anpassen
renderer-permission-cancel-changes = Änderungen abbrechen
renderer-permission-reject = Ablehnen
renderer-permission-runs-after = Wird erst nach Ihrer Genehmigung ausgeführt.
renderer-permission-decision-submitted = Entscheidung übermittelt
renderer-permission-rejected = Abgelehnt
renderer-permission-changes-submitted = Änderungen übermittelt
renderer-permission-approved = Genehmigt
renderer-permission-collapse = Genehmigte Aktion einklappen

# Renderers — structured input form
renderer-form-field-required = Dieses Feld ist erforderlich
renderer-form-field-invalid = Ungültiges Format
renderer-form-ai-will-generate = KI generiert
renderer-form-let-ai-generate = KI generieren lassen
renderer-form-select-placeholder = Auswählen...
renderer-form-ai-generate-field = KI generiert dieses Feld
renderer-form-collapse-aria = Übermitteltes Formular einklappen
renderer-form-ai-generate-count = KI generiert { $count } Feld(er)
renderer-form-continue-ai = Mit KI fortfahren
renderer-form-submit = Absenden
renderer-form-summary-ai = { $label }: KI-generiert

# Settings
settings-title = Einstellungen
settings-tab-agents = Agenten
settings-tab-skills = Skills
settings-tab-tools = Tools
settings-page-agent-studio = Agent Studio
settings-sidebar-aria = Einstellungsbereiche

settings-section-configuration = Konfiguration
settings-section-memory = { enterprise-agent-nav-memory }
settings-section-policies = Standardrichtlinien
settings-section-metrics = Nutzung & Metriken

settings-configuration-title = Konfiguration
settings-memory-toggle-label = { enterprise-agent-nav-memory }
settings-memory-toggle-desc = Präferenzen und Kontext sitzungsübergreifend merken
settings-auto-approve-label = Auto-Genehmigungsmodus
settings-auto-approve-desc = Agent darf fortfahren, ohne bei Aktionen nachzufragen, die normalerweise eine Genehmigung erfordern
settings-dev-mode-label = Entwicklermodus
settings-dev-mode-desc = Modellauswahl, Trace-Explorer und Debug-Trace-Tools anzeigen
settings-reflection-mode-label = Reflexionsmodus
settings-reflection-mode-desc = Steuert, ob der Agent seine Arbeit vor dem Abschluss überprüft
settings-reflection-adaptive = Adaptiv
settings-reflection-always = Immer
settings-reflection-disabled = Deaktiviert

settings-memory-title = { enterprise-agent-nav-memory }
settings-memory-namespace-preferences = Präferenzen
settings-memory-namespace-domain = Domänenfakten
settings-memory-namespace-skills = Muster
settings-memory-namespace-episodes = Tagebuch
settings-memory-empty-preferences = Noch keine gespeicherten Präferenzen. Füge hinzu, was sich der Agent merken soll, z. B. „antworte kurz und direkt“.
settings-memory-empty-domain = Noch keine Domänenfakten. Der Agent speichert hier automatisch wiederverwendbare Workspace-Fakten nach Sitzungen (z. B. „Q1 endet am 31. März“).
settings-memory-empty-skills = Noch keine Muster. Der Agent speichert hier automatisch „welcher Workflow für welche Aufgabe funktioniert hat“ nach Sitzungen.
settings-memory-empty-episodes = Noch keine Tagebucheinträge. Nach jeder Sitzung protokolliert der Agent, woran ihr zusammen gearbeitet habt, mit Themen und Datum.
settings-memory-search-placeholder = { $namespace } durchsuchen...
settings-memory-all-topics = Alle Themen
settings-memory-entry-count = { $count ->
    [one] 1 Eintrag
   *[other] { $count } Einträge
}
settings-memory-entries-episodes-suffix = · Tagebuch vergangener Sitzungen
settings-memory-entries-auto-suffix = · automatisch nach Sitzungen gelernt
settings-memory-delete-aria = Speichereintrag löschen: { $title }
settings-memory-relative-today = Heute
settings-memory-relative-yesterday = Gestern
settings-memory-relative-days = vor { $days } Tagen
settings-memory-relative-weeks = vor { $weeks } Wo.

settings-preferences-intro = Diese gelten für jede Aufgabe. Der Agent liest sie zu Sitzungsbeginn, damit du dich nicht wiederholen musst.
settings-pref-response-length = Antwortlänge
settings-pref-tone = Ton
settings-pref-format = Format
settings-pref-expertise = Fachniveau
settings-pref-language = Sprache
settings-pref-language-none = Keine Präferenz
settings-pref-custom-instructions = Eigene Anweisungen
settings-pref-custom-placeholder = Alles Weitere, was der Agent immer beachten soll.
settings-pref-option-concise = Knapp
settings-pref-option-balanced = Ausgewogen
settings-pref-option-detailed = Ausführlich
settings-pref-option-professional = Professionell
settings-pref-option-friendly = Freundlich
settings-pref-option-direct = Direkt
settings-pref-option-casual = Locker
settings-pref-option-prose = Fließtext
settings-pref-option-bullets = Aufzählungspunkte
settings-pref-option-tables = Tabellen wenn sinnvoll
settings-pref-option-steps = Schritt für Schritt
settings-pref-option-beginner = Einsteigerfreundlich
settings-pref-option-expert = Experte (Grundlagen überspringen)
settings-pref-lang-english = Englisch
settings-pref-lang-german = Deutsch
settings-pref-lang-french = Französisch
settings-pref-lang-spanish = Spanisch
settings-pref-lang-italian = Italienisch
settings-pref-lang-portuguese = Portugiesisch
settings-pref-lang-dutch = Niederländisch

settings-profile-about = Über dich
settings-profile-desc = Aus deinem Mitarbeiterdatensatz generiert, damit Enterprise-Agenten deine Rolle, dein Team, deinen Vorgesetzten und deine Skills verstehen.
settings-profile-regenerate = Neu generieren
settings-profile-status-missing = Noch nicht generiert
settings-profile-status-generating = Wird aus Mitarbeiterdaten generiert...
settings-profile-status-ready = Aus Mitarbeiterdaten generiert
settings-profile-status-failed = Generierung fehlgeschlagen
settings-profile-status-edited = Von dir bearbeitet
settings-profile-updated = Aktualisiert { $date }
settings-profile-placeholder = Dein Profilspeicher erscheint hier, nachdem er aus Mitarbeiterdaten generiert wurde.
settings-profile-loading = Profilspeicher wird geladen...
settings-profile-error-load = Profilspeicher konnte nicht geladen werden.
settings-profile-error-save = Profilspeicher konnte nicht gespeichert werden.
settings-profile-error-regenerate = Profilgenerierung konnte nicht gestartet werden.

settings-policies-title = Standardrichtlinien
settings-policies-intro = Immer aktive Intranet-Richtlinien. Jeder Agent in diesem Workspace kann sie jederzeit in einer Unterhaltung auflisten und lesen — keine Agent-spezifische Konfiguration nötig.
settings-policies-empty = Noch keine Standardrichtlinien verknüpft. Klicke auf Richtlinie hinzufügen, um Intranet-Richtlinien zu verknüpfen, die jeder Agent in diesem Workspace lesen kann.
settings-policies-add = Richtlinie hinzufügen
settings-policies-updated = Aktualisiert { $date }
settings-policies-open-title = In neuem Tab öffnen (ID: { $id })
settings-policies-remove-aria = Richtlinie entfernen { $title }
settings-policies-error-load = Standardrichtlinien konnten nicht geladen werden
settings-policies-error-save = Standardrichtlinien konnten nicht gespeichert werden

settings-metrics-title = Nutzung & Metriken
settings-metrics-range-7d = 7 Tage
settings-metrics-range-30d = 30 Tage
settings-metrics-range-all = Gesamt
settings-metrics-total-sessions = Sitzungen gesamt
settings-metrics-tokens = Verwendete Tokens
settings-metrics-cost = Gesch. Kosten
settings-metrics-duration = Ø Dauer
settings-metrics-by-status = Nach Status

settings-skills-title = Enterprise Skills
settings-skills-intro = Skills werden automatisch anhand deiner Aufgabe erkannt. Lege einen Fallback-Skill fest, wenn die automatische Erkennung keine sichere Übereinstimmung findet.
settings-skills-all = Alle
settings-skills-empty = Keine Skills verfügbar
settings-skills-fallback = Fallback
settings-skills-installs = { $count } Installationen
settings-skills-remove-fallback = Als Fallback entfernen
settings-skills-set-fallback = Als Fallback festlegen
settings-skills-install = Skill installieren
settings-skills-collapse = Einklappen
settings-skills-details = Details
settings-skills-setup = { $time } Einrichtung
settings-skills-setup-steps = Einrichtungsschritte

settings-tools-loading = Tools werden geladen...
settings-tools-error-load = Tools konnten nicht geladen werden
settings-tools-empty = Noch keine Tools konfiguriert.
settings-tools-intro = Für Enterprise-Agenten verfügbare Tools, nach Geschäftsbereich gruppiert.
settings-tools-hint = Der fette Name ist, was der Agent sieht; das Monospace-Badge ist die persistierte Skill-Referenz. Der kleine graue „via …“-Hinweis zeigt die Quelle jedes Tools.
settings-tools-search-placeholder = Tools suchen — Name, Beschreibung, Kategorie, Tag…
settings-tools-category = Kategorie
settings-tools-category-all = Alle ({ $count })
settings-tools-no-match = Keine Tools entsprechen den aktuellen Filtern.
settings-tools-via = via { $source }
settings-tools-disabled = Deaktiviert
settings-tools-auth-required = Auth erforderlich
settings-tools-no-auth = Keine Auth erforderlich
settings-tools-hitl = HITL
settings-tools-artifacts = Artefakte
settings-tools-integrations-title = Konfigurierte Tool-Integrationen
settings-tools-builtin = Eingebaut
settings-tools-active = Aktiv
settings-tools-inactive = Inaktiv
settings-tools-toggle-error-disable = { $name } konnte nicht deaktiviert werden
settings-tools-toggle-error-enable = { $name } konnte nicht aktiviert werden

settings-flow-bindings-title = Flow-Begleiter-Bindungen
settings-flow-bindings-desc = Welche Lookup-Tools jeder Schreib-Flow zuerst braucht. Änderungen hier überschreiben die schema-abgeleitete Basis für alle.
settings-flow-bindings-error-load = Flow-Bindungen konnten nicht geladen werden
settings-flow-bindings-error-save = Bindungen für { $flow } konnten nicht gespeichert werden
settings-flow-bindings-source-edited = bearbeitet
settings-flow-bindings-source-override = Code-Override
settings-flow-bindings-self-contained = eigenständig
settings-flow-bindings-no-companions = Keine Begleiter. Einen hinzufügen oder als eigenständig speichern.
settings-flow-bindings-remove-aria = Begleiter entfernen
settings-flow-bindings-reset = Auf generiert zurücksetzen
settings-flow-bindings-clear = Alle löschen
settings-necessity-required = erforderlich
settings-necessity-recommended = empfohlen
settings-necessity-conditional = bedingt

settings-skill-studio-title = Skill Studio
settings-skill-studio-search-placeholder = Skills suchen...
settings-skill-studio-new = Neuer Skill
settings-skill-studio-dismiss = Schließen
settings-skill-studio-empty = Keine Skills gefunden
settings-skill-studio-clear-search = Suche löschen
settings-skill-studio-count = { $shown } von { $total } Skills
settings-skill-studio-active = Aktiv
settings-skill-studio-inactive = Inaktiv
settings-skill-studio-files-count = { $count } Dateien
settings-skill-studio-tools-count = { $count } Tools
settings-skill-studio-edit-title = Skill bearbeiten
settings-skill-studio-new-title = Neuer Skill
settings-skill-studio-field-name = Name
settings-skill-studio-field-name-placeholder = Skill-Name
settings-skill-studio-field-category = Kategorie
settings-skill-studio-field-category-placeholder = z. B. crm, finance, general
settings-skill-studio-field-description = Beschreibung
settings-skill-studio-field-description-placeholder = Kurzbeschreibung
settings-skill-studio-field-tags = Tags (kommagetrennt)
settings-skill-studio-field-tags-placeholder = crm, sales, automation
settings-skill-studio-field-compatibility = Kompatibilität
settings-skill-studio-field-compatibility-placeholder = z. B. prompt-manager>=0.9.0
settings-skill-studio-field-content = Inhalt (Markdown)
settings-skill-studio-field-content-placeholder = # Skill-Anweisungen...
settings-skill-studio-save-changes = Änderungen speichern
settings-skill-studio-create = Skill erstellen
settings-skill-studio-saving = Speichern…
settings-skill-studio-delete-confirm = Skill „{ $name }“ löschen?
settings-skill-studio-category-label = Kategorie: { $category }
settings-skill-studio-label-description = Beschreibung
settings-skill-studio-label-version = Version:
settings-skill-studio-label-status = Status:
settings-skill-studio-label-created-by = Erstellt von:
settings-skill-studio-label-updated-by = Aktualisiert von:
settings-skill-studio-label-content = Inhalt
settings-skill-studio-files-title = Angehängte Dateien
settings-skill-studio-upload = Datei hochladen
settings-skill-studio-uploading = Hochladen…
settings-skill-studio-no-files = Keine Dateien angehängt.
settings-skill-studio-tools-title = Tools
settings-skill-studio-assign-tools = Tools zuweisen
settings-skill-studio-select-tools = Tools auswählen
settings-skill-studio-assign = Zuweisen
settings-skill-studio-no-tools = Keine Tools verfügbar.

settings-action-enable = Aktivieren
settings-action-disable = Deaktivieren
settings-action-loading = Laden…
settings-action-edit = Bearbeiten

# Workspace — rechte Leiste, Live-Vorschau, Sitzungs-Zeitleiste
workspace-panel-close = Arbeitsbereich-Panel schließen
workspace-panel-open = Arbeitsbereich-Panel öffnen
workspace-follow-ups-title = Vorgeschlagene Folgefragen
workspace-follow-ups-dismiss = Vorgeschlagene Folgefragen schließen
workspace-reopen-clarification-show = Optionen anzeigen
workspace-artifact-type-slides = Folien
workspace-artifact-type-document = Dokument
workspace-artifact-type-note = Notiz
workspace-artifact-type-pdf = PDF
workspace-artifact-type-html = HTML-Dashboard
workspace-artifact-type-chart = Diagramm
workspace-retry-preview-with-title = Der vorherige Versuch, { $label } „{ $title }“ zu erstellen, ist fehlgeschlagen. Bitte erneut versuchen.
workspace-retry-preview = Der vorherige Versuch, { $label } zu erstellen, ist fehlgeschlagen. Bitte erneut versuchen.
workspace-session-timeline-title = Sitzungs-Zeitleiste
workspace-session-timeline-latest = Zuletzt { $time }
workspace-session-timeline-event-count = { $count } Ereignisse
workspace-timeline-empty = Sitzungsereignisse erscheinen hier…
workspace-decisions-empty = Agentenentscheidungen erscheinen hier, sobald die Sitzung fortschreitet…
workspace-activity-empty = Tool-Aktivität erscheint hier…
workspace-delegated-task = Arbeitet an einer delegierten Aufgabe
workspace-delegated-to = Delegiert an { $agent }
workspace-delegated-subagent = An Sub-Agent delegiert
workspace-skill-badge = Skill: { $name }
workspace-decision-skill = Skill
workspace-decision-tool-routing = Tool-Routing
workspace-decision-routing = Routing
workspace-decision-reflection = Reflexion
workspace-decision-hitl = Mensch in der Schleife
workspace-decision-human-input = Menschliche Eingabe
workspace-decision-plan = Plan
workspace-decisions-title = Entscheidungen
workspace-decisions-no-branch = Noch keine Verzweigungspunkte
workspace-decisions-branch-singular = { $count } Verzweigungspunkt
workspace-decisions-branch-plural = { $count } Verzweigungspunkte
workspace-plan-waiting = Warten auf Start
workspace-plan-progress = { $done } von { $total } erledigt
workspace-plan-finalizing = Antwort wird finalisiert…
workspace-documents-title = Arbeitsbereich-Dokumente
workspace-artifacts-title = Artefakte
workspace-latest-summary = Neueste: { $name }
workspace-artifact-view = Ansehen
workspace-artifact-download = Herunterladen
workspace-experts-title = Enterprise-Experten
workspace-experts-summary-running = { $running } laufend · { $done } erledigt
workspace-experts-summary-running-failed = { $running } laufend · { $done } erledigt · { $failed } fehlgeschlagen
workspace-experts-summary-done-failed = { $done } erledigt · { $failed } fehlgeschlagen
workspace-experts-summary-done = { $done } erledigt
workspace-expert-default = Enterprise-Experte
workspace-expert-market = Marktforschung
workspace-expert-hr = HR-Betrieb
workspace-expert-compensation = Vergütung
workspace-expert-finance = Finanzen
workspace-expert-workflow = Workflow-Design
workspace-expert-writing = Schreiben
workspace-expert-data = Datenanalyse
workspace-expert-it = IT-Support
workspace-debug-trace-title = Debug-Trace (nur Dev)
workspace-debug-trace-failed-load = Trace konnte nicht geladen werden
workspace-debug-trace-loading = Trace wird geladen…
workspace-debug-trace-no-steps = Noch keine Trace-Schritte
workspace-debug-trace-step-singular = { $count } Trace-Schritt
workspace-debug-trace-step-plural = { $count } Trace-Schritte
workspace-debug-trace-loading-detail = Debug-Trace wird geladen...
workspace-debug-filter-all = alle
workspace-debug-filter-decisions = Entscheidungen
workspace-debug-filter-tools = Tools
workspace-debug-filter-hitl = hitl
workspace-debug-filter-errors = Fehler
workspace-debug-filter-artifacts = Artefakte
workspace-debug-refresh = Aktualisieren
workspace-debug-refreshing = Wird aktualisiert…
workspace-debug-export = Exportieren
workspace-debug-analyzing = Analysiere...
workspace-debug-explanation-cached = Erklärung (zwischengespeichert)
workspace-debug-explanation-ready = Erklärung bereit
workspace-debug-analyze-failed = Analyse fehlgeschlagen
workspace-debug-explain-session = Sitzung erklären
workspace-debug-copied = Kopiert!
workspace-debug-copy-failed = Kopieren fehlgeschlagen
workspace-debug-copy-context = Debug-Kontext kopieren
workspace-debug-ai-analysis = KI-Analyse
workspace-debug-rerun = Erneut ausführen
workspace-debug-cached-at = zwischengespeichert { $time }
workspace-debug-root-cause = Ursache
workspace-debug-affected-layer = Betroffene Ebene
workspace-debug-evidence = Belege
workspace-debug-code-locations = Code-Stellen
workspace-debug-suggested-fix = Vorgeschlagene Lösung
workspace-debug-test-command = Testbefehl
workspace-debug-analyzer-disabled = KI-Analysator deaktiviert. Setzen Sie DEEP_AGENT_AI_ANALYZER_ENABLED=true auf prompt-manager.
workspace-debug-analyzer-error = Analysatorfehler: { $message }
workspace-debug-slow-phases = Langsame Phasen
workspace-debug-failed-tools = Fehlgeschlagene Tools
workspace-debug-repeated-tools = Wiederholte Tool-Aufrufe
workspace-debug-langsmith-project = LangSmith-Projekt
workspace-debug-langsmith-open = öffnen
workspace-debug-status-unknown = unbekannt
workspace-debug-parallel = parallel
workspace-debug-shortlist = Shortlist ({ $count })
workspace-case-title = Fall
workspace-case-steps = { $completed }/{ $total } Schritte
workspace-case-all-closed = Alle Fälle geschlossen
workspace-case-owner = Verantwortlich
workspace-case-due = Fällig
workspace-case-open-workflow = Workflow öffnen
workspace-case-partial = Teilweise
workspace-status-skipped = Übersprungen
workspace-clarification-aria = Agenten-Rückfrage
workspace-clarification-dismiss = Schließen
workspace-clarification-custom = Eigene Antwort schreiben
workspace-clarification-enter-hint = Enter zum Senden
workspace-clarification-placeholder = Antwort eingeben und Enter drücken…
workspace-clarification-keyboard-hint = Enter zum Senden, Umschalt+Enter für Zeilenumbruch
workspace-clarification-send = Senden
workspace-fallback-yes = Ja
workspace-fallback-no = Nein
workspace-live-preview-title = Live-Vorschau
workspace-chart-unavailable = Diagrammdaten nicht verfügbar
workspace-html-path-unavailable = HTML-Artefaktpfad nicht verfügbar.
workspace-pdf-preview-failed = PDF-Vorschau fehlgeschlagen: { $error }
workspace-pdf-reference-missing = PDF-Referenz fehlt.
workspace-pdf-loading = PDF wird geladen…
workspace-pdf-attached = { $fileName } · an diese Sitzung angehängt
workspace-pdf-download = PDF herunterladen
workspace-preview-collapse = Vorschau einklappen
workspace-preview-expand = Vorschau erweitern
workspace-generating-label = { $label } wird erstellt...
workspace-transforming-layout = Wird in visuelles Layout umgewandelt...
workspace-generating-content = Inhalt wird erstellt...
workspace-slides-preparing = { $count } Folien - Layout wird vorbereitet...
workspace-slides-generating = { $count } Folien - werden erstellt...
workspace-error-slides = Folien konnten nicht fertiggestellt werden
workspace-error-document = Dokument konnte nicht fertiggestellt werden
workspace-error-note = Notiz konnte nicht fertiggestellt werden
workspace-error-chart = Diagramm konnte nicht fertiggestellt werden
workspace-error-html = Seite konnte nicht fertiggestellt werden
workspace-error-pdf = PDF konnte nicht fertiggestellt werden
workspace-error-generic = Konnte nicht fertiggestellt werden
workspace-error-body = Beim Erstellen ist etwas schiefgelaufen. Versuchen Sie es in einem Moment erneut.
workspace-try-again = Erneut versuchen
workspace-hide-technical = Technische Details ausblenden
workspace-show-technical = Technische Details anzeigen
workspace-hide-grid = Raster ausblenden
workspace-show-all = Alle anzeigen
workspace-prev-slide = Vorherige Folie
workspace-next-slide = Nächste Folie
workspace-draft-review = Entwurf - Vor dem Speichern prüfen
workspace-draft-delete = Löschen
workspace-draft-discard = Verwerfen
workspace-draft-save-failed = Speichern fehlgeschlagen
workspace-draft-retry = Erneut versuchen
workspace-draft-done = Fertig
workspace-draft-discard-delete = Entwurf aus Dokumenten löschen
workspace-draft-discard-dismiss = Vorschau schließen
workspace-document-generating = Wird erstellt
workspace-document-saved-badge = In Dokumenten gespeichert
workspace-document-badge = Dokument
workspace-canvas-copy = Kopieren
workspace-canvas-open-documents = In Dokumenten öffnen
workspace-canvas-open-tooltip = Bearbeitungen nach dem ersten Speichern müssen in der Dokumenten-App erfolgen
workspace-canvas-saved = Gespeichert
workspace-canvas-save-failed = Fehlgeschlagen
workspace-canvas-persisted-banner = In Dokumenten gespeichert. Öffnen Sie das Dokument für weitere Bearbeitung mit Echtzeit-Zusammenarbeit.
workspace-canvas-generating-doc = Dokument wird erstellt...
workspace-canvas-no-content = Kein Inhalt
workspace-canvas-writing = Schreibt...
workspace-canvas-edit-hint = Inhalt anklicken zum Bearbeiten
workspace-artifact-viewer-aria = Artefakt-Viewer
workspace-artifact-load-failed = Laden fehlgeschlagen: { $error }
workspace-artifact-download-instead = Stattdessen herunterladen
workspace-skill-auto = auto
workspace-skill-auto-tooltip = Automatisch anhand Ihrer Aufgabe erkannt
workspace-skill-version-loaded = v{ $version } geladen
workspace-skill-version-draft = v{ $version } geladen (Entwurf ist v{ $draft })
workspace-connector-connected = Verbunden: { $names }
workspace-connector-more = +{ $count } weitere
workspace-avatar-unknown = Unbekannt
workspace-avatar-employee = Mitarbeiter-Avatar
workspace-task-no-plan = Noch kein Plan
workspace-task-steps-pending = Schritte erscheinen, sobald der Agent startet
workspace-step-aria = Schritt { $number }: { $label }. { $status }
workspace-collaboration-title = Agenten-Zusammenarbeit
workspace-collaboration-tree-view = Baumansicht
workspace-collaboration-timeline-view = Zeitleistenansicht
workspace-collaboration-done = { $count } erledigt
workspace-collaboration-running = { $count } laufend
workspace-collaboration-failed = { $count } fehlgeschlagen
workspace-chart-empty = Keine Diagrammdaten verfügbar
workspace-chart-other = Sonstige
workspace-chart-total = Gesamt
workspace-chart-no-data-points = Keine Datenpunkte für dieses Diagramm.
workspace-chart-unsupported-preview = Nicht unterstützte oder leere Diagrammvorschau.
workspace-timeline-tool = Tool
workspace-presentation-type = Präsentation
# Agents (phase2-rest)
agents-toolbar-subtitle = Erstelle Agenten, konfiguriere ihre Fähigkeiten und wähle, wo sie laufen.
agents-create-button = Agent oder Worker erstellen
agents-search-placeholder = Aktive und archivierte Agenten suchen...
agents-confirm-label = Confirm
agents-cancel-label = Cancel
agents-workforce-empty-goto = Go to Deployment
agents-worker-empty = No configuration available.
agents-badge-assistant = Assistant
agents-badge-worker = Worker
agents-badge-worker-paused = Worker paused
agents-card-select-aria = Select { $name }
agents-card-skills-count = { $count } skills
agents-card-tools-count = { $count } tools in skills
agents-card-no-description = No description available.
agents-card-worker-id = Worker ID
agents-card-descriptor-worker = Governed worker
agents-card-descriptor-agent = Configurable agent
agents-readiness-needs-setup = Needs setup
agents-card-action-configure = Configure
agents-card-action-continue-setup = Continue setup
agents-card-no-skills = No skills assigned
agents-card-more-skills = +{ $count } more
agents-card-archiving = Archiving...
agents-card-archive = Archive
agents-config-studio-setup = Studio setup
agents-config-progress = { $completed } of { $total } steps complete
agents-config-continue = Continue: { $step }
agents-config-tab-profile = Profile
agents-config-tab-capabilities = Capabilities
agents-config-tab-deployment = Deployment
agents-config-tab-passport = Passport
agents-config-tab-activation = Activation
agents-config-error-load-skills = Failed to load skills
agents-config-error-load-details = Failed to load agent details
agents-config-error-persist-skills = Failed to persist skills
agents-config-error-save-system-prompt = Failed to save system prompt
agents-config-error-save-details = Failed to save details
agents-config-error-generate-avatar = Failed to generate avatar
agents-config-error-remove-avatar = Failed to remove avatar
agents-config-error-description-thin = Description is too thin — add at least { $min } characters describing what the agent does. It is how the agent gets discovered and chosen.
agents-config-error-system-prompt-short = System prompt is too short — add at least { $min } characters describing the agent's identity, capabilities, and constraints.
agents-save-saving = Saving…
agents-save-saved = Saved
agents-avatar-alt = { $label } avatar
agents-avatar-generating = Generating…
agents-avatar-regenerate = Regenerate
agents-avatar-generate = Generate avatar
agents-avatar-removing = Removing…
agents-avatar-remove = Remove avatar
agents-compliance-title-pass = Meets the Agent Authoring Standard
agents-compliance-title-warn = Almost there — a few improvements recommended
agents-compliance-title-fail = This agent is incomplete and may not work
agents-compliance-checks-count = { $done }/{ $total } checks
agents-description-chip-min-chars = At least { $min } characters
agents-description-chip-not-just-name = More than the name
agents-description-chip-specific = Specific
agents-description-required = A real description is required — it's how this agent gets discovered and chosen.
agents-char-count-min = { $count } chars (min { $min })
agents-system-prompt-chip-identity = Identity ("You are …")
agents-system-prompt-chip-constraints = Constraints (MUST / NEVER)
agents-system-prompt-chip-substantial = Enough detail
agents-system-prompt-reset = Reset
agents-system-prompt-save = Save System Prompt
agents-system-prompt-unavailable = System prompt editing is unavailable for this agent record.
agents-skill-builtin-badge = Built-in
agents-create-title = Create agent
agents-create-subtitle = Define the agent once, then choose where it runs.
agents-create-setup-title = Create setup
agents-create-steps-ready = { $completed } of { $total } steps ready
agents-create-continue = Continue: { $step }
agents-create-optional = Optional
agents-create-optional-worker = Optional until Worker deployment is selected
agents-create-step-profile = Profile
agents-create-step-capabilities = Capabilities
agents-create-step-deployment = Deployment
agents-create-step-passport = Passport
agents-create-step-activation = Activation
agents-create-submit = Create agent
agents-create-submitting = Creating…
agents-create-loading-setup = Loading setup…
agents-create-submit-worker = Create agent or worker
agents-create-open-studio = Need more configuration? Open Enterprise Agent Studio
agents-create-tool-hint = Is this really an agent? If it's a single action like creating a chart, asset, or visualization, build a tool, not an agent. Agents own a domain and make judgments (e.g. "HR Expert").
agents-create-field-name = Agent name
agents-create-field-specialty = Specialty
agents-create-field-description = Description
agents-create-field-visibility = Visibility
agents-create-field-instructions = Instructions
agents-create-field-instructions-system = (system prompt)
agents-create-use-template = Use template
agents-create-visibility-workspace = Workspace — anyone in this workspace
agents-create-visibility-private = Private — only me
agents-create-workforce-toggle = Activate as a Worker
agents-create-workforce-toggle-desc = Creates the same agent with a paused Worker deployment so Passport and Activation can be completed before it runs.
agents-create-field-role = Role
agents-create-field-department = Department
agents-create-field-autonomy = Autonomy
agents-create-passport-skip = Skip this step unless the agent needs Worker identity, ownership, governance, and runtime controls.
agents-create-activation-paused = The Worker deployment is created paused. Finish Passport and Activation in Studio before it runs.
agents-create-activation-no-worker = No Worker runtime will be created. You can activate this agent as a Worker later from Studio.
agents-create-loading-defaults = Loading workspace and model defaults…
agents-create-creating-in = Creating in { $workspace }.
agents-create-no-defaults = Could not find a valid workspace/model. Open Enterprise Agent Studio to configure defaults.
agents-create-error-load-defaults = Failed to load workspace/model defaults.
agents-create-error-create = Failed to create agent. Please try again.
agents-create-profile-desc = Name the agent, describe its domain, and decide who can use it.
agents-create-capabilities-desc = Give the agent instructions and optional policies. Skills can be refined later in Studio.
agents-create-deployment-desc = Every agent can be configured in Studio. Add Worker deployment only when it needs governed runtime.
agents-create-passport-desc = Only needed when this agent should run as a governed Worker.
agents-create-activation-desc = Choose the Worker runtime posture. New Workers start paused for review.
agents-create-description-helper = This is the single biggest factor in whether your agent gets picked for a task. Describe what it does using the words people will actually type.
agents-create-description-example-label = Example:
agents-create-stored-as = Stored as
agents-create-identifier-hint = letters, digits and underscores only.
agents-create-identifier-auto = Letters, digits, and spaces are fine — we automatically convert it to an identifier.
agents-create-name-hint = A clear, human name. We derive the internal identifier automatically.
agents-create-specialty-hint = What domain or function does this agent own? Used for discovery and routing.
agents-create-policies-title = Company policies
agents-create-policies-optional = Optional
agents-create-policies-selected = { $count } selected
agents-create-policies-search = Search EveryPages policies…
agents-create-policies-loading = Loading policies…
agents-create-policies-load-error = Couldn't load policies. You can still create the agent and attach them later.
agents-create-policies-empty-search = No policies match your search.
agents-create-policies-empty = No company policies published yet.
agents-create-policy-untitled = Untitled policy
agents-create-description-check-min = At least { $min } characters
agents-create-description-check-not-name = More than just the name
agents-create-description-check-specific = Specific (uses real domain words)
agents-create-description-required = A real description is required — it's how this agent gets discovered and chosen.
agents-create-prompt-check-identity = Declares identity ("You are …")
agents-create-prompt-check-constraints = States hard rules (MUST / NEVER / Refuse)
agents-create-prompt-check-structure = Has structure (capabilities, constraints, output)
agents-create-prompt-check-substantial = Substantial enough (not a one-liner)
agents-create-prompt-required = A real system prompt is required (at least { $min } characters). Use the template to start.
agents-autonomy-draft-only = Assistive — drafts and recommends, makes no system changes
agents-autonomy-approval-required = Approval Required — prepares actions, routes to a human first
agents-autonomy-auto-low-risk = Delegated — acts on low-risk steps, escalates exceptions
agents-autonomy-full-auto = Autonomous — runs end-to-end within validated boundaries
agents-deployments-title = Deployments
agents-deployments-description = Choose where this agent runs. Assistant is always available; Worker adds governed runtime.
agents-deploy-assistant-title = Assistant
agents-deploy-assistant-status = Available
agents-deploy-worker-title = Worker
agents-deploy-worker-status-off = Off
agents-deploy-worker-status-paused = Paused
agents-deploy-worker-status-active = Active
agents-deploy-activate-button = Activate as Worker
agents-deploy-configure-note = Configure Passport and Activation after deploying.
agents-deploy-success-note = Worker deployment added. It starts paused for review.
agents-deploy-instructions-hint = Optional operating instructions specific to the Worker runtime.
agents-deploy-activating = Activating…
agents-deploy-error-role-required = Role is required to activate a Worker deployment.
agents-deploy-error-failed = Failed to activate Worker deployment.
agents-passport-empty-title = Not a Worker yet
agents-passport-empty-desc = Activate this agent as a Worker to give it a role, an owner, and governance.
agents-passport-empty-label = No Passport configuration available.
agents-activation-empty-title = No Worker runtime yet
agents-activation-empty-desc = Activate this agent as a Worker in Deployment before configuring autonomy, triggers, and live activity.
agents-activation-empty-label = No runtime configuration available.
agents-skill-search-placeholder = Search skills…
agents-skill-search-empty-query = No matching skills found.
agents-skill-search-all-assigned = All skills are already assigned.
agents-skill-save-changes = Save Changes
agents-tags-placeholder = Comma-separated, e.g. support, tickets, internal-ops
agents-policies-title = Policies
agents-policies-description = Attach intranet policies this agent can read at run time.
agents-policies-empty = No policies attached.
agents-policies-workspace-default = Workspace Default
agents-policies-exclude-aria = Exclude default policy
agents-policies-remove-aria = Remove policy
agents-policies-add = Add Policy
agents-policies-modal-title = Attach Intranet Policy to Agent
agents-policies-modal-close-aria = Close dialog
agents-policies-modal-search = Search policies by title…
agents-policies-modal-loading = Loading policies…
agents-policies-modal-error = Failed to load policies.
agents-policies-modal-retry = Retry
agents-policies-modal-empty-search = No policies match your search.
agents-policies-modal-empty = No policies found.
agents-policies-modal-publish-hint = Publish policies in EveryPages to attach them here.
agents-policies-modal-updated = Updated { $date }
agents-policies-modal-open-title = Open policy in new tab
agents-policies-modal-page = Page { $page } of { $total } ({ $count } total)
agents-policies-modal-previous = Previous
agents-policies-modal-next = Next
agents-policies-modal-selected = { $count } selected
agents-policies-modal-apply = Apply
agents-skill-picker-title = Assign Skills
agents-skill-picker-empty = No enabled skills available to assign.
agents-skill-picker-builtin = Built-in
agents-skill-picker-pub-version = pub v{ $version }
agents-skill-picker-runtime-version = Runtime version
agents-skill-picker-latest-published = Latest published
agents-skill-picker-pin = Pin v{ $version }
agents-skill-picker-pin-unavailable = Pin v{ $version } unavailable
agents-skill-picker-selected-count = { $count } skill(s) selected
agents-skill-picker-save = Save

# Skills (phase2-rest)
skills-browse-upload = Upload Skill
skills-browse-create = Create Skill
skills-browse-search = Skills suchen…
skills-browse-loading = Loading…
skills-browse-no-match = No matching skills
skills-browse-empty = No skills found
skills-browse-status-draft = Draft
skills-browse-status-builtin = Built-in
skills-browse-status-archived = Archived
skills-browse-status-inactive = Inactive
skills-browse-status-enabled = Enabled
skills-browse-default-badge = (default)
skills-browse-pub-version = pub v{ $version }
skills-browse-unpublished = unpublished
skills-browse-draft-version = draft v{ $version }
skills-browse-tools-in-skill = Tools in Skill:
skills-browse-files = Files
skills-browse-hide-files = Hide files
skills-browse-export = Export
skills-browse-runtime-skill = Runtime skill
skills-browse-enable = Enable
skills-browse-disable = Disable
skills-browse-archive = Archive
skills-browse-archived-title = Archived Skills
skills-browse-archived-loading = Loading archived…
skills-browse-archived-empty = No archived skills
skills-browse-restore = Restore
skills-editor-select-skill = Select a skill to edit
skills-editor-pick-skill = Pick a skill from the list or create a new one.
skills-editor-edit-title = Edit { $id }
skills-editor-unsaved = Unsaved
skills-editor-clear-selection-aria = Clear selection
skills-editor-skill-md = SKILL.md
skills-editor-tools = Tools
skills-editor-add-tool = Add Tool to Skill
skills-editor-attach-files = Attach files…
skills-editor-revert = Revert
skills-editor-publish = Publish v{ $version }
skills-editor-save-draft = Save draft
skills-editor-saving = Saving…
skills-create-title = Create new skill
skills-create-cancel-aria = Cancel creation
skills-create-name = Skill name
skills-create-description = Description
skills-create-instructions = Instructions
skills-create-will-save-as = Will be saved as
skills-create-tools = Tools
skills-create-add-tool = Add Tool to Skill
skills-create-attach-files = Attach files…
skills-create-cancel = Cancel
skills-create-submit = Create
skills-create-creating = Creating…
skills-add-tools-title = Add Tool to Skill
skills-add-tools-search = Search tools…
skills-add-tools-category = Category
skills-add-tools-all = All ({ $count })
skills-add-tools-loading = Loading tools…
skills-add-tools-retry = Retry
skills-add-tools-select-all = Select all
skills-add-tools-deselect-all = Deselect all
skills-add-tools-via = via { $source }
skills-add-tools-hitl = HITL
skills-add-tools-artifacts = Artifacts
skills-add-tools-disabled = Disabled
skills-add-tools-preview-schema = Preview schema
skills-add-tools-cancel = Cancel
skills-add-tools-add = Add
skills-add-tools-preview-select = Select a tool to preview its schema and parameters.
skills-add-tools-what-it-does = What it does
skills-add-tools-parameters = Parameters
skills-add-tools-show-raw = Show raw JSON
skills-add-tools-show-readable = Show readable
skills-add-tools-loading-params = Loading parameters…
skills-add-tools-no-params = No input parameters
skills-add-tools-no-auth = No auth required
skills-add-tools-auth-required = Auth required
skills-tool-companions-title = Works with
skills-tool-companions-add-all = Add all ({ $count })
skills-tool-companions-required = Required
skills-tool-companions-recommended = Recommended
skills-tool-companions-if-needed = If needed
skills-tool-companions-open-details = Open tool details
skills-tool-companions-added = Added
skills-tool-companions-add = Add
skills-version-history-title = Version history
skills-version-draft = Draft v{ $version }
skills-version-published = Published v{ $version }
skills-version-unpublished = Unpublished
skills-version-live = Live
skills-version-loading = Loading versions…
skills-version-empty = No versions yet
skills-version-restore = Restore
skills-version-publish = Publish
skills-browse-loading-files = Dateien werden geladen…
skills-browse-no-aux-files = Noch keine Zusatzdateien.
skills-browse-add-files = Dateien hinzufügen
skills-tool-companions-hint = Diese Tools hinzufügen, damit der Agent IDs/Werte vor der Aktion auflösen kann.
agents-skill-picker-error-load = Skill-Daten konnten nicht geladen werden
agents-skill-picker-error-pin = Angeheftete Version für { $skillId } ist nicht veröffentlicht. Wählen Sie „Zuletzt veröffentlicht“ oder eine veröffentlichte Version.
agents-skill-picker-error-save = Skill-Zuweisungen konnten nicht gespeichert werden
skills-source-functions = Tools
skills-source-native = Nativ
skills-source-flowbot = FlowBot
skills-source-mcp = MCP
skills-source-builtin = Integriert
skills-category-hr = HR & Mitarbeitende
skills-category-crm = CRM
skills-category-irm = Investments
skills-category-office = Office & Intranet
skills-category-flow = Flows & Automatisierungen
skills-category-flowbot-actions = Business-Aktionen
skills-category-expert = Experten
skills-category-create-expert = Experten erstellen
skills-category-documents = Dokumente
skills-category-knowledge = Wissen
skills-category-email = E-Mail
skills-category-meeting = Meetings
skills-category-calendar = Kalender
skills-category-analytics = Analysen
skills-category-commerce = Commerce
skills-category-service = Service Desk
skills-category-charts = Diagramme
skills-category-web = Web
skills-category-mcp = MCP-Connectors
skills-category-structured-connectors = Strukturierte Daten
skills-category-unstructured-connectors = Unstrukturierte Daten
skills-category-control = Kontrolle & Freigabe
skills-category-memory = Memory
skills-category-session-documents = Sitzungsdokumente
skills-category-policies = Richtlinien
skills-category-graphql = GraphQL (erweitert)
skills-category-uncategorized = Sonstiges

# Memory lens (phase2-rest)
memory-lens-back-aria = Back to workspace
memory-lens-title = Was wir über dich wissen
memory-lens-dev-badge = dev
memory-lens-subtitle = Alles, was der Agent über dich speichert — Profil, Präferenzen, Fakten, Muster und Tagebuch.
memory-lens-refresh = Refresh
memory-lens-tab-overview = Overview
memory-lens-tab-diary = Diary
memory-lens-tab-topics = Topics
memory-lens-tab-people = People & things
memory-lens-tab-graph = Mind map
memory-lens-profile-title = Profile brief
memory-lens-profile-subtitle = The agent's natural-language summary of who you are.
memory-lens-profile-status-ready = Ready
memory-lens-profile-status-edited = Edited
memory-lens-profile-status-generating = Generating
memory-lens-profile-status-failed = Failed
memory-lens-profile-status-missing = Not generated
memory-lens-profile-regenerating = Regenerating
memory-lens-profile-regenerate = Regenerate
memory-lens-profile-empty = No profile brief yet. It is generated from your workspace facts and recent sessions — use Regenerate to build one.
memory-lens-profile-model = Model: { $model }
memory-lens-profile-updated = Updated { $date }
memory-lens-profile-source-facts = Source facts
memory-lens-browser-title = Memories
memory-lens-browser-search = Semantic search across all memory...
memory-lens-browser-all = All
memory-lens-browser-topic-clear = clear
memory-lens-browser-empty-filters = No memories match the current filters.
memory-lens-entry-salience = Salience { $score }
memory-lens-entry-score = Score { $score }
memory-lens-entry-delete-aria = Delete memory: { $title }
memory-lens-detail-select = Select an entry to read its full content.
memory-lens-detail-delete-aria = Delete memory
memory-lens-diary-all-month = All of this month
memory-lens-diary-count = { $count } { $count ->
    [one] memory
   *[other] memories
}
memory-lens-diary-clear = Clear
memory-lens-diary-empty = No memories recorded for this day.
memory-lens-diary-no-date = No date
memory-lens-calendar-prev-aria = Previous month
memory-lens-calendar-next-aria = Next month
memory-lens-facet-empty-topic = No topics yet. Memories gain topics as the agent learns about you.
memory-lens-facet-empty-entity = No people or things yet.
memory-lens-facet-search-topic = Search topics…
memory-lens-facet-search-entity = Search people & things…
memory-lens-facet-no-match = No matches.
memory-lens-facet-count = { $count } { $unit }(s)
memory-lens-references-open = Open
memory-lens-graph-loading = Mapping your memory…
memory-lens-graph-empty-title = Nothing to map yet
memory-lens-graph-empty-desc = Memories will appear here once the agent has learned enough to connect topics, people, and facts.
memory-lens-graph-click-explore = Click a node to explore connections.
memory-lens-graph-controls-search = Search graph…
memory-lens-graph-controls-clear-aria = Clear search
memory-lens-graph-controls-fit-aria = Fit graph to view
memory-lens-graph-controls-searching = Searching…
memory-lens-graph-controls-matches = { $count } { $count ->
    [one] match
   *[other] matches
}
memory-lens-graph-legend-topics = Topics
memory-lens-graph-legend-entities = People & things
memory-lens-graph-legend-memories = Memories
memory-lens-graph-detail-salience-critical = Critical
memory-lens-graph-detail-salience-important = Important
memory-lens-graph-detail-salience-notable = Notable
memory-lens-graph-detail-salience-routine = Routine
memory-lens-graph-detail-entities = People & things
memory-lens-graph-detail-topics = Topics
memory-lens-graph-detail-topic = Topic
memory-lens-graph-detail-person = Person
memory-lens-graph-detail-thing = thing
memory-lens-graph-detail-memories-count = { $count } memories
memory-lens-graph-detail-connected = Connected memories
memory-lens-graph-detail-load-more = Load more memories
memory-lens-graph-detail-loading = Loading…
memory-lens-graph-detail-hub-empty = Select a node to see its connected memories.
memory-lens-graph-detail-close-aria = Close details
memory-lens-stat-total = Total memories
memory-lens-stat-total-desc = Across all namespaces
memory-lens-stat-salience = High salience
memory-lens-stat-salience-desc = Importance 7+
memory-lens-stat-updated = Last updated
memory-lens-stat-updated-none = No activity
memory-lens-insights-topics = Top topics
memory-lens-insights-entities = Top entities
memory-lens-insights-salience = Salience
memory-lens-insights-topics-empty = Topics emerge as the agent learns about you.
memory-lens-insights-entities-empty = People and things appear from your memories.
memory-lens-salience-critical = Critical
memory-lens-salience-high = High
memory-lens-salience-medium = Medium
memory-lens-salience-low = Low

# Trace lens (phase2-rest)
trace-lens-back-aria = Back to workspace
trace-lens-title = Trace Lens
trace-lens-subtitle = LangSmith-Debugger — Tools, Sub-Agenten, Experten, Skills und Entscheidungen in Ausführungsreihenfolge.
trace-lens-refresh = Refresh
trace-lens-copied = Copied
trace-lens-copy-cursor = Copy for Cursor
trace-lens-copy = Copy
trace-lens-workforce = Workforce
trace-lens-workforce-source = Workforce · { $source }
trace-lens-stat-ttft = TTFT
trace-lens-stat-duration = Duration
trace-lens-stat-tools = Tools
trace-lens-stat-subagents = Sub-agents
trace-lens-stat-experts = Experts
trace-lens-stat-skills = Skills
trace-lens-stat-decisions = Decisions
trace-lens-stat-llm-calls = LLM calls
trace-lens-stat-avg-llm = Avg LLM
trace-lens-stat-human-wait = Human wait
trace-lens-stat-failed = Failed
trace-lens-stat-tokens = Tokens
trace-lens-stat-cost = Cost
trace-lens-filter-placeholder = Filter steps…
trace-lens-show-events = Show events
trace-lens-steps-count = { $count } steps
trace-lens-select-run = Select a run to inspect its trace.
trace-lens-loading = Loading trace…
trace-lens-retry = Retry
trace-lens-runs-title = Runs
trace-lens-runs-filter-all = All
trace-lens-runs-filter-chat = Chat
trace-lens-runs-filter-workforce = Workforce
trace-lens-runs-source-manual = Manual
trace-lens-runs-source-schedule = Schedule
trace-lens-runs-source-webhook = Webhook
trace-lens-runs-source-email = Email
trace-lens-runs-no-input = (no input)
trace-lens-runs-empty = No runs found.
trace-lens-runs-time-just-now = just now
trace-lens-runs-time-minutes = { $count }m ago
trace-lens-runs-time-hours = { $count }h ago
trace-lens-runs-time-days = { $count }d ago
trace-lens-span-select = Select a step to inspect its input, output, and timing.
trace-lens-span-input = Input
trace-lens-span-output = Output
trace-lens-span-details = Details
trace-lens-span-seq = seq #{ $seq }
trace-lens-span-start = start +{ $ms }
trace-lens-span-duration = duration { $ms }
trace-lens-llm-latency = Latency
trace-lens-llm-prompt = Prompt
trace-lens-llm-completion = Completion
trace-lens-llm-cached = Cached
trace-lens-llm-cache-hit = Cache hit
trace-lens-llm-cost = Cost
trace-lens-llm-stage = Stage
trace-lens-llm-finish = Finish
trace-lens-detail-yes = Yes
trace-lens-detail-no = No
trace-lens-detail-none = None
trace-lens-span-kind-tool = Tool
trace-lens-span-kind-thinking = Thinking
trace-lens-span-kind-subagent = Sub-agent
trace-lens-span-kind-expert = Expert
trace-lens-span-kind-skill = Skill
trace-lens-span-kind-decision = Decision
trace-lens-span-kind-routing = Routing
trace-lens-span-kind-hitl = Human-in-the-loop
trace-lens-span-kind-wait = Waiting
trace-lens-span-kind-approval = Approval
trace-lens-span-kind-capability-missing = Capability gap
trace-lens-span-kind-artifact = Artifact
trace-lens-span-kind-pack = Execution pack
trace-lens-span-kind-cost = Cost
trace-lens-span-kind-llm = LLM call
trace-lens-span-kind-workforce = Workforce
trace-lens-span-kind-status = Status
trace-lens-span-kind-message = Message
trace-lens-span-kind-terminal = Terminal
trace-lens-span-kind-error = Error
# Agent mesh (phase2-rest)
agent-mesh-scope-company = Unternehmen
agent-mesh-scope-user = Benutzersitzungen
agent-mesh-scope-me = Meine Sitzungen
agent-mesh-scope-session = Aktuelle Sitzung
agent-mesh-scope-desc-company = Alle Sitzungen im Arbeitsbereich
agent-mesh-scope-desc-user = Sitzungen für einen ausgewählten Benutzer
agent-mesh-scope-desc-me = Alle deine Sitzungen
agent-mesh-scope-desc-session = Live- oder Wiedergabeansicht der Sitzung
agent-mesh-scope-title-company = Unternehmens-{ -platform-ai-agent-network.label }
agent-mesh-scope-title-user = Benutzer-{ -platform-ai-agent-network.label }
agent-mesh-scope-title-user-named = { -platform-ai-agent-network.label } für { $name }
agent-mesh-scope-title-me = Mein { -platform-ai-agent-network.label }
agent-mesh-scope-title-session = Sitzungs-{ -platform-ai-agent-network.label }
agent-mesh-scope-subtitle-company = Alle { -platform-ai-agent-product.inline-plural }, Skills und Tools im Arbeitsbereich
agent-mesh-scope-subtitle-user = { -platform-ai-agent-product.inline-plural }, Skills und Tools dieses Benutzers
agent-mesh-scope-subtitle-me = { -platform-ai-agent-product.inline-plural }, Skills und Tools in deinen Sitzungen
agent-mesh-scope-subtitle-session = Wie deine { -platform-ai-agent-product.inline-plural } verbunden sind · Entscheidung zur Antwort nachvollziehen
agent-mesh-empty-title = Keine Sitzung ausgewählt
agent-mesh-empty-desc = Öffne oder starte eine Every-Fabric-Sitzung, um das live { -platform-ai-agent-network.label } zu sehen — { -platform-ai-agent-product.inline-plural }, Skills und Tools, verbunden durch Nachrichten.
agent-mesh-back-landing = Zurück zur Startseite
agent-mesh-loading-trace = Sitzungsspuren werden geladen…
agent-mesh-decision-default-title = Sitzungs-Entscheidungssimulation
agent-mesh-loading-data = Mesh-Daten werden geladen…
agent-mesh-error-load = Mesh-Daten konnten nicht geladen werden
agent-mesh-empty-activity-title = Noch keine Aktivität
agent-mesh-empty-activity-company = Im Arbeitsbereich wurden noch keine Sitzungen aufgezeichnet.
agent-mesh-empty-activity-scope = Für diesen Bereich wurden keine Sitzungen gefunden.
agent-mesh-view-graph = Graph
agent-mesh-view-cards = Karten
agent-mesh-layer-agents = { -platform-ai-agent-product.label-plural }
agent-mesh-layer-skills = Skills
agent-mesh-layer-tools = Tools & Connectors
agent-mesh-layers-title = Ebenen
agent-mesh-layers-edge-labels = Kantenbeschriftungen
agent-mesh-status-online = { $agents } { $agents ->
    [one] Agent
   *[other] Agents
} online · { $tools } { $tools ->
    [one] Tool
   *[other] Tools
} erreichbar
agent-mesh-breadcrumb-nav-aria = Mesh-Navigation
agent-mesh-breadcrumb-user-fallback = Benutzer { $id }…
agent-mesh-breadcrumb-session-fallback = Sitzung { $id }…
agent-mesh-back-previous = Zurück zur vorherigen Mesh-Ansicht
agent-mesh-back-workspace = Zurück zum Arbeitsbereich
agent-mesh-back-shortcut = Zurück (Rücktaste)
agent-mesh-back-previous-view = Zurück zur vorherigen Ansicht
agent-mesh-trace-explorer = Trace Explorer
agent-mesh-view-changed = Ansicht geändert zu { $title }
agent-mesh-fullscreen-enter = Vollbild aktivieren
agent-mesh-fullscreen-exit = Vollbild beenden
agent-mesh-fullscreen-shortcut-esc = { $label } (F oder Esc)
agent-mesh-fullscreen-shortcut = { $label } (F)
agent-mesh-scope-aria = Mesh-Bereich
agent-mesh-layers-aria = Mesh-Ebenen
agent-mesh-search-placeholder = Agents, Skills, Tools suchen…
agent-mesh-search-aria = Mesh-Knoten suchen
agent-mesh-search-clear = Suche löschen
agent-mesh-search-no-matches = Keine Treffer für „{ $query }“
agent-mesh-node-orchestrator = Orchestrator
agent-mesh-node-agent = { -platform-ai-agent-product.inline }
agent-mesh-node-skill = Skill
agent-mesh-node-tool = Tool
agent-mesh-view-2d = Zur 2D-Ansicht wechseln
agent-mesh-view-3d = Zur 3D-Ansicht wechseln
agent-mesh-toggle-layers = Ebenenpanel umschalten
agent-mesh-live-hud-title = Live-Aktivität in diesem Mesh
agent-mesh-live-hud-sessions = { $count } live
agent-mesh-live-hud-agents = { $count } Agents
agent-mesh-live-hud-tools = { $count } Tools
agent-mesh-replay-aria = Wiedergabe-Zeitleiste
agent-mesh-replay-pause = Wiedergabe pausieren
agent-mesh-replay-play = Wiedergabe starten
agent-mesh-replay-restart = Wiedergabe neu starten
agent-mesh-replay-seek = Wiedergabe-Zeitleiste suchen
agent-mesh-replay-events = { $count } { $count ->
    [one] Ereignis
   *[other] Ereignisse
}
agent-mesh-replay-live = Live
agent-mesh-decision-aria = Entscheidungssimulation
agent-mesh-decision-heading = Entscheidungssimulation
agent-mesh-decision-replay-summary = Nachvollzug der Antwort · { $agents } { $agents ->
    [one] Agent
   *[other] Agents
} · { $tools } { $tools ->
    [one] Tool-Aufruf
   *[other] Tool-Aufrufe
}
agent-mesh-decision-stat-runtime = { $duration } Laufzeit
agent-mesh-decision-stat-tokens = { $tokens } Tokens
agent-mesh-decision-stat-cost = ${ $cost } Kosten
agent-mesh-decision-stat-count = { $count } Entscheidungen
agent-mesh-decision-empty = Noch keine Entscheidungen oder Ereignisse.
agent-mesh-decision-conf = Konf. { $percent }%
agent-mesh-overview-title = Übersicht
agent-mesh-overview-agents = Agents
agent-mesh-overview-tools = Tools
agent-mesh-overview-sessions = Sitzungen
agent-mesh-overview-users = Benutzer
agent-mesh-overview-top-agents = Top-Agents
agent-mesh-overview-top-skills = Top-Skills
agent-mesh-overview-top-tools = Top-Tools
agent-mesh-overview-no-agents = Keine Agents aufgezeichnet
agent-mesh-overview-no-skills = Keine Skills aufgezeichnet
agent-mesh-overview-no-tools = Keine Tools aufgezeichnet
agent-mesh-overview-active-users = Aktive Benutzer
agent-mesh-overview-recent-sessions = Letzte Sitzungen
agent-mesh-overview-user-sessions = { $count } Sitzungen
agent-mesh-edge-view-message = Nachricht zwischen Agents anzeigen
agent-mesh-edge-view-message-title = Klicken für die vollständige Nachricht
agent-mesh-edge-message-aria = { $kind }-Nachricht
agent-mesh-edge-close = Nachrichtendetail schließen
agent-mesh-edge-status = Status
agent-mesh-edge-no-body = (Kein Nachrichtentext aufgezeichnet.)
agent-mesh-edge-unknown-source = Unbekannte Quelle
agent-mesh-edge-unknown-target = Unbekanntes Ziel
agent-mesh-edge-sessions = Sitzungen ({ $count })
agent-mesh-edge-kind-delegation = Delegation
agent-mesh-edge-kind-tool-call = Tool-Aufruf
agent-mesh-edge-kind-expert-call = Expertenaufruf
agent-mesh-edge-kind-skill-load = Skill laden
agent-mesh-edge-kind-completion = Abschluss
agent-mesh-node-detail-aria = Knotendetail: { $label }
agent-mesh-node-detail-close = Detail schließen
agent-mesh-node-detail-status = Status
agent-mesh-node-detail-invocations = Aufrufe
agent-mesh-node-detail-duration = Dauer
agent-mesh-node-detail-first-seen = Erstmals gesehen
agent-mesh-node-detail-used-by = Verwendet von { $count } { $count ->
    [one] Benutzer
   *[other] Benutzern
}
agent-mesh-node-detail-sessions = { $count } { $count ->
    [one] Sitzung
   *[other] Sitzungen
}
agent-mesh-node-detail-inbound = Eingehend ({ $count })
agent-mesh-node-detail-outbound = Ausgehend ({ $count })
agent-mesh-node-detail-skills = Skills ({ $count })
agent-mesh-node-detail-auto-detected = Automatisch erkannt
agent-mesh-node-skills-aria = { $count } { $count ->
    [one] Skill
   *[other] Skills
}
agent-mesh-node-live-sessions = { $count } Live-Sitzungen
agent-mesh-glass-heading = Unternehmens-Agents
agent-mesh-glass-value = { $count } { $count ->
    [one] Agent
   *[other] Agents
}

# Scheduled tasks (phase2-rest)
scheduled-title = Geplante Aufgaben
scheduled-back-aria = Zurück
scheduled-refresh-aria = Aktualisieren
scheduled-close = Schließen
scheduled-new-task = Neue Aufgabe
scheduled-editing = Zeitplan bearbeiten
scheduled-title-placeholder = Titel des Zeitplans
scheduled-task-placeholder = Agent-Aufgabe für jede Wiederholung
scheduled-repeat = Wiederholen
scheduled-frequency-once = Einmalig
scheduled-frequency-daily = Täglich
scheduled-frequency-weekly = Wöchentlich
scheduled-frequency-monthly = Monatlich
scheduled-save-template = Als Vorlage speichern
scheduled-saving-template = Wird gespeichert…
scheduled-create-once = Aufgabe planen
scheduled-create-recurring = Wiederkehrenden Zeitplan erstellen
scheduled-saving = Wird gespeichert…
scheduled-creating = Wird erstellt…
scheduled-save-changes = Änderungen speichern
scheduled-tab-all = Alle
scheduled-tab-pending = Ausstehend
scheduled-tab-sent = Gesendet
scheduled-tab-failed = Fehlgeschlagen
scheduled-tab-cancelled = Abgebrochen
scheduled-try-again = Erneut versuchen
scheduled-empty-title = Noch keine geplanten Aufgaben
scheduled-empty-desc = Starte mit einer Vorlage unten oder bitte den Agent im Chat, eine Aufgabe zu planen.
scheduled-status-pending = Ausstehend
scheduled-status-firing = Wird gesendet…
scheduled-status-fired = Gesendet
scheduled-status-cancelled = Abgebrochen
scheduled-status-failed = Fehlgeschlagen
scheduled-badge-agent-run = Agent-Lauf
scheduled-badge-recurring = Wiederkehrend
scheduled-subtitle-agent-session = Dauerhafte { -platform-ai-agent-product.inline }-Sitzung
scheduled-subtitle-assignees = { $count } { $count ->
    [one] Zuständiger
   *[other] Zuständige
}
scheduled-open-result = Ergebnis öffnen
scheduled-run-now = Jetzt ausführen
scheduled-edit-aria = Bearbeiten
scheduled-cancel = Abbrechen
scheduled-disable = Deaktivieren
scheduled-enable = Aktivieren
scheduled-retry = Erneut versuchen
scheduled-delete = Löschen
scheduled-keep = Behalten
scheduled-delete-aria = Löschen
scheduled-collapse = Einklappen
scheduled-expand = Ausklappen
scheduled-detail-message = Nachricht
scheduled-detail-assignees = Zuständige ({ $count })
scheduled-detail-result = Ergebnis
scheduled-detail-open-session = Agent-Sitzung öffnen, um das Ergebnis anzuzeigen
scheduled-detail-recurrence = Wiederholung
scheduled-detail-recurrence-next = { $label } · nächster Lauf { $when }
scheduled-detail-run-history = Laufhistorie
scheduled-detail-triggered = Ausgelöst
scheduled-detail-open = Öffnen
scheduled-detail-inbox = An Posteingang zugestellt
scheduled-detail-inbox-summary = { $count } { $count ->
    [one] Aufgabe
   *[other] Aufgaben
} im Posteingang des Zuständigen{ $plural }
scheduled-detail-last-attempt = Letzter Versuch:
scheduled-detail-sent-at = Gesendet am:
scheduled-detail-id = ID: { $id }
scheduled-templates-quick-start = Schnellstart
scheduled-templates-delete-aria = Vorlage löschen
scheduled-err-task-required = Gib die Aufgabe ein, die der Agent ausführen soll.
scheduled-err-datetime-required = Wähle ein zukünftiges Datum und eine Uhrzeit.
scheduled-err-datetime-future = Die geplante Zeit muss in der Zukunft liegen.
scheduled-err-save-failed = Änderungen konnten nicht gespeichert werden.
scheduled-err-template-task = Gib die Aufgabe ein, bevor du sie als Vorlage speicherst.
scheduled-err-template-save = Vorlage konnte nicht gespeichert werden.
scheduled-err-create-failed = Zeitplan konnte nicht erstellt werden.
scheduled-dispatch-err-auth-label = Authentifizierung fehlgeschlagen
scheduled-dispatch-err-unavailable-label = Dienst nicht verfügbar
scheduled-dispatch-err-timeout-label = Zeitüberschreitung
scheduled-dispatch-err-assignee-label = Ungültiger Zuständiger
scheduled-dispatch-err-unknown-label = Fehlgeschlagen
scheduled-dispatch-err-auth-msg = Authentifizierung bei der Flow Engine fehlgeschlagen (Token fehlt oder abgelehnt). Service-Account prüfen und erneut versuchen.
scheduled-dispatch-err-unavailable-msg = Die Flow Engine war nicht erreichbar. Prüfe, ob der Dienst läuft.
scheduled-dispatch-err-timeout-msg = Die Flow Engine hat nicht rechtzeitig geantwortet. Versuche es erneut, wenn sie erreichbar ist.
scheduled-dispatch-err-assignee-msg = Ein Zuständiger konnte nicht aufgelöst werden. Prüfe, ob er noch existiert.
scheduled-dispatch-err-unknown-msg = Die Aufgabe konnte nicht zugestellt werden.
scheduled-dispatch-details = Details
scheduled-dispatch-hide-details = Details ausblenden

# Error boundary (phase2-rest)
error-boundary-title = Every Fabric ist beim Rendern abgestürzt
error-boundary-unknown = Unbekannter Rendering-Fehler
error-boundary-retry = Arbeitsbereich erneut laden

# Artifacts (phase2-rest)
artifact-replay-animation = Animation wiederholen
artifact-replay-label = Wiederholen
artifact-chart-empty = Kein Diagramminhalt verfügbar.

# Connectors (phase2-rest)
connectors-picker-title = Connectoren
connectors-picker-loading = Connectoren werden geladen…
connectors-picker-empty = Keine Connectoren verfügbar.
connectors-picker-close-aria = Schließen

# Forms (phase2-rest)
forms-employee-search-placeholder = Mitarbeitende suchen und auswählen…
forms-employee-change = Ändern
forms-employee-auth-required = Authentifizierung erforderlich, um Mitarbeitende zu suchen
forms-employee-error = Fehler: { $error }
forms-employee-searching = Mitarbeitende werden gesucht…
forms-employee-no-match = Keine passenden Mitarbeitenden gefunden
forms-employee-start-typing = Tippen Sie, um Mitarbeitende zu suchen

# Trace explorer timeline (phase2-rest)
trace-explorer-timeline-empty = Noch keine Zeitachsendaten verfügbar
trace-explorer-timeline-truncated = { $shown } von { $total } Frames angezeigt
trace-explorer-bar-running = läuft
trace-explorer-legend-tool = Tool-Aufruf
trace-explorer-legend-subagent = Delegation
trace-explorer-legend-expert = Experte
trace-explorer-legend-decision = Entscheidung
trace-explorer-legend-skill = Skill
trace-explorer-legend-hitl = Menschliche Eingabe
trace-explorer-legend-step = Schritt
trace-explorer-legend-terminal = Terminal
trace-explorer-legend-capability-missing = Fehlend
trace-explorer-legend-artifact = Artefakt
trace-explorer-legend-other = Sonstiges

# Glass card sphere (phase2-rest)
glass-card-status-running = Läuft
glass-card-status-active = Aktiv
glass-card-status-renewing = Verlängerung
glass-card-status-trial = Test
glass-card-status-paused = Pausiert

# Artifacts toolbar & renderers (phase2-rest)
artifact-type-html = HTML
artifact-type-document = Dokument
artifact-type-markdown = Markdown
artifact-type-slide = Folien
artifact-type-chart = Diagramm
artifact-type-table = Tabelle
artifact-type-diagram = Diagramm
artifact-type-app-preview = App-Vorschau
artifact-type-code = Code
artifact-type-unknown = Datei
artifact-view-preview = Vorschau
artifact-view-code = Code
artifact-copy-content = Inhalt kopieren
artifact-copy = Kopieren
artifact-copied = Kopiert!
artifact-download = Herunterladen
artifact-download-png = Als PNG herunterladen
artifact-open-tab = In neuem Tab öffnen
artifact-close-viewer = Viewer schließen
artifact-table-empty = Kein Tabelleninhalt verfügbar.
artifact-table-no-rows = Keine Tabellenzeilen verfügbar.
artifact-app-preview-desc = Generierte App-Vorschauquelle. Die interaktive Ausführung ist im Artefakt-Viewer deaktiviert; prüfen oder laden Sie die Quelle herunter.
artifact-loading-document = Dokument wird geladen…
artifact-loading-diagram = Diagramm wird geladen…
artifact-loading-slides = Folien werden geladen…
artifact-slides-empty = Keine Folien gefunden.
artifact-slide-notes = Notizen

# Sidebar navigation (phase2-rest completion)
sidebar-nav-aria = { -platform-ai-agent-product.label-plural }-Navigation
sidebar-section-workspace = Arbeitsbereich
sidebar-section-active-session = Aktive Sitzung
sidebar-badge-new = NEU
sidebar-expand-tooltip = Seitenleiste erweitern
sidebar-collapse-tooltip = Seitenleiste einklappen

# Final answer compact summaries (phase2-rest completion)
renderer-compact-summary-single = Ich habe das { $type } „{ $title }“ erstellt. Du kannst es auf der Arbeitsfläche prüfen, mit Folgeanweisungen verfeinern oder in deinen Dokumenten speichern.
renderer-compact-summary-multi = Ich habe { $count } Elemente erstellt: { $titles }. Du kannst sie auf der Arbeitsfläche prüfen oder in deinem Arbeitsbereich speichern.
renderer-dashboard-ready = Dashboard bereit — siehe die Visualisierung unten.

# Agent mesh 3D node (phase2-rest completion)
agent-mesh-node-live-badge = •{ $count } live
