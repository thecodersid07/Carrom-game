function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createEnvelopeGain(audioContext, destination, volume, startTime) {
  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(Math.max(0.0001, volume), startTime);
  gainNode.connect(destination);
  return gainNode;
}

function createTone(audioContext, destination, options) {
  const {
    frequency,
    endFrequency = frequency,
    type = 'sine',
    volume = 0.08,
    duration = 0.12,
    attack = 0.008,
    release = duration,
  } = options;
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gainNode = createEnvelopeGain(audioContext, destination, 0.0001, now);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(
    Math.max(20, endFrequency),
    now + duration
  );

  gainNode.gain.exponentialRampToValueAtTime(
    Math.max(0.0001, volume),
    now + attack
  );
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + release);

  oscillator.connect(gainNode);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function createNoiseBuffer(audioContext) {
  const bufferSize = Math.floor(audioContext.sampleRate * 0.12);
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);

  for (let index = 0; index < bufferSize; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }

  return buffer;
}

function createNoise(audioContext, destination, options) {
  const {
    volume = 0.03,
    duration = 0.08,
    filterFrequency = 900,
  } = options;
  const now = audioContext.currentTime;
  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gainNode = createEnvelopeGain(audioContext, destination, 0.0001, now);

  source.buffer = createNoiseBuffer(audioContext);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFrequency, now);

  gainNode.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.connect(filter);
  filter.connect(gainNode);
  source.start(now);
  source.stop(now + duration);
}

export default function createSoundManager() {
  let audioContext = null;
  let masterGain = null;
  let muted = false;
  let unlockPromise = null;
  let audioPrimed = false;
  const cooldowns = {
    strikerHit: 70,
    coinCollision: 90,
    pocket: 140,
    perfectShot: 280,
    win: 500,
  };
  const lastPlayedAt = new Map();

  const ensureAudio = () => {
    if (typeof window === 'undefined') {
      return null;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    if (!audioContext) {
      audioContext = new AudioContextClass();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.16;
      masterGain.connect(audioContext.destination);
    }

    return audioContext;
  };

  const primeAudio = (context) => {
    if (!context || !masterGain || audioPrimed) {
      return;
    }

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    gainNode.gain.setValueAtTime(0.0001, now);
    oscillator.frequency.setValueAtTime(440, now);
    oscillator.connect(gainNode);
    gainNode.connect(masterGain);
    oscillator.start(now);
    oscillator.stop(now + 0.01);
    audioPrimed = true;
  };

  const unlock = () => {
    const context = ensureAudio();

    if (!context) {
      return Promise.resolve(false);
    }

    if (context.state === 'running') {
      primeAudio(context);
      return Promise.resolve(true);
    }

    if (!unlockPromise) {
      unlockPromise = context
        .resume()
        .then(() => {
          if (context.state === 'running') {
            primeAudio(context);
            return true;
          }

          return false;
        })
        .catch(() => false)
        .finally(() => {
          unlockPromise = null;
        });
    }

    return unlockPromise;
  };

  const canPlay = (name) => {
    if (muted) {
      return false;
    }

    const now = performance.now();
    const lastTime = lastPlayedAt.get(name) ?? 0;

    if (now - lastTime < cooldowns[name]) {
      return false;
    }

    lastPlayedAt.set(name, now);
    return true;
  };

  const playStrikerHit = (intensity = 0.5) => {
    if (!canPlay('strikerHit')) {
      return;
    }

    const context = ensureAudio();

    if (!context || !masterGain || context.state !== 'running') {
      return;
    }

    const safeIntensity = clamp(intensity, 0.2, 1);
    createTone(context, masterGain, {
      frequency: 220,
      endFrequency: 150,
      type: 'triangle',
      volume: 0.03 + safeIntensity * 0.03,
      duration: 0.09,
      release: 0.11,
    });
    createNoise(context, masterGain, {
      volume: 0.006 + safeIntensity * 0.01,
      duration: 0.05,
      filterFrequency: 700,
    });
  };

  const playCoinCollision = (intensity = 0.4) => {
    if (!canPlay('coinCollision')) {
      return;
    }

    const context = ensureAudio();

    if (!context || !masterGain || context.state !== 'running') {
      return;
    }

    const safeIntensity = clamp(intensity, 0.15, 1);
    createTone(context, masterGain, {
      frequency: 640,
      endFrequency: 420,
      type: 'sine',
      volume: 0.02 + safeIntensity * 0.02,
      duration: 0.07,
      release: 0.08,
    });
  };

  const playPocket = () => {
    if (!canPlay('pocket')) {
      return;
    }

    const context = ensureAudio();

    if (!context || !masterGain || context.state !== 'running') {
      return;
    }

    createTone(context, masterGain, {
      frequency: 300,
      endFrequency: 180,
      type: 'sine',
      volume: 0.05,
      duration: 0.16,
      release: 0.18,
    });
    createNoise(context, masterGain, {
      volume: 0.01,
      duration: 0.08,
      filterFrequency: 500,
    });
  };

  const playPerfectShot = () => {
    if (!canPlay('perfectShot')) {
      return;
    }

    const context = ensureAudio();

    if (!context || !masterGain || context.state !== 'running') {
      return;
    }

    createTone(context, masterGain, {
      frequency: 520,
      endFrequency: 780,
      type: 'triangle',
      volume: 0.045,
      duration: 0.14,
      release: 0.16,
    });
    createTone(context, masterGain, {
      frequency: 780,
      endFrequency: 980,
      type: 'sine',
      volume: 0.026,
      duration: 0.16,
      attack: 0.02,
      release: 0.2,
    });
  };

  const playWin = () => {
    if (!canPlay('win')) {
      return;
    }

    const context = ensureAudio();

    if (!context || !masterGain || context.state !== 'running') {
      return;
    }

    createTone(context, masterGain, {
      frequency: 392,
      endFrequency: 523,
      type: 'triangle',
      volume: 0.05,
      duration: 0.22,
      release: 0.24,
    });
    createTone(context, masterGain, {
      frequency: 523,
      endFrequency: 659,
      type: 'sine',
      volume: 0.03,
      duration: 0.28,
      attack: 0.03,
      release: 0.3,
    });
  };

  return {
    getMuted: () => muted,
    unlock,
    toggleMuted: () => {
      muted = !muted;
      return muted;
    },
    playStrikerHit,
    playCoinCollision,
    playPocket,
    playPerfectShot,
    playWin,
  };
}
