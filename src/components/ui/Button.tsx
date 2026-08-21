import type { ButtonHTMLAttributes } from 'react';

// Fondation §9 du design system EKVARA. Un seul composant, variantes
// volontairement limitées — pas de système de tailles/variantes extensible :
// seul ce dont l'app a réellement besoin (voir ce que chaque variante
// remplace déjà dans le codebase avant d'en ajouter une nouvelle).
export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'ghost-light';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-1.5 font-sans text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';

// Primary/Secondary/Accent partagent une même surface (hauteur, padding,
// radius) — seule Ghost s'en écarte volontairement (§9 : "sans surface
// forte"), au même titre que les liens "Voir ma progression →" déjà existants.
const SURFACE_CLASSES = 'rounded-md px-4 py-2.5';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: `${SURFACE_CLASSES} bg-ekvara-black text-ekvara-surface hover:bg-black`,
  secondary: `${SURFACE_CLASSES} border border-ekvara-black/15 bg-ekvara-surface text-ekvara-black hover:border-ekvara-black/30`,
  // Texte sombre sur lime, jamais blanc : le lime est trop clair pour un
  // texte clair rester lisible dessus (§16).
  accent: `${SURFACE_CLASSES} bg-ekvara-lime text-ekvara-black hover:bg-[#cdf22e]`,
  ghost: 'text-ekvara-black hover:opacity-70',
  // Même rôle que "ghost", pour un CTA posé sur une surface sombre (ex. la
  // hero card compétition) où le texte noir de "ghost" serait illisible.
  'ghost-light': 'text-ekvara-surface hover:opacity-70',
};

function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}

export default Button;
