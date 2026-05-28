export function generateInvoiceHtml(order) {
  const itemsHtml = (order.items || []).map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">LKR ${item.price.toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">LKR ${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; line-height: 1.6; padding: 40px; }
        .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.15); }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #f8fafc; text-align: left; padding: 10px; border-bottom: 2px solid #cbd5e1; }
        .total { text-align: right; margin-top: 30px; font-size: 18px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <div class="header">
          <div>
            <h1>INVOICE</h1>
            <p>Invoice #: <strong>${order.id || 'INV-001'}</strong><br>Date: ${new Date().toLocaleDateString()}</p>
          </div>
          <div style="text-align: right;">
            <h3>NoCode Builder SaaS</h3>
            <p>Colombo, Sri Lanka<br>support@nocodebuilder.io</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml || '<tr><td colspan="4">No items listed</td></tr>'}
          </tbody>
        </table>

        <div class="total">
          <p>Total: LKR ${(order.total_amount || 0).toFixed(2)}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateBookingReceiptHtml(booking) {
  return `
    <div style="font-family: sans-serif; padding: 20px;">
      <h2>Booking Receipt</h2>
      <p>Reference: <strong>${booking.reference}</strong></p>
      <p>Customer: ${booking.customer_name} (${booking.customer_email})</p>
      <p>Status: ${booking.status}</p>
    </div>
  `;
}
