/** Returns 4 context-aware suggested prompts for the current module/entity. */
export function getSuggestedPrompts({ module, entity }) {
  switch (module) {
    case 'Dashboard':
      return [
        "Summarise today's activity",
        'Which orders are overdue?',
        'Draft a client update email',
        'What needs my attention this week?',
      ]

    case 'Clients':
      return entity
        ? [
            `Draft an outreach email for ${entity.company}`,
            `Summarise ${entity.company}'s history`,
            'What orders are linked to this client?',
            'Suggest a next step for this account',
          ]
        : [
            'Draft an outreach email for this client',
            'Summarise client history',
            'Which clients need follow-up?',
            'Who are our top clients by order volume?',
          ]

    case 'Orders':
      return entity
        ? [
            `What's the status of order ${entity.orderId}?`,
            'Draft a supplier follow-up',
            'Summarise this order for the client',
            'What are the next steps on this order?',
          ]
        : [
            "What's the status of this order?",
            'Draft a supplier follow-up',
            'Which orders are overdue?',
            'Summarise open orders',
          ]

    case 'Suppliers':
      return entity
        ? [
            `Draft a message to ${entity.name}`,
            "Summarise this supplier's track record",
            'What orders use this supplier?',
            'Any concerns with this supplier?',
          ]
        : [
            'Draft a supplier outreach message',
            'Which suppliers are most reliable?',
            'Summarise supplier performance',
            'Suggest a new supplier category to explore',
          ]

    case 'Invoicing':
      return entity
        ? [
            `Draft a payment reminder for ${entity.invoiceNo}`,
            'Summarise this invoice',
            'Is this invoice overdue?',
            'Draft a thank-you note for payment',
          ]
        : [
            'Summarise outstanding invoices',
            'Draft a payment reminder',
            'Which clients have overdue invoices?',
            "What's our total outstanding balance?",
          ]

    case 'Team':
      return entity
        ? [
            `What is ${entity.name} currently working on?`,
            'Draft a check-in message',
            'Summarise this person\'s role',
            'Suggest a task delegation',
          ]
        : [
            'Summarise team workload',
            'Draft a team update',
            'Who is handling the most orders?',
            'Suggest a task delegation',
          ]

    default:
      return [
        "Summarise today's activity",
        'Which orders are overdue?',
        'Draft a client update email',
        'What needs my attention?',
      ]
  }
}
