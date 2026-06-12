import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8080',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    supportFile: 'e2e/cypress/support/e2e.js',
    specPattern: 'e2e/cypress/e2e/**/*.cy.js'
  }
});
