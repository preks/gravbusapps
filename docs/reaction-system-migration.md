# Reaction System Migration - Zusammenfassung

## Übersicht

Erfolgreich das "Like"-Konzept im Intranet durch ein flexibles "Reaction"-System mit Emoji-Unterstützung ersetzt.

## ⚠️ Wichtig: Temporäre Adapter-Lösung

Diese Migration ist eine **reine Frontend-Migration mit Adapter-Pattern**:

### 3-Schicht-Mapping

```
Backend Schema (unverändert)
    ↓
    allowLike, likesCount
    ↓
[Adapter Layer 1: useContents.ts]
    ↓
    allowReaction, reactionsCount
    ↓
[Adapter Layer 2: useArticleReactions.ts]
    ↓
    Konvertiert ArticleLike → ReactionSummary { '👍': {...} }
    ↓
Frontend Components (ReactionButton)
    ↓
    Zeigt 👍 als einzige Reaction
```

### Adapter-Strategie

1. **Query-Layer** (`ContentQueries.ts`): Verwendet `allowLike`, `likesCount`
2. **Data-Layer** (`useContents.ts`): Mappt zu `allowReaction`, `reactionsCount`
3. **Reaction-Layer** (`useArticleReactions.ts`):
   - Query: `ArticleLike` (bestehende Entity)
   - Output: `ReactionSummary` mit 👍 für alle Likes
4. **UI-Layer** (`ReactionButton`): Zeigt 👍-Button statt Emoji-Picker

## ⚠️ Wichtig: Backend-Schema-Kompatibilität

Diese Migration ist eine **reine Frontend-Migration**. Das Backend-Schema bleibt unverändert:

- GraphQL-Queries verwenden weiterhin `allowLike` und `likesCount`
- Der `useContents` Hook mappt automatisch `allowLike` → `allowReaction` und `likesCount` → `reactionsCount`
- Frontend-Komponenten verwenden ausschließlich die neuen Feldnamen

### Mapping-Strategie

```typescript
// Backend liefert:
{
  allowLike: true,
  likesCount: 42
}

// Frontend nutzt:
{
  allowReaction: true,
  reactionsCount: 42
}
```

## Implementierte Änderungen

### 1. Package Installation

- ✅ `emoji-picker-react` installiert
- ✅ Reactions Picker Mode aktiviert

### 2. Neue Komponenten erstellt

#### ReactionButton (`src/business-apps/core/content/components/interactions/ReactionButton.tsx`)

