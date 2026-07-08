let actx = null;

function ac() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}

function tone(freq, dur, type = 'sine', vol = 0.18, startFreq = freq) {
  try {
    const c = ac();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq, c.currentTime + dur * 0.75);
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + dur);
  } catch {}
}

export function playKick() { tone(180, 0.08, 'triangle', 0.18, 360); }
export function playPass() { tone(420, 0.08, 'sine', 0.12, 640); }
export function playTackle() { tone(105, 0.16, 'sawtooth', 0.12, 180); }
export function playSave() { tone(220, 0.12, 'square', 0.14); setTimeout(() => tone(160, 0.18, 'sine', 0.1), 80); }
export function playGoal() { [392, 494, 587, 784, 988].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'square', 0.19), i * 75)); }
export function playWhistle() { tone(1320, 0.12, 'sine', 0.13); setTimeout(() => tone(1320, 0.18, 'sine', 0.12), 170); }
