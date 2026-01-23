how to do this project? give solutions. i make web apps.
```
Sales Project
 Objective
 Design and prototype an AI-powered article recommendation engine that extends 
 SALES+ by helping ACME recommend the right products, volumes, and prices to BCME customers-based directly on their restaurant menus.
 The goal is to move from generic selling to menu-aware, data-driven recommendations
 that increase relevance for customers while improving sales efficiency and margin for ACME.
 Key Challenges
 • Restaurants have unique menus, but purchasing recommendations are often generic
 • Mapping dishes to ingredients and SKUs is manual and non-scalable
 • Sales teams lack data-driven volume and price guidance
 • Missed opportunities for bundling, upsell, and alternatives
 • Difficulty predicting true demand based on menu complexity and dish popularity
 What the Solution Should Achieve
 The solution should leverage AI to translate restaurant menus into actionable sales 
 recommendations:
 • Menu parsing & understanding
 o Extract dishes from menus (text, PDF, images)
 o Detect cuisine type and menu structure
 • Ingredient & SKU mapping
 o Identify ingredients per dish
 o Map ingredients to Selgros articles (SKUs)
 • Demand & volume estimation
 o Estimate ingredient consumption based on dish volumes, restaurant size, or 
 turnover
 o Propose recommended order quantities per time period
 • Commercial intelligence
 o Suggest bundle offers and cross-sell opportunities
 o Recommend alternatives or upsell items (better margin, local, sustainable)
 o Support dedicated or optimized pricing proposals
 • SALES+ integration mindset
 o Designed as an extension, not a standalone product o Output usable by sales reps or customer-facing tools
 Deliverables
 By the end of the deadline, teams should deliver:
 • A working prototype or demo of the recommendation engine
 • A menu-to-article mapping flow (menu → dishes → ingredients → ACME SKUs)
 • Volume and purchase recommendations for a sample restaurant
 • At least one advanced recommendation (bundle, upsell, or alternative)
 • A short demo narrative explaining:
 o How the menu is analyzed
 o How recommendations are generated
 o The value for both ACME and the restaurant
 Success Criteria (How We’ll Evaluate)
 A strong solution will:
 • Feel highly relevant to a restaurant’s real menu
 • Leverage AI meaningfully for understanding and prediction
 • Improve sales effectiveness (better targeting, higher basket value)
 • Provide clear, explainable recommendations
 • Be realistic to integrate into the Sales solution
 • Demonstrate clear commercial value for ACME
 North Star
 Every menu should translate into the perfect ACME order, automatically.
```


Got it — this is **very doable** for a web-app dev, and you don’t need “hardcore AI research”. You need **smart decomposition + pragmatic AI usage**.

Below is a **clear, buildable solution** with **multiple implementation options**, from MVP → impressive demo.

---

# 1️⃣ High-level solution (what you’re actually building)

You are **not building an ERP**.
You are building an **AI-powered translation layer**:

> **Menu → Ingredients → ACME SKUs → Quantities → Commercial recommendations**

Think of it as a **pipeline**, not one giant AI.

```
Menu (PDF / image / text)
   ↓
Menu Understanding (AI)
   ↓
Dish → Ingredient graph
   ↓
Ingredient → SKU matching
   ↓
Demand estimation
   ↓
Sales intelligence (bundle / upsell / price)
   ↓
SALES+ friendly output (JSON / UI)
```

---

# 2️⃣ Tech stack (simple & realistic)

Since you build web apps:

### Frontend

* **React / Next.js**
* Upload menu (PDF/image/text)
* Show:

  * Parsed dishes
  * Mapped ingredients
  * Recommended SKUs & quantities
  * “Why” explanations

### Backend

* **Node.js / NestJS**
* API routes:

  * `/parse-menu`
  * `/map-ingredients`
  * `/recommend-orders`
  * `/commercial-intel`

### AI

* **LLM (GPT / Claude / Azure OpenAI)**
* **No training needed**
* Prompted + structured outputs (JSON)

### Data

* Mock **ACME SKU catalog** (CSV / JSON)
* Example:

```json
{
  "sku": "ACME_OLIVE_OIL_5L",
  "name": "Extra Virgin Olive Oil 5L",
  "category": "Oils",
  "price": 32,
  "margin": 0.28
}
```

---

# 3️⃣ Menu parsing & understanding (core AI use)

### Input formats

* Text menu
* PDF (use `pdf-parse`)
* Image (OCR via Tesseract / Vision API)

### AI Prompt (example)

```text
You are a food industry assistant.

Given a restaurant menu, extract:
- Dish name
- Dish category (starter, main, dessert)
- Cuisine type
- Estimated popularity (low / medium / high)

Return JSON only.
```

### Output

```json
{
  "cuisine": "Italian",
  "dishes": [
    {
      "name": "Margherita Pizza",
      "category": "Main",
      "popularity": "high"
    },
    {
      "name": "Spaghetti Carbonara",
      "category": "Main",
      "popularity": "high"
    }
  ]
}
```

