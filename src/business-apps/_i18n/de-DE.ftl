# file-meta: {
#   "status": "approved",
#   "updatedBy": "translator-de@newwork.se",
#   "updatedAt": "2025-01-20T14:25:00Z",
#   "reviewedAt": "2025-01-18T09:00:00Z",
#   "reviewedBy": "reviewer-de@newwork.se",
#   "reviewedKeys": ["save", "cancel", "delete", "edit", "create", "update", "close", "submit", "error", "success", "warning", "info", "retry", "load_more", "loading", "search", "no_results", "no_data", "welcome-title", "app-name", "welcome-user", "user-info"],
#   "notes": "Partially reviewed - common actions and labels approved. Complex patterns (selectors, nested) still need review after recent updates."
# }

# Common actions
save = Speichern
cancel = Abbrechen
delete = Löschen
edit = Bearbeiten
create = Erstellen
update = Aktualisieren
close = Schließen
submit = Absenden

# Common labels
error = Fehler
success = Erfolg
warning = Warnung
info = Info
retry = Erneut versuchen
load_more = Mehr laden
loading = Laden
search = Suchen

# Common messages
no_results = Keine Ergebnisse gefunden
no_data = Keine Daten verfügbar

## 1. EINFACHER TEXT
welcome-title = Lokalisierungsbeispiel
app-name = Fluent Übersetzungssystem

## 2. VARIABLEN (Placeables)
# Einzelne Variable
welcome-user = Willkommen, { $name }!
# Mehrere Variablen
user-info = { $firstName } { $lastName } ({ $email })

## 3. ZAHLENFORMATIERUNG
# Implizite Formatierung (automatisches Tausendertrennzeichen)
file-size = Dateigröße: { $bytes } Bytes
# Explizite Formatierung mit Optionen
price = Preis: { NUMBER($amount, style: "currency", currency: "EUR") }
percentage = Fortschritt: { NUMBER($value, style: "percent") }

## 4. DATUM/ZEIT-FORMATIERUNG
last-updated = Zuletzt aktualisiert: { DATETIME($date) }
meeting-time = Besprechung: { DATETIME($datetime, dateStyle: "short", timeStyle: "short") }

## 5. SELEKTOREN (Plural)
# Kardinal-Plural (one/other)
items-count = { $count ->
    [one] { $count } Element ausgewählt
   *[other] { $count } Elemente ausgewählt
}
# Mit Null-Fall
unread-emails = { $count ->
    [0] Keine ungelesenen E-Mails
    [one] 1 ungelesene E-Mail
   *[other] { $count } ungelesene E-Mails
}

## 6. ORDINALZAHLEN
# Ordinal-Plural (1., 2., 3., 4.)
rank-position = { NUMBER($pos, type: "ordinal") ->
   [1] Du bist Erster geworden!
   [one] Du bist { $pos }. geworden
  *[other] Du bist { $pos }. geworden
}

## 7. GESCHLECHT/EIGENE SELEKTOREN
# String-basierter Selektor
user-role = { $role ->
   [admin] Administrator-Zugriff
   [editor] Editor-Berechtigung
   [viewer] Nur-Lese-Zugriff
  *[other] Unbekannte Rolle
}

## 8. ATTRIBUTE
# Nachricht mit Attributen (z.B. für aria-label, placeholder)
login-input = Anmelden
    .placeholder = Benutzername eingeben
    .aria-label = Benutzername-Eingabefeld

## 9. REFERENZEN AUF ANDERE NACHRICHTEN
app-title = Fluent Demo
page-title = { app-title } - Einstellungen

## 10. MEHRZEILIGER TEXT
terms-of-service = 
    Durch die Nutzung dieses Dienstes stimmen Sie unseren Bedingungen zu.
    
    Dies ist ein mehrzeiliger Textblock, der
    Zeilenumbrüche und Formatierung beibehält.

## 11. SONDERZEICHEN
# Verwendung von quoted text für Sonderzeichen
curly-braces = Verwende {"{"} und {"}"} für echte geschweifte Klammern
backslash = Pfad: {"C:\\Benutzer\\Dokumente"}
non-breaking-space = Datenschutz{"\u00A0"}Richtlinie

## 12. KOMMENTARE
# Dies ist ein Kommentar - wird Benutzern nicht angezeigt
# Kommentare helfen Übersetzern, den Kontext zu verstehen

## 13. KOMPLEXE KOMBINATIONEN
# Kombination von Selektoren mit Variablen und Formatierung
file-upload-status = { $status ->
   [uploading] { $fileName } wird hochgeladen ({ NUMBER($progress, style: "percent") })
   [completed] { $fileName } erfolgreich hochgeladen
   [failed] Fehler beim Hochladen von { $fileName }
  *[pending] Warten auf Upload von { $fileName }
}

## 14. VERSCHACHTELTE SELEKTOREN
# Erweitert: Selektor innerhalb eines Selektors
notification = { $type ->
   [message] { $count ->
       [one] Du hast 1 neue Nachricht
      *[other] Du hast { $count } neue Nachrichten
   }
   [friend-request] { $count ->
       [one] 1 Freundschaftsanfrage
      *[other] { $count } Freundschaftsanfragen
   }
  *[other] { $count } Benachrichtigungen
}
