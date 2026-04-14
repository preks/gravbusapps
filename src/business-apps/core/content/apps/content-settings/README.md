# Content Settings App

Comprehensive settings app for managing Content Module taxonomy: Categories, Tags, Types, and Reactions.

## Overview

This app provides specialized UIs for managing:

- **Content Categories**: Hierarchical organization of content (own table, UUID-backed)
- **Content Tags**: Flexible tagging for filtering and discovery (own table, UUID-backed)
- **Content Types**: Define different types of content entries (own table, UUID-backed)
- **Content Reactions**: Emoji and custom image reactions for user engagement (catalog-based)

## Architecture

- **Main Component**: `ContentSettings.tsx` - Card-based navigation using `SettingsLayout`
- **Page Components**: Individual management pages
- **Taxonomy Data**: ContentType, ContentCategory, ContentTag use direct GraphQL mutations via `graphqlClient`
- **Reaction Data**: Uses hooks from `@/common/data/catalog` — reactions remain catalog-based

## Field Mapping

### ContentCategory (table: `nw_content.content_category`)

```typescript
{
  id: string // UUID primary key
  name: string // Display name
}
```

### ContentTag (table: `nw_content.content_tag`)

```typescript
{
  id: string // UUID primary key
  name: string // Display name
}
```

### ContentType (table: `nw_content.content_type`)

```typescript
{
  id: string           // UUID primary key
  name: string         // Display name
  contentGroup?: string // Optional enum value (ContentGroup) to scope type to a group
}
```

### ContentReaction Catalog

#### Standard Emoji (type: "EMOJI")

```typescript
{
  type: 'EMOJI' // Reaction type
  code: 'THUMBS_UP' // UPPER_SNAKE_CASE (auto-generated)
  value: 'Thumbs Up' // Display name (translatable)
  description: '👍' // Emoji character (NOT translatable)
  additionalValue1: 'U+1F44D' // Unicode representation
  additionalValue2: '1f44d' // Unified code for emoji-picker
  additionalValue3: '["thumbs up", "+1", "yes"]' // Alternative names JSON
  alternativeCode: ':thumbs_up:' // Shortcode
  displayOrder: 1 // Sort order in picker
}
```

#### Custom Image Reaction (type: "CUSTOM")

```typescript
{
  type: 'CUSTOM' // Reaction type
  code: 'COMPANY_LOGO' // UPPER_SNAKE_CASE (auto-generated)
  value: 'Company Logo' // Display name (translatable)
  description: 'Company Logo' // Display text (NOT translatable)
  additionalValue1: 'CUSTOM_1730217600000' // Custom ID (timestamp-based)
  additionalValue2: 'https://cdn.../logo.png' // Image URL
  additionalValue3: '' // Reserved for metadata
  alternativeCode: ':company_logo:' // Shortcode
  displayOrder: 100 // Sort order
}
```

## Usage

### Accessing Settings

1. Navigate to Content → Content Settings
2. Click on a card to manage that taxonomy type
3. Use search to filter entries

### Managing Categories

- Create categories by entering a name and saving
- Edit or delete existing categories

### Managing Tags

- Create tags by entering a name and saving
- Edit or delete existing tags

### Managing Types

- Create types with a name and optional content group scope
- Edit or delete existing types

### Managing Reactions

#### Adding Standard Emoji

1. Click "Add Reaction"
2. Select "Emoji" tab
3. Choose emoji from picker
4. Enter display name (auto-generates code and shortcode)
5. Set display order
6. Click "Create"

#### Adding Custom Reaction

1. Click "Add Reaction"
2. Select "Custom Image" tab
3. Enter publicly accessible image URL
4. Enter display name
5. Set display order
6. Click "Create"

## Technical Details

### Taxonomy (ContentType, ContentCategory, ContentTag)

CRUD operations use direct GraphQL mutations:

- `InsertContentTypeOne`, `UpdateContentTypeByPk`, `DeleteContentTypeByPk`
- `InsertContentCategoryOne`, `UpdateContentCategoryByPk`, `DeleteContentCategoryByPk`
- `InsertContentTagOne`, `UpdateContentTagByPk`, `DeleteContentTagByPk`

Data is fetched via `useContentTypeOptions`, `useContentCategoryOptions`, `useContentTagOptions` hooks from `@/common/data/content`.

### Reactions (ContentReaction)

Still catalog-based. Uses hooks from `@/common/data/catalog`:

- Catalog Identifier: `ContentReaction`
- Catalog Version: `v1`

### Integration with ReactionButton

The `ReactionButton` component automatically supports both reaction types:

- **EMOJI**: Displays emoji character from `description` field
- **CUSTOM**: Displays image from `additionalValue2` (image URL)

## File Structure

```
src/business-apps/core/content/apps/content-settings/
├── ContentSettings.tsx              # Main settings component
├── index.ts
├── README.md
└── pages/
    ├── index.ts
    ├── category-data/
    │   ├── CategoryDataPage.tsx
    │   └── components/CategoryTable.tsx
    ├── tag-data/
    │   ├── TagDataPage.tsx
    │   └── components/TagTable.tsx
    ├── type-data/
    │   ├── TypeDataPage.tsx
    │   └── components/TypeTable.tsx
    └── reaction-data/
        ├── ReactionDataPage.tsx
        ├── components/
        │   ├── ReactionTable.tsx      # Table with emoji/image preview
        │   └── ReactionFormDialog.tsx # Form with emoji picker
        └── utils/emojiUtils.ts        # Code generation utilities
```

## Dependencies

- `@newwork/nw-design-system` - UI components
- `emoji-picker-react` - Emoji selection
- `@/common/data/content` - Taxonomy hooks (ContentType, ContentCategory, ContentTag)
- `@/common/data/catalog` - Catalog hooks (ContentReaction only)
- `lucide-react` - Icons
