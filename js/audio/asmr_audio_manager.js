import { Platform } from '../platform/platform.js';

/**
 * 物理玻璃瓶水位声学与生活级温润 ASMR 音效引擎 (白皮书第五节规范)
 */
export class ASMRAudioManager {
  constructor() {
    this.audioCtx = null;
    this.cachedPinkNoiseBuffer = null;
    this.soundEnabled = true;
  }

  ensureAudio() {
    if (!this.audioCtx) {
      this.audioCtx = Platform.createAudioContext();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * 生成粉红噪声缓冲区 (1/f 噪声源)
   */
  getPinkNoiseBuffer() {
    if (!this.audioCtx) return null;
    if (this.cachedPinkNoiseBuffer) return this.cachedPinkNoiseBuffer;

    const sampleRate = this.audioCtx.sampleRate || 44100;
    const length = sampleRate * 2.5;
    const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
      b6 = white * 0.115926;
    }
    this.cachedPinkNoiseBuffer = buffer;
    return buffer;
  }

  /**
   * 1. 真实物理注水声：粉红噪声 + 亥姆霍兹腔体带通滤波 + 水位爬升 + 气泡滑音
   */
  playPourSound(options = {}) {
    if (!this.soundEnabled) return;
    this.ensureAudio();
    if (!this.audioCtx) return;

    const {
      maxCap = 4,
      isGiantCat = false,
      initialLayers = 0,
      moveCount = 1,
      durationMs = 450
    } = options;

    const now = this.audioCtx.currentTime;
    const durSec = Math.max(0.25, durationMs / 1000);
    const noiseBuf = this.getPinkNoiseBuffer();
    if (!noiseBuf) return;

    // 根据不同容器容积定义腔体基频
    let baseStartFreq = 295;
    let baseMaxFreq = 680;
    let cavityQ = 4.2;
    let glugRateHz = 8.4;
    let streamGain = 0.20;

    if (isGiantCat) {
      baseStartFreq = 155; baseMaxFreq = 395; cavityQ = 5.2; glugRateHz = 5.8; streamGain = 0.24;
    } else if (maxCap <= 2) {
      baseStartFreq = 510; baseMaxFreq = 980; cavityQ = 3.6; glugRateHz = 11.5; streamGain = 0.17;
    } else if (maxCap === 6) {
      baseStartFreq = 220; baseMaxFreq = 540; cavityQ = 4.8; glugRateHz = 7.0; streamGain = 0.22;
    } else if (maxCap >= 8) {
      baseStartFreq = 175; baseMaxFreq = 450; cavityQ = 5.5; glugRateHz = 6.0; streamGain = 0.23;
    }

    const fillStartFrac = Math.min(0.94, initialLayers / maxCap);
    const fillEndFrac = Math.min(0.98, (initialLayers + moveCount) / maxCap);
    const freqStart = baseStartFreq + (baseMaxFreq - baseStartFreq) * Math.pow(fillStartFrac, 1.2);
    const freqEnd = baseStartFreq + (baseMaxFreq - baseStartFreq) * Math.pow(fillEndFrac, 1.2);

    const noiseSrc = this.audioCtx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    noiseSrc.loop = true;

    // 亥姆霍兹腔体带通滤波器
    const cavityFilter = this.audioCtx.createBiquadFilter();
    cavityFilter.type = 'bandpass';
    cavityFilter.Q.setValueAtTime(cavityQ, now);
    cavityFilter.frequency.setValueAtTime(freqStart, now);
    cavityFilter.frequency.exponentialRampToValueAtTime(Math.max(freqStart + 18, freqEnd), now + durSec);

    // 920Hz 温润低通滤波器 (彻底滤除高频嘶嘶刺耳杂音)
    const warmthLowpass = this.audioCtx.createBiquadFilter();
    warmthLowpass.type = 'lowpass';
    warmthLowpass.frequency.setValueAtTime(maxCap <= 2 ? 1250 : 920, now);

    const mainGain = this.audioCtx.createGain();
    mainGain.gain.setValueAtTime(0.0005, now);
    mainGain.gain.linearRampToValueAtTime(streamGain, now + 0.045);
    mainGain.gain.setValueAtTime(streamGain, now + Math.max(0.06, durSec - 0.06));
    mainGain.gain.exponentialRampToValueAtTime(0.0005, now + durSec);

    // 咕咚感 LFO
    const lfo = this.audioCtx.createOscillator();
    const lfoGain = this.audioCtx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(glugRateHz, now);
    lfoGain.gain.setValueAtTime(streamGain * 0.15, now);
    lfo.connect(lfoGain).connect(mainGain.gain);

    noiseSrc.connect(cavityFilter).connect(warmthLowpass).connect(mainGain).connect(this.audioCtx.destination);
    noiseSrc.start(now);
    lfo.start(now);
    noiseSrc.stop(now + durSec + 0.02);
    lfo.stop(now + durSec + 0.02);

    // 注入水珠气泡音
    const dropletCount = Math.floor(6 + moveCount * 2.5);
    for (let i = 0; i < dropletCount; i++) {
      const progress = (i + 0.2 + Math.random() * 0.6) / dropletCount;
      const tDrop = now + 0.02 + progress * (durSec - 0.04);
      const curWaterPitch = freqStart + (freqEnd - freqStart) * progress;
      const bubbleStartF = curWaterPitch * (0.98 + Math.random() * 0.24);

      const osc = this.audioCtx.createOscillator();
      const g = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(bubbleStartF, tDrop);
      osc.frequency.exponentialRampToValueAtTime(bubbleStartF * 1.32, tDrop + 0.038);

      g.gain.setValueAtTime(0.0001, tDrop);
      g.gain.linearRampToValueAtTime(0.065, tDrop + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, tDrop + 0.038);

      osc.connect(g).connect(this.audioCtx.destination);
      osc.start(tDrop);
      osc.stop(tDrop + 0.045);
    }
  }

  /**
   * 2. 亚麻布触垫摩擦刷音 (拿起/落座瞬间)
   */
  playNoiseBrush() {
    if (!this.soundEnabled) return;
    this.ensureAudio();
    if (!this.audioCtx) return;

    const noiseBuf = this.getPinkNoiseBuffer();
    if (!noiseBuf) return;
    const now = this.audioCtx.currentTime;

    const src = this.audioCtx.createBufferSource();
    src.buffer = noiseBuf;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(750, now);
    filter.Q.setValueAtTime(3.2, now);

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    src.connect(filter).connect(gain).connect(this.audioCtx.destination);
    src.start(now);
    src.stop(now + 0.08);
  }

  /**
   * 3. 宜家原木塞重锤落塞撞击音 (cork_slam)
   */
  playCorkSlam() {
    if (!this.soundEnabled) return;
    this.ensureAudio();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.085);

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    osc.connect(gain).connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.1);

