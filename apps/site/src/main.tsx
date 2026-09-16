import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/open-sans';
import 'react-tablekit/styles.css';
import { App } from './App';
import './styles/site.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
