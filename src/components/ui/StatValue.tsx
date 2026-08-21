// Composition "gros chiffre Archivo + label secondaire Manrope" (§12),
// réutilisée par WeightCard (74,5 / KG) et ProgressCard (3 / CAPACITÉS EN
// PROGRESSION) — seuls deux endroits en bénéficient réellement aujourd'hui,
// mais c'est déjà une duplication évidente de composition, pas seulement de
// classes isolées.
interface StatValueProps {
  value: string;
  label: string;
  size?: 'md' | 'xl';
  className?: string;
}

const VALUE_SIZE_CLASSES: Record<NonNullable<StatValueProps['size']>, string> = {
  md: 'text-3xl',
  xl: 'text-5xl',
};

function StatValue({ value, label, size = 'xl', className = '' }: StatValueProps) {
  return (
    <div className={className}>
      <p className={`font-display font-extrabold leading-none tracking-tight text-ekvara-black ${VALUE_SIZE_CLASSES[size]}`}>
        {value}
      </p>
      <p className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-ekvara-muted">{label}</p>
    </div>
  );
}

export default StatValue;
