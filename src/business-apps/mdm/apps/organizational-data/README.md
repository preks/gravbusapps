# Organizational Data Management

This app manages organizational master data including company information, projects, and site locations for HR operations.

## Overview

The Organizational Data app provides comprehensive functionality to:

- Manage company information including legal details, industry classification, and contact information
- Track and manage projects with budgets, timelines, and resource allocation
- Maintain site location data with capacity, occupancy, and facility information
- Support organizational planning and resource management

## Components

### OrganizationalData

Main component that provides the overall layout and tab navigation for organizational data management.

### CompaniesTab

Manages companies information including:

- CRUD operations for companies
- Legal information (VAT ID, registration numbers, legal forms)
- Industry classification and company size tracking
- Headquarters location and contact details
- Company status management (Active/Inactive)
- Website and description management

### ProjectsTab

Manages project information including:

- CRUD operations for projects
- Project status tracking (Active, Planned, Completed, On Hold, Cancelled)
- Budget management and billable status
- Project manager and department assignment
- Client information and project timelines
- Priority levels (Low, Medium, High, Critical)
- Search and filtering capabilities

### SiteLocationTab

Manages site location information including:

- CRUD operations for site locations
- Location types (Headquarters, Office, Branch, Remote, Coworking, Other)
- Address and geographical information
- Capacity and occupancy tracking
- Facility management (Cafeteria, Gym, Parking, Conference Rooms, etc.)
- Contact person and communication details
- Status tracking (Active, Inactive, Under Construction)

## Features

### Companies Management

- **Legal Information**: VAT IDs, registration numbers, legal forms
- **Industry Classification**: Technology, Finance, Healthcare, Manufacturing, etc.
- **Company Size**: Employee count ranges from 1-10 to 5000+
- **Status Tracking**: Active/Inactive status management
- **Contact Information**: Headquarters, website, description

### Project Management

- **Status Tracking**: Active, Planned, Completed, On Hold, Cancelled
- **Budget Management**: Budget amounts with billable/non-billable classification
- **Resource Allocation**: Project manager and department assignment
- **Timeline Management**: Start and end date tracking
- **Priority Levels**: Critical, High, Medium, Low priority classification
- **Client Management**: Internal and external client tracking

### Site Locations Management

- **Location Types**: Headquarters, Office, Branch, Remote, Coworking, Other
- **Capacity Management**: Maximum capacity and current occupancy tracking
- **Facility Tracking**: Comprehensive facility management (12+ facility types)
- **Geographic Information**: Address, city, country, timezone
- **Contact Management**: Contact person, phone, email
- **Status Management**: Active, Inactive, Under Construction

## Data Structures

### Company Interface

```typescript
interface Company {
  id: string
  name: string
  code: string
  legalName: string
  industry: string
  size: string
  founded: string
  headquarters: string
  website?: string
  description?: string
  status: 'Active' | 'Inactive'
  legalForm: string
  vatId?: string
  registrationNumber?: string
}
```

### Project Interface

```typescript
interface Project {
  id: string
  name: string
  code: string
  description?: string
  status: 'Active' | 'Planned' | 'Completed' | 'On Hold' | 'Cancelled'
  startDate?: string
  endDate?: string
  clientName?: string
  projectManager: string
  department: string
  budget?: number
  billable: boolean
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
}
```

### SiteLocation Interface

```typescript
interface SiteLocation {
  id: string
  name: string
  code: string
  type: 'Headquarters' | 'Office' | 'Branch' | 'Remote' | 'Coworking' | 'Other'
  address: string
  city: string
  state?: string
  country: string
  postalCode: string
  timezone: string
  capacity: number
  currentOccupancy: number
  facilities: string[]
  contactPerson?: string
  phone?: string
  email?: string
  status: 'Active' | 'Inactive' | 'Under Construction'
  description?: string
}
```

## Navigation

The app supports URL-based navigation with query parameters:

- `/hr/master-data/organizational-data?tab=companies` - Companies management
- `/hr/master-data/organizational-data?tab=projects` - Project management
- `/hr/master-data/organizational-data?tab=site-locations` - Site locations management

Hash-based navigation is also supported as fallback:

- `#companies` - Companies tab
- `#projects` - Projects tab
- `#site-locations` - Site Locations tab

## Integration with HR Settings

The Organizational Data app is integrated into the HR Settings system with:

- **Card Title**: "Organizational Data"
- **Icon**: RiBuilding2Line (Building icon)
- **Description**: "Manage company information, projects, and site locations"
- **Navigation Entries**: Three entries for each tab with proper URLs

## Mock Data

Each tab includes comprehensive mock data for demonstration:

### Companies Data (5 entries)

- NEWWORK SE (Parent company)
- XING GmbH (Professional networking)
- kununu GmbH (Employer rating platform)
- honeypot GmbH (Developer job platform)
- XING Events GmbH (Event management platform)

### Project Data (6 entries)

- XING Platform Redesign (€250,000 budget)
- kununu Mobile App (€180,000 budget)
- Client API Integration (€120,000 budget)
- Data Analytics Platform (€200,000 budget)
- Security Audit & Compliance (€80,000 budget)
- Customer Portal Enhancement (€150,000 budget)

### Site Locations Data (6 entries)

- Hamburg Headquarters (800 capacity, 650 occupancy)
- Vienna Office (150 capacity, 120 occupancy)
- Berlin Office (200 capacity, 180 occupancy)
- Munich Branch (80 capacity, 45 occupancy)
- Barcelona Coworking (50 capacity, 12 occupancy)
- Frankfurt Office (120 capacity, under construction)

## Styling and Design

The app uses inline styles to avoid Tailwind prefix issues:

- **Gradient Backgrounds**: Linear gradients from light gray to gray
- **Card Layout**: White background cards with rounded corners and shadows
- **Color-coded Tags**: Status, priority, and type indicators with appropriate colors
- **Professional Typography**: Consistent font weights and colors
- **Responsive Design**: Grid layouts that adapt to different screen sizes

## Search and Filtering

All tabs include comprehensive search functionality:

- **Companies Tab**: Search by name, code, legal name, industry, headquarters
- **Projects Tab**: Search by name, code, description, client, project manager, department
- **Site Locations Tab**: Search by name, code, city, country, address, type

## Form Validation

Modal forms include proper validation:

- **Required Fields**: Marked with validation rules
- **Field Types**: Appropriate input types (text, number, select, textarea)
- **Form Layout**: Grid-based layouts for optimal space usage
- **Error Handling**: Try-catch blocks with user-friendly error messages

## Future Enhancements

Potential areas for enhancement:

1. **Integration with Employee Data**: Link locations to employees
2. **Project Resource Management**: Assign employees to projects
3. **Location Analytics**: Occupancy trends and space utilization
4. **Budget Tracking**: Project budget vs. actual spending
5. **Facility Booking**: Room and facility reservation system
6. **Reporting**: Generate reports on organizational data
7. **Import/Export**: Bulk data operations
8. **API Integration**: Connect to external systems
9. **Audit Trail**: Track changes to organizational data
10. **Advanced Filtering**: More sophisticated filtering options
