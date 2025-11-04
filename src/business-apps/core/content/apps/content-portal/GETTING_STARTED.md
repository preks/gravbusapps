# Content Hub - Getting Started

## Quick Start

### Development

Die Content Hub App ist sofort einsatzbereit und kann lokal getestet werden.

### Publishing

**Content Hub App:**

```bash
npm run publish:screen -- /core/every/apps/content-hub
```

**Content Management App:**

```bash
npm run publish:screen -- /core/every/apps/content-management
```

## Features Overview

### Content Hub (User-Facing)

Die Content Hub App bietet eine vollständige Intranet/Content-Plattform mit 4 Haupt-Bereichen:

#### 1. News Tab

- Featured Articles (erste 2 Artikel prominent)
- Kategorie-Filter: Achievements, Company Updates, Tech News
- Debounced Search (500ms)
- Pagination mit "Load More"
- Company News Banner

#### 2. Intranet Tab

- 3-spalten Grid-Layout
- Full-width Search
- Pagination
- Intranet Welcome Banner

#### 3. Knowledge Tab

- 3-spalten Grid-Layout
- Kategorie-Filter: User Guides, Onboarding, Compliance
- Search
- Pagination
- Knowledge Subtitle Banner

#### 4. Documents Tab (NEU)

- 3-spalten Grid-Layout
- Kategorie-Filter: Policies, Templates, Reports
- Search
- Pagination
- Documents Banner

### Content Management (Admin)

Verwaltungsoberfläche für alle Content-Typen:

- Tabellen-basierte Liste
- Pagination (20 Items pro Seite)
- Search
- Sorting
- Quick Actions (Edit)
- Error Handling mit Retry

## Component Architecture

### Data Flow

```
BusinessAppContextProps (accessToken)
  ↓
Intranet.tsx / ContentManager.tsx
  ↓
Feed Components (NewsFeed, IntranetFeed, etc.)
  ↓
useContents Hook
  ↓
useGraphQLClient + GraphQL Query
  ↓
ArticleEmployeeView (Backend)
```

### Component Hierarchy

```
Intranet
├── Tabs Navigation
│   ├── News Tab → NewsFeed
│   │   ├── Banner
│   │   ├── Featured Articles (ContentCard x2)
│   │   ├── NavigationTagList (Categories)
│   │   ├── SearchInput
│   │   ├── Regular Articles (ContentCard grid)
│   │   └── Load More Button
│   ├── Intranet Tab → IntranetFeed
│   │   ├── Banner
│   │   ├── SearchInput
│   │   ├── Content Grid (ContentCard x12)
│   │   └── Load More Button
│   ├── Knowledge Tab → KnowledgeFeed
│   │   ├── Banner
│   │   ├── NavigationTagList (Categories)
│   │   ├── SearchInput
│   │   ├── Content Grid (ContentCard x12)
│   │   └── Load More Button
│   └── Documents Tab → DocumentFeed
│       ├── Banner
│       ├── NavigationTagList (Categories)
│       ├── SearchInput
│       ├── Content Grid (ContentCard x12)
│       └── Load More Button
```

## GraphQL Integration

### Queries

**Main Query:** `GET_ALL_CONTENTS_QUERY`

- Filters: search, contentGroupRef, contentTypeRef, tags, creationDate
- Sorting: field + order (ascend/descend)
- Pagination: offset + limit
- Returns: ArticleEmployeeView + Aggregate Count

**Supporting Queries:**

- `GET_CONTENT_TAGS_QUERY` - Fetch available tags
- `GET_CONTENT_GROUPS_QUERY` - Fetch content groups (News, Intranet, etc.)
- `GET_CONTENT_TYPES_QUERY` - Fetch content types (Categories)

### Data Hooks

**useContents** - Multiple contents with pagination

```typescript
const { data, totalCount, isLoading, error, refetch } = useContents(
  {
    offset: 0,
    limit: 20,
    search: 'query',
    contentGroupRef: 'ContentGroup:v1:NEWS',
    sorter: { field: 'createdAt', order: 'descend' }
  },
  accessToken
)
```

**useContent** - Single content by ID

```typescript
const { item, isUpdating, error, contentNotFound } = useContent(contentId, accessToken)
```

## Styling Guide

### Design Tokens Usage

**Background Colors:**

