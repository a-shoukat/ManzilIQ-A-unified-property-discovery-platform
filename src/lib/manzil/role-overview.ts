export type CountSpec = {
  key: string; label: string; page: string; table: string; owner: string;
  filters?: [string, string | string[]][]; sum?: string;
};
export type RoleOverviewConfig = { text: string; stats: CountSpec[]; areas: [string, string][] };

export const ROLE_OVERVIEW: Record<string, RoleOverviewConfig> = {
  buyer: {
    text: 'Track your bookings, payments and documents in one place.',
    stats: [
      { key: 'bookings', label: 'My bookings', page: 'my-bookings', table: 'bookings', owner: 'customer_id' },
      { key: 'pendingB', label: 'Pending bookings', page: 'my-bookings', table: 'bookings', owner: 'customer_id', filters: [['status', 'pending']] },
      { key: 'paid', label: 'Paid', page: 'my-payments', table: 'payments', owner: 'customer_id', filters: [['status', 'confirmed']], sum: 'amount' },
      { key: 'due', label: 'Pending payments', page: 'my-payments', table: 'payments', owner: 'customer_id', filters: [['status', 'pending']], sum: 'amount' },
      { key: 'docs', label: 'Documents', page: 'documents', table: 'generated_documents', owner: 'customer_id' },
      { key: 'unread', label: 'Unread alerts', page: 'inbox', table: 'notifications', owner: 'user_id', filters: [['read', 'false']] },
    ],
    areas: [['marketplace', 'Browse marketplace'], ['book-plot', 'Book a plot'], ['my-bookings', 'My bookings'], ['my-payments', 'My payments'],
      ['documents', 'Documents'], ['compare', 'Compare'], ['price-estimator', 'Price estimator'], ['my-activity', 'My activity'], ['inbox', 'Inbox']],
  },
  dealer: {
    text: 'Manage your lots, leads and sales performance.',
    stats: [
      { key: 'lots', label: 'My lots', page: 'dealer-lots', table: 'lots', owner: 'dealer_id' },
      { key: 'activeLots', label: 'Active lots', page: 'dealer-lots', table: 'lots', owner: 'dealer_id', filters: [['status', 'active']] },
      { key: 'leads', label: 'Total leads', page: 'dealer-leads', table: 'leads', owner: 'dealer_id' },
      { key: 'newLeads', label: 'New leads', page: 'dealer-leads', table: 'leads', owner: 'dealer_id', filters: [['status', 'new']] },
      { key: 'closed', label: 'Bookings closed', page: 'dealer-analytics', table: 'bookings', owner: 'dealer_id', filters: [['status', ['token_paid', 'completed']]] },
      { key: 'unread', label: 'Unread alerts', page: 'inbox', table: 'notifications', owner: 'user_id', filters: [['read', 'false']] },
    ],
    areas: [['dealer', 'Dealer portal'], ['dealer-discover', 'Discover societies'], ['dealer-lots', 'My lots'], ['dealer-leads', 'Leads'],
      ['add-property', 'Add listing'], ['dealer-analytics', 'Performance'], ['documents', 'Documents'], ['inbox', 'Inbox']],
  },
  society_admin: {
    text: 'Manage inventory, dealers, bookings and finances.',
    stats: [
      { key: 'plots', label: 'Total plots', page: 'society-inventory', table: 'plots', owner: 'society_id' },
      { key: 'avail', label: 'Available', page: 'society-inventory', table: 'plots', owner: 'society_id', filters: [['status', 'available']] },
      { key: 'sold', label: 'Booked / sold', page: 'society-inventory', table: 'plots', owner: 'society_id', filters: [['status', ['reserved', 'sold']]] },
      { key: 'pendingB', label: 'Booking requests', page: 'society-bookings', table: 'bookings', owner: 'society_id', filters: [['status', 'pending']] },
      { key: 'dealers', label: 'Dealer requests', page: 'society-dealers', table: 'dealer_requests', owner: 'society_id', filters: [['status', 'pending']] },
      { key: 'revenue', label: 'Collected', page: 'society-financials', table: 'payments', owner: 'society_id', filters: [['status', 'confirmed']], sum: 'amount' },
    ],
    areas: [['society-inventory', 'Inventory'], ['society-map', 'Society map'], ['society-bookings', 'Booking requests'], ['society-dealers', 'Dealers'],
      ['society-financials', 'Financials'], ['society-analytics', 'Sales analytics'], ['broadcast', 'Broadcast'], ['add-property', 'Add listing'], ['documents', 'Documents']],
  },
};