✅ This already **feels magical** to evaluators.

---

# 4️⃣ Ingredient extraction per dish

Second AI step:

```text
For each dish, list:
- Core ingredients
- Optional ingredients
- Typical portion size (grams)

Assume standard restaurant recipes.
```

### Output

```json
{
  "dish": "Spaghetti Carbonara",
  "ingredients": [
    { "name": "Spaghetti", "grams": 100 },
    { "name": "Egg yolk", "grams": 40 },
    { "name": "Pancetta", "grams": 60 },
    { "name": "Parmesan", "grams": 30 }
  ]
}
```

⚠️ You don’t need perfect accuracy — **explainable estimates** are enough.

---

# 5️⃣ Ingredient → ACME SKU mapping (semi-AI)

### Option A (fast MVP)

* Fuzzy matching (`string-similarity`)
* Category filtering

### Option B (impressive)

Use AI with constraints:

```text
Match each ingredient to the best ACME SKU.
Prefer:
- Same category
- Suitable packaging for restaurants
- Higher margin if equivalent

Return SKU ID and confidence.
```

### Output

```json
{
  "ingredient": "Parmesan",
  "sku": "ACME_PARMESEAN_BLOCK_5KG",
  "confidence": 0.92
}
```

---

# 6️⃣ Demand & volume estimation (business logic + AI)

You combine **rules + AI estimates**.

### Inputs

* Dish popularity
* Restaurant size (small / medium / large)
* Seating capacity or turnover (ask user or assume)

### Simple formula (very acceptable):

```ts
weeklyDishesSold =
  baseVolume *
  popularityMultiplier *
  restaurantSizeMultiplier
```

Example:

```json
{
  "dish": "Spaghetti Carbonara",
  "weekly_orders": 180
}
```

Then:

```ts
ingredientQuantity =
  weekly_orders * grams_per_dish
```

### Result

```json
{
  "sku": "ACME_PASTA_10KG",
  "recommended_quantity": "20 kg / week"
}
```

---

# 7️⃣ Commercial intelligence (THIS is the wow part)

### 7.1 Bundles

Logic:

* Frequently co-used ingredients
* Common Italian combos

Example:

```json
{
  "bundle": "Italian Pasta Essentials",
  "includes": [
    "Pasta 10kg",
    "Olive Oil 5L",
    "Parmesan 5kg"
  ],
  "discount": "5%"
}
```

### 7.2 Upsell

Rule:

* Same ingredient
* Better margin or premium quality

```json
{
  "original": "Standard Olive Oil",
  "upsell": "Extra Virgin Olive Oil (Local)",
  "margin_gain": "+6%"
}
```

### 7.3 Alternatives

* If SKU out of stock
* Or sustainable/local replacement

---

# 8️⃣ SALES+ integration mindset

You **must show this** clearly.

### Output format (important)

```json
{
  "restaurant": "Luigi’s Trattoria",
  "recommendations": [
    {
      "sku": "ACME_PASTA_10KG",
      "quantity": 20,
      "reason": "Based on 180 weekly Carbonara orders"
    }
  ],
  "bundles": [...],
  "upsells": [...]
}
```

### Explain:

* “This plugs directly into SALES+ order proposals”
* “Sales reps can review, tweak, and approve”

---

# 9️⃣ Demo narrative (what you say)

Use this script:

> “We upload a restaurant menu.
> The AI understands the cuisine, dishes, and structure.
> It translates dishes into ingredients, then into ACME SKUs.
> Based on restaurant size and dish popularity, it estimates demand.
> Finally, it proposes optimized orders, bundles, and upsells — all explainable and ready for SALES+.”

---

# 🔟 What NOT to overbuild

❌ No real-time forecasting
❌ No model training
❌ No perfect nutrition accuracy
❌ No ERP-level pricing engine

This is a **sales intelligence prototype**, not production SAP.

---

# 11️⃣ If you want extra polish

* “Why this recommendation?” tooltip
* Confidence scores
* Editable assumptions (restaurant size slider)
* Before vs after basket value

---

# North Star (your closing slide)

> **“Every menu becomes the perfect ACME order — automatically.”**

If you want, next I can:

* Design the **API schema**
* Write **AI prompts**
* Sketch the **React UI**
* Or help you make this look **enterprise-level** instead of hackathon-grade



the ingredients list, that ACME has available, do you think it can be a separate table in our backend?


Yes — **100% yes**, and not just “can be”:
👉 **it *should* be a separate table**.

In fact, separating it is one of the strongest *architecture* decisions you can make for this project, and evaluators will like it.

Let’s break it down cleanly.

---

## Why ACME ingredients should be a separate backend table

### 1️⃣ Ingredients ≠ SKUs (very important distinction)

These are **different concepts**:

* **Ingredient** = *what a dish needs*
  → “Parmesan cheese”, “Olive oil”, “Tomatoes”

