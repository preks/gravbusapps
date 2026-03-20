import type { TemplateConfig } from './boardTemplateTypes'
import { col, statusCol, selectCol, kpiWidget, chartWidget, dashboardView, daysFromNow } from './boardTemplateTypes'

export const EVENT_PLANNING: TemplateConfig = {
  id: 'event-planning',
  name: 'Event Planning',
  description: 'Organize events, venues, budgets, and schedules',
  iconName: 'CalendarDays',
  sheets: [
    {
      name: 'Events',
      columns: [
        col('name', 'Event Name', 'text', 0, { isPrimary: true, isRequired: true }),
        col('date', 'Date', 'date', 1),
        col('endDate', 'End Date', 'date', 2),
        col('venue', 'Venue', 'text', 3),
        col('budget', 'Budget', 'currency', 4),
        statusCol(
          'status',
          'Status',
          5,
          [
            { value: 'planning', label: 'Planning', colorToken: 'muted' },
            { value: 'confirmed', label: 'Confirmed', colorToken: 'info' },
            { value: 'in_progress', label: 'In Progress', colorToken: 'warning' },
            { value: 'completed', label: 'Completed', colorToken: 'success' },
            { value: 'cancelled', label: 'Cancelled', colorToken: 'destructive' }
          ],
          ['completed', 'cancelled']
        )
      ],
      views: [
        { id: 'v_table', name: 'Table', type: 'table', isDefault: true, config: { type: 'table' } },
        {
          id: 'v_calendar',
          name: 'Calendar',
          type: 'calendar',
          isDefault: false,
          config: { type: 'calendar', dateColumn: 'date', titleColumn: 'name' }
        },
        {
          id: 'v_timeline',
          name: 'Timeline',
          type: 'timeline',
          isDefault: false,
          config: { type: 'timeline', startDateColumn: 'date', endDateColumn: 'endDate', titleColumn: 'name' }
        },
        dashboardView('v_dash', [
          kpiWidget('w1', 'Total Budget', 'budget', 'sum', 1, 'currency'),
          kpiWidget('w2', 'Total Events', 'name', 'count'),
          chartWidget('w3', 'Events by Status', 'pie', 'status', 'name', 2, 'count'),
          chartWidget('w4', 'Budget by Status', 'bar', 'status', 'budget', 2, 'sum')
        ])
      ],
      groups: [
        { id: 'grp_0', name: 'Planning', order: 0, colorToken: 'muted' },
        { id: 'grp_1', name: 'Confirmed', order: 1, colorToken: 'info' },
        { id: 'grp_2', name: 'Completed', order: 2, colorToken: 'success' }
      ],
      getSeedRows: () => [
        {
          name: 'Annual Company Summit',
          date: daysFromNow(30),
          endDate: daysFromNow(32),
          venue: 'Convention Center',
          budget: 15000,
          status: 'planning'
        },
        {
          name: 'Product Launch Party',
          date: daysFromNow(14),
          endDate: daysFromNow(14),
          venue: 'Rooftop Lounge',
          budget: 8000,
          status: 'confirmed'
        },
        {
          name: 'Team Building Workshop',
          date: daysFromNow(7),
          endDate: daysFromNow(7),
          venue: 'Outdoor Adventure Park',
          budget: 3500,
          status: 'confirmed'
        },
        {
          name: 'Customer Appreciation Dinner',
          date: daysFromNow(21),
          endDate: daysFromNow(21),
          venue: 'Grand Hotel Ballroom',
          budget: 12000,
          status: 'planning'
        },
        {
          name: 'Tech Conference Booth Setup',
          date: daysFromNow(45),
          endDate: daysFromNow(47),
          venue: 'Expo Center Hall B',
          budget: 25000,
          status: 'planning'
        },
        {
          name: 'Quarterly All-Hands Meeting',
          date: daysFromNow(-5),
          endDate: daysFromNow(-5),
          venue: 'Main Auditorium',
          budget: 2000,
          status: 'completed'
        },
        {
          name: 'Holiday Office Party',
          date: daysFromNow(60),
          endDate: daysFromNow(60),
          venue: 'Italian Restaurant',
          budget: 5000,
          status: 'planning'
        },
        {
          name: 'New Hire Orientation Week',
          date: daysFromNow(10),
          endDate: daysFromNow(14),
          venue: 'Training Room A',
          budget: 1500,
          status: 'confirmed'
        },
        {
          name: 'Board of Directors Meeting',
          date: daysFromNow(3),
          endDate: daysFromNow(3),
          venue: 'Executive Suite',
          budget: 500,
          status: 'confirmed'
        },
        {
          name: 'Charity Fundraiser Gala',
          date: daysFromNow(50),
          endDate: daysFromNow(50),
          venue: 'City Ballroom',
          budget: 20000,
          status: 'planning'
        }
      ]
    }
  ]
}

