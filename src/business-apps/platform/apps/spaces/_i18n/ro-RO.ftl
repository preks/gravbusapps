# Common
common-back = Inapoi
common-share = Distribuie
common-add-content = Adauga continut
common-create-space = Creeaza spatiu
common-cancel = Anuleaza
common-save = Salveaza
common-change = Schimba
common-clear = Goleste
common-create = Creeaza
common-delete = Sterge
common-deleting = Se sterge...
common-rename = Redenumeste
common-move = Muta
common-move-here = Muta aici
common-move-to-folder = Muta in dosar
common-move-to-space = Muta in spatiu
common-try-again = Incearca din nou
common-open = Deschide
common-join = Intra
common-open-chat = Deschide chatul
common-view-all = Vezi tot
common-schedule-meeting = Programeaza intalnirea
common-live = Live
common-audio-call = Apel audio
common-video-call = Apel video
common-public = Public
common-private = Privat
common-online = Online
common-offline = Offline
common-discoverable-by-organization = Vizibil in organizatie
common-only-invited-members = Doar membrii invitati
common-owner = Proprietar
common-admin = Administrator
common-editor = Editor
common-viewer = Vizualizator
common-you = Tu
common-invite = Invita
common-optional = (optional)
common-this-item = acest element
common-untitled = Fara titlu
common-unknown = Necunoscut
common-loading = Se incarca...
common-breadcrumb = Navigare pe niveluri
common-team-member = Membru al echipei
common-root = Radacina
common-root-directory = Director radacina
common-no-folder-top-level = Fara dosar (nivel superior)
common-folder = Dosar
common-files = Fisiere
common-members = Membri
common-search-spaces-placeholder = Cauta in spatii...
common-search-files-placeholder = Cauta fisiere...
common-search-members-placeholder = Cauta membri...
common-search-employees-placeholder = Cauta dupa nume...
common-search-folders-placeholder = Cauta dosare...
common-member-count = { $count ->
    [one] { $count } membru
   *[other] { $count } membri
}
common-item-count = { $count ->
    [one] { $count } element
   *[other] { $count } elemente
}
common-folder-count = { $count ->
    [one] { $count } dosar
   *[other] { $count } dosare
}
common-activities-count = { $count ->
    [one] { $count } activitate
   *[other] { $count } activitati
}
common-selected-items = { $count ->
    [one] { $count } element selectat
   *[other] { $count } elemente selectate
}
common-updated-relative = Actualizat { $time }

# Content types
content-type-document = Document
content-type-documents = Documente
content-type-note = Notita
content-type-notes = Notite
content-type-spreadsheet = Tabel
content-type-spreadsheets = Tabele
content-type-slide = Prezentare
content-type-slides = Slide-uri
content-type-whiteboard = Tabla alba
content-type-whiteboards = Table albe
content-type-file = Fisier
content-type-folder = Dosar

# Hub
hub-title = Spaces
hub-description = Spatii de colaborare pentru echipa ta. Documente, notite si tabele intr-un singur loc.
hub-every-office = Every Office
hub-filter-all = Toate
hub-filter-owned = Ale mele
hub-filter-shared = Partajate
hub-total-spaces = { $count ->
    [one] { $count } spatiu
   *[other] { $count } spatii
}
hub-owned-summary = { $count } ale tale
hub-owned-shared-summary = { $owned } ale tale · { $shared } partajate cu tine
hub-no-spaces-found = Nu au fost gasite spatii
hub-no-spaces-yet = Inca nu exista spatii
hub-search-empty-description = Incearca sa modifici cautarea pentru a gasi ceea ce cauti
hub-empty-description = Creeaza un spatiu pentru a incepe organizarea continutului echipei tale
hub-delete-title = Stergi acest spatiu?
hub-delete-with-name = "{ $name }" va fi eliminat pentru toata lumea. Documentele, notitele, board-urile si slide-urile tale raman in Every Office; sunt doar deconectate de la acest spatiu.
hub-delete-without-name = Acest spatiu va fi eliminat pentru toata lumea. Continutul tau ramane in Every Office; este doar deconectat de la acest spatiu.
hub-delete-confirm = Sterge spatiul
hub-toast-space-deleted = Spatiul a fost sters
hub-toast-space-delete-failed = Spatiul nu a putut fi sters. Doar proprietarul poate sterge un spatiu.

