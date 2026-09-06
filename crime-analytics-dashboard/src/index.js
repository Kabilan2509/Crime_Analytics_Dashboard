import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));

const CATALYST_LOGIN_PATH = '/__catalyst/auth/login';
const BROWSER_SESSION_KEY = 'ksp-catalyst-browser-session';
const isCatalystHosted = /(^|\.)catalystserverless\.(in|com)$/i.test(window.location.hostname);
// Catalyst's configured login_redirect returns successful authentication here.
const returnedFromCatalystLogin = window.location.pathname === '/app/index.html';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Unable to load ${src}`));
    document.head.appendChild(script);
  });
}

async function loadCatalystSdk() {
  await loadScript('https://static.zohocdn.com/catalyst/sdk/js/4.0.0/catalystWebSDK.js');
  await loadScript('/__catalyst/sdk/init.js');
}

async function renderAuthenticatedApp() {
  // The Catalyst SDK and init script are only available on the hosted client.
  // Keep localhost usable for UI development without weakening deployed access.
  if (isCatalystHosted) {
    try {
      await loadCatalystSdk();
    } catch (error) {
      console.error('Unable to initialize the Catalyst authentication SDK.', error);
      return;
    }

    const loginUrl = `${window.location.origin}${CATALYST_LOGIN_PATH}`;

    // Catalyst cookies can outlive the browser. Require a successful login in
    // this browser session and clear any older persistent Catalyst session.
    if (!returnedFromCatalystLogin && window.sessionStorage.getItem(BROWSER_SESSION_KEY) !== 'active') {
      try {
        if (window.catalyst?.auth?.signOut) {
          window.catalyst.auth.signOut(loginUrl);
          return;
        }
      } catch (error) {
        console.error('Unable to clear the previous Catalyst session.', error);
      }
      window.location.replace(loginUrl);
      return;
    }

    try {
      if (!window.catalyst?.auth?.isUserAuthenticated) {
        throw new Error('Catalyst Authentication SDK did not initialize');
      }

      const response = await window.catalyst.auth.isUserAuthenticated();
      if (!response?.content) {
        throw new Error('No authenticated Catalyst user');
      }

      if (returnedFromCatalystLogin) {
        window.sessionStorage.setItem(BROWSER_SESSION_KEY, 'active');
        window.history.replaceState(null, '', `/app/${window.location.search}${window.location.hash}`);
      }
    } catch (error) {
      console.info('Catalyst session unavailable; redirecting to hosted login.', error);
      window.sessionStorage.removeItem(BROWSER_SESSION_KEY);
      window.location.replace(loginUrl);
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
