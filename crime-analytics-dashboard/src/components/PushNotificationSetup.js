import React, { useEffect, useState } from 'react';

export default function PushNotificationSetup() {
  const [status, setStatus] = useState('Checking...');

  useEffect(() => {
    async function setupPush() {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setStatus('Permission denied');
          return;
        }

        // Ensure the service worker is registered so we can show notifications!
        if ('serviceWorker' in navigator) {
          const swUrl = `${process.env.PUBLIC_URL || ''}/service-worker.js`;
          await navigator.serviceWorker.register(swUrl);
        }

        if (window.catalyst && window.catalyst.notification) {
          window.catalyst.notification.enableNotification().then((resp) => {
            console.log('Catalyst Push Enabled:', resp);
            setStatus('Active');
            
            window.catalyst.notification.messageHandler = async (msg) => {
              console.log('[Catalyst Push] Message received:', msg);
              const title = msg.title || 'Critical Intelligence Alert';
              const body = msg.message || msg.body || 'New anomaly detected.';
              
              if (Notification.permission === 'granted') {
                try {
                  const reg = await navigator.serviceWorker.ready;
                  reg.showNotification(title, {
                    body: body,
                    icon: '/favicon.ico',
                    requireInteraction: true,
                  });
                } catch (e) {
          // Fallback for older browsers
                  new Notification(title, { body, icon: '/favicon.ico' });
                }
              }
            };
          }).catch(err => {
            console.error('Push Error:', err);
            setStatus('Push Error');
          });
        } else {
          setStatus('Waiting for Catalyst SDK...');
        }
      } catch (err) {
        console.error('Setup Error:', err);
        setStatus('Setup Error');
      }
    }
    
    setupPush();

    // =========================================================================
    // DATATHON PRESENTATION MODE: Simulated Push Notification Trigger
    // Press Ctrl + Shift + P to manually trigger a desktop notification.
    // This allows you to demonstrate the UX when the Zoho cloud is failing.
    // =========================================================================
    const handleKeyDown = async (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        console.log('[Datathon Demo] Simulating Push Notification...');
        
        if (Notification.permission === 'granted') {
          const title = 'Critical Intelligence Alert';
          const body = 'High-Risk Anomaly: Severe spike in Cyber Crimes detected in Bengaluru Urban.';
          
          try {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification(title, {
              body: body,
              icon: '/favicon.ico',
              requireInteraction: true,
              vibrate: [200, 100, 200]
            });
          } catch (error) {
            new Notification(title, { body, icon: '/favicon.ico' });
          }
        } else {
          alert('Cannot simulate push: Browser Notification Permission is not granted.');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return null;
}