# Detail
detail-loading-space = Se incarca spatiul...
detail-not-found-title = Spatiul nu a fost gasit
detail-not-found-description = Este posibil ca acest spatiu sa fi fost sters sau sa nu ai acces.
detail-tab-overview = Prezentare generala
detail-tab-drive = Drive
detail-tab-members = Membri ({ $count })
detail-team-collaboration = Colaborare in echipa
detail-pinned = Fixate
detail-recent-activity = Activitate recenta
detail-toast-space-deleted = Spatiul a fost sters
detail-toast-space-delete-failed = Spatiul nu a putut fi sters. Doar proprietarul poate sterge un spatiu.

# Hero and cards
hero-owner-label = Proprietar
hero-delete-space = Sterge spatiul
card-owner-badge = Proprietar

# Stats
stats-documents = Documente
stats-spreadsheets = Tabele
stats-notes = Notite
stats-presentations = Prezentari
stats-recent-activity = Activitate recenta

# Create dialog
create-title = Creeaza spatiu
create-description = Creeaza un spatiu de lucru pentru a organiza continutul echipei tale
create-tab-manual = Creeaza manual
create-tab-dimension = Creeaza dupa grup
create-name-label = Nume
create-name-placeholder = ex. Echipa de Marketing
create-description-label = Descriere
create-description-placeholder = Pentru ce este acest spatiu?
create-members-label = Membri ({ $count })
create-select-group-title = Creeaza spatiu din grup
create-select-group-description = Selecteaza un grup organizational si toti membrii lui vor fi adaugati automat in spatiul tau.
create-select-group = Selecteaza grupul
create-members-will-be-added = Vor fi adaugati { $count } membri
create-from-group = Creeaza spatiu din grup
create-action-with-members = Creeaza spatiu ({ $count } membri)

# Settings dialog
settings-title = Setari spatiu
settings-description = Schimba numele, descrierea si vizibilitatea acestui spatiu
settings-danger-zone = Zona periculoasa
settings-danger-description = Sterge definitiv acest spatiu. Documentele, notitele, board-urile si slide-urile raman in biblioteca ta, dar nu vor mai fi legate de acest spatiu. Doar proprietarul spatiului il poate sterge.
settings-delete-button = Sterge spatiul
settings-delete-title = Stergi acest spatiu?
settings-delete-with-name = "{ $name }" va fi eliminat pentru toata lumea. Continutul adaugat de tine ramane in Every Office; este doar deconectat de la acest spatiu.
settings-delete-without-name = Acest spatiu va fi eliminat pentru toata lumea. Continutul tau ramane in Every Office; este doar deconectat de la acest spatiu.

# Pinned and activity
pinned-empty-title = Nu exista continut fixat
pinned-empty-description = Fixeaza elemente importante pentru a le evidentia aici
activity-empty-title = Inca nu exista activitate
activity-empty-description = Activitatea va aparea pe masura ce continutul este modificat
activity-action-created = a creat
activity-action-edited = a editat
activity-action-deleted = a sters
activity-action-shared = a distribuit
activity-action-moved = a mutat
activity-action-commented = a comentat la
activity-action-uploaded = a incarcat

# Content browser
content-tab-all = Toate
content-empty-search-title = Niciun fisier nu se potriveste cautarii tale
content-empty-title = Nu exista fisiere in aceasta locatie
content-empty-search-description = Incearca un alt termen de cautare
content-empty-description = Adauga continut in acest spatiu pentru a incepe
content-column-name = Nume
content-column-type = Tip
content-column-modified = Modificat
content-column-created = Creat
content-remove-from-space = Elimina din spatiu

