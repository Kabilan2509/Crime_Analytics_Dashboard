/**
 * Web Audio API Alert Sound Synthesizer
 * Generates clear, non-intrusive sound alerts for critical incidents.
 *
 * @param {number} frequency - Audio frequency in Hz.
 * @param {number} duration - Sound duration in seconds.
 */
export function playAlertSound(frequency = 880, duration = 0.15) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    // Browser audio context might be suspended until user interacts with document
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      // Audio is blocked, silently bypass or queue
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Fade out volume to avoid click pops
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn('Web Audio API call bypassed:', e);
  }
}
