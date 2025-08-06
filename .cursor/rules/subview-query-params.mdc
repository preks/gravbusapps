---
description: When components with nested Tabs that should be bookmarkable; or when Tab components where specific tabs need to be accessible via URL; or when multi-level navigation where both main view and sub-tabs should be reflected in URL; or when user requests subView query parameter functionality.
alwaysApply: false
---

# SubView Query Parameter Implementation Pattern

## Overview
This document defines the pattern for implementing `subView` query parameter functionality in components with nested tab structures. This ensures URL synchronization with tab states and proper browser navigation support.

## Core Implementation Pattern

### 1. Define SubView Value Mappings
First, identify the internal tab values and their corresponding URL parameter values:

```typescript
// Example for Investments component
const INVESTMENT_SUBVIEW_VALUES = ['overview', 'equity', 'real-estate', 'private-equity', 'liquid-funds'];

// Example for Opportunities component  
const OPPORTUNITIES_INTERNAL_TO_URL = {
  'list': 'list',
  'board': 'pipeline'
};
```

### 2. Create Initial SubView Functions
Create separate functions for each component that has subView functionality:

```typescript
// Get initial subView from URL for investments tab
const getInitialInvestmentsSubView = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const subViewFromUrl = urlParams.get("subView");

  // Valid investment subView values
  if (subViewFromUrl && ['overview', 'equity', 'real-estate', 'private-equity', 'liquid-funds'].includes(subViewFromUrl)) {
    return subViewFromUrl;
  }

  // Default to overview
  return "overview";
};

// Get initial subView from URL for opportunities tab
const getInitialOpportunitiesSubView = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const subViewFromUrl = urlParams.get("subView");

  // Map URL subView values to internal tab values for opportunities
  if (subViewFromUrl === "pipeline") {
    return "board";
  } else if (subViewFromUrl === "list") {
    return "list";
  }

  // Default to list view
  return "list";
};
```

### 3. Initialize State with URL Values
Update state initialization to read from URL parameters:

```typescript
const [activeTab, setActiveTab] = useState<string>(getInitialView());
const [opportunitiesSubTab, setOpportunitiesSubTab] = 
  useState<string>(getInitialOpportunitiesSubView());
const [investmentsSubTab, setInvestmentsSubTab] = 
  useState<string>(getInitialInvestmentsSubView());
```

### 4. Enhanced URL Update Function
Update the URL function to handle multiple view types and their subView mappings:

```typescript
const updateUrl = (view: string, subView?: string) => {
  const urlParams = new URLSearchParams(window.location.search);

  // Always set the view parameter
  urlParams.set("view", view);

  // Handle subView parameter for opportunities
  if (view === "opportunities" && subView) {
    // Map internal tab values to URL subView values
    if (subView === "board") {
      urlParams.set("subView", "pipeline");
    } else if (subView === "list") {
      urlParams.set("subView", "list");
    }
  } 
  // Handle subView parameter for investments
  else if (view === "investments" && subView) {
    // Direct mapping for investments - no conversion needed
    urlParams.set("subView", subView);
  } 
  else {
    // Clear subView parameter when not in supported views
    if (urlParams.has("subView")) {
      urlParams.delete("subView");
    }
  }

  const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
  window.history.replaceState({}, "", newUrl);
};
```

### 5. SubTab Change Handlers
Create dedicated handlers for each component's subTab changes:

```typescript
const handleOpportunitiesSubTabChange = (subTab: string) => {
  setOpportunitiesSubTab(subTab);
  // Update URL with new subView when tab changes
  updateUrl(activeTab, subTab);
};

const handleInvestmentsSubTabChange = (subTab: string) => {
  setInvestmentsSubTab(subTab);
  // Update URL with new subView when tab changes
  updateUrl(activeTab, subTab);
};
```

### 6. Enhanced Main Tab Change Handler
Update the main tab change handler to include subView in URL updates:

```typescript
const handleTabChange = (key: string) => {
  if (!key || key === activeTab) {
    return;
  }
  setActiveTab(key);
  
  // Include current subView in URL for supported views
  if (key === "opportunities") {
    updateUrl(key, opportunitiesSubTab);
  } else if (key === "investments") {
    updateUrl(key, investmentsSubTab);
  } else {
    updateUrl(key);
  }
};
```

### 7. Browser Navigation Support
Update the popstate handler to restore both main view and subView:

