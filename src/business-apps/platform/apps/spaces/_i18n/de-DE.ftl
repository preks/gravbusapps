# Common
common-back = Zuruck
common-share = Teilen
common-add-content = Inhalte hinzufugen
common-create-space = Space erstellen
common-cancel = Abbrechen
common-save = Speichern
common-change = Andern
common-clear = Leeren
common-create = Erstellen
common-delete = Loschen
common-deleting = Wird geloscht...
common-rename = Umbenennen
common-move = Verschieben
common-move-here = Hierher verschieben
common-move-to-folder = In Ordner verschieben
common-move-to-space = In Space verschieben
common-try-again = Erneut versuchen
common-open = Offnen
common-open-chat = Chat offnen
common-view-all = Alle anzeigen
common-schedule-meeting = Meeting planen
common-live = Live
common-audio-call = Audioanruf
common-video-call = Videoanruf
common-public = Offentlich
common-private = Privat
common-online = Online
common-offline = Offline
common-discoverable-by-organization = In der Organisation auffindbar
common-only-invited-members = Nur eingeladene Mitglieder
common-owner = Eigentumer
common-admin = Admin
common-editor = Bearbeiter
common-viewer = Betrachter
common-you = Du
common-invite = Einladen
common-optional = (optional)
common-this-item = dieses Element
common-untitled = Unbenannt
common-unknown = Unbekannt
common-loading = Wird geladen...
common-breadcrumb = Breadcrumb
common-team-member = Teammitglied
common-root = Stammordner
common-root-directory = Stammverzeichnis
common-no-folder-top-level = Kein Ordner (oberste Ebene)
common-folder = Ordner
common-files = Dateien
common-members = Mitglieder
common-search-spaces-placeholder = Spaces durchsuchen...
common-search-files-placeholder = Dateien durchsuchen...
common-search-members-placeholder = Mitglieder durchsuchen...
common-search-employees-placeholder = Nach Namen suchen...
common-search-folders-placeholder = Ordner durchsuchen...
common-member-count = { $count ->
    [one] { $count } Mitglied
   *[other] { $count } Mitglieder
}
common-item-count = { $count ->
    [one] { $count } Element
   *[other] { $count } Elemente
}
common-folder-count = { $count ->
    [one] { $count } Ordner
   *[other] { $count } Ordner
}
common-activities-count = { $count ->
    [one] { $count } Aktivitat
   *[other] { $count } Aktivitaten
}
common-selected-items = { $count ->
    [one] { $count } Element ausgewahlt
   *[other] { $count } Elemente ausgewahlt
}
common-updated-relative = Aktualisiert { $time }

# Content types
content-type-document = Dokument
content-type-documents = Dokumente
content-type-note = Notiz
content-type-notes = Notizen
content-type-spreadsheet = Tabelle
content-type-spreadsheets = Tabellen
content-type-slide = Prasentation
content-type-slides = Folien
content-type-whiteboard = Whiteboard
content-type-whiteboards = Whiteboards
content-type-file = Datei
content-type-folder = Ordner

# Hub
hub-title = Spaces
hub-description = Kollaborative Arbeitsbereiche fur dein Team. Dokumente, Notizen und Tabellen an einem Ort.
hub-every-office = Every Office
hub-filter-all = Alle
hub-filter-owned = Eigene
hub-filter-shared = Geteilt
hub-total-spaces = { $count ->
    [one] { $count } Space
   *[other] { $count } Spaces
}
hub-owned-summary = { $count } deine
hub-owned-shared-summary = { $owned } deine · { $shared } mit dir geteilt
hub-no-spaces-found = Keine Spaces gefunden
hub-no-spaces-yet = Noch keine Spaces
hub-search-empty-description = Passe deine Suche an, um das Gesuchte zu finden
hub-empty-description = Erstelle einen Space, um die Inhalte deines Teams zu organisieren
hub-delete-title = Diesen Space loschen?
hub-delete-with-name = "{ $name }" wird fur alle entfernt. Deine Dokumente, Notizen, Boards und Folien bleiben in Every Office; sie werden nur von diesem Space getrennt.
hub-delete-without-name = Dieser Space wird fur alle entfernt. Deine Inhalte bleiben in Every Office; sie werden nur von diesem Space getrennt.
hub-delete-confirm = Space loschen
hub-toast-space-deleted = Space geloscht
hub-toast-space-delete-failed = Der Space konnte nicht geloscht werden. Nur der Eigentumer kann einen Space loschen.

