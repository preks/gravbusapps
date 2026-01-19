# Compensation Data App

This app manages compensation bands and salary structures for HR master data.

## Overview

The Compensation Data app provides functionality to:

- Manage compensation bands with pay grades and salary ranges
- Define minimum and maximum salary thresholds
- Support multiple currencies
- Organize compensation structures by pay grade levels

## Components

### CompensationData

Main component that provides the overall layout and navigation for the compensation data management interface.

### CompensationBandsTab

Manages the compensation bands data including:

- CRUD operations for compensation bands
- Search and filtering capabilities
- Modal forms for creating/editing bands
- Data validation and error handling

## Features

### Compensation Band Management

- **Pay Grade System**: Organize compensation bands by numerical pay grades (1-20)
- **Salary Ranges**: Define minimum and maximum salary thresholds for each band
- **Multi-Currency Support**: Support for EUR, USD, GBP, CHF currencies
- **Descriptions**: Optional descriptions for each compensation band
- **Search & Filter**: Real-time search across band names, descriptions, and pay grades

### Data Structure

Each compensation band includes:

- `id`: Unique identifier
- `name`: Display name for the band
- `payGrade`: Numerical grade (1-20)
- `minSalary`: Minimum salary amount
- `maxSalary`: Maximum salary amount
- `currency`: Currency code (EUR, USD, GBP, CHF)
- `description`: Optional description
- `version`: Version number for tracking changes

### User Interface

- **Table View**: Sortable table with pagination
- **Modal Forms**: Create/edit forms with validation
- **Search**: Real-time search functionality
- **Currency Formatting**: Localized currency display
- **Responsive Design**: Works on different screen sizes

## Integration

### HR Settings Integration

The app is integrated into the HR Settings as a separate card under "Compensation Data" with direct navigation to the compensation bands management interface.

### URL Structure

- Main route: `/hr/master-data/compensation-data`
- Tab navigation: `?tab=compensation-bands#compensation-bands`

## Data Flow

1. **Mock Data**: Currently uses mock data for demonstration
2. **State Management**: Uses React hooks for local state
3. **Form Validation**: Ant Design form validation
4. **CRUD Operations**: Local state updates (ready for API integration)

## Future Enhancements

- API integration for real data persistence
- Additional compensation band types
- Bulk import/export functionality
- Approval workflows for compensation changes
- Historical tracking of compensation changes
- Integration with employee records

## Technical Notes

- Built with React, TypeScript, and Ant Design
- Uses inline styles to avoid Tailwind prefix conflicts
- Follows existing project patterns and conventions
- Includes comprehensive TypeScript types
- Implements proper error handling and user feedback
