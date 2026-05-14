# Greeting
greeting-morning = Guten Morgen
greeting-afternoon = Guten Nachmittag
greeting-evening = Guten Abend
greeting-subtitle = Was möchtest du heute erledigen?

# AI Command Bar
ai-bar-title = EveryAI
ai-bar-subtitle = Frag alles, starte Workflows, erhalte Einblicke
ai-bar-new-chat = Neuer Chat
ai-bar-placeholder = Frag Every AI... z.B. "genehmige die Ausgaben meines Teams"
ai-bar-load-older = Ältere Nachrichten laden

# Priorities Panel
priorities-title = Heutige Prioritäten
priorities-approvals = { $count ->
  [one] { $count } Genehmigung ausstehend
 *[other] { $count } Genehmigungen ausstehend
}
priorities-tasks = { $count ->
  [one] { $count } Aufgabe heute fällig
 *[other] { $count } Aufgaben heute fällig
}
priorities-overdue = { $count ->
  [one] { $count } überfällige Aufgabe
 *[other] { $count } überfällige Aufgaben
}
priorities-team-absent = { $count ->
  [one] { $count } Teammitglied heute abwesend
 *[other] { $count } Teammitglieder heute abwesend
}
priorities-birthdays = { $count ->
  [one] { $count } bevorstehender Geburtstag
 *[other] { $count } bevorstehende Geburtstage
}
priorities-expense-tasks = { $count ->
  [one] { $count } Ausgabe erfordert Aufmerksamkeit
 *[other] { $count } Ausgaben erfordern Aufmerksamkeit
}
priorities-expense-pending = { $count ->
  [one] { $count } ausstehende Ausgabe
 *[other] { $count } ausstehende Ausgaben
}
priorities-empty = Alles erledigt!
priorities-action-review = Prüfen
priorities-action-approve = Genehmigen
priorities-action-view = Anzeigen

# Side Panels
panel-absent-title = Abwesende Teammitglieder
panel-absent-subtitle = Teammitglieder, die heute abwesend sind
panel-absent-days = { $count ->
  [one] { $count } Tag
 *[other] { $count } Tage
}
panel-absent-day = Tag
panel-absent-days-label = Tage
panel-absent-no-records = Keine Abwesenheitseinträge gefunden.
panel-absent-empty = Keine Teammitglieder sind heute abwesend.
panel-absent-error = Abwesenheitshistorie konnte nicht geladen werden.
panel-birthdays-title = Bevorstehende Geburtstage
panel-birthdays-subtitle = Geburtstage in deinem Team
panel-birthday-today = Heute!
panel-birthday-in-days = { $count ->
  [one] in { $count } Tag
 *[other] in { $count } Tagen
}
panel-birthday-days-ago = { $count ->
  [one] vor { $count } Tag
 *[other] vor { $count } Tagen
}
panel-birthdays-empty = Keine bevorstehenden Geburtstage.

# What's New Section
whats-new-title = Was gibt's Neues
whats-new-view-all = Alle anzeigen
whats-new-latest-news = Aktuelle Nachrichten
whats-new-joiners = Neue & kommende Kollegen
whats-new-say-welcome = Willkommen sagen
whats-new-empty = Nichts Neues diese Woche
whats-new-joiners-error = Neue Kollegen konnten nicht geladen werden
joiner-joins-on = Startet am { $date }
joiner-joins-on-org = Startet am { $date } in { $orgUnit }
joiner-joined-on = Gestartet am { $date }
joiner-joined-on-org = Gestartet am { $date } in { $orgUnit }
welcome-message = Willkommen im Team, { $name }! Schön, dass du da bist. Melde dich, wenn du etwas brauchst!
welcome-sent = Willkommensnachricht an { $name } gesendet
welcome-already-sent = Du hast { $name } bereits geschrieben.
welcome-go-to-chat = Chat
welcome-error = Willkommensnachricht konnte nicht gesendet werden

# Work Pulse
pulse-title = Arbeitspuls
pulse-subtitle = Deine persönlichen Arbeitskennzahlen
pulse-vacation-balance = Urlaubsguthaben
pulse-vacation-of-total = Tage verfügbar
pulse-vacation-used-of-total = Tage genommen
pulse-expense-status = Ausgaben
pulse-expense-pending-payout = warten auf Auszahlung
pulse-expense-pending = ausstehend
pulse-service-requests = Serviceanfragen
pulse-service-open = offen
pulse-team-performance = Teamziele
pulse-team-goals-progress = durchschnittlicher Fortschritt
pulse-open-positions = Offene Stellen
pulse-open-roles = unbesetzte Rollen

# AI Insights
ai-insights-title = KI-Einblicke
ai-insights-subtitle = KI-gestützte Team-Empfehlungen
ai-insights-refresh = Einblicke aktualisieren
ai-insights-ask-more = KI nach mehr fragen
ai-insights-ask-more-prompt = Worauf sollte ich mich heute noch konzentrieren? Gib mir Einblicke zu meinem Team und meiner Arbeit.

# Quick Actions
quick-actions-title = Schnellaktionen
action-request-leave = Urlaub beantragen
action-submit-expense = Ausgabe einreichen
action-open-everybox = EveryBox öffnen
action-ask-ai = AI fragen
action-approve-requests = Anfragen genehmigen
action-team-absences = Team-Abwesenheiten
action-start-flow = FLOW starten
action-orgchart = Organigramm

# App Spaces
spaces-title = Meine Apps
spaces-hr = HR+
spaces-expenses = Ausgaben+
spaces-orgchart = MAP Organigramm
spaces-services = Services+
spaces-sales = Sales+
spaces-documents = Dokumente

