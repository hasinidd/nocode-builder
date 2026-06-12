describe('E-Commerce Order Checkout E2E', () => {
  it('adds product to cart and completes checkout', () => {
    cy.visit('/a/demo-shop-agent');
    cy.contains('Products').click();
    cy.get('.product-card').first().contains('Buy').click();
    cy.get('input[name="name"]').type('Customer Name');
    cy.get('input[name="address"]').type('123 Main Street');
    cy.get('button').contains('Place Order').click();
    cy.contains('Order Placed').should('be.visible');
  });
});
