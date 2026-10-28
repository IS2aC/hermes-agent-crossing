import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function App(): React.JSX.Element {
  return <main><div className="badge">HERMES AGENT CROSSING</div><h1>Hermes Agent Crossing — hello</h1><p>Votre open space Hermes prend forme.</p><span className="online">● Services prêts</span></main>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
