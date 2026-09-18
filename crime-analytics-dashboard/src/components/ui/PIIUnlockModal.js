import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Shield, AlertTriangle, X, Check, Smartphone } from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

export default function PIIUnlockModal({ isOpen, onClose }) {
  const { session, verifyOfficer } = useSecurity();
  const [form, setForm] = useState({
    officerName: '',
    badgeId: '',
    unitName: '',
    email: '',
  });

  // Steps: 'input' | 'setup' | 'otp' | 'reset-request' | 'reset-confirm'
  const [step, setStep] = useState('input');
  const [otpCode, setOtpCode] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [mfaData, setMfaData] = useState(null); // { status, qrDataUrl, secret, uri }
  const [isLoading, setIsLoading] = useState(false);
  const [infoMsg, setInfoMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

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
        email: session.email || prev.email || '',
      }));
    }
  }, [isOpen, session.officerName, session.badgeId, session.unitName, session.email]);

  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setOtpCode('');
      setResetCode('');
      setMfaData(null);
      setInfoMsg('');
      setErrorMsg('');
      setCopied(false);

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

      if (e.key === 'Tab' && modalContainerRef.current) {
        const focusableElements = modalContainerRef.current.querySelectorAll(
          'input, button, [tabindex="0"]'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ── Step 1: Submit Officer Info & Check MFA Status ──
  const handleCheckMfaStatus = async (e) => {
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

    if (!form.email || !form.email.includes('@')) {
      setErrorMsg('A valid official email is required for secure authentication.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/server/crime_api/api/mfa/status?email=${encodeURIComponent(form.email)}&badgeId=${encodeURIComponent(form.badgeId)}&officerName=${encodeURIComponent(form.officerName)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to check MFA status');
      }

      setMfaData(data);

      if (data.status === 'SETUP_REQUIRED') {
        setStep('setup');
        setInfoMsg('New Officer Device detected. Scan the QR code with your Authenticator app.');
      } else {
        setStep('otp');
        setInfoMsg('Officer enrolled. Enter the 6-digit code from your Authenticator app.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Unable to connect to authentication server.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Verify 6-digit TOTP Code ──
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/server/crime_api/api/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          token: otpCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed. Please try again.');
      }

      verifyOfficer(form.officerName, form.badgeId, form.unitName);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Invalid Authenticator code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 3: Request Lost-Phone Reset OTP via Email ──
  const handleRequestResetOtp = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/server/crime_api/api/mfa/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          badgeId: form.badgeId,
          officerName: form.officerName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send reset code');
      }

      setStep('reset-confirm');
      setInfoMsg(data.message || `Verification code sent to ${form.email}`);
    } catch (err) {
      setErrorMsg(err.message || 'Could not send verification email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 4: Confirm Email Reset & Receive New QR ──
  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/server/crime_api/api/mfa/confirm-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          code: resetCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid reset verification code');
      }

      setMfaData(data);
      setStep('setup');
      setOtpCode('');
      setInfoMsg('Old Authenticator revoked! Scan the new QR code below to re-enroll.');
    } catch (err) {
      setErrorMsg(err.message || 'Reset confirmation failed. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

  const copySecret = () => {
    if (mfaData?.secret) {
      navigator.clipboard.writeText(mfaData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        backdropFilter: 'blur(5px)',
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
          borderRadius: '10px',
          padding: '24px',
          width: step === 'setup' ? '380px' : '350px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          fontFamily: 'monospace',
          color: 'var(--text-primary)',
          transition: 'width 0.2s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <strong id="pii-modal-title" style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={16} strokeWidth={1.5} /> PII Access Verification
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
              padding: '4px',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Info or Error Alerts */}
        {infoMsg && (
          <div style={{ fontSize: '11px', color: 'var(--accent-success)', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '8px 10px', borderRadius: '4px', marginBottom: '14px', lineHeight: '1.4', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={16} strokeWidth={1.5} style={{ flexShrink: 0 }} /> {infoMsg}
          </div>
        )}

        {errorMsg && (
          <div style={{ fontSize: '11px', color: 'var(--accent-danger)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '8px 10px', borderRadius: '4px', marginBottom: '14px', lineHeight: '1.4', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={16} strokeWidth={1.5} style={{ flexShrink: 0 }} /> {errorMsg}
          </div>
        )}

        {/* ── STEP: INPUT (Officer Credentials) ── */}
        {step === 'input' && (
          <form onSubmit={handleCheckMfaStatus} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '11px', margin: '0 0 4px 0', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Verify your officer credentials to unlock protected victim & accused details.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
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
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                KGID / Badge Number
              </label>
              <input
                type="text"
                value={form.badgeId}
                onChange={e => handleFieldChange('badgeId', e.target.value)}
                placeholder="e.g. KG100042"
                required
                disabled={isLoading}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                Assigned Police Station
              </label>
              <input
                type="text"
                value={form.unitName}
                onChange={e => handleFieldChange('unitName', e.target.value)}
                placeholder="e.g. Shivaji Nagar PS"
                required
                disabled={isLoading}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                Official Email (for MFA Verification)
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => handleFieldChange('email', e.target.value)}
                placeholder="e.g. officer@ksp.gov.in"
                required
                disabled={isLoading || !!session.email}
                style={{
                  ...inputStyle,
                  background: session.email ? 'rgba(255,255,255,0.05)' : 'var(--bg-panel-alt)',
                  cursor: session.email ? 'not-allowed' : 'text',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button type="button" onClick={onClose} disabled={isLoading} style={btnSecondary}>
                Cancel
              </button>
              <button type="submit" disabled={isLoading} style={btnPrimary}>
                {isLoading ? 'Checking...' : 'Next →'}
              </button>
            </div>
          </form>
        )}

        {/* ── STEP: SETUP (QR Code Onboarding) ── */}
        {step === 'setup' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', margin: '0', lineHeight: '1.4' }}>
              Scan this QR code with <strong>Google Authenticator</strong> or <strong>Microsoft Authenticator</strong> on your mobile phone:
            </p>

            {mfaData?.qrDataUrl && (
              <div style={{ background: '#ffffff', padding: '10px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', display: 'inline-block' }}>
                <img src={mfaData.qrDataUrl} alt="Scan QR code in Google Authenticator" style={{ width: '180px', height: '180px', display: 'block' }} />
              </div>
            )}

            {/* Manual Secret Key Fallback */}
            {mfaData?.secret && (
              <div style={{ width: '100%', background: 'var(--bg-panel-alt, #1f2e43)', padding: '8px 10px', borderRadius: '6px', border: '1px dashed var(--border-color)', fontSize: '11px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '9px', textTransform: 'uppercase', marginBottom: '2px' }}>
                  Manual Setup Key
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <code style={{ fontSize: '11px', color: '#38bdf8', letterSpacing: '1px' }}>{mfaData.secret}</code>
                  <button type="button" onClick={copySecret} style={{ background: 'transparent', border: 'none', color: copied ? 'var(--accent-success)' : 'var(--accent-info, #60a5fa)', cursor: 'pointer', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {copied ? <><Check size={16} strokeWidth={1.5} /> Copied</> : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ width: '100%' }}>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                Enter 6-Digit Code to Activate
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                required
                disabled={isLoading}
                style={otpInputStyle}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <button type="button" onClick={() => { setStep('input'); setErrorMsg(''); setInfoMsg(''); }} disabled={isLoading} style={btnSecondary}>
                Back
              </button>
              <button type="submit" disabled={isLoading || otpCode.length !== 6} style={btnSuccess}>
                {isLoading ? 'Activating...' : 'Activate & Unlock'}
              </button>
            </div>
          </form>
        )}

        {/* ── STEP: OTP (Enrolled Officer Direct Unlock) ── */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-panel-alt)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <Smartphone size={18} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{form.officerName || 'Officer'}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{form.email}</div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                Enter 6-Digit Authenticator Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                required
                disabled={isLoading}
                style={otpInputStyle}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => { setStep('input'); setErrorMsg(''); setInfoMsg(''); }} disabled={isLoading} style={btnSecondary}>
                Back
              </button>
              <button type="submit" disabled={isLoading || otpCode.length !== 6} style={btnSuccess}>
                {isLoading ? 'Verifying...' : 'Verify & Unlock'}
              </button>
            </div>

            {/* Lost device / Reset link */}
            <div style={{ textAlign: 'center', marginTop: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
              <button
                type="button"
                onClick={() => { setStep('reset-request'); setErrorMsg(''); setInfoMsg(''); }}
                style={{ background: 'transparent', border: 'none', color: '#93c5fd', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Lost phone or cannot access Authenticator?
              </button>
            </div>
          </form>
        )}

        {/* ── STEP: RESET-REQUEST (Lost Phone Initiation) ── */}
        {step === 'reset-request' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '12px', color: 'var(--accent-warning)', background: 'rgba(245, 158, 11, 0.1)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.25)', lineHeight: '1.4' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={16} strokeWidth={1.5} /> <strong>Authenticator Reset</strong></span>
              <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                We will send a 6-digit verification code to your registered email to revoke your old Authenticator and issue a new QR code.
              </div>
            </div>

            <div style={{ background: 'var(--bg-panel-alt)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '11px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Registered Email: </span>
              <strong>{form.email}</strong>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => { setStep('otp'); setErrorMsg(''); setInfoMsg(''); }} disabled={isLoading} style={btnSecondary}>
                Cancel
              </button>
              <button type="button" onClick={handleRequestResetOtp} disabled={isLoading} style={btnPrimary}>
                {isLoading ? 'Sending Code...' : 'Send Verification Email'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: RESET-CONFIRM (Email OTP Verification) ── */}
        {step === 'reset-confirm' && (
          <form onSubmit={handleConfirmReset} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0', lineHeight: '1.4' }}>
              Enter the 6-digit reset code sent to <strong>{form.email}</strong>:
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                Email Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={resetCode}
                onChange={e => setResetCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                required
                disabled={isLoading}
                style={otpInputStyle}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => { setStep('reset-request'); setErrorMsg(''); setInfoMsg(''); }} disabled={isLoading} style={btnSecondary}>
                Back
              </button>
              <button type="submit" disabled={isLoading || resetCode.length !== 6} style={btnPrimary}>
                {isLoading ? 'Confirming...' : 'Revoke & Show New QR'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}

// ── Reusable Styles ──
const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '4px',
  border: '1px solid var(--border-color)',
  background: 'var(--bg-panel-alt, #1f2e43)',
  color: 'var(--text-primary)',
  fontSize: '12px',
  boxSizing: 'border-box',
  minHeight: '36px',
};

const otpInputStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid var(--border-color)',
  background: 'var(--bg-panel-alt, #1f2e43)',
  color: 'var(--text-primary)',
  fontSize: '18px',
  textAlign: 'center',
  letterSpacing: '6px',
  fontWeight: 'bold',
  boxSizing: 'border-box',
  minHeight: '44px',
};

const btnSecondary = {
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
};

const btnPrimary = {
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
};

const btnSuccess = {
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
};