# Detail
detail-loading-space = Space wird geladen...
detail-not-found-title = Space nicht gefunden
detail-not-found-description = Dieser Space wurde moglicherweise geloscht oder du hast keinen Zugriff.
detail-tab-overview = Ubersicht
detail-tab-drive = Drive
detail-tab-members = Mitglieder ({ $count })
detail-team-collaboration = Team-Zusammenarbeit
detail-pinned = Angeheftet
detail-recent-activity = Letzte Aktivitat
detail-toast-space-deleted = Space geloscht
detail-toast-space-delete-failed = Der Space konnte nicht geloscht werden. Nur der Eigentumer kann einen Space loschen.

# Hero and cards
hero-owner-label = Eigentumer
hero-delete-space = Space loschen
card-owner-badge = Eigentumer

# Stats
stats-documents = Dokumente
stats-spreadsheets = Tabellen
stats-notes = Notizen
stats-presentations = Prasentationen
stats-recent-activity = Letzte Aktivitat

# Create dialog
create-title = Space erstellen
create-description = Erstelle einen Arbeitsbereich, um die Inhalte deines Teams zu organisieren
create-tab-manual = Manuell erstellen
create-tab-dimension = Nach Gruppe erstellen
create-name-label = Name
create-name-placeholder = z. B. Marketing-Team
create-description-label = Beschreibung
create-description-placeholder = Wofur ist dieser Space?
create-members-label = Mitglieder ({ $count })
create-select-group-title = Space aus Gruppe erstellen
create-select-group-description = Wahle eine organisatorische Gruppe aus und alle Mitglieder werden automatisch zu deinem Space hinzugefugt.
create-select-group = Gruppe auswahlen
create-members-will-be-added = { $count } Mitglieder werden hinzugefugt
create-from-group = Space aus Gruppe erstellen
create-action-with-members = Space erstellen ({ $count } Mitglieder)

# Settings dialog
settings-title = Space-Einstellungen
settings-description = Name, Beschreibung und Sichtbarkeit dieses Spaces andern
settings-danger-zone = Gefahrenbereich
settings-danger-description = Diesen Space dauerhaft loschen. Dokumente, Notizen, Boards und Folien bleiben in deiner Bibliothek, sind aber nicht mehr mit diesem Space verknupft. Nur der Space-Eigentumer kann loschen.
settings-delete-button = Space loschen
settings-delete-title = Diesen Space loschen?
settings-delete-with-name = "{ $name }" wird fur alle entfernt. Von dir hinzugefugte Inhalte bleiben in Every Office; sie werden nur von diesem Space getrennt.
settings-delete-without-name = Dieser Space wird fur alle entfernt. Deine Inhalte bleiben in Every Office; sie werden nur von diesem Space getrennt.

# Pinned and activity
pinned-empty-title = Keine angehefteten Inhalte
pinned-empty-description = Heften Sie wichtige Elemente an, damit sie hier hervorgehoben werden
activity-empty-title = Noch keine Aktivitat
activity-empty-description = Aktivitat erscheint, sobald Inhalte verandert werden
activity-action-created = erstellt
activity-action-edited = bearbeitet
activity-action-deleted = geloscht
activity-action-shared = geteilt
activity-action-moved = verschoben
activity-action-commented = kommentiert
activity-action-uploaded = hochgeladen

# Content browser
content-tab-all = Alle
content-empty-search-title = Keine Dateien entsprechen deiner Suche
content-empty-title = Keine Dateien an diesem Ort
content-empty-search-description = Versuche einen anderen Suchbegriff
content-empty-description = Fuge Inhalte zu diesem Space hinzu, um zu beginnen
content-column-name = Name
content-column-type = Typ
content-column-modified = Geandert
content-column-created = Erstellt
content-remove-from-space = Aus Space entfernen

