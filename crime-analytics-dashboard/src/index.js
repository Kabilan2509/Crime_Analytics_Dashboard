import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Catalyst Hosted Login returns to the physical client entry file. Keep the
// public dashboard URL canonical without triggering another navigation.
if (window.location.pathname === '/app/index.html') {
  window.history.replaceState(null, '', `/app/${window.location.search}${window.location.hash}`);
}

const root = ReactDOM.createRoot(document.getElementById('root'));

const CATALYST_LOGIN_PATH = '/__catalyst/auth/login';
const isCatalystHosted = /(^|\.)catalystserverless\.(in|com)$/i.test(window.location.hostname);

async function renderAuthenticatedApp() {
  // The Catalyst SDK and init script are only available on the hosted client.
  // Keep localhost usable for UI development without weakening deployed access.
  if (isCatalystHosted) {
    try {
      if (!window.catalyst?.auth?.isUserAuthenticated) {
        throw new Error('Catalyst Authentication SDK did not initialize');
      }

      const response = await window.catalyst.auth.isUserAuthenticated();
      if (!response?.content) {
        throw new Error('No authenticated Catalyst user');
      }
    } catch (error) {
      console.info('Catalyst session unavailable; redirecting to hosted login.', error);
      window.location.replace(`${window.location.origin}${CATALYST_LOGIN_PATH}`);
      return;
    }
  }

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

renderAuthenticatedApp();
