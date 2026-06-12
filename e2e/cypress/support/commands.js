Cypress.Commands.add('login', (email = 'testuser@nocode.io', password = 'TestPassword@2026') => {
  cy.visit('/login');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('include', '/dashboard');
});

Cypress.Commands.add('createAgent', (name, description) => {
  cy.visit('/agents/new');
  cy.get('input[name="name"]').type(name);
  cy.get('textarea[name="description"]').type(description);
  cy.get('button[type="submit"]').click();
  cy.contains(name).should('be.visible');
});
