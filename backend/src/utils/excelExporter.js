export function exportToCsv(dataArray, headersMap) {
  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    return Object.keys(headersMap).join(',') + '\n';
  }

  const keys = Object.keys(headersMap);
  const headerRow = Object.values(headersMap).map(h => `"${h.replace(/"/g, '""')}"`).join(',');

  const dataRows = dataArray.map(row => {
    return keys.map(k => {
      const val = row[k];
      if (val === null || val === undefined) return '""';
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

export function exportBookingsCsv(bookings) {
  const headers = {
    reference: 'Booking Ref',
    customer_name: 'Customer Name',
    customer_email: 'Customer Email',
    customer_phone: 'Phone Number',
    status: 'Status',
    created_at: 'Date Created'
  };
  return exportToCsv(bookings, headers);
}

export function exportLeadsCsv(leads) {
  const headers = {
    id: 'Inquiry ID',
    session_id: 'Session ID',
    fields: 'Submitted Data',
    created_at: 'Date Received'
  };
  return exportToCsv(leads, headers);
}

export function exportOrdersCsv(orders) {
  const headers = {
    id: 'Order ID',
    quantity: 'Quantity',
    status: 'Order Status',
    total_amount: 'Total (LKR)',
    created_at: 'Order Date'
  };
  return exportToCsv(orders, headers);
}
