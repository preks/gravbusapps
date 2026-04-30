# file-meta: {
#   "status": "approved",
#   "updatedBy": "translator@newwork.se",
#   "updatedAt": "2025-01-15T10:30:00Z",
#   "reviewedAt": "2025-12-31T23:59:59Z",
#   "reviewedBy": "reviewer@newwork.se",
#   "reviewedKeys": ["save", "cancel", "delete", "edit", "create", "update", "close", "submit", "error", "success", "warning", "info", "retry", "load_more", "loading", "search", "no_results", "no_data", "welcome-title", "app-name", "welcome-user", "user-info", "file-size", "price", "percentage", "last-updated", "meeting-time", "items-count", "unread-emails", "rank-position", "user-role", "login-input", "app-title", "page-title", "terms-of-service", "curly-braces", "backslash", "non-breaking-space", "file-upload-status", "notification"],
#   "notes": "Source locale - all keys reviewed and approved. Review date set in future to indicate stable baseline."
# }

# Common actions
save = Save
cancel = Cancel
delete = Delete
edit = Edit
create = Create
update = Update
close = Close
submit = Submit

# Common labels
error = Error
success = Success
warning = Warning
info = Info
retry = Retry
load_more = Load More
loading = Loading
search = Search

# Common messages
no_results = No results found
no_data = No data available
editor-list-bullets = Bullets
editor-list-numbering = Numbering
editor-list-none = None
editor-list-outdent = Outdent
editor-list-indent = Indent

## 1. SIMPLE TEXT
welcome-title = Localization Example
app-name = Fluent Translation System

## 2. VARIABLES (Placeables)
# Single variable
welcome-user = Welcome, { $name }!
# Multiple variables
user-info = { $firstName } { $lastName } ({ $email })

## 3. NUMBER FORMATTING
# Implicit formatting (automatic thousands separator)
file-size = File size: { $bytes } bytes
# Explicit formatting with options
price = Price: { NUMBER($amount, style: "currency", currency: "EUR") }
percentage = Progress: { NUMBER($value, style: "percent") }

## 4. DATE/TIME FORMATTING
last-updated = Last updated: { DATETIME($date) }
meeting-time = Meeting: { DATETIME($datetime, dateStyle: "short", timeStyle: "short") }

## 5. SELECTORS (Plurals)
# Cardinal plurals (one/other)
items-count = { $count ->
    [one] { $count } item selected
   *[other] { $count } items selected
}
# With zero case
unread-emails = { $count ->
    [0] No unread emails
    [one] 1 unread email
   *[other] { $count } unread emails
}

## 6. ORDINALS
# Ordinal plurals (1st, 2nd, 3rd, 4th)
rank-position = { NUMBER($pos, type: "ordinal") ->
   [1] You finished 1st!
   [one] You finished { $pos }st
   [two] You finished { $pos }nd
   [few] You finished { $pos }rd
  *[other] You finished { $pos }th
}

## 7. GENDER/CUSTOM SELECTORS
# String-based selector
user-role = { $role ->
   [admin] Administrator Access
   [editor] Editor Permissions
   [viewer] View-Only Access
  *[other] Unknown Role
}

## 8. ATTRIBUTES
# Message with attributes (e.g., for aria-label, placeholder)
login-input = Login
    .placeholder = Enter your username
    .aria-label = Username input field

## 9. REFERENCING OTHER MESSAGES
app-title = Fluent Demo
page-title = { app-title } - Settings

## 10. MULTILINE TEXT
terms-of-service = 
    By using this service, you agree to our terms.
    
    This is a multi-line text block that preserves
    line breaks and formatting.

## 11. SPECIAL CHARACTERS
# Using quoted text to escape special characters
curly-braces = Use {"{"} and {"}"} for literal braces
backslash = Path: {"C:\\Users\\Documents"}
non-breaking-space = Privacy{"\u00A0"}Policy

## 12. COMMENTS
# This is a comment - it won't be shown to users
# Comments help translators understand context

## 13. COMPLEX COMBINATIONS
# Combining selectors with variables and formatting
file-upload-status = { $status ->
   [uploading] Uploading { $fileName } ({ NUMBER($progress, style: "percent") })
   [completed] { $fileName } uploaded successfully
   [failed] Failed to upload { $fileName }
  *[pending] Waiting to upload { $fileName }
}

## 14. NESTED SELECTORS
# Advanced: selector within selector
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

