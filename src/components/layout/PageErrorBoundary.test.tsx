import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageErrorBoundary from './PageErrorBoundary';

function Broken(): never {
  throw new Error('boom');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PageErrorBoundary', () => {
  it('une page qui plante affiche un message propre (jamais la stack) au lieu d\'un écran blanc', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <PageErrorBoundary resetKey="/poids">
        <Broken />
      </PageErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent("Cette page n'a pas pu s'afficher.");
    expect(screen.queryByText('boom')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Retour à l'accueil" })).toHaveAttribute('href', '/');
  });

  it('naviguer vers une autre route efface l\'erreur', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <PageErrorBoundary resetKey="/poids">
        <Broken />
      </PageErrorBoundary>,
    );

    rerender(
      <PageErrorBoundary resetKey="/">
        <p>accueil</p>
      </PageErrorBoundary>,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('accueil')).toBeInTheDocument();
  });
});