# Members
members-title = Teammitglieder
members-subtitle = { $count } Mitglieder in diesem Space
members-invite-members = Mitglieder einladen
members-sort-by = Sortieren nach:
members-sort-name = Name
members-sort-role = Rolle
members-sort-join-date = Beitrittsdatum
members-sort-activity = Aktivitat
members-no-members = Noch keine Mitglieder
members-no-search-results = Keine Mitglieder entsprechen deiner Suche
members-change-role = Rolle andern
members-remove-from-space = Aus Space entfernen
members-role-owner-description = Volle Kontrolle uber den Space
members-role-admin-description = Kann Mitglieder und Inhalte verwalten
members-role-editor-description = Kann Inhalte erstellen und bearbeiten
members-role-viewer-description = Kann Inhalte nur ansehen

# Invite dialog
invite-title = Mitglied einladen
invite-description = Suche nach Mitarbeitenden, die zu diesem Space hinzugefugt werden sollen
invite-search-label = Mitarbeitende suchen
invite-no-results = Keine Mitarbeitenden gefunden
invite-role-label = Rolle

# Add content dialog
add-content-title = Inhalte hinzufugen
add-content-description = Wahlen Sie Inhalte aus, die diesem Space hinzugefugt werden sollen
add-content-empty-search-title = Keine passenden Inhalte gefunden
add-content-empty-documents = Keine Dokumente zum Hinzufugen verfugbar
add-content-empty-notes = Keine Notizen zum Hinzufugen verfugbar
add-content-empty-spreadsheets = Keine Tabellen zum Hinzufugen verfugbar
add-content-owned-only = Nur Inhalte, die dir gehoren, konnen einem Space hinzugefugt werden
add-content-select-items = Wahlen Sie Elemente zum Hinzufugen aus
add-content-button = Zu Space hinzufugen

# Move dialogs
move-content-title = Inhalt verschieben
move-content-description = Vorhandene Inhalte zu diesem Space hinzufugen
move-content-type-label = Inhaltstyp
move-content-document-id = Dokument-ID
move-content-note-id = Notiz-ID
move-content-spreadsheet-id = Tabellen-ID
move-content-document-placeholder = Dokument-ID eingeben
move-content-note-placeholder = Notiz-ID eingeben
move-content-spreadsheet-placeholder = Tabellen-ID eingeben
move-content-note-title = Inhalt wird verschoben
move-content-note-description = Wenn du Inhalte in diesen Space verschiebst, gehoren sie ausschliesslich dem Space und werden aus deinem personlichen Bereich entfernt.
move-to-space-title = In Space verschieben
move-to-space-description-with-name = "{ $name }" in einen Space verschieben
move-to-space-description-without-name = Wahlen Sie einen Space aus, um dieses { $contentType } zu verschieben
move-to-space-empty-search = Keine passenden Spaces gefunden
move-to-space-empty = Keine Spaces verfugbar
move-to-space-create-first = Erstelle zuerst einen Space, um deine Inhalte zu organisieren
move-to-space-footer = Inhalte werden ausschliesslich in den ausgewahlten Space verschoben
move-to-folder-title = In Ordner verschieben
move-to-folder-description = Wahlen Sie ein Ziel fur { $item }
move-to-folder-empty-search = Keine Ordner entsprechen deiner Suche
move-to-folder-moving = Wird verschoben...

# Folder UI
folder-navigation = Navigation
folder-quick-access = Schnellzugriff
folder-section-title = Ordner
folder-empty-title = Noch keine Ordner
folder-empty-description = Erstelle einen Ordner, um deinen Space zu organisieren
folder-new-folder = Neuer Ordner
folder-new-subfolder = Neuer Unterordner
folder-delete-confirm = Ordner "{ $name }" loschen? Elemente werden in den ubergeordneten Ordner oder den Stammordner verschoben.
folder-empty-here = Hier gibt es noch keine Ordner
folder-empty-here-description = Erstelle einen Ordner, um deine Inhalte zu organisieren
folder-name-placeholder = Ordnername eingeben
folder-saving = Wird gespeichert...
folder-create-title = Neuer Ordner
folder-create-description-root = Erstelle einen Ordner im Stammverzeichnis
folder-create-description-subfolder = Erstelle einen Unterordner
folder-rename-title = Ordner umbenennen