# Members
members-title = Membrii echipei
members-subtitle = { $count } membri in acest spatiu
members-invite-members = Invita membri
members-sort-by = Sorteaza dupa:
members-sort-name = Nume
members-sort-role = Rol
members-sort-join-date = Data alaturarii
members-sort-activity = Activitate
members-no-members = Inca nu exista membri
members-no-search-results = Niciun membru nu corespunde cautarii tale
members-change-role = Schimba rolul
members-remove-from-space = Elimina din spatiu
members-role-owner-description = Control complet asupra spatiului
members-role-admin-description = Poate gestiona membrii si continutul
members-role-editor-description = Poate crea si edita continut
members-role-viewer-description = Poate doar vizualiza continutul

# Invite dialog
invite-title = Invita membru
invite-description = Cauta angajati pentru a-i adauga in acest spatiu
invite-search-label = Cauta angajat
invite-no-results = Nu au fost gasiti angajati
invite-role-label = Rol

# Add content dialog
add-content-title = Adauga continut
add-content-description = Selecteaza continutul pe care vrei sa il adaugi in acest spatiu
add-content-empty-search-title = Nu a fost gasit continut potrivit
add-content-empty-documents = Nu exista documente disponibile pentru adaugare
add-content-empty-notes = Nu exista notite disponibile pentru adaugare
add-content-empty-spreadsheets = Nu exista tabele disponibile pentru adaugare
add-content-owned-only = Doar continutul pe care il detii poate fi adaugat intr-un spatiu
add-content-select-items = Selecteaza elementele de adaugat
add-content-button = Adauga in spatiu

# Move dialogs
move-content-title = Muta continut
move-content-description = Adauga continut existent in acest spatiu
move-content-type-label = Tip de continut
move-content-document-id = ID document
move-content-note-id = ID notita
move-content-spreadsheet-id = ID tabel
move-content-document-placeholder = Introdu ID-ul documentului
move-content-note-placeholder = Introdu ID-ul notitei
move-content-spreadsheet-placeholder = Introdu ID-ul tabelului
move-content-note-title = Mutare continut
move-content-note-description = Cand muti continutul in acest spatiu, el va apartine exclusiv spatiului si va fi eliminat din zona ta personala.
move-to-space-title = Muta in spatiu
move-to-space-description-with-name = Muta "{ $name }" intr-un spatiu
move-to-space-description-without-name = Selecteaza un spatiu pentru a muta acest { $contentType }
move-to-space-empty-search = Nu au fost gasite spatii potrivite
move-to-space-empty = Nu exista spatii disponibile
move-to-space-create-first = Creeaza mai intai un spatiu pentru a-ti organiza continutul
move-to-space-footer = Continutul va fi mutat exclusiv in spatiul selectat
move-to-folder-title = Muta in dosar
move-to-folder-description = Selecteaza destinatia pentru { $item }
move-to-folder-empty-search = Niciun dosar nu corespunde cautarii tale
move-to-folder-moving = Se muta...

# Folder UI
folder-navigation = Navigare
folder-quick-access = Acces rapid
folder-section-title = Dosare
folder-empty-title = Inca nu exista dosare
folder-empty-description = Creeaza unul pentru a-ti organiza spatiul
folder-new-folder = Dosar nou
folder-new-subfolder = Subdosar nou
folder-delete-confirm = Stergi dosarul "{ $name }"? Elementele vor fi mutate in dosarul parinte sau in radacina.
folder-empty-here = Inca nu exista dosare aici
folder-empty-here-description = Creeaza un dosar pentru a-ti organiza continutul
folder-name-placeholder = Introdu numele dosarului
folder-saving = Se salveaza...
folder-create-title = Dosar nou
folder-create-description-root = Creeaza un dosar in radacina drive-ului
folder-create-description-subfolder = Creeaza un subdosar
folder-rename-title = Redenumeste dosarul

