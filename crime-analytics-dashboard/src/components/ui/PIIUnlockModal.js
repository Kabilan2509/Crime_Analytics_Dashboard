import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useSecurity } from '../../context/SecurityContext';

export default function PIIUnlockModal({ isOpen, onClose }) {
  const { session, verifyOfficer } = useSecurity();
  const [form, setForm] = useState({
    officerName: '',
    badgeId: '',
    unitName: '',
    email: ''
  });
  const [step, setStep] = useState('input'); // 'input' or 'otp'
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugOtp, setDebugOtp] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const nameInputRef = useRef(null);
  const modalContainerRef = useRef(null);

  // Pre-populate input fields if session already has officer details
  useEffect(() => {
    if (isOpen) {
      setForm(prev => ({
        ...prev,
        officerName: prev.officerName || session.officerName || '',
        badgeId: prev.badgeId || session.badgeId || '',
        unitName: prev.unitName || session.unitName || '',
        email: session.email || prev.email || ''
      }));
    }
  }, [isOpen, session.officerName, session.badgeId, session.unitName, session.email]);

  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setOtpCode('');
      setDebugOtp('');
      setInfoMsg('');
      setErrorMsg('');

      // Focus on first input
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen]);

  // Trap focus and listen for ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
      
      // Focus trapping
      if (e.key === 'Tab') {
        if (!modalContainerRef.current) return;
        const focusableElements = modalContainerRef.current.querySelectorAll(
          'input, button, [tabindex="0"]'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    setIsLoading(true);
    
    const badgePattern = /^KG\d{4,}$/i;
    if (!badgePattern.test(form.badgeId)) {
      setErrorMsg('Badge Number must start with "KG" followed by at least 4 digits (e.g. KG12345)');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/server/crime_api/api/security/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          badgeId: form.badgeId,
          officerName: form.officerName
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to request verification code.');
      }
      
      setStep('otp');
      setInfoMsg(data.message);
      if (data.debugOtp) {
        setDebugOtp(data.debugOtp);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error sending OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);
    try {
      const res = await fetch('/server/crime_api/api/security/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          badgeId: form.badgeId,
          otp: otpCode
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed.');
      }

      verifyOfficer(form.officerName, form.badgeId, form.unitName);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Invalid OTP code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  return ReactDOM.createPortal(
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pii-modal-title"
    >
      <div 
        ref={modalContainerRef}
        style={{
          background: 'var(--bg-panel, #142132)',
          border: '1px solid var(--border-color, rgba(173, 193, 214, 0.16))',
          borderRadius: '8px',
          padding: '24px',
          width: '340px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          fontFamily: 'monospace',
          color: 'var(--text-primary)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <strong id="pii-modal-title" style={{ fontSize: '13px', textTransform: 'uppercase', color: '#60a5fa', letterSpacing: '0.5px' }}>
            🔑 PII Access Verification
          </strong>
          <button 
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-secondary)', 
              cursor: 'pointer', 
              fontSize: '14px',
              minHeight: 'auto',
              minWidth: 'auto',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: '11px', margin: '0 0 16px 0', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          Please verify your identity to unlock personally identifiable information (PII) for this command session.
        </p>

        {step === 'input' ? (
          <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                Officer Name
              </label>
              <input 
                ref={nameInputRef}
                type="text"
                value={form.officerName} 
                onChange={e => handleFieldChange('officerName', e.target.value)} 
                placeholder="e.g. Inspector Ramesh" 
                required 
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-panel-alt)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                  minHeight: '36px'
                }} 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                KGID / Badge Number
              </label>
              <input 
                type="text"
                value={form.badgeId} 
                onChange={e => handleFieldChange('badgeId', e.target.value)} 
                placeholder="e.g. KG12345" 
                required 
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-panel-alt)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                  minHeight: '36px'
                }} 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                Assigned Station
              </label>
              <input 
                type="text"
                value={form.unitName} 
                onChange={e => handleFieldChange('unitName', e.target.value)} 
                placeholder="e.g. Shivaji Nagar PS" 
                required 
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-panel-alt)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                  minHeight: '36px'
                }} 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                Verification Email ID (for OTP)
              </label>
              <input 
                type="email"
                value={form.email} 
                onChange={e => handleFieldChange('email', e.target.value)} 
                placeholder="e.g. officer@ksp.gov.in" 
                required 
                disabled={isLoading || !!session.email}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: session.email ? 'rgba(255,255,255,0.05)' : 'var(--bg-panel-alt)',
                  color: session.email ? 'var(--text-muted)' : 'var(--text-primary)',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                  minHeight: '36px',
                  cursor: session.email ? 'not-allowed' : 'text'
                }} 
              />
            </div>

            {errorMsg && (
              <div style={{ fontSize: '11px', color: 'var(--accent-danger, #ff4d4d)', lineHeight: '1.4' }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button 
                type="button"
                onClick={onClose}
                disabled={isLoading}
                style={{
                  flex: 1,
                  background: 'var(--bg-panel-alt, #1f2e43)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  minHeight: '36px',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isLoading}
                style={{
                  flex: 1.5,
                  background: 'var(--accent-primary, #3b82f6)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  minHeight: '36px',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? 'Sending...' : 'Request OTP Code'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {infoMsg && (
              <div style={{ fontSize: '11px', color: '#10b981', lineHeight: '1.4', background: 'rgba(16, 185, 129, 0.1)', padding: '8px', borderRadius: '4px' }}>
                ✓ {infoMsg}
              </div>
            )}

            {debugOtp && (
              <div style={{ fontSize: '11px', color: '#f59e0b', padding: '8px', border: '1px dashed #f59e0b', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.05)' }}>
                ℹ️ <strong>Demo Bypass:</strong> Use code <code>{debugOtp}</code>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                Enter 6-Digit OTP Code
              </label>
              <input 
                type="text"
                maxLength={6}
                value={otpCode} 
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} 
                placeholder="e.g. 123456" 
                required 
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-panel-alt)',
                  color: 'var(--text-primary)',
                  fontSize: '16px',
                  textAlign: 'center',
                  letterSpacing: '4px',
                  fontWeight: 'bold',
                  boxSizing: 'border-box',
                  minHeight: '40px'
                }} 
              />
            </div>

            {errorMsg && (
              <div style={{ fontSize: '11px', color: 'var(--accent-danger, #ff4d4d)', lineHeight: '1.4' }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button 
                type="button"
                onClick={() => { setStep('input'); setErrorMsg(''); }}
                disabled={isLoading}
                style={{
                  flex: 1,
                  background: 'var(--bg-panel-alt, #1f2e43)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  minHeight: '36px',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                Back
              </button>
              <button 
                type="submit" 
                disabled={isLoading}
                style={{
                  flex: 1.5,
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  minHeight: '36px',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? 'Verifying...' : 'Verify & Unlock'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
