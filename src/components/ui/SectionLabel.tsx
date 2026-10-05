import type { HTMLAttributes } from 'react';

// Élimine la duplication du même eyebrow "PROGRESSION" / "POIDS" / "OBJECTIF"
// répété à l'identique dans chaque card dashboard. `className` permet de
// remplacer la couleur par défaut sur une surface sombre (ex. hero card).
function SectionLabel({ className = '', children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={`text-sm font-semibold uppercase tracking-wide text-ekvara-black/55 ${className}`}
      {...props}
    >
      {children}
    </h2>
  );
}

export default SectionLabel;
