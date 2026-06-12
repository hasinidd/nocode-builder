describe('Authentication E2E Flow', () => {
  it('allows a new user to register and logs in', () => {
    const email = `e2e_${Date.now()}@example.com`;
    cy.visit('/register');
    cy.get('input[name="name"]').type('E2E Tester');
    cy.get('input[type="email"]').type(email);
    cy.get('input[type="password"]').type('Password@2026');
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/register');
  });

  it('shows validation error on invalid login', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('nobody@example.com');
    cy.get('input[type="password"]').type('WrongPass');
    cy.get('button[type="submit"]').click();
    cy.contains('Invalid').should('be.visible');
  });
});