# Drive
drive-not-supported = Dosarele nu sunt inca disponibile pe instanta backend la care esti conectat. Dupa ce ruleaza versiunea actualizata a document-service, dosarele vor functiona si aici.
drive-also-save-to-my-drive = Salveaza si in My Drive

# Calendar
calendar-title = Calendarul echipei
calendar-meeting-title = Intalnire { $spaceName }
calendar-no-upcoming = Nu exista intalniri viitoare
calendar-no-linked-title = Nu exista inca un calendar partajat legat de acest spatiu
calendar-no-linked-description = Conecteaza un calendar partajat la acest grup pentru a vedea si programa intalniri aici.
calendar-video = Video
calendar-time-today = Astazi, { $time }
calendar-time-tomorrow = Maine, { $time }
calendar-time-date = { $date }, { $time }

# Chat and messages
chat-title = Chatul echipei
chat-no-linked-title = Inca nu exista un chat de grup legat de acest spatiu
chat-no-linked-description = Creeaza un chat de grup pentru aceasta echipa pentru a activa colaborarea
chat-recent-messages = Mesaje recente
chat-no-messages = Inca nu exista mesaje
chat-start-conversation = Incepe conversatia!
chat-shared-file = A distribuit un fisier
chat-no-recent-activity = Nicio activitate recenta
chat-active-just-now = Activ acum
chat-active-hours-ago = Activ acum { $count }h
chat-active-yesterday = Activ ieri
chat-active-days-ago = Activ acum { $count } zile

# Presence and huddles
presence-online-summary = { $online } din { $total } online
presence-members-summary = { $total } membri
presence-more-members = Inca { $count } membri ai echipei
quick-huddle = Huddle rapid

# Live activity
live-activity-title = Activitate live
live-activity-empty-title = Nu exista editare activa in acest moment
live-activity-empty-description = Activitatea va aparea cand membrii echipei lucreaza la documente
live-activity-editing = editeaza
live-activity-viewing = vizualizeaza
live-activity-more = +inca { $count } activi
live-activity-duration-just-now = chiar acum
live-activity-duration-minutes-short = { $count }m
live-activity-duration-hours-short = { $count }h

# Time
time-just-now = Chiar acum
time-minutes-ago-short = acum { $count }m
time-hours-ago-short = acum { $count }h
time-yesterday = Ieri
time-days-ago-short = acum { $count }z

# Errors
error-not-authenticated = Nu esti autentificat
error-load-spaces = Spatiile nu au putut fi incarcate
error-create-space = Spatiul nu a putut fi creat
error-create-space-duplicate = Exista deja un spatiu pentru acest grup
error-update-space = Spatiul nu a putut fi actualizat
error-delete-space = Spatiul nu a putut fi sters
error-load-space = Spatiul nu a putut fi incarcat
error-add-member = Membrul nu a putut fi adaugat
error-update-member = Membrul nu a putut fi actualizat
error-remove-member = Membrul nu a putut fi eliminat
error-fetch-content = Continutul nu a putut fi incarcat
error-move-content = Continutul nu a putut fi mutat
error-remove-content = Continutul nu a putut fi eliminat
error-load-available-content = Continutul nu a putut fi incarcat
error-load-messages = Mesajele nu au putut fi incarcate
error-load-linked-chat = Conversatia legata nu a putut fi gasita
error-load-linked-calendar = Calendarul partajat legat nu a putut fi gasit
error-load-meetings = Intalnirile nu au putut fi incarcate
error-load-folders = Dosarele nu au putut fi incarcate
error-create-folder = Dosarul nu a putut fi creat
error-update-folder = Dosarul nu a putut fi actualizat
error-delete-folder = Dosarul nu a putut fi sters
error-load-space-activity = Activitatea spatiului nu a putut fi incarcata
