describe('Booking & Appointment Scheduling E2E', () => {
  it('allows end user to view available slots and place booking', () => {
    cy.visit('/a/demo-salon-agent');
    cy.contains('Book').click();
    cy.get('.slot-item').first().click();
    cy.get('input[name="customerName"]').type('Jane Doe');
    cy.get('input[name="customerEmail"]').type('jane.doe@example.com');
    cy.get('button').contains('Confirm Booking').click();
    cy.contains('Confirmed').should('be.visible');
  });
});