```tsx
className = 'gba:bg-primary gba:text-primary-foreground'
className = 'gba:bg-card gba:text-card-foreground'
className = 'gba:bg-muted gba:text-muted-foreground'
```

**Interactive States:**

```tsx
className = 'hover:gba:bg-accent hover:gba:shadow-xl'
className = 'gba:border-border hover:gba:border-foreground'
```

**Spacing & Layout:**

```tsx
className = 'gba:p-4 gba:gap-6 gba:mb-6'
className = 'gba:grid gba:grid-cols-3 gba:max-w-[1300px]'
```

### Responsive Design

**Grid Layouts:**

- News Featured: 2 columns
- Regular Grid: 3 columns
- Mobile: Auto-adjust to 1 column (via nw-design-system)

**Max Width:**

- Content Container: `max-w-[1300px]`
- Search Input: `max-w-[400px]`
- Load More Button: `w-[280px]`

## Testing

### Data-TestIDs Pattern

**Format:** `{module}-{component}-{element}-{id?}`

**Examples:**

```
content-hub
content-hub-tab-news
content-hub-content-news
news-feed
content-card-123
content-nav-tag-All
news-feed-load-more
content-search-input
```

### Testing Checklist

- [ ] Tab Navigation funktioniert
- [ ] Search triggert GraphQL Query
- [ ] Category Filter aktualisiert Ergebnisse
- [ ] Pagination lädt weitere Inhalte
- [ ] Error States zeigen Retry-Button
- [ ] Empty States zeigen Meldung
- [ ] Loading States zeigen Spinner

## Troubleshooting

### GraphQL Errors

**Problem:** Query returns empty or errors
**Solution:** Prüfe ob ArticleEmployeeView in Backend existiert

### AccessToken Missing

**Problem:** Hook returns isLoading=false, data=[]
**Solution:** Prüfe ob context.accessToken übergeben wird

### Styling Issues

**Problem:** Tailwind classes funktionieren nicht
**Solution:** Stelle sicher dass `gba:` Präfix vorhanden ist

### Translation Keys Missing

**Problem:** Placeholder-Text wird angezeigt
**Solution:** i18n Keys in Translation-Dateien hinzufügen

## Migration from \_export

### Key Changes

| \_export (Original) | content-hub (Migrated)        |
| ------------------- | ----------------------------- |
| Next.js Pages       | React Component with Tabs     |
| useRouter           | Tab State Management          |
| useSwrGql           | useGraphQLClient + useState   |
| gravity-ui-catalog  | nw-design-system              |
| No prefix           | `gba:` prefix everywhere      |
| 3 Content Types     | 4 Content Types (+ Documents) |
| Platform URLs       | Tab Navigation                |

### What Was NOT Migrated

- ❌ Next.js Pages (`pages/`)
- ❌ Chat Integration (`nextgen-chat-integration/`)
- ❌ Platform Menu Mapping
- ❌ URLs Constants (replaced with Tab Navigation)

### What Was ADDED

- ✅ Document Module (komplett neu)
- ✅ BusinessAppContextProps Integration
- ✅ Complete Design System Migration
- ✅ Modern React Patterns (Hooks, Callbacks)
- ✅ Comprehensive data-testid Coverage

## API Requirements

Die Content-Plattform benötigt folgende Backend-Endpoints:

### GraphQL Queries Required:

1. `ArticleEmployeeView` - Main content query
2. `ArticleEmployeeViewAggregate` - Count aggregation
3. `Tag` - Tags list
4. `ContentGroup` - Content groups
5. `ArticleType` - Content types/categories

### GraphQL Mutations (for Forms - not yet implemented):

1. `CreateArticle` - Create new content
2. `UpdateArticle` - Update existing content
3. `DeleteArticle` - Delete content

## Performance Notes

### Optimization Strategies

- Debounced search (500ms)
- Pagination instead of infinite scroll
- useCallback für Event Handlers
- Conditional rendering für Empty/Error States

### Bundle Size

- nw-design-system: Shared chunk
- react-quill: Not yet loaded (Forms not implemented)
- Total: ~50-100KB per app (gzipped)

## Support

Bei Fragen oder Problemen:

1. Prüfe README.md für Implementation Progress
2. Prüfe IMPLEMENTATION_SUMMARY.md für vollständigen Überblick
3. Konsultiere \_export Code als Referenz
