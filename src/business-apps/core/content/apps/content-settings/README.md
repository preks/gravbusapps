# Content Settings App

Comprehensive settings app for managing Content Module catalogs: Categories, Tags, Reactions, and Types.

## Overview

This app provides specialized UIs for managing the four core catalog types used in the Content Module:

- **Content Categories**: Hierarchical organization of content
- **Content Tags**: Flexible tagging for filtering and discovery
- **Content Reactions**: Emoji and custom image reactions for user engagement
- **Content Types**: Define different types of content entries

## Architecture

- **Main Component**: `ContentSettings.tsx` - Card-based navigation using `SettingsLayout`
- **Page Components**: Individual catalog management pages
- **Central Data**: Uses hooks from `@/common/data/catalog` for GraphQL operations
- **Specialized UIs**: Each catalog type has a custom-tailored UI

## Catalog Field Mapping

### ContentCategory Catalog

```typescript
{
  code: 'COMPANY_NEWS' // UPPER_SNAKE_CASE
  value: 'Company News' // Display name (translatable)
  displayOrder: 1 // Sort order
}
```

### ContentTag Catalog

```typescript
{
  code: 'TECHNOLOGY' // UPPER_SNAKE_CASE
  value: 'Technology' // Display name (translatable)
  additionalValue1: '#3b82f6' // Color hex (optional)
  displayOrder: 1
}
```

### ContentType Catalog

```typescript
{
  code: 'ARTICLE' // UPPER_SNAKE_CASE
  value: 'Article' // Display name (translatable)
  description: 'Long-form...' // Detailed description (translatable)
  displayOrder: 1
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

## Translation Support

The Catalog Manager provides translation capabilities for specific fields:

### Translatable Fields

- `value` - Display names (all catalogs)
- `description` - Only for ContentType (NOT for reactions - emoji is universal)
- `additionalValue3` - Alternative names array for reactions

### Non-Translatable Fields

- `code` - Technical identifier (always UPPER_SNAKE_CASE)
- `description` (reactions) - Emoji character or custom name (universal)
- `additionalValue1` - Unicode or custom ID (technical)
- `additionalValue2` - Unified code or image URL (technical)
- `alternativeCode` - Shortcode format (technical)
- `displayOrder` - Sort order (numeric)

## Usage

### Accessing Settings

1. Navigate to Content → Content Settings
2. Click on a card to manage that catalog type
3. Use search to filter settings

### Managing Categories

- Create hierarchical categories
- Drag-drop to reorder
- Bulk operations support

### Managing Tags

- Assign colors for visual distinction
- Preview tag cloud
- Track popular tags

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

### Managing Types

- Define content types with descriptions
- Link to form field configurations
- View usage statistics

## Technical Details

### Catalog Identifiers

All use version `'v1'`:

- `ContentCategory`
- `ContentTag`
- `ContentReaction`
- `ContentType`

### Code Generation

All codes are auto-generated from display names:

- "Thumbs Up" → `THUMBS_UP`
- "Company News" → `COMPANY_NEWS`

### Shortcode Generation

Shortcodes follow standard emoji format:

- "Thumbs Up" → `:thumbs_up:`
- "Red Heart" → `:red_heart:`

### Unicode Format

Unicode values use standard notation:

- Single codepoint: `U+1F44D`
- Multiple codepoints: `U+2764 U+FE0F`

### Integration with ReactionButton

The `ReactionButton` component automatically supports both reaction types:

- **EMOJI**: Displays emoji character from `description` field
- **CUSTOM**: Displays image from `additionalValue2` (image URL)

Both types work seamlessly in the user interface with proper fallbacks.

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
- `@/common/data/catalog` - Central catalog data hooks
- `lucide-react` - Icons
