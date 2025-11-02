# ============================================
# FLUENT SYNTAX EXAMPLES - Referință Completă
# ============================================

## 1. TEXT SIMPLU
welcome-title = Exemplu de Localizare
app-name = Sistem de Traducere Fluent

## 2. VARIABILE (Placeables)
# Variabilă singulară
welcome-user = Bun venit, { $name }!
# Variabile multiple
user-info = { $firstName } { $lastName } ({ $email })

## 3. FORMATARE NUMERE
# Formatare implicită (separator de mii automat)
file-size = Dimensiune fișier: { $bytes } bytes
# Formatare explicită cu opțiuni
price = Preț: { NUMBER($amount, style: "currency", currency: "EUR") }
percentage = Progres: { NUMBER($value, style: "percent") }

## 4. FORMATARE DATĂ/ORĂ
last-updated = Ultima actualizare: { DATETIME($date) }
meeting-time = Întâlnire: { DATETIME($datetime, dateStyle: "short", timeStyle: "short") }

## 5. SELECTORI (Plural)
# Plural cardinal (one/few/other în română)
items-count = { $count ->
    [one] { $count } element selectat
    [few] { $count } elemente selectate
   *[other] { $count } de elemente selectate
}
# Cu caz zero
unread-emails = { $count ->
    [0] Niciun email necitit
    [one] 1 email necitit
    [few] { $count } emailuri necitite
   *[other] { $count } de emailuri necitite
}

## 6. ORDINALE
# Plural ordinal (1-ul, 2-lea, 3-lea)
rank-position = { NUMBER($pos, type: "ordinal") ->
   [1] Ai terminat pe locul 1!
   [one] Ai terminat pe locul { $pos }-lea
  *[other] Ai terminat pe locul { $pos }-lea
}

## 7. GEN/SELECTORI PERSONALIZAȚI
# Selector bazat pe șir
user-role = { $role ->
   [admin] Acces Administrator
   [editor] Permisiuni Editor
   [viewer] Acces Doar Vizualizare
  *[other] Rol Necunoscut
}

## 8. ATRIBUTE
# Mesaj cu atribute (de ex., pentru aria-label, placeholder)
login-input = Autentificare
    .placeholder = Introduceți numele de utilizator
    .aria-label = Câmp de intrare nume utilizator

## 9. REFERINȚE LA ALTE MESAJE
app-title = Demo Fluent
page-title = { app-title } - Setări

## 10. TEXT PE MULTIPLE LINII
terms-of-service = 
    Prin utilizarea acestui serviciu, sunteți de acord cu termenii noștri.
    
    Acesta este un bloc de text pe multiple linii care păstrează
    întreruperile de linie și formatarea.

## 11. CARACTERE SPECIALE
# Utilizare text citat pentru caractere speciale
curly-braces = Folosește {"{"} și {"}"} pentru acolade literale
backslash = Cale: {"C:\\Users\\Documents"}
non-breaking-space = Confidențialitate{"\u00A0"}Politică

## 12. COMENTARII
# Acesta este un comentariu - nu va fi afișat utilizatorilor
# Comentariile îi ajută pe traducători să înțeleagă contextul

## 13. COMBINAȚII COMPLEXE
# Combinare selectori cu variabile și formatare
file-upload-status = { $status ->
   [uploading] Se încarcă { $fileName } ({ NUMBER($progress, style: "percent") })
   [completed] { $fileName } încărcat cu succes
   [failed] Eșec la încărcarea { $fileName }
  *[pending] În așteptare pentru încărcarea { $fileName }
}

## 14. SELECTORI IMBRICAȚI
# Avansat: selector în selector
notification = { $type ->
   [message] { $count ->
       [one] Ai 1 mesaj nou
       [few] Ai { $count } mesaje noi
      *[other] Ai { $count } de mesaje noi
   }
   [friend-request] { $count ->
       [one] 1 cerere de prietenie
       [few] { $count } cereri de prietenie
      *[other] { $count } de cereri de prietenie
   }
  *[other] { $count } notificări
}
