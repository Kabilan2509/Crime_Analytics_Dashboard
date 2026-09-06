import React, { useState, useRef, useEffect } from 'react';
import { MdContrast, MdRestartAlt, MdAccessibility, MdVisibility, MdClose } from 'react-icons/md';

/**
 * Accessibility Toolbar — government compliance feature
 * High contrast toggle and colorblind mode
 * Required by GIGW (Guidelines for Indian Government Websites)
 */
function AccessibilityToolbar() {
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem('madhukar-high-contrast') === 'true');
  const [colorblindSafe, setColorblindSafe] = useState(() => localStorage.getItem('madhukar-colorblind-safe') === 'true');
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('madhukar-font-size') || 'default');
  const [expanded, setExpanded] = useState(false);
  const toolbarRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
    document.documentElement.classList.toggle('colorblind-safe', colorblindSafe);
    document.documentElement.dataset.fontSize = fontSize;
    localStorage.setItem('madhukar-high-contrast', String(highContrast));
    localStorage.setItem('madhukar-colorblind-safe', String(colorblindSafe));
    localStorage.setItem('madhukar-font-size', fontSize);
    window.dispatchEvent(new CustomEvent('madhukar-colorblind-change', { detail: colorblindSafe }));
  }, [highContrast, colorblindSafe, fontSize]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target)) {
        setExpanded(false);
      }
    }
    if (expanded) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return undefined;
    const closeOnEscape = event => {
      if (event.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [expanded]);

  useEffect(() => {
    const handleFontSizeChange = (e) => setFontSize(e.detail);
    window.addEventListener('madhukar-font-size-change', handleFontSizeChange);
    return () => window.removeEventListener('madhukar-font-size-change', handleFontSizeChange);
  }, []);

  const toggleContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    document.documentElement.classList.toggle('high-contrast', next);
  };

  const toggleColorblind = () => {
    const next = !colorblindSafe;
    setColorblindSafe(next);
    document.documentElement.classList.toggle('colorblind-safe', next);
    window.dispatchEvent(new CustomEvent('madhukar-colorblind-change', { detail: next }));
  };

  const resetAll = () => {
    setHighContrast(false);
    setColorblindSafe(false);
    setFontSize('default');
    document.documentElement.classList.remove('high-contrast');
    document.documentElement.classList.remove('colorblind-safe');
    window.dispatchEvent(new CustomEvent('madhukar-colorblind-change', { detail: false }));
  };

  return (
    <div className="a11y-toolbar" ref={toolbarRef}>
      <button
        type="button"
        className="a11y-toggle"
        onClick={() => setExpanded(prev => !prev)}
        title="Accessibility Options"
        aria-expanded={expanded}
        aria-controls="accessibility-options"
        aria-label={`Accessibility options${highContrast ? ', high contrast enabled' : ''}`}
      >
        <MdAccessibility size={18} />
      </button>

      {expanded && (
        <div id="accessibility-options" className="a11y-panel" role="region" aria-label="Accessibility options">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div className="a11y-title" style={{ margin: 0 }}>Accessibility</div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                outline: 'none'
              }}
              title="Close Panel"
            >
              <MdClose size={14} />
            </button>
          </div>

          <div className="a11y-row">
            <span>High Contrast</span>
            <div className="a11y-btns">
              <button
                type="button"
                onClick={toggleContrast}
                className={highContrast ? 'active' : ''}
                title="Toggle high contrast"
                aria-label="Toggle high contrast"
                aria-pressed={highContrast}
              >
                <MdContrast size={16} />
              </button>
            </div>
          </div>

          <div className="a11y-row a11y-font-row">
            <span>Text Size</span>
            <div className="a11y-btns" role="group" aria-label="Choose dashboard text size">
              <button type="button" onClick={() => setFontSize('default')} className={fontSize === 'default' ? 'active' : ''}
                aria-pressed={fontSize === 'default'} title="Default text size"><span aria-hidden="true">A</span><span className="sr-only">Default</span></button>
              <button type="button" onClick={() => setFontSize('large')} className={fontSize === 'large' ? 'active' : ''}
                aria-pressed={fontSize === 'large'} title="Large text size"><span aria-hidden="true" style={{ fontSize: 17 }}>A</span><span className="sr-only">Large</span></button>
              <button type="button" onClick={() => setFontSize('x-large')} className={fontSize === 'x-large' ? 'active' : ''}
                aria-pressed={fontSize === 'x-large'} title="Extra large text size"><span aria-hidden="true" style={{ fontSize: 20 }}>A</span><span className="sr-only">Extra large</span></button>
            </div>
          </div>

          <div className="a11y-row">
            <span>Colorblind Mode</span>
            <div className="a11y-btns">
              <button
                type="button"
                onClick={toggleColorblind}
                className={colorblindSafe ? 'active' : ''}
                title="Toggle colorblind-safe colors"
                aria-label="Toggle colorblind-safe colors"
                aria-pressed={colorblindSafe}
              >
                <MdVisibility size={16} />
              </button>
            </div>
          </div>

          <button type="button" className="a11y-reset" onClick={resetAll}>
            <MdRestartAlt size={14} /> Reset All
          </button>
        </div>
      )}
    </div>
  );
}

export default AccessibilityToolbar;
