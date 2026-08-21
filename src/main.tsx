import React from 'react';
import ReactDOM from 'react-dom/client';
// Graisses réellement utilisées par la hiérarchie du design system (§5) :
// Archivo 600/700/800 pour l'identité/impact, Manrope 400/500/600/700 pour
// l'interface — pas d'italique, pas de variantes inutilisées.
import '@fontsource/archivo/600.css';
import '@fontsource/archivo/700.css';
import '@fontsource/archivo/800.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import './index.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