export const RECRUITMENT_PIPELINE: TemplateConfig = {
  id: 'recruitment-pipeline',
  name: 'Recruitment Pipeline',
  description: 'Track candidates from application to offer',
  iconName: 'UserCheck',
  sheets: [
    {
      name: 'Candidates',
      columns: [
        col('name', 'Candidate', 'text', 0, { isPrimary: true, isRequired: true }),
        col('role', 'Role', 'text', 1),
        statusCol(
          'stage',
          'Stage',
          2,
          [
            { value: 'applied', label: 'Applied', colorToken: 'muted' },
            { value: 'screening', label: 'Screening', colorToken: 'info' },
            { value: 'interview', label: 'Interview', colorToken: 'warning' },
            { value: 'offer', label: 'Offer', colorToken: 'success' },
            { value: 'hired', label: 'Hired', colorToken: 'success' },
            { value: 'rejected', label: 'Rejected', colorToken: 'destructive' }
          ],
          ['hired', 'rejected']
        ),
        col('interviewDate', 'Interview Date', 'date', 3),
        col('salary', 'Expected Salary', 'currency', 4),
        col('rating', 'Rating', 'rating', 5)
      ],
      views: [
        { id: 'v_table', name: 'Table', type: 'table', isDefault: true, config: { type: 'table' } },
        {
          id: 'v_kanban',
          name: 'Pipeline',
          type: 'kanban',
          isDefault: false,
          config: { type: 'kanban', statusColumn: 'stage', titleColumn: 'name' }
        },
        dashboardView('v_dash', [
          kpiWidget('w1', 'Total Candidates', 'name', 'count'),
          kpiWidget('w2', 'Avg. Salary Ask', 'salary', 'avg', 1, 'currency'),
          chartWidget('w3', 'Candidates by Stage', 'bar', 'stage', 'name', 2, 'count'),
          chartWidget('w4', 'Candidates by Role', 'pie', 'role', 'name', 2, 'count')
        ])
      ],
      groups: [
        { id: 'grp_0', name: 'New Applicants', order: 0, colorToken: 'muted' },
        { id: 'grp_1', name: 'In Process', order: 1, colorToken: 'info' },
        { id: 'grp_2', name: 'Decision', order: 2, colorToken: 'warning' },
        { id: 'grp_3', name: 'Closed', order: 3, colorToken: 'success' }
      ],
      getSeedRows: () => [
        {
          name: 'Sarah Chen',
          role: 'Senior Frontend Developer',
          stage: 'interview',
          interviewDate: daysFromNow(2),
          salary: 130000,
          rating: 4
        },
        {
          name: 'Marcus Thompson',
          role: 'Backend Engineer',
          stage: 'screening',
          interviewDate: daysFromNow(5),
          salary: 115000,
          rating: 3
        },
        {
          name: 'Emily Rodriguez',
          role: 'Product Designer',
          stage: 'offer',
          interviewDate: daysFromNow(-3),
          salary: 105000,
          rating: 5
        },
        {
          name: 'David Kim',
          role: 'DevOps Engineer',
          stage: 'applied',
          interviewDate: daysFromNow(10),
          salary: 125000,
          rating: 0
        },
        {
          name: 'Jessica Patel',
          role: 'Data Scientist',
          stage: 'interview',
          interviewDate: daysFromNow(3),
          salary: 140000,
          rating: 4
        },
        {
          name: "Ryan O'Connor",
          role: 'Full Stack Developer',
          stage: 'hired',
          interviewDate: daysFromNow(-10),
          salary: 120000,
          rating: 5
        },
        {
          name: 'Aisha Johnson',
          role: 'QA Engineer',
          stage: 'rejected',
          interviewDate: daysFromNow(-7),
          salary: 95000,
          rating: 2
        },
        {
          name: 'Tom Mueller',
          role: 'Engineering Manager',
          stage: 'screening',
          interviewDate: daysFromNow(7),
          salary: 160000,
          rating: 3
        },
        {
          name: 'Priya Sharma',
          role: 'Mobile Developer',
          stage: 'interview',
          interviewDate: daysFromNow(4),
          salary: 118000,
          rating: 4
        },
        {
          name: 'Alex Wright',
          role: 'Security Engineer',
          stage: 'applied',
          interviewDate: daysFromNow(12),
          salary: 135000,
          rating: 0
        }
      ]
    }
  ]
}