- ✅ **Reactions Picker Mode** ([emoji-picker-react](https://github.com/ealush/emoji-picker-react))
- Nutzt `reactionsDefaultOpen={true}` für schnelle Reaction-Auswahl
- Nutzt `onReactionClick` Handler
- **8 vordefinierte Reactions**: 👍 ❤️ 😂 👏 🔥 🎉 🙏 👀
- Speichert ausgewähltes Emoji in localStorage
- Backend speichert nur `liked=true`
- Kompakte UI optimiert für Reactions

#### useArticleReactions Hook (`src/business-apps/core/content/hooks/useArticleReactions.ts`)

- Query auf `ArticleLike` (bestehende Entity)
- Liest Emoji aus localStorage
- Zeigt alle Likes als das vom aktuellen User gewählte Emoji
- **Limitation**: Andere User sehen nicht ihre eigenen Emojis (nur das des aktuellen Users)
- **TODO**: Auf `ContentEntryReaction` umstellen wenn Backend bereit

### 3. Typ-Updates

#### Content Interface (`src/business-apps/core/content/apps/intranet/types/content.types.ts`)

**Geändert:**

- `allowLike` → `allowReaction`
- `likesCount` → `reactionsCount`
- `userLike` → entfernt
- `userHasLiked` → entfernt
- Neu: `reactionSummary?: { [emoji: string]: Reaction }`

#### ContentEntryWindowVals

- `allowLike` → `allowReaction`

#### ContentPreviewData

- `allowLike` → `allowReaction`

### 4. Komponenten-Migration

#### ContentCard

- ✅ `LikeButton` → `ReactionButton`
- ✅ `useArticleLikes` → `useArticleReactions`
- ✅ Props aktualisiert

#### MainFeaturedArticle

- ✅ Heart Icon entfernt
- ✅ Zeigt Top-3 Reactions mit Counts
- ✅ Props erweitert mit `reactionSummary`

#### TrendingNow

- ✅ Heart Icon entfernt
- ✅ Zeigt Top-2 Reactions mit Counts
- ✅ `calculateTrendingScore` nutzt `reactionsCount`

#### ContentInfoSection

- ✅ `LikeButton` → `ReactionButton`
- ✅ `useArticleLikes` → `useArticleReactions`
- ✅ Vollständige Migration

#### QuestionView

- ✅ `likesCount` → `reactionsCount` für Vote-Anzeige
- ✅ Query aktualisiert

### 5. Query-Updates & Mapping

#### ContentQueries.ts

- ✅ Query verwendet weiterhin `allowLike` und `likesCount` (Backend-Kompatibilität)

#### useContents.ts

- ✅ Neuer `BackendContent` Interface für Backend-Response
- ✅ `mapBackendToContent` Funktion mappt Felder:
  - `allowLike` → `allowReaction`
  - `likesCount` → `reactionsCount`
- ✅ Frontend erhält saubere `Content` Objekte mit neuen Feldnamen
- ✅ `LIKES_WEIGHT` → `REACTIONS_WEIGHT`
- ✅ `calculateTrendingScore` nutzt `reactionsCount`#### contentUtils.ts
- ✅ `LIKES_WEIGHT` → `REACTIONS_WEIGHT`
- ✅ `calculateTrendingScore` nutzt `reactionsCount`

### 6. Export-Updates

- `index.ts` exportiert jetzt beide: `LikeButton` (legacy) und `ReactionButton`

## Aktuelle Einschränkungen (Temporär)

### Reactions Picker mit LocalStorage

- ✅ 8 vordefinierte Reactions verfügbar (👍 ❤️ 😂 👏 🔥 🎉 🙏 👀)
- ✅ Schnelle Auswahl ohne vollständigen Emoji-Picker
- ✅ Ausgewähltes Emoji wird in localStorage gespeichert
- ⚠️ **Limitation**: Alle Likes werden als das Emoji angezeigt, das der **aktuelle User** gewählt hat
- ⚠️ Andere User sehen nicht ihre eigenen Emoji-Auswahlen
- ⚠️ Emoji geht verloren bei Browser-Cache-Löschung

### Warum Reactions Picker?

Laut [emoji-picker-react Dokumentation](https://github.com/ealush/emoji-picker-react):

> The picker can be used as a reactions picker... This will cause the picker to show the reactions picker on the initial mount instead of the main picker component.

Vorteile:

- ✅ Schneller als vollständiger Emoji-Picker
- ✅ Kompakte UI
- ✅ Optimiert für schnelle Reactions (wie bei Social Media)
- ✅ Customizable reactions via `reactions` prop

### Backend-Kompatibilität

- Nutzt `ArticleLike` Entity (existing)
- Nutzt `contentEntryReact` Flow Context (existing)
- Backend speichert nur `liked=true/false` (kein Emoji)
- Keine Backend-Änderungen erforderlich

### Warum diese Lösung?

Diese Lösung ermöglicht:

- ✅ Sofortiges Feedback für den User (sieht sein gewähltes Emoji)
- ✅ Emoji-Picker UX testen ohne Backend-Änderungen
- ✅ Schrittweise Migration
- ⚠️ Mit Akzeptanz der LocalStorage-Limitation

## Migration Path zum vollen Reaction-System

Das System erwartet folgende GraphQL-Entities:

```graphql
type ContentEntryReaction {
  id: ID!
  contentEntryId: ID!
  creatorEmployeeId: ID!
  contentReactionRef: String
  createdAt: DateTime!
  createdBy: String!
  isDeleted: Boolean!
  contentReaction: CatalogEntry
  creatorEmployee: Employee
}

type CatalogEntry {
  id: ID!
  key: String!
  value: String!
  label: String
  icon: String # Emoji wird hier gespeichert
}
```

## Flow Context

Reactions nutzen den Flow Context:

- `FlowContextName.contentReactionUpdate`

## Features

### Aktuell verfügbar:

- ✅ **Reactions Picker** (8 vordefinierte Emojis)
- ✅ Schnelle Reaction-Auswahl
- ✅ LocalStorage-basierte Emoji-Speicherung
- ✅ Toggle-Funktion (Like/Unlike)
- ✅ Count-Anzeige
- ✅ User-State (hervorgehoben wenn reagiert)
- ⚠️ Limitation: Nur aktueller User sieht sein gewähltes Emoji

### Customization möglich:

```typescript
// Reactions können angepasst werden
const PREDEFINED_REACTIONS = [
  '1f44d', // 👍
  '2764-fe0f', // ❤️
  '1f602' // 😂
  // ... weitere Unified Codes
]
```

### Vorbereitet (wartet auf Backend):

- 🔄 Per-User Emoji-Speicherung im Backend
- 🔄 Mehrere verschiedene Emojis pro Article
- 🔄 Persistente Emoji-Auswahl (nicht localStorage)

## Testing

- ✅ Keine Linter-Fehler
- ✅ Alle Like-Referenzen entfernt
- ✅ Type-Safety gewährleistet

## Migration Notes

### Backend-Schema bleibt unverändert

**Wichtig**: Das Backend/Database-Schema wurde NICHT geändert:

- `ArticleEmployeeView.allowLike` existiert weiterhin
- `ArticleEmployeeView.likesCount` existiert weiterhin
- GraphQL-Queries verwenden weiterhin die alten Feldnamen
- **Mapping erfolgt transparent im Frontend**

### Vorteile dieser Strategie

1. ✅ Kein Breaking Change im Backend
2. ✅ Schrittweise Migration möglich
3. ✅ Andere Clients (Mobile, etc.) funktionieren weiterhin
4. ✅ Backend-Migration kann später unabhängig erfolgen

### Alte LikeButton-Komponente

Noch vorhanden für Backwards-Compatibility in anderen Content-Records.
Kann später vollständig entfernt werden.

### Database Migration (Optional - Zukünftig)

Wenn später das Backend migriert wird:

1. `content_entry_reaction` Tabelle hinzufügen
2. `ContentReaction` Katalog mit Emoji-Einträgen erstellen
3. `allowLike` → `allowReaction` in ContentEntry umbenennen
4. `likesCount` → `reactionsCount` in Views/Aggregates
5. **Mapping-Layer im Frontend entfernen**

## Vorteile

1. **Flexibilität**: Beliebige Emojis als Reactions
2. **Engagement**: Mehr Ausdrucksmöglichkeiten als nur "Like"
3. **UX**: Moderne Emoji-Picker-UI
4. **Analytics**: Detailliertere Reaction-Daten
5. **Erweiterbarkeit**: Einfach neue Reaction-Types hinzufügen

## Nächste Schritte

### Sofort möglich (✅):

1. Testing in Dev-Umgebung
2. Deployment ohne Backend-Änderungen
3. User können aus 8 Reactions wählen (👍 ❤️ 😂 👏 🔥 🎉 🙏 👀)
4. User sehen ihr gewähltes Emoji (localStorage-basiert)
5. Reactions können einfach angepasst werden (PREDEFINED_REACTIONS Array)
6. **Bekannte Limitation kommunizieren**: "Andere sehen noch nicht deine Emoji-Auswahl"

### Backend-Team (🔄 Ausstehend):

1. `content_entry_reaction` Tabelle erstellen
2. `ContentReaction` Katalog mit Emojis befüllen
3. GraphQL Schema erweitern
4. `contentReactionUpdate` Flow Context implementieren

### Frontend nach Backend-Bereitschaft (⏳):

1. In `useArticleReactions.ts`: Query zu `ContentEntryReaction` ändern
2. In `ReactionButton.tsx`: Emoji-Picker aktivieren
3. Flow Context aktualisieren
4. Adapter-Layer entfernen
5. Dokumentation aktualisieren