# Drive
drive-not-supported = Ordner sind in der Backend-Instanz, mit der du verbunden bist, noch nicht verfugbar. Sobald der aktualisierte document-service lauft, funktionieren Ordner auch hier.
drive-also-save-to-my-drive = Auch in meinem Drive speichern

# Calendar
calendar-title = Teamkalender
calendar-meeting-title = Meeting { $spaceName }
calendar-no-upcoming = Keine bevorstehenden Meetings
calendar-video = Video
calendar-time-today = Heute, { $time }
calendar-time-tomorrow = Morgen, { $time }
calendar-time-date = { $date }, { $time }

# Chat and messages
chat-title = Team-Chat
chat-no-linked-title = Noch kein Gruppenchat mit diesem Space verknupft
chat-no-linked-description = Erstelle einen Gruppenchat fur dieses Team, um die Zusammenarbeit zu aktivieren
chat-recent-messages = Letzte Nachrichten
chat-no-messages = Noch keine Nachrichten
chat-start-conversation = Starte die Unterhaltung!
chat-shared-file = Eine Datei geteilt
chat-no-recent-activity = Keine aktuelle Aktivitat
chat-active-just-now = Gerade aktiv
chat-active-hours-ago = Vor { $count } Std. aktiv
chat-active-yesterday = Gestern aktiv
chat-active-days-ago = Vor { $count } Tagen aktiv

# Presence and huddles
presence-online-summary = { $online } von { $total } online
presence-members-summary = { $total } Mitglieder
presence-more-members = { $count } weitere Teammitglieder
quick-huddle = Schnell-Huddle

# Live activity
live-activity-title = Live-Aktivitat
live-activity-empty-title = Derzeit keine aktive Bearbeitung
live-activity-empty-description = Aktivitat erscheint, wenn Teammitglieder an Dokumenten arbeiten
live-activity-editing = bearbeitet gerade
live-activity-viewing = sieht sich gerade an
live-activity-more = +{ $count } weitere aktiv
live-activity-duration-just-now = gerade eben
live-activity-duration-minutes-short = { $count } Min.
live-activity-duration-hours-short = { $count } Std.

# Time
time-just-now = Gerade eben
time-minutes-ago-short = vor { $count } Min.
time-hours-ago-short = vor { $count } Std.
time-yesterday = Gestern
time-days-ago-short = vor { $count } T.

# Errors
error-not-authenticated = Nicht authentifiziert
error-load-spaces = Spaces konnten nicht geladen werden
error-create-space = Space konnte nicht erstellt werden
error-update-space = Space konnte nicht aktualisiert werden
error-delete-space = Space konnte nicht geloscht werden
error-load-space = Space konnte nicht geladen werden
error-add-member = Mitglied konnte nicht hinzugefugt werden
error-update-member = Mitglied konnte nicht aktualisiert werden
error-remove-member = Mitglied konnte nicht entfernt werden
error-fetch-content = Inhalte konnten nicht geladen werden
error-move-content = Inhalte konnten nicht verschoben werden
error-remove-content = Inhalte konnten nicht entfernt werden
error-load-available-content = Inhalte konnten nicht geladen werden
error-load-messages = Nachrichten konnten nicht geladen werden
error-load-linked-chat = Verknupfter Chat konnte nicht gefunden werden
error-load-meetings = Meetings konnten nicht geladen werden
error-load-folders = Ordner konnten nicht geladen werden
error-create-folder = Ordner konnte nicht erstellt werden
error-update-folder = Ordner konnte nicht aktualisiert werden
error-delete-folder = Ordner konnte nicht geloscht werden
error-load-space-activity = Space-Aktivitat konnte nicht geladen werden
