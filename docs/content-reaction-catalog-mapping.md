# Content Reaction Catalog Field Mapping

## Complete Field Mapping Table

| **Catalog Field**    | **Parent Emoji (Neutral)** | **Child Emoji (Skin Tone)**      | **Custom Emoji**       | **Notes**           |
| -------------------- | -------------------------- | -------------------------------- | ---------------------- | ------------------- |
| **type**             | `"EMOJI"`                  | `"EMOJI"`                        | `"CUSTOM"`             | Discriminator       |
| **code**             | `"THUMBS_UP"`              | `"THUMBS_UP_LIGHT"`              | `"COMPANY_LOGO"`       | UPPER_SNAKE_CASE    |
| **parentEntryId**    | `null`                     | `"ContentReaction:v1:THUMBS_UP"` | `null`                 | Hierarchy           |
| **value**            | `"Thumbs Up"`              | `"Thumbs Up (Light)"`            | `"Company Logo"`       | Translatable        |
| **description**      | `"👍"`                     | `"👍🏻"`                           | `"emoji_company_logo"` | Character or ID     |
| **additionalValue1** | `"U+1F44D"`                | `"U+1F44D U+1F3FB"`              | `"CUSTOM_001"`         | Formatted unicode   |
| **additionalValue2** | `"1f44d"`                  | `"1f44d-1f3fb"`                  | `""` (empty)           | Full unified code   |
| **additionalValue3** | Image URL                  | Image URL                        | Image URL              | Image for all types |
| **objectValue**      | `{ names: [...] }`         | `{ names: [...] }`               | `{ names: [...] }`     | Metadata            |
| **alternativeCode**  | `":thumbs_up:"`            | `":thumbs_up_light:"`            | `":company_logo:"`     | Shortcode           |
| **displayOrder**     | `1`                        | `2`                              | `100`                  | Sort order          |
| **translations**     | `[...]`                    | `[...]`                          | `[...]`                | Value translations  |

---

## Detailed Examples

### 1️⃣ Parent Entry (Neutral Emoji)

```json
{
  "id": "ContentReaction:v1:THUMBS_UP",
  "parentEntryId": null,
  "type": "EMOJI",
  "code": "THUMBS_UP",
  "value": "Thumbs Up",
  "description": "👍",
  "additionalValue1": "U+1F44D",
  "additionalValue2": "1f44d",
  "additionalValue3": "https://cdn.../1f44d.png",
  "objectValue": {
    "names": ["thumbs up", "+1", "yes"]
  },
  "alternativeCode": ":thumbs_up:",
  "displayOrder": 1,
  "translations": []
}
```

### 2️⃣ Child Entry (Skin Tone Variant)

```json
{
  "id": "ContentReaction:v1:THUMBS_UP_LIGHT",
  "parentEntryId": "ContentReaction:v1:THUMBS_UP",
  "type": "EMOJI",
  "code": "THUMBS_UP_LIGHT",
  "value": "Thumbs Up (Light)",
  "description": "👍🏻",
  "additionalValue1": "U+1F44D U+1F3FB",
  "additionalValue2": "1f44d-1f3fb",
  "additionalValue3": "https://cdn.../1f44d-1f3fb.png",
  "objectValue": {
    "names": ["thumbs up", "+1", "yes"]
  },
  "alternativeCode": ":thumbs_up_light:",
  "displayOrder": 0,
  "translations": []
}
```

**Note**: Children have their own display order system (0-4) independent of parent's order:

- Light: `displayOrder: 0`
- Medium Light: `displayOrder: 1`
- Medium: `displayOrder: 2`
- Medium Dark: `displayOrder: 3`
- Dark: `displayOrder: 4`

### 3️⃣ Custom Emoji

```json
{
  "id": "ContentReaction:v1:COMPANY_LOGO",
  "parentEntryId": null,
  "type": "CUSTOM",
  "code": "COMPANY_LOGO",
  "value": "Company Logo",
  "description": "emoji_company_logo",
  "additionalValue1": "CUSTOM_001",
  "additionalValue2": "",
  "additionalValue3": "https://cdn.example.com/logo.png",
  "objectValue": {
    "names": ["company logo", "logo", "brand"]
  },
  "alternativeCode": ":company_logo:",
  "displayOrder": 100,
  "translations": []
}
```

---

## Field Purpose

### Core Fields

- **type**: `"EMOJI"` or `"CUSTOM"` discriminator
- **code**: Unique UPPER_SNAKE_CASE identifier
- **value**: Human-readable name (translatable)
- **parentEntryId**: Links child to parent (null for parents)

### Emoji-Specific

- **description**: Emoji character (e.g., "👍", "👍🏻")
- **additionalValue1**: Full formatted unicode with modifiers
- **additionalValue2**: Full unified code WITH skin tone (e.g., "1f44d-1f3fb")
- **additionalValue3**: Image URL

### Custom-Specific

