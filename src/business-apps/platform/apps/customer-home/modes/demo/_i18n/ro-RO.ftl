# Greeting
greeting-morning = Bună dimineața
greeting-afternoon = Bună ziua
greeting-evening = Bună seara
greeting-subtitle = Ce vrei să rezolvi astăzi?

# AI Command Bar
ai-bar-title = EveryAI
ai-bar-subtitle = Întreabă orice, pornește fluxuri de lucru, obține informații
ai-bar-new-chat = Conversație nouă
ai-bar-placeholder = Întreabă Every AI... de ex. „aprobă cheltuielile echipei mele”
ai-bar-load-older = Încarcă mesajele mai vechi

# Priorities Panel
priorities-title = Prioritățile de astăzi
priorities-approvals = { $count ->
  [one] { $count } aprobare în așteptare
 *[other] { $count } aprobări în așteptare
}
priorities-tasks = { $count ->
  [one] { $count } sarcină scadentă astăzi
 *[other] { $count } sarcini scadente astăzi
}
priorities-overdue = { $count ->
  [one] { $count } sarcină întârziată
 *[other] { $count } sarcini întârziate
}
priorities-team-absent = { $count ->
  [one] { $count } membru al echipei absent astăzi
 *[other] { $count } membri ai echipei absenți astăzi
}
priorities-birthdays = { $count ->
  [one] { $count } zi de naștere apropiată
 *[other] { $count } zile de naștere apropiate
}
priorities-expense-tasks = { $count ->
  [one] { $count } cheltuială necesită atenție
 *[other] { $count } cheltuieli necesită atenție
}
priorities-expense-pending = { $count ->
  [one] { $count } cheltuială în așteptare
 *[other] { $count } cheltuieli în așteptare
}
priorities-empty = Ești la zi cu toate!
priorities-action-review = Revizuiește
priorities-action-approve = Aprobă
priorities-action-view = Vezi

# Side Panels
panel-absent-title = Membri ai echipei absenți
panel-absent-subtitle = Membrii echipei care sunt absenți astăzi
panel-absent-days = { $count ->
  [one] { $count } zi
 *[other] { $count } zile
}
panel-absent-day = zi
panel-absent-days-label = zile
panel-absent-no-records = Nu s-au găsit înregistrări de absență.
panel-absent-empty = Niciun membru al echipei nu este absent astăzi.
panel-absent-error = Istoricul absențelor nu a putut fi încărcat.
panel-birthdays-title = Zile de naștere apropiate
panel-birthdays-subtitle = Zile de naștere care urmează în echipa ta
panel-birthday-today = Astăzi!
panel-birthday-in-days = { $count ->
  [one] peste { $count } zi
 *[other] peste { $count } zile
}
panel-birthday-days-ago = { $count ->
  [one] acum { $count } zi
 *[other] acum { $count } zile
}
panel-birthdays-empty = Nu există zile de naștere apropiate.

# What's New Section
whats-new-title = Noutăți
whats-new-view-all = Vezi tot
whats-new-latest-news = Cele mai recente știri
whats-new-joiners = Colegi noi și viitori
whats-new-say-welcome = Spune bun venit
whats-new-empty = Nimic nou săptămâna aceasta
whats-new-joiners-error = Noii colegi nu au putut fi încărcați
joiner-joins-on = Se alătură pe { $date }
joiner-joins-on-org = Se alătură pe { $date } în { $orgUnit }
joiner-joined-on = S-a alăturat pe { $date }
joiner-joined-on-org = S-a alăturat pe { $date } în { $orgUnit }
welcome-message = Bun venit în echipă, { $name }! Ne bucurăm să te avem alături. Spune-mi dacă ai nevoie de ceva!
welcome-sent = Mesaj de bun venit trimis către { $name }
welcome-already-sent = I-ai scris deja lui { $name }.
welcome-go-to-chat = Chat
welcome-error = Mesajul de bun venit nu a putut fi trimis

# Work Pulse
pulse-title = Pulsul muncii
pulse-subtitle = Indicatorii tăi personali de lucru
pulse-vacation-balance = Sold concediu
pulse-vacation-of-total = zile disponibile
pulse-vacation-used-of-total = zile utilizate
pulse-expense-status = Cheltuieli
pulse-expense-pending-payout = în așteptarea plății
pulse-expense-pending = în așteptare
pulse-service-requests = Solicitări de servicii
pulse-service-open = deschise
pulse-team-performance = Obiectivele echipei
pulse-team-goals-progress = progres mediu
pulse-open-positions = Posturi deschise
pulse-open-roles = roluri neocupate

# AI Insights
ai-insights-title = Informații AI
ai-insights-subtitle = Recomandări pentru echipă bazate pe AI
ai-insights-refresh = Reîmprospătează informațiile
ai-insights-ask-more = Cere mai multe de la AI
ai-insights-ask-more-prompt = Pe ce altceva ar trebui să mă concentrez astăzi? Oferă-mi informații despre echipa și munca mea.

# Quick Actions
quick-actions-title = Acțiuni rapide
action-request-leave = Solicită concediu
action-submit-expense = Trimite cheltuială
action-open-everybox = Deschide EveryBox
action-ask-ai = Întreabă AI
action-approve-requests = Aprobă solicitări
action-team-absences = Absențele echipei
action-start-flow = Pornește FLOW
action-orgchart = OrgChart

# App Spaces
spaces-title = Aplicațiile mele
spaces-hr = HR+
spaces-expenses = Expenses+
spaces-orgchart = MAP OrgChart
spaces-services = Services+
spaces-sales = Sales+
spaces-documents = Documente