export const PRODUCT_ROADMAP: TemplateConfig = {
  id: 'product-roadmap',
  name: 'Product Roadmap',
  description: 'Plan features, track progress, and align teams',
  iconName: 'Rocket',
  sheets: [
    {
      name: 'Features',
      columns: [
        col('name', 'Feature', 'text', 0, { isPrimary: true, isRequired: true }),
        statusCol(
          'status',
          'Status',
          1,
          [
            { value: 'planned', label: 'Planned', colorToken: 'muted' },
            { value: 'in_progress', label: 'In Progress', colorToken: 'info' },
            { value: 'testing', label: 'Testing', colorToken: 'warning' },
            { value: 'released', label: 'Released', colorToken: 'success' }
          ],
          ['released']
        ),
        col('startDate', 'Start Date', 'date', 2),
        col('endDate', 'Target Date', 'date', 3),
        col('owner', 'Owner', 'people', 4),
        selectCol('effort', 'Effort', 5, [
          { value: 'low', label: 'Low', colorToken: 'success' },
          { value: 'medium', label: 'Medium', colorToken: 'warning' },
          { value: 'high', label: 'High', colorToken: 'destructive' }
        ])
      ],
      views: [
        { id: 'v_table', name: 'Table', type: 'table', isDefault: true, config: { type: 'table' } },
        {
          id: 'v_timeline',
          name: 'Timeline',
          type: 'timeline',
          isDefault: false,
          config: { type: 'timeline', startDateColumn: 'startDate', endDateColumn: 'endDate', titleColumn: 'name' }
        },
        {
          id: 'v_kanban',
          name: 'Kanban',
          type: 'kanban',
          isDefault: false,
          config: { type: 'kanban', statusColumn: 'status', titleColumn: 'name' }
        },
        dashboardView('v_dash', [
          kpiWidget('w1', 'Total Features', 'name', 'count'),
          kpiWidget('w2', 'Released', 'status', 'count'),
          chartWidget('w3', 'Features by Status', 'pie', 'status', 'name', 2, 'count'),
          chartWidget('w4', 'Features by Effort', 'bar', 'effort', 'name', 2, 'count')
        ])
      ],
      groups: [
        { id: 'grp_0', name: 'Planned', order: 0, colorToken: 'muted' },
        { id: 'grp_1', name: 'In Development', order: 1, colorToken: 'info' },
        { id: 'grp_2', name: 'Released', order: 2, colorToken: 'success' }
      ],
      getSeedRows: () => [
        {
          name: 'Single Sign-On Integration',
          status: 'released',
          startDate: daysFromNow(-60),
          endDate: daysFromNow(-30),
          effort: 'high'
        },
        {
          name: 'Bulk Import/Export',
          status: 'released',
          startDate: daysFromNow(-45),
          endDate: daysFromNow(-20),
          effort: 'medium'
        },
        {
          name: 'Real-time Collaboration',
          status: 'in_progress',
          startDate: daysFromNow(-14),
          endDate: daysFromNow(14),
          effort: 'high'
        },
        {
          name: 'Custom Reporting Dashboard',
          status: 'in_progress',
          startDate: daysFromNow(-10),
          endDate: daysFromNow(20),
          effort: 'high'
        },
        {
          name: 'Role-Based Access Control',
          status: 'in_progress',
          startDate: daysFromNow(-7),
          endDate: daysFromNow(21),
          effort: 'medium'
        },
        {
          name: 'API Rate Limiting',
          status: 'testing',
          startDate: daysFromNow(-21),
          endDate: daysFromNow(3),
          effort: 'low'
        },
        {
          name: 'Advanced Search Filters',
          status: 'testing',
          startDate: daysFromNow(-18),
          endDate: daysFromNow(5),
          effort: 'medium'
        },
        {
          name: 'Mobile App v2.0',
          status: 'planned',
          startDate: daysFromNow(7),
          endDate: daysFromNow(60),
          effort: 'high'
        },
        {
          name: 'Webhook Integrations',
          status: 'planned',
          startDate: daysFromNow(14),
          endDate: daysFromNow(42),
          effort: 'medium'
        },
        {
          name: 'Audit Log and Compliance',
          status: 'planned',
          startDate: daysFromNow(21),
          endDate: daysFromNow(56),
          effort: 'medium'
        },
        {
          name: 'Multi-language Support',
          status: 'planned',
          startDate: daysFromNow(30),
          endDate: daysFromNow(75),
          effort: 'high'
        },
        {
          name: 'AI-Powered Suggestions',
          status: 'planned',
          startDate: daysFromNow(45),
          endDate: daysFromNow(90),
          effort: 'high'
        }
      ]
    }
  ]
}

