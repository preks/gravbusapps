# Content Platform - Publishing Guide

## 📋 Übersicht

Die Content-Plattform besteht aus 5 publishable screens:

- 2 Apps (content-hub, content-management)
- 2 Forms (content-form, document-form)
- 1 Record (content-record)

## 🚀 Publishing Commands

### Option 1: Einzeln publishen

```bash
# Content Hub App (Haupt-App mit 4 Tabs)
npm run publish:screen -- /core/every/apps/content-hub

# Content Management App (Admin-Interface)
npm run publish:screen -- /core/every/apps/content-management

# Content Form (Create/Edit Content)
npm run publish:screen -- /core/every/forms/content-form

# Document Form (Upload Documents)
npm run publish:screen -- /core/every/forms/document-form

# Content Record (Detail View)
npm run publish:screen -- /core/every/records/content-record
```

### Option 2: Alle auf einmal publishen

```bash
# Apps
npm run publish:screen -- /core/every/apps/content-hub; npm run publish:screen -- /core/every/apps/content-management

# Forms
npm run publish:screen -- /core/every/forms/content-form; npm run publish:screen -- /core/every/forms/document-form

# Records
npm run publish:screen -- /core/every/records/content-record
```

### Option 3: Mit Resource URL Prompts

```bash
# Mit -r oder --resource flag für Resource URL creation
npm run publish:screen -- /core/every/apps/content-hub -r
npm run publish:screen -- /core/every/apps/content-management -r
npm run publish:screen -- /core/every/forms/content-form -r
npm run publish:screen -- /core/every/forms/document-form -r
npm run publish:screen -- /core/every/records/content-record -r
```

## 📦 Was wird gepublished?

### content-hub

**Beschreibung:** Intranet/Content-Plattform mit 4 Content-Typen
**Features:**

- News Feed mit Featured Articles
- Intranet Feed
- Knowledge Base Feed
- Document Library Feed
- Search & Category Filtering
- Responsive Design

**Entry Point:** `src/wrapped-entries/core/every/apps/content-hub.ts`
**Main Component:** `src/business-apps/core/every/apps/content-hub/Intranet.tsx`

### content-management

**Beschreibung:** Admin-Interface für Content-Verwaltung
**Features:**

- Table view aller Contents
- Pagination & Search
- Sorting
- Quick Actions

**Entry Point:** `src/wrapped-entries/core/every/apps/content-management.ts`
**Main Component:** `src/business-apps/core/every/apps/content-management/ContentManagement.tsx`

### content-form

**Beschreibung:** Formular zum Erstellen/Bearbeiten von Content
**Features:**

- Group & Type Selection
- Title & Preview
- Content Editor
- Settings (Author, Comments, Likes)
- Validation

**Entry Point:** `src/wrapped-entries/core/every/forms/content-form.ts`
**Main Component:** `src/business-apps/core/every/forms/content-form/ContentForm.tsx`

### document-form

**Beschreibung:** Formular zum Upload von Dokumenten
**Features:**

- File Upload
- Category Selection
- Title & Description
- Settings

**Entry Point:** `src/wrapped-entries/core/every/forms/document-form.ts`
**Main Component:** `src/business-apps/core/every/forms/document-form/DocumentForm.tsx`

### content-record

**Beschreibung:** Detail-Ansicht für einzelnen Content
**Features:**

- Full Content Display
- Author Info
- Stats (Likes, Comments, Shares)
- Back Navigation
- Tags Display

**Entry Point:** `src/wrapped-entries/core/every/records/content-record.ts`
**Main Component:** `src/business-apps/core/every/records/content-record/ContentRecord.tsx`

## 🔗 Integration Points

### Required Props (BusinessAppContextProps)

Alle Komponenten erwarten:

```typescript
interface BusinessAppContextProps {
  accessToken?: string
  userInfo?: {
    employeeDetails?: {
      employeeId?: string
    }
  }
  // ... weitere optional props
}
```

### Custom Props

**content-form:**

```typescript
{
  contentId?: string  // Für Edit-Mode
}
```

**document-form:**

```typescript
{
  documentId?: string  // Für Edit-Mode
}
```

**content-record:**

```typescript
{
  contentId?: string  // Content ID zum Anzeigen
}
```

## 📡 Backend Requirements

### GraphQL Endpoints

Die Apps benötigen folgende GraphQL Queries:

- `ArticleEmployeeView` - Main content query
- `ArticleEmployeeViewAggregate` - Count aggregation
- `Tag` - Tags list
- `ArticleGroup` - Content groups
- `ArticleType` - Content types

### Expected Data

```graphql
ArticleEmployeeView {
  articleId
  title
  previewText
  content
  articleGroupRef  # "ArticleGroup:v1:NEWS|INTRANET|KNOWLEDGE|DOCUMENT"
  articleTypeRef   # "ArticleType:v1:CATEGORY_NAME"
  contentImage
  author {
    userId
    firstName
    lastName
    jobPosition
    avatar
  }
  tags { tag_id, tag }
  likesCount
  commentsCount
  shareCount
  createdAt
  status
  # ... weitere Felder
}
```

## 🎨 Styling & Design

### Design System

- Alle Components nutzen `@newwork/nw-design-system`
- Tailwind classes mit `gba:` prefix
- Design tokens für Farben
- Responsive breakpoints

### Themes

- Light/Dark mode ready
- Color tokens anpassbar
- Consistent spacing

## 🧪 Testing

### data-testid Patterns

```
content-hub
content-hub-tab-{type}
content-hub-content-{type}
{type}-feed
content-card-{id}
content-nav-tag-{category}
content-search-input
{type}-feed-load-more
content-form-{field}-{element}
document-form-{field}-{element}
content-record
content-record-back-button
```

## 🔍 Troubleshooting

### Häufige Probleme

**Problem:** GraphQL Query schlägt fehl
**Lösung:** Prüfe ob ArticleEmployeeView im Backend existiert

**Problem:** AccessToken fehlt
**Lösung:** Prüfe BusinessAppContextProps Integration

**Problem:** Styling funktioniert nicht
**Lösung:** Stelle sicher dass `gba:` Präfix vorhanden ist

**Problem:** Forms werden nicht angezeigt
**Lösung:** Prüfe wrapWithUiCatalog Export

## 📝 Post-Publishing Tasks

Nach dem Publishing:

1. ✅ Teste alle 5 Screens in der Platform
2. ✅ Prüfe ob GraphQL Queries funktionieren
3. ✅ Teste Search & Filter Funktionalität
4. ✅ Prüfe Responsive Design
5. ✅ Teste Form Submissions
6. ⏳ i18n Translation Keys hinzufügen
7. ⏳ AppActionButton in ContentManagement integrieren

## 🎯 Success Criteria

Nach erfolgreichem Publishing sollte folgendes funktionieren:

- [ ] Content Hub öffnet mit 4 Tabs
- [ ] Alle Feeds zeigen Contents an
- [ ] Search funktioniert
- [ ] Category Filter funktioniert
- [ ] Pagination lädt mehr Content
- [ ] Content Management zeigt Table an
- [ ] Forms öffnen und können ausgefüllt werden
- [ ] Content Record zeigt Detail-Ansicht
- [ ] Keine Console Errors
- [ ] Responsive auf allen Devices

## 📞 Support

Bei Problemen:

1. Prüfe Browser Console für Errors
2. Prüfe Network Tab für failed requests
3. Prüfe ob accessToken korrekt übergeben wird
4. Konsultiere README.md und FINAL_STATUS.md
