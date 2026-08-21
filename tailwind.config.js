/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette EKVARA V1 — volontairement limitée à 4 couleurs de marque.
        // La palette grise par défaut de Tailwind (gray-*) reste disponible et
        // utilisée par l'existant : ekvara-muted ne la remplace pas partout,
        // seuls les composants migrés vers le design system l'utilisent.
        ekvara: {
          black: '#090909',
          surface: '#FAFAF8',
          muted: '#A3A3A3',
          lime: '#D9FF43',
        },
      },
      fontFamily: {
        // Manrope devient la police par défaut de l'interface (voir index.css) :
        // remplace le sans-serif système partout, sans changement de code par page.
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Archivo est opt-in via `font-display`, réservée à l'identité/impact
        // (titres, hero numbers) — jamais appliquée par défaut au corps de texte.
        display: ['Archivo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
