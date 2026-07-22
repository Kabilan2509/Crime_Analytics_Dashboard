import React, { useState, useRef, useEffect } from 'react';
import { MdContrast, MdRestartAlt, MdAccessibility, MdVisibility, MdClose } from 'react-icons/md';

/**
 * Accessibility Toolbar — government compliance feature
 * High contrast toggle and colorblind mode
 * Required by GIGW (Guidelines for Indian Government Websites)
 */
function AccessibilityToolbar() {
  const [highContrast, setHighContrast] = useState(() => document.documentElement.classList.contains('high-contrast'));
  const [colorblindSafe, setColorblindSafe] = useState(() => document.documentElement.classList.contains('colorblind-safe'));
  const [expanded, setExpanded] = useState(false);
  const toolbarRef = useRef(null);

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

  const toggleContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    document.documentElement.classList.toggle('high-contrast', next);
  };

  const toggleColorblind = () => {
    const next = !colorblindSafe;
    setColorblindSafe(next);
    document.documentElement.classList.toggle('colorblind-safe', next);
  };

  const resetAll = () => {
    setHighContrast(false);
    setColorblindSafe(false);
    document.documentElement.classList.remove('high-contrast');
    document.documentElement.classList.remove('colorblind-safe');
  };

  return (
    <div className="a11y-toolbar" ref={toolbarRef}>
      <button
        type="button"
        className="a11y-toggle"
        onClick={() => setExpanded(prev => !prev)}
        title="Accessibility Options"
        aria-label="Toggle accessibility toolbar"
      >
        <MdAccessibility size={18} />
      </button>

      {expanded && (
        <div className="a11y-panel">
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
              >
                <MdContrast size={16} />
              </button>
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
