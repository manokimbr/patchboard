describe('AppBar', () => {
  it('carrega e mostra o título da aplicação', () => {
    cy.visit('/')
    cy.get('[data-cy="appbar"]').should('exist')
    cy.get('[data-cy="appbar"]').should('contain', 'Patchboard')
  })
})
