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
