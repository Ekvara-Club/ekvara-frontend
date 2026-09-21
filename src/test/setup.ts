import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';

// 1 s (défaut) est trop juste quand la machine est chargée (serveurs de dev,
// builds, workers jsdom en parallèle) : un waitFor légitime échouait par timeout.
configure({ asyncUtilTimeout: 4000 });

afterEach(() => cleanup());
