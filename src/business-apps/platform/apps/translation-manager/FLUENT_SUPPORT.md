# Translation Manager - Fluent Syntax Support

## ✅ Unterstützte Features

### 1. Simple Text ✅

```ftl
app-name = Fluent Translation System
```

**Translation Manager**: Zeigt einfachen Text in einer Zeile.

---

### 2. Variables ✅

```ftl
welcome-user = Welcome, { $name }!
user-info = { $firstName } { $lastName } ({ $email })
```

**Translation Manager**:

- Zeigt komplette Syntax mit `{ $var }`
- Variablen werden korrekt serialisiert

---

### 3. Number Formatting ✅

```ftl
file-size = File size: { $bytes } bytes
price = Price: { NUMBER($amount, style: "currency", currency: "EUR") }
percentage = Progress: { NUMBER($value, style: "percent") }
```

**Translation Manager**:

- `NUMBER()` Funktion wird korrekt serialisiert
- Named arguments (`style: "currency"`) werden dargestellt
- Komplette Syntax bleibt erhalten

---

### 4. Date/Time Formatting ✅

```ftl
last-updated = Last updated: { DATETIME($date) }
meeting-time = Meeting: { DATETIME($datetime, dateStyle: "short", timeStyle: "short") }
```

**Translation Manager**:

- `DATETIME()` Funktion wird korrekt serialisiert
- Named arguments werden dargestellt

---

### 5. Selectors (Simple Plurals) ✅

```ftl
items-count = { $count ->
    [one] { $count } item selected
   *[other] { $count } items selected
}
```

**Translation Manager**:

- **Gesplittet in einzelne Zeilen**:
  - `items-count[one]` → `item selected` (nur editierbarer Text)
  - `items-count[other]` → `items selected` (nur editierbarer Text)
- Variablen wie `{ $count }` werden **nicht** in den editierbaren Zeilen angezeigt
- Komplette Selector-Syntax wird beim Speichern rekonstruiert

---

### 6. Ordinals ✅

```ftl
rank-position = { NUMBER($pos, type: "ordinal") ->
   [1] You finished 1st!
   [one] You finished { $pos }st
  *[other] You finished { $pos }th
}
```

**Translation Manager**:

- **Gesplittet in einzelne Zeilen**:
  - `rank-position[1]` → `You finished 1st!`
  - `rank-position[one]` → `You finished st` (ohne Variable)
  - `rank-position[other]` → `You finished th` (ohne Variable)
- `NUMBER($pos, type: "ordinal")` als Selector wird korrekt rekonstruiert

---

### 7. Custom Selectors ✅

```ftl
user-role = { $role ->
   [admin] Administrator Access
   [editor] Editor Permissions
  *[other] Unknown Role
}
```

**Translation Manager**:

- **Gesplittet in einzelne Zeilen**:
  - `user-role[admin]` → `Administrator Access`
  - `user-role[editor]` → `Editor Permissions`
  - `user-role[other]` → `Unknown Role`

---

### 8. Attributes ✅

```ftl
login-input = Login
    .placeholder = Enter your username
    .aria-label = Username input field
```

**Translation Manager**:

- **Drei separate Zeilen**:
  - `login-input` → `Login` (Hauptwert)
  - `login-input.placeholder` → `Enter your username`
  - `login-input.aria-label` → `Username input field`
- Attributes werden als separate Keys behandelt

---

### 9. Message References ✅

```ftl
app-title = Fluent Demo
page-title = { app-title } - Settings
```

**Translation Manager**:

- `{ app-title }` wird korrekt als `MessageReference` serialisiert
- Zeigt: `{ app-title } - Settings`

---

### 10. Multiline Text ✅

```ftl
terms-of-service =
    By using this service, you agree to our terms.

    This is a multi-line text block.
```

**Translation Manager**:

- Textarea mit `gba:min-h-20` erlaubt mehrzeilige Eingabe
- Whitespace wird beibehalten

---

### 11. Special Characters ✅

```ftl
curly-braces = Use \{ and \} for literal braces
backslash = Path: C:\\Users\\Documents
```

**Translation Manager**:

- Escaping bleibt erhalten beim Serialisieren
- `\{`, `\}`, `\\` werden korrekt dargestellt

---

### 12. Comments ✅

```ftl
# This is a comment
```

**Translation Manager**:

- Kommentare werden vom Parser ignoriert
- Bleiben in FTL-Dateien erhalten beim Speichern

---

### 13. Complex Combinations ✅

```ftl
file-upload-status = { $status ->
   [uploading] Uploading { $fileName } ({ NUMBER($progress, style: "percent") })
   [completed] { $fileName } uploaded successfully
  *[pending] Waiting to upload { $fileName }
}
```

**Translation Manager**:

- **Gesplittet in einzelne Zeilen**:
  - `file-upload-status[uploading]` → `Uploading ({ NUMBER($progress, style: "percent") })`
  - `file-upload-status[completed]` → `uploaded successfully`
  - `file-upload-status[pending]` → `Waiting to upload`
- Kombiniert Selektoren + Variablen + Funktionen
- Text ohne Variablen (`{ $fileName }`) wird extrahiert

---

### 14. Nested Selectors ✅

```ftl
notification = { $type ->
   [message] { $count ->
       [one] You have 1 new message
      *[other] You have { $count } new messages
   }
   [friend-request] { $count ->
       [one] 1 friend request
      *[other] { $count } friend requests
   }
  *[other] { $count } notifications
}
```

**Translation Manager**:

- **Als EINE komplette Zeile** (nicht gesplittet wegen Verschachtelung)
- Zeigt komplette verschachtelte Selector-Struktur:
  ```
  { $type ->
       [message] { $count ->
           [one] You have 1 new message
          *[other] You have { $count } new messages
       }
       ...
  }
  ```
- Erlaubt komplette Bearbeitung der Struktur in einem Textarea

---

## Zusammenfassung

### Was funktioniert perfekt:

✅ Alle Fluent-Syntax-Features werden korrekt geparst  
✅ Simple Selektoren werden in editierbare Zeilen gesplittet  
✅ Nested Selektoren werden als komplette Struktur angezeigt  
✅ Attributes werden als separate Keys behandelt  
✅ Funktionen (`NUMBER`, `DATETIME`) werden korrekt serialisiert  
✅ Message References werden unterstützt  
✅ Variablen bleiben in komplexen Messages erhalten  
✅ Nur reiner Text wird in Selector-Varianten extrahiert

### Verbesserungen:

- Simple Selektoren: **Nur editierbarer Text** wird angezeigt (keine Variablen)
- Nested Selektoren: **Komplette Struktur** (da zu komplex zum Splitten)
- Attributes: **Separate Keys** (`id.placeholder`)
- Functions: **Vollständige Serialisierung** mit allen Parametern
