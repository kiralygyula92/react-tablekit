import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/open-sans';
import 'react-tablekit/styles.css';
import { App } from './App';
import { startMockServerInBackground } from './mock/ready';
import './styles/site.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root not found');

// MSW loads in its own chunk; demo requests await `whenMockReady()` (see mock/ready.ts).
startMockServerInBackground();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