* **SKU (Article)** = *what ACME sells*
  → “Parmesan DOP 5kg block”, “Olive Oil EV 5L tin”

One ingredient can map to:

* multiple SKUs (sizes, brands, quality tiers)
* changing availability or pricing

👉 So ingredients deserve their **own normalized entity**.

---

## Recommended data model (clean & scalable)

### 1️⃣ `ingredients` table (domain / semantic layer)

This is your **bridge between menus and commerce**.

```sql
ingredients
-----------
id (uuid)
name                  -- "Parmesan cheese"
canonical_name        -- "parmesan"
category              -- dairy, oil, meat, veg
cuisine_tags          -- italian, mediterranean
unit                  -- g, ml, pcs
shelf_life_days
is_core_ingredient    -- true / false
```

This table:

* is **menu-facing**
* is **AI-friendly**
* does NOT care about packaging or pricing

---

### 2️⃣ `skus` table (commercial layer)

```sql
skus
----
id
sku_code
name
ingredient_id         -- FK → ingredients.id
package_size          -- 5kg, 10L
unit                  -- kg, l
price
margin
brand
is_active
is_sustainable
```

👉 This lets you:

* map **1 ingredient → N SKUs**
* rank SKUs by margin, sustainability, availability

---

### 3️⃣ Optional: `ingredient_synonyms` (very powerful)

```sql
ingredient_synonyms
-------------------
id
ingredient_id
synonym               -- parmigiano, parm, grana
language
```

This massively improves:

* menu parsing
* multilingual menus
* fuzzy matching

---

## How this fits the AI pipeline

### Step 1: AI extracts ingredients from menu

```json
["Parmesan", "Olive oil", "Egg yolk"]
```

### Step 2: Backend resolves → canonical ingredients

```ts
ingredient = findIngredientByName("Parmesan")
```

### Step 3: Backend fetches SKUs

```sql
SELECT * FROM skus
WHERE ingredient_id = :ingredientId
AND is_active = true
ORDER BY margin DESC
```

### Step 4: AI or rules choose best SKU

```json
{
  "ingredient": "Parmesan",
  "selected_sku": "ACME_PARMESEAN_DOP_5KG",
  "reason": "High usage, best margin, restaurant-grade packaging"
}
```

---

## Why NOT embed ingredients inside SKUs?

❌ Hard to explain
❌ Hard to scale
❌ Hard to support alternatives
❌ Hard to support “why” explanations

Evaluators will *absolutely* see this as bad modeling.

---

## This unlocks advanced features (for free)

With a separate ingredients table, you automatically enable:

### ✅ Smart alternatives

> Same ingredient, different SKU

### ✅ Bundling

> Ingredients that co-occur across dishes

### ✅ Menu similarity

> “This menu resembles 78% Italian bistros”

### ✅ Sustainability logic

> Prefer local SKUs for the same ingredient

### ✅ Explainability (huge win)

> “We recommend this SKU because it best fits *this ingredient* and *this menu*”

---

## What to say in the demo (important)

Use this sentence:

> “We separate ingredients from commercial SKUs.
> This allows


what is an SKU?


An **SKU** stands for **Stock Keeping Unit**.

### In simple terms

An SKU is **a specific product that a company sells and tracks**.

Think of it as:

> **“The exact sellable item in inventory”**

---

## Ingredient vs SKU (clear example)

### Ingredient (concept)

* Parmesan cheese
* Olive oil
* Spaghetti

These are **what recipes need**.

---

### SKU (sellable product)

* **ACME_PARMESEAN_DOP_5KG**
  → Parmesan cheese, DOP, 5 kg block
* **ACME_OLIVE_OIL_EV_5L_TIN**
  → Extra virgin olive oil, 5 L
* **ACME_SPAGHETTI_NO7_10KG**
  → Spaghetti No.7, 10 kg bag

These are **what ACME actually sells, prices, and delivers**.

---

## Why companies use SKUs

An SKU uniquely identifies:

* product name
* package size
* brand
* price
* margin
* stock availability

Two olive oils = **two different SKUs** if:

* size differs
* quality differs
* supplier differs

---

## Real-world analogy (very intuitive)

🍕 **Pizza menu**

* “Mozzarella” → ingredient

🏬 **Supplier catalog**

* “Mozzarella, block, 2kg, brand X” → SKU
* “Mozzarella, shredded, 1kg, brand Y” → SKU

Same ingredient → **multiple SKUs**

---

## Why SKUs matter in your project

Your system must:

* understand **what the restaurant needs** (ingredients)
* decide **what ACME should sell** (SKUs)

That’s why:

> **Menu → Ingredients → SKUs → Quantities**

---

## One-sentence definition (demo-ready)

> **“An SKU is the smallest unit of inventory that ACME sells, prices, and tracks.”**

If you want, I can:

* help you explain this to non-technical stakeholders
* show how SKUs appear in SALES+
* or help you model SKUs cleanly in your database


