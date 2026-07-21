import React, { useState } from 'react';
import { MdTextIncrease, MdTextDecrease, MdContrast, MdRestartAlt, MdAccessibility, MdVisibility } from 'react-icons/md';

/**
 * Accessibility Toolbar — government compliance feature
 * Font size controls, high contrast toggle, text spacing, and colorblind mode
 * Required by GIGW (Guidelines for Indian Government Websites)
 */
function AccessibilityToolbar() {
  const [fontSize, setFontSize] = useState(100);
  const [highContrast, setHighContrast] = useState(false);
  const [colorblindSafe, setColorblindSafe] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const changeFontSize = (delta) => {
    const newSize = Math.max(80, Math.min(130, fontSize + delta));
    setFontSize(newSize);
    document.documentElement.style.fontSize = `${newSize}%`;
  };

  const toggleContrast = () => {
    setHighContrast(!highContrast);
    document.documentElement.classList.toggle('high-contrast');
  };

  const toggleColorblind = () => {
    setColorblindSafe(!colorblindSafe);
    document.documentElement.classList.toggle('colorblind-safe');
  };

  const resetAll = () => {
    setFontSize(100);
    setHighContrast(false);
    setColorblindSafe(false);
    document.documentElement.style.fontSize = '100%';
    document.documentElement.classList.remove('high-contrast');
    document.documentElement.classList.remove('colorblind-safe');
  };

  return (
    <div className="a11y-toolbar">
      <button
        className="a11y-toggle"
        onClick={() => setExpanded(!expanded)}
        title="Accessibility Options"
        aria-label="Toggle accessibility toolbar"
      >
        <MdAccessibility size={18} />
      </button>

      {expanded && (
        <div className="a11y-panel">
          <div className="a11y-title">Accessibility</div>

          <div className="a11y-row">
            <span>Font Size ({fontSize}%)</span>
            <div className="a11y-btns">
              <button onClick={() => changeFontSize(-10)} title="Decrease font size" aria-label="Decrease font size">
                <MdTextDecrease size={16} />
              </button>
              <button onClick={() => changeFontSize(10)} title="Increase font size" aria-label="Increase font size">
                <MdTextIncrease size={16} />
              </button>
            </div>
          </div>

          <div className="a11y-row">
            <span>High Contrast</span>
            <div className="a11y-btns">
              <button
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
                onClick={toggleColorblind}
                className={colorblindSafe ? 'active' : ''}
                title="Toggle colorblind-safe colors"
                aria-label="Toggle colorblind-safe colors"
              >
                <MdVisibility size={16} />
              </button>
            </div>
          </div>

          <button className="a11y-reset" onClick={resetAll}>
            <MdRestartAlt size={14} /> Reset All
          </button>
        </div>
      )}
    </div>
  );
}

export default AccessibilityToolbar;
