describe('Agent Creation & Configuration E2E', () => {
  beforeEach(() => {
    cy.login();
  });

  it('creates an agent and updates settings', () => {
    const agentName = `E2E Agent ${Date.now()}`;
    cy.createAgent(agentName, 'An agent for E2E automated test suite');
    cy.contains('Configure').click();
    cy.get('select[name="language"]').select('en');
    cy.get('button').contains('Save').click();
    cy.contains('Saved').should('be.visible');
  });
});