export const INVENTORY_TRACKER: TemplateConfig = {
  id: 'inventory-tracker',
  name: 'Inventory Tracker',
  description: 'Monitor stock levels, reorder points, and costs',
  iconName: 'Package',
  sheets: [
    {
      name: 'Inventory',
      columns: [
        col('name', 'Item', 'text', 0, { isPrimary: true, isRequired: true }),
        col('sku', 'SKU', 'text', 1),
        col('quantity', 'Quantity', 'number', 2),
        col('reorderLevel', 'Reorder Level', 'number', 3),
        selectCol('category', 'Category', 4, [
          { value: 'electronics', label: 'Electronics', colorToken: 'info' },
          { value: 'accessories', label: 'Accessories', colorToken: 'warning' },
          { value: 'furniture', label: 'Furniture', colorToken: 'success' },
          { value: 'office', label: 'Office Supplies', colorToken: 'muted' }
        ]),
        col('unitPrice', 'Unit Price', 'currency', 5)
      ],
      views: [
        { id: 'v_table', name: 'Table', type: 'table', isDefault: true, config: { type: 'table' } },
        dashboardView('v_dash', [
          kpiWidget('w1', 'Total Items', 'name', 'count'),
          kpiWidget('w2', 'Total Stock', 'quantity', 'sum'),
          chartWidget('w3', 'Items by Category', 'pie', 'category', 'name', 2, 'count'),
          chartWidget('w4', 'Stock Levels', 'bar', 'name', 'quantity', 2)
        ])
      ],
      groups: [
        { id: 'grp_0', name: 'Electronics', order: 0, colorToken: 'info' },
        { id: 'grp_1', name: 'Accessories', order: 1, colorToken: 'warning' },
        { id: 'grp_2', name: 'Furniture', order: 2, colorToken: 'success' },
        { id: 'grp_3', name: 'Office Supplies', order: 3, colorToken: 'muted' }
      ],
      getSeedRows: () => [
        {
          name: 'Wireless Mouse',
          sku: 'WM-001',
          quantity: 245,
          reorderLevel: 50,
          category: 'electronics',
          unitPrice: 29.99
        },
        {
          name: 'USB-C Cable (2m)',
          sku: 'UC-002',
          quantity: 1200,
          reorderLevel: 200,
          category: 'accessories',
          unitPrice: 12.99
        },
        {
          name: 'Standing Desk',
          sku: 'SD-003',
          quantity: 18,
          reorderLevel: 10,
          category: 'furniture',
          unitPrice: 549.99
        },
        {
          name: 'Monitor Arm Mount',
          sku: 'MA-004',
          quantity: 65,
          reorderLevel: 20,
          category: 'accessories',
          unitPrice: 89.99
        },
        {
          name: 'HD Webcam',
          sku: 'WC-005',
          quantity: 150,
          reorderLevel: 30,
          category: 'electronics',
          unitPrice: 79.99
        },
        {
          name: 'Noise-Cancelling Headset',
          sku: 'NH-006',
          quantity: 82,
          reorderLevel: 25,
          category: 'electronics',
          unitPrice: 199.99
        },
        {
          name: 'Mechanical Keyboard',
          sku: 'KM-007',
          quantity: 190,
          reorderLevel: 40,
          category: 'electronics',
          unitPrice: 149.99
        },
        {
          name: 'LED Desk Lamp',
          sku: 'DL-008',
          quantity: 310,
          reorderLevel: 50,
          category: 'furniture',
          unitPrice: 39.99
        },
        {
          name: 'Cable Organizer Kit',
          sku: 'CO-009',
          quantity: 500,
          reorderLevel: 100,
          category: 'accessories',
          unitPrice: 14.99
        },
        {
          name: 'Whiteboard (4x6 ft)',
          sku: 'WB-010',
          quantity: 22,
          reorderLevel: 5,
          category: 'office',
          unitPrice: 129.99
        },
        {
          name: 'Ergonomic Chair',
          sku: 'EC-011',
          quantity: 30,
          reorderLevel: 10,
          category: 'furniture',
          unitPrice: 699.99
        },
        {
          name: 'Laptop Stand',
          sku: 'LS-012',
          quantity: 175,
          reorderLevel: 30,
          category: 'accessories',
          unitPrice: 49.99
        }
      ]
    }
  ]
}

