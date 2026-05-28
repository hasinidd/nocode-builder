export class DocumentGeneratorService {
  generateProposalHtml(agentName, clientName, proposalItems, totalAmount) {
    const itemsRows = proposalItems.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${item.title}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${item.description || ''}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">LKR ${item.amount.toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Proposal for ${clientName}</title>
        <style>
          body { font-family: 'Inter', sans-serif; color: #1e293b; max-width: 800px; margin: 40px auto; padding: 20px; }
          .title-section { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #f8fafc; text-align: left; padding: 12px; font-weight: 600; }
          .total { margin-top: 30px; font-size: 20px; font-weight: bold; text-align: right; }
        </style>
      </head>
      <body>
        <div class="title-section">
          <h2>Service Proposal</h2>
          <p>Prepared by: <strong>${agentName}</strong><br>Prepared for: <strong>${clientName}</strong><br>Date: ${new Date().toLocaleDateString()}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Service Item</th>
              <th>Description</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="total">
          Total Investment: LKR ${totalAmount.toFixed(2)}
        </div>
      </body>
      </html>
    `;
  }
}

export const documentGeneratorService = new DocumentGeneratorService();
export default documentGeneratorService;
