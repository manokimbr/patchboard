describe('Smoke test', () => {
    it('loads the app shell', () => {
      cy.visit('/')
      cy.contains(/HelloWorld|Automox|Patchboard/i)
    })
  })
  