export const PRODUCTION_BOARD: TemplateConfig = {
  id: 'production-board',
  name: 'Production Board',
  description: 'Track print jobs, production runs, and deliveries',
  iconName: 'Printer',
  sheets: [
    {
      name: 'Jobs',
      columns: [
        col('name', 'Job Name', 'text', 0, { isPrimary: true, isRequired: true }),
        col('client', 'Client', 'text', 1),
        col('quantity', 'Quantity', 'number', 2),
        statusCol(
          'status',
          'Status',
          3,
          [
            { value: 'pending', label: 'Pending', colorToken: 'muted' },
            { value: 'in_production', label: 'In Production', colorToken: 'info' },
            { value: 'quality_check', label: 'Quality Check', colorToken: 'warning' },
            { value: 'completed', label: 'Completed', colorToken: 'success' },
            { value: 'shipped', label: 'Shipped', colorToken: 'success' }
          ],
          ['completed', 'shipped']
        ),
        col('dueDate', 'Due Date', 'date', 4),
        col('cost', 'Cost', 'currency', 5)
      ],
      views: [
        { id: 'v_table', name: 'Table', type: 'table', isDefault: true, config: { type: 'table' } },
        {
          id: 'v_kanban',
          name: 'Kanban',
          type: 'kanban',
          isDefault: false,
          config: { type: 'kanban', statusColumn: 'status', titleColumn: 'name' }
        },
        dashboardView('v_dash', [
          kpiWidget('w1', 'Active Jobs', 'name', 'count'),
          kpiWidget('w2', 'Total Revenue', 'cost', 'sum', 1, 'currency'),
          chartWidget('w3', 'Jobs by Status', 'pie', 'status', 'name', 2, 'count'),
          chartWidget('w4', 'Revenue by Client', 'bar', 'client', 'cost', 2, 'sum')
        ])
      ],
      groups: [
        { id: 'grp_0', name: 'Pending', order: 0, colorToken: 'muted' },
        { id: 'grp_1', name: 'In Production', order: 1, colorToken: 'info' },
        { id: 'grp_2', name: 'Completed', order: 2, colorToken: 'success' }
      ],
      getSeedRows: () => [
        {
          name: 'Annual Report Booklets',
          client: 'Acme Corp',
          quantity: 500,
          status: 'pending',
          dueDate: daysFromNow(10),
          cost: 2500
        },
        {
          name: 'Product Brochures (Tri-fold)',
          client: 'TechStart Inc',
          quantity: 2000,
          status: 'in_production',
          dueDate: daysFromNow(5),
          cost: 1800
        },
        {
          name: 'Business Cards Premium',
          client: 'Vertex Solutions',
          quantity: 1000,
          status: 'completed',
          dueDate: daysFromNow(-2),
          cost: 350
        },
        {
          name: 'Trade Show Event Banners',
          client: 'Summit Health',
          quantity: 10,
          status: 'quality_check',
          dueDate: daysFromNow(3),
          cost: 900
        },
        {
          name: 'Packaging Labels (Roll)',
          client: 'Nova Financial',
          quantity: 5000,
          status: 'in_production',
          dueDate: daysFromNow(7),
          cost: 1200
        },
        {
          name: 'Monthly Newsletter Mailers',
          client: 'Horizon Media',
          quantity: 3000,
          status: 'pending',
          dueDate: daysFromNow(12),
          cost: 2100
        },
        {
          name: 'Promotional Posters (A1)',
          client: 'Atlas Industries',
          quantity: 50,
          status: 'completed',
          dueDate: daysFromNow(-5),
          cost: 650
        },
        {
          name: 'Employee ID Cards',
          client: 'Global Dynamics',
          quantity: 200,
          status: 'shipped',
          dueDate: daysFromNow(-7),
          cost: 400
        },
        {
          name: 'Restaurant Menu Cards',
          client: 'Grand Hotel',
          quantity: 500,
          status: 'in_production',
          dueDate: daysFromNow(4),
          cost: 550
        },
        {
          name: 'Gift Certificate Booklets',
          client: 'Apex Digital',
          quantity: 1000,
          status: 'pending',
          dueDate: daysFromNow(15),
          cost: 780
        }
      ]
    }
  ]
}
