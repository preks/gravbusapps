# Video Tile Responsive Sizing - Testing Guide

## Implementation Summary

This document provides testing guidelines for the new video tile max-width constraints feature that prevents overly wide video tiles on large screens.

## Changes Implemented

### 1. GroupCallModalRtk.tsx

- Added `maxTileSize` to responsive configuration with breakpoint-based values:
  - Mobile (< 768px): 9999px (no limit)
  - Tablet (768px - 1023px): 300px
  - Desktop (1024px - 1439px): 400px
  - Large Desktop (1440px - 1919px): 450px
  - Ultra-wide (≥ 1920px): 500px

- Created `getOptimalAspectRatio()` helper function that dynamically calculates aspect ratios based on:
  - Tile width
  - Participant count
  - Whether it's a screen share (always 16:9)

- Replaced fixed aspect ratio (4:3 mobile, 16:9 desktop) with dynamic calculation

### 2. VideoGrid.tsx

- Added `maxTileSize` prop to VideoGridProps interface
- Added container ref (`gridContainerRef`) for width tracking
- Updated `calculateOptimalColumns()` to respect max tile width constraints
- Modified grid template to use `min(maxTileSize, 1fr)` pattern
- Added `gba:justify-center` class to center grid when tiles hit max width

## Testing Checklist

### Basic Functionality Tests

#### Mobile (< 768px)

- [ ] Open video call on mobile device or resize browser to < 768px
- [ ] Verify tiles fill available width (no max width constraint)
- [ ] Test with 2, 3, 4, 6 participants
- [ ] Verify aspect ratios adapt properly

#### Tablet (768px - 1023px)

- [ ] Resize browser window to 800px width
- [ ] Join call with 2 participants
- [ ] Verify each tile is maximum 300px wide
- [ ] Verify grid is centered with margin space on sides
- [ ] Add more participants (3, 4, 6) and verify consistent behavior

#### Desktop (1024px - 1439px)

- [ ] Resize browser window to 1200px width
- [ ] Join call with 2 participants
- [ ] Verify each tile is maximum 400px wide
- [ ] Verify grid centers properly
- [ ] Test with 3, 4, 6, 9 participants

#### Large Desktop (1440px - 1919px)

- [ ] Resize browser window to 1600px width
- [ ] Join call with 2-3 participants
- [ ] Verify tiles are maximum 450px wide
- [ ] Verify proper centering
- [ ] Test with various participant counts

#### Ultra-wide (≥ 1920px)

- [ ] Resize browser window to 2560px width
- [ ] Join call with 2 participants
- [ ] Verify tiles are maximum 500px wide (not stretched to ~1200px)
- [ ] Verify grid is centered with generous margins
- [ ] Test with 3, 4, 6 participants

### Aspect Ratio Tests

#### Dynamic Aspect Ratio Calculation

- [ ] Verify screen shares always use 16:9 aspect ratio
- [ ] Verify portrait-ish 3:4 ratio for wide tiles (> 400px) with ≤ 4 participants
- [ ] Verify 4:3 ratio for medium tiles (> 250px)
- [ ] Verify 16:9 ratio for narrow tiles

### Screen Share Tests

#### Screen Share Exception

- [ ] Start screen sharing in a call
- [ ] Verify screen share tiles ignore max width constraints
- [ ] Verify screen shares maintain 16:9 aspect ratio
- [ ] Verify regular video tiles still respect max width when screen share is present

### Sidebar Tests

#### With Sidebar Open/Closed

- [ ] Open participants panel (sidebar)
- [ ] Verify tiles respect `minTileSizeWithSidebar` values
- [ ] Close sidebar
- [ ] Verify tiles use regular `minTileSize` values
- [ ] Verify max width constraints work in both cases

### Window Resize Tests

#### Dynamic Resizing

- [ ] Start call with 3 participants on ultra-wide screen (2560px)
- [ ] Slowly resize browser window smaller
- [ ] Verify smooth transitions between breakpoints
- [ ] Verify no layout jumps or flickering
- [ ] Verify tiles properly adapt to new constraints
- [ ] Resize back to ultra-wide
- [ ] Verify max width constraint is re-applied

### Edge Cases

#### Large Participant Counts

- [ ] Join call with 12+ participants
- [ ] Verify grid calculates appropriate columns
- [ ] Verify max width is still respected
- [ ] Verify pagination works correctly

#### Mixed Content

- [ ] Join call with mix of video, audio-only, and screen shares
- [ ] Verify all tile types respect max width (except screen shares)
- [ ] Verify aspect ratios are appropriate for each type

#### Single Participant

- [ ] Join call with only 1 other participant
- [ ] On ultra-wide screen, verify tile doesn't exceed 500px
- [ ] Verify proper centering

## Visual Quality Checks

### Before vs After Comparison

**Before (Issue):**

- 2 participants on 2560px screen: Each tile ~1200px wide
- Videos stretched horizontally with poor aspect ratios
- Mostly empty wall/background visible instead of faces
- Inconsistent sizing across different screen sizes

**After (Expected):**

- 2 participants on 2560px screen: Each tile max 500px wide
- Grid centered with margin space on sides
- Proper face framing with natural aspect ratios
- Consistent experience across all screen sizes
- Screen shares still use full width when needed

### Face Framing

- [ ] Verify faces are properly centered and sized in tiles
- [ ] Verify no excessive background/wall space in frame
- [ ] Verify tiles maintain natural proportions

### Grid Centering

- [ ] When tiles hit max width, verify grid is centered
- [ ] Verify equal margins on left and right sides
- [ ] Verify no awkward spacing or alignment issues

## Performance Tests

### Responsiveness

- [ ] Rapidly resize browser window
- [ ] Verify no performance degradation
- [ ] Verify smooth updates without lag

### Memory

- [ ] Monitor browser memory during window resizes
- [ ] Verify no memory leaks from resize listeners

## Browser Compatibility

Test on multiple browsers:

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

## Regression Tests

Verify existing functionality still works:

- [ ] Pagination (if more participants than can fit on one page)
- [ ] Video quality controls
- [ ] Audio muting/unmuting
- [ ] Hand raising
- [ ] Reactions
- [ ] Active speaker highlighting
- [ ] Screen share focusing/expanding

## Known Limitations

- Mobile devices (< 768px) have no max width constraint to preserve full-screen experience
- Max width values are based on Teams/Meet patterns but may need fine-tuning based on user feedback
- Dynamic aspect ratio calculation is approximation-based; individual user cameras may vary

## Rollback Plan

If issues are found, revert commits to:

1. GroupCallModalRtk.tsx: Remove maxTileSize from responsive config
2. VideoGrid.tsx: Remove maxTileSize prop and container ref logic
3. Restore fixed aspect ratio calculation

## Success Criteria

The implementation is successful if:

1. ✅ Video tiles never exceed defined max widths per breakpoint
2. ✅ Grid centers properly when max width is reached
3. ✅ No layout jumps or visual glitches during window resize
4. ✅ Screen shares maintain full width capability
5. ✅ Face framing is natural and properly sized
6. ✅ No performance degradation
7. ✅ All existing functionality continues to work
8. ✅ User feedback is positive regarding video quality and sizing

## Next Steps

After testing is complete:

1. Gather user feedback on max width values
2. Fine-tune breakpoints if needed
3. Consider adding user preference controls for tile sizing
4. Monitor analytics for improved user engagement in video calls
