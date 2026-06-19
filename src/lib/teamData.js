export const ROLES = {
  'Account Manager': {
    department: 'Client Services',
    permissions: [
      'Clients — full access',
      'Orders — read only',
      'Invoicing — read only',
      'Dashboard — read only',
    ],
  },
  'Sourcing Specialist': {
    department: 'Sourcing',
    permissions: [
      'Orders — full access',
      'Suppliers — full access',
      'Dashboard — read only',
    ],
  },
  'Procurement Coordinator': {
    department: 'Procurement',
    permissions: [
      'Orders — full access',
      'Suppliers — full access',
      'Invoicing — read only',
      'Dashboard — read only',
    ],
  },
  'QC Inspector': {
    department: 'Quality Control',
    permissions: [
      'Orders — full access',
      'Suppliers — read only',
    ],
  },
  'Logistics Coordinator': {
    department: 'Logistics',
    permissions: [
      'Orders — full access',
      'Suppliers — read only',
    ],
  },
  'Finance Officer': {
    department: 'Finance',
    permissions: [
      'Invoicing — full access',
      'Clients — read only',
      'Dashboard — full access',
    ],
  },
  'Operations Director': {
    department: 'Operations',
    permissions: [
      'Full access — all modules',
      'Team & role management',
      'Settings & integrations',
    ],
  },
}

export const ROLE_NAMES = Object.keys(ROLES)
export const DEPARTMENTS = [...new Set(Object.values(ROLES).map(r => r.department))].sort()

export const INITIAL_TEAM = [
  {
    id: 'mem-1',
    name: 'Priya Naidoo',
    email: 'priya@meridian-intl.com',
    phone: '+27 82 111 2233',
    whatsapp: '+27 82 111 2233',
    role: 'Operations Director',
    department: 'Operations',
    status: 'Active',
    lastActive: '2026-06-18',
    notes: 'Co-founder. Oversees all sourcing and client operations.',
  },
  {
    id: 'mem-2',
    name: 'James Fletcher',
    email: 'james@meridian-intl.com',
    phone: '+27 71 334 5566',
    whatsapp: '+27 71 334 5566',
    role: 'Account Manager',
    department: 'Client Services',
    status: 'Active',
    lastActive: '2026-06-17',
    notes: 'Manages Cape Trade Imports and Harlow & Sons accounts.',
  },
  {
    id: 'mem-3',
    name: 'Li Wei',
    email: 'liwei@meridian-intl.com',
    phone: '+86 138 0013 8000',
    whatsapp: '+86 138 0013 8000',
    role: 'Sourcing Specialist',
    department: 'Sourcing',
    status: 'Active',
    lastActive: '2026-06-18',
    notes: 'Based in Guangzhou. Primary factory liaison for all active orders.',
  },
  {
    id: 'mem-4',
    name: 'Samuel Okonkwo',
    email: 'samuel@meridian-intl.com',
    phone: '+27 83 556 7788',
    whatsapp: '+27 83 556 7788',
    role: 'QC Inspector',
    department: 'Quality Control',
    status: 'Active',
    lastActive: '2026-06-12',
    notes: 'Handles third-party inspection coordination and pre-shipment QC sign-off.',
  },
  {
    id: 'mem-5',
    name: 'Mei Lin',
    email: 'meilin@meridian-intl.com',
    phone: '+86 139 0011 2233',
    whatsapp: '+86 139 0011 2233',
    role: 'Finance Officer',
    department: 'Finance',
    status: 'Active',
    lastActive: '2026-06-15',
    notes: 'Manages invoicing, payment tracking and Zoho Books reconciliation.',
  },
  {
    id: 'mem-6',
    name: 'Tom Brandt',
    email: 'tom@meridian-intl.com',
    phone: '+44 7900 112233',
    whatsapp: '+44 7900 112233',
    role: 'Logistics Coordinator',
    department: 'Logistics',
    status: 'Inactive',
    lastActive: '2026-03-28',
    notes: 'On extended leave. Logistics currently managed by Priya.',
  },
]