```typescript
useEffect(() => {
  const handlePopState = () => {
    const newView = getInitialView();
    setActiveTab(newView);
    
    // Set subView based on the current view
    if (newView === "opportunities") {
      const newOpportunitiesSubView = getInitialOpportunitiesSubView();
      setOpportunitiesSubTab(newOpportunitiesSubView);
    } else if (newView === "investments") {
      const newInvestmentsSubView = getInitialInvestmentsSubView();
      setInvestmentsSubTab(newInvestmentsSubView);
    }
  };

  window.addEventListener("popstate", handlePopState);
  return () => window.removeEventListener("popstate", handlePopState);
}, []);
```

### 8. Initial URL Setup
Ensure the URL is properly set on initial load:

```typescript
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.has("view")) {
    let subView: string | undefined;
    if (activeTab === "opportunities") {
      subView = opportunitiesSubTab;
    } else if (activeTab === "investments") {
      subView = investmentsSubTab;
    }
    updateUrl(activeTab, subView);
  }
}, []);
```

### 9. Component Integration
Update component rendering to use the new handlers:

```typescript
// For components with subTabs
<SomeComponent
  initialSubTab={investmentsSubTab}
  onSubTabChange={handleInvestmentsSubTabChange}
  // ... other props
/>

// For nested Tabs components  
<Tabs value={opportunitiesSubTab} onValueChange={handleOpportunitiesSubTabChange}>
  {/* Tab content */}
</Tabs>
```

## Common SubView Value Patterns

### Direct Mapping (No Conversion)
Used when internal tab values match desired URL values exactly:
```typescript
// Investments: overview, equity, real-estate, private-equity, liquid-funds
// URL: ?subView=equity → Internal: "equity"
```

### Mapped Values (With Conversion)  
Used when internal tab values differ from desired URL values:
```typescript
// Opportunities: list ↔ list, board ↔ pipeline
// URL: ?subView=pipeline → Internal: "board"
// URL: ?subView=list → Internal: "list"
```

## URL Parameter Examples

### Single SubView
```
# Investments Overview
?view=investments&subView=overview

# Investments Equity
?view=investments&subView=equity

# Opportunities Pipeline
?view=opportunities&subView=pipeline
```

### Combined with Other Parameters
```
# With existing filters
?view=investments&subView=equity&investmentType=active

# With search parameters
?view=opportunities&subView=pipeline&status=OPPORTUNITY_OPEN
```

## Implementation Checklist

### Before Implementation
- [ ] Identify all tab values that need URL representation
- [ ] Determine if direct mapping or value conversion is needed
- [ ] Plan default subView for each main view
- [ ] Check existing URL parameter structure

### During Implementation  
- [ ] Create getInitial{Component}SubView functions
- [ ] Update state initialization with URL reading
- [ ] Enhance updateUrl function for new view types
- [ ] Add subTab change handlers for each component
- [ ] Update main tab change handler
- [ ] Update popstate handler for browser navigation
- [ ] Update initial URL setup logic
- [ ] Update component rendering with new handlers

### After Implementation
- [ ] Test all tab combinations with URL updates
- [ ] Verify browser back/forward navigation works
- [ ] Confirm bookmarking works for all states
- [ ] Test URL sharing functionality
- [ ] Validate parameter clearing when switching views

## Error Handling

### Invalid SubView Values
```typescript
// Always validate against known values
if (subViewFromUrl && VALID_SUBVIEW_VALUES.includes(subViewFromUrl)) {
  return subViewFromUrl;
}
// Fall back to default
return DEFAULT_SUBVIEW;
```

### Missing SubView Parameter
```typescript
// Always provide meaningful defaults
return "overview"; // or "list", "dashboard", etc.
```

## Benefits

### User Experience
- **Bookmarkable URLs**: Users can bookmark specific tab states
- **Browser Navigation**: Back/forward buttons work correctly
- **URL Sharing**: Share links to specific tab configurations
- **State Persistence**: Tab selection survives page refresh

### Development
- **Consistent Pattern**: Reusable approach across components
- **Maintainable**: Clear separation of URL logic
- **Testable**: Each function has single responsibility
- **Scalable**: Easy to add new subView types

## Examples from Implementation

### CustomerRelations.tsx
- View: `opportunities`
- SubView values: `list`, `pipeline` (URL) ↔ `list`, `board` (internal)
- Usage: `?view=opportunities&subView=pipeline`

### InvestmentRelations.tsx  
- View: `investments`
- SubView values: `overview`, `equity`, `real-estate`, `private-equity`, `liquid-funds`
- Usage: `?view=investments&subView=equity`

This pattern ensures consistent URL synchronization across all tab-based components while maintaining clean separation of concerns and proper browser navigation support.
