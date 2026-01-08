---
alwaysApply: false
---
# Pay Grade Matrix Layout

When creating pay grade matrix visualizations for compensation data:

**Key Pattern**: Each row contains label + all grid cells for proper alignment
**Problem Solved**: Labels were misaligned with grid rows
**Solution**: Use CSS Grid with `gba:contents` for proper row structure

## Matrix Layout Structure
```typescript
<div className="gba:grid gba:grid-cols-[200px_1fr_200px] gba:gap-4">
  {payGrades.map(grade => (
    <div key={grade.id} className="gba:contents">
      {/* Pay Grade Label */}
      <div className="gba:flex gba:items-center gba:pr-4">
        <span 
          className="gba:flex-1 gba:truncate gba:text-sm" 
          title={grade.name}
        >
          {grade.name}
        </span>
      </div>
      
      {/* Job Level Grid Cells */}
      <div className="gba:flex gba:gap-1">
        {jobLevelGroups.map(group => (
          <div 
            key={group.id} 
            className="gba:flex-1 gba:h-8 gba:bg-gray-100 gba:rounded"
          />
        ))}
      </div>
      
      {/* Salary Range */}
      <div className="gba:text-right gba:text-sm gba:text-gray-600">
        {formatCurrency(grade.minSalary)} - {formatCurrency(grade.maxSalary)}
      </div>
    </div>
  ))}
</div>
```

## Label Truncation with Tooltips
- Use `gba:flex-1` to allow labels full container width before truncating
- Add `title` attribute for hover tooltips showing full names
- Use `gba:truncate` for ellipsis on long names

## Three-Column Structure
1. **Pay Grade Label** (200px fixed width)
2. **Job Level Groups Grid** (flexible width)
3. **Salary Range** (200px fixed width)

This ensures proper alignment between Y-axis labels and grid cells.

@src/business-apps/mdm/apps/compensation-data/components/tabs/PayGradesTab.tsx