- **description**: Emoji ID (e.g., "emoji_company_logo")
- **additionalValue1**: Custom identifier
- **additionalValue2**: Empty string
- **additionalValue3**: Image URL

### Shared

- **objectValue.names**: Alternative search keywords
- **alternativeCode**: Shortcode format (`:name:`)
- **displayOrder**: UI sort order

---

## Key Design Principles

### 1. Parent-Child Hierarchy

```
👍 THUMBS_UP (parent, neutral)
  ├─ 👍🏻 THUMBS_UP_LIGHT (child)
  ├─ 👍🏼 THUMBS_UP_MEDIUM_LIGHT (child)
  ├─ 👍🏽 THUMBS_UP_MEDIUM (child)
  ├─ 👍🏾 THUMBS_UP_MEDIUM_DARK (child)
  └─ 👍🏿 THUMBS_UP_DARK (child)
```

### 2. additionalValue2 Contains Full Code

- **Parent**: `"1f44d"` (base code)
- **Child**: `"1f44d-1f3fb"` (WITH skin tone modifier)
- **Custom**: `""` (empty)

### 3. Automatic Skin Tone Generation

When emoji supports skin tones, create:

- 1 Parent entry (neutral) with user-defined `displayOrder`
- 5 Child entries with independent `displayOrder` 0-4:
  - Light: 0
  - Medium Light: 1
  - Medium: 2
  - Medium Dark: 3
  - Dark: 4

### 4. UI Display

- **Settings UI**: Show only parent reactions (filter `parentEntryId === null`)
- **Reaction Picker**: Show all variants (parent + children)
- **Usage Stats**: Track parent and children separately

```typescript
if (reaction.type === "EMOJI") {
  // Render emoji character from description
  return <span>{reaction.description}</span>
} else if (reaction.type === "CUSTOM") {
  // Render custom image from additionalValue3
  return <img src={reaction.additionalValue3} />
}
```

---

## Query Examples

### Get parent with all children

```graphql
ContentReaction(
  where: {
    _or: [
      { id: { _eq: "ContentReaction:v1:THUMBS_UP" } },
      { parentEntryId: { _eq: "ContentReaction:v1:THUMBS_UP" } }
    ]
    isDeleted: { _eq: false }
  }
) {
  id
  code
  value
  description
  parentEntryId
  additionalValue2
  objectValue
}
```

### Get all base emojis (parents only)

```graphql
ContentReaction(
  where: {
    type: { _eq: "EMOJI" }
    parentEntryId: { _is_null: true }
    isDeleted: { _eq: false }
  }
) {
  id
  code
  value
  description
}
```

### Get specific skin tone variant

```graphql
ContentReaction(
  where: {
    additionalValue2: { _eq: "1f44d-1f3fb" }
    type: { _eq: "EMOJI" }
    isDeleted: { _eq: false }
  }
) {
  id
  code
  value
  description
  parentEntryId
}
```

## Complete Field Mapping Table

| Catalog Field        | Standard Emoji (type: "EMOJI")       | Custom Emoji (type: "CUSTOM") | Source/Notes                                                     |
| -------------------- | ------------------------------------ | ----------------------------- | ---------------------------------------------------------------- |
| **type**             | `"EMOJI"`                            | `"CUSTOM"`                    | Discriminator field                                              |
| **code**             | `"THUMBS_UP"`                        | `"COMPANY_LOGO"`              | UPPER_SNAKE_CASE, generated from `value`                         |
| **value**            | `"Thumbs Up"`                        | `"Company Logo"`              | Display name (translatable)                                      |
| **description**      | `"👍"`                               | `"Company Logo"`              | Emoji: `emojiData.emoji` (character)<br>Custom: Display name     |
| **additionalValue1** | `"U+1F44D"`                          | `"CUSTOM_001"` or unicode     | Emoji: `formatUnicode(unified)`<br>Custom: Custom ID or unicode  |
| **additionalValue2** | `"1f44d"`                            | `"https://cdn.../logo.png"`   | Emoji: `unifiedWithoutSkinTone` (base code)<br>Custom: Image URL |
| **additionalValue3** | ❌ Empty                             | ❌ Empty                      | **DEPRECATED** - Use `objectValue` instead                       |
| **objectValue**      | `{ names: [...], skinTone?: "..." }` | `{ names: [...] }`            | JSON object with metadata                                        |
| **alternativeCode**  | `":thumbs_up:"`                      | `":company_logo:"`            | Shortcode format                                                 |
| **displayOrder**     | `1`                                  | `100`                         | Sort order in UI                                                 |
| **translations**     | `[{ locale, value }]`                | `[{ locale, value }]`         | Translations for `value` field                                   |

## Detailed objectValue Structure

### Standard Emoji (type: "EMOJI")