    Platform.vibrateShort();
  }

  /**
   * 4. 出餐铃声 (service_bell: 金属撞击 + C7/G7/C8/E8泛音)
   */
  playServiceBell() {
    if (!this.soundEnabled) return;
    this.ensureAudio();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const freqs = [2093, 3136, 4186, 5274]; // C7, G7, C8, E8
    freqs.forEach((f, idx) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);

      const amp = 0.12 / (idx + 1);
      gain.gain.setValueAtTime(amp, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      osc.connect(gain).connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    });
  }

  /**
   * 5. 冰晶碎裂/破冰消融音效
   */
  playIceBreak() {
    if (!this.soundEnabled) return;
    this.ensureAudio();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      const f = 1800 + Math.random() * 800;
      osc.frequency.setValueAtTime(f, now + i * 0.025);
      osc.frequency.exponentialRampToValueAtTime(f * 0.6, now + i * 0.025 + 0.06);

      gain.gain.setValueAtTime(0.08, now + i * 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.025 + 0.065);

      osc.connect(gain).connect(this.audioCtx.destination);
      osc.start(now + i * 0.025);
      osc.stop(now + i * 0.025 + 0.07);
    }
  }

  /**
   * 6. 通关胜利欢呼琴键琶音
   */
  playWinChime() {
    if (!this.soundEnabled) return;
    this.ensureAudio();
    if (!this.audioCtx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
    const now = this.audioCtx.currentTime;
    notes.forEach((f, idx) => {
      const t = now + idx * 0.07;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain).connect(this.audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }
}