```typescript
{
  type: "EMOJI",
  code: "THUMBS_UP",
  value: "Thumbs Up",
  description: "👍",                                    // Emoji character from emojiData.emoji
  additionalValue1: "U+1F44D",                          // Formatted unicode
  additionalValue2: "1f44d",                            // Base unified code (unifiedWithoutSkinTone)
  additionalValue3: "",                                 // Empty (deprecated)
  objectValue: {
    names: ["thumbs up", "+1", "yes"],                  // From emojiData.names
    skinTone: "neutral"                                 // "neutral", "tone1", "tone2", etc.
  },
  alternativeCode: ":thumbs_up:",
  displayOrder: 1,
  translations: []
}
```

### Standard Emoji with Skin Tone (type: "EMOJI")

```typescript
{
  type: "EMOJI",
  code: "THUMBS_UP_TONE_1",
  value: "Thumbs Up (Tone 1)",
  description: "👍🏻",                                   // Emoji with skin tone modifier
  additionalValue1: "U+1F44D U+1F3FB",                  // Unicode with skin tone modifier
  additionalValue2: "1f44d",                            // Base code (same for all tones!)
  additionalValue3: "",                                 // Empty (deprecated)
  objectValue: {
    names: ["thumbs up", "+1", "yes", "(Tone 1)"],
    skinTone: "tone1"                                   // Skin tone identifier
  },
  alternativeCode: ":thumbs_up_tone_1:",
  displayOrder: 2,
  translations: []
}
```

### Custom Emoji (type: "CUSTOM")

```typescript
{
  type: "CUSTOM",
  code: "COMPANY_LOGO",
  value: "Company Logo",
  description: "Company Logo",                          // Display name (fallback)
  additionalValue1: "CUSTOM_001",                       // Custom ID or unicode if applicable
  additionalValue2: "https://cdn.example.com/logo.png", // Image URL
  additionalValue3: "",                                 // Empty (deprecated)
  objectValue: {
    names: ["company logo", "logo", "brand"]            // User-defined names
  },
  alternativeCode: ":company_logo:",
  displayOrder: 100,
  translations: []
}
```

## Field Purpose Summary

### Core Fields (Both Types)

- **type**: Discriminator (`"EMOJI"` | `"CUSTOM"`)
- **code**: Unique identifier (UPPER_SNAKE_CASE)
- **value**: Human-readable display name (translatable)
- **displayOrder**: Sort order in picker/UI
- **alternativeCode**: Shortcode for text input (`:name:`)

### Emoji-Specific Fields

- **description**: The actual emoji character (e.g., "👍")
- **additionalValue1**: Formatted unicode (e.g., "U+1F44D U+1F3FB")
- **additionalValue2**: **Base unified code without skin tone** (e.g., "1f44d") - used for grouping all skin tone variants
- **objectValue.skinTone**: Skin tone identifier for this variant

### Custom-Specific Fields

- **description**: Display name (no emoji character)
- **additionalValue1**: Custom ID or placeholder unicode
- **additionalValue2**: **Image URL** for the custom emoji
- **objectValue.names**: User-defined alternative names

### Shared Fields

- **objectValue.names**: Array of alternative names/keywords for search
- **translations**: Localized versions of `value` field

## Key Design Principles

1. **additionalValue2 is the grouping key**
   - For emojis: Base unified code (e.g., "1f44d") - same for all skin tones
   - For custom: Image URL
2. **objectValue replaces additionalValue3**
   - Structured JSON data instead of stringified array
   - Consistent schema for both types
3. **Skin tone variants share the same base code**
   - All 👍 variants have `additionalValue2: "1f44d"`
   - Differentiated by `objectValue.skinTone` and `additionalValue1` (full unicode)
4. **Type field determines rendering**
   - `EMOJI`: Render `description` as text (emoji character)
   - `CUSTOM`: Render `<img src={additionalValue2} />`

## Migration from Current Implementation

### Current Issues

❌ `additionalValue3` stores stringified `names` array  
❌ No `objectValue` usage  
❌ `additionalValue2` stores `unified` instead of `unifiedWithoutSkinTone`  
❌ No consistent structure between EMOJI and CUSTOM

### Required Changes

✅ Move `names` from `additionalValue3` to `objectValue.names`  
✅ Change `additionalValue2` to use `unifiedWithoutSkinTone` for emojis  
✅ Add `objectValue.skinTone` for skin tone identification  
✅ Align CUSTOM and EMOJI `objectValue` structure  
✅ Deprecate `additionalValue3` usage

## Example Queries

### Get all skin tone variants of thumbs up

```graphql
ContentReaction(
  where: {
    additionalValue2: { _eq: "1f44d" }
    type: { _eq: "EMOJI" }
    isDeleted: { _eq: false }
  }
) {
  id
  code
  value
  description
  objectValue  # { names, skinTone }
}
```

### Get all custom emojis

```graphql
ContentReaction(
  where: {
    type: { _eq: "CUSTOM" }
    isDeleted: { _eq: false }
  }
) {
  id
  code
  value
  additionalValue2  # Image URL
  objectValue       # { names }
}
```
