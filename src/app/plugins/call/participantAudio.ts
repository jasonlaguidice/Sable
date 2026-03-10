import { getSettings } from '$state/settings';

// Walk the React fiber on an audio element to find the trackRef
function getTrackRefFromElement(
  audioEl: HTMLAudioElement
): { participant: any; track: any } | null {
  const fiberKey = Object.keys(audioEl).find((k) => k.startsWith('__reactFiber'));
  if (!fiberKey) return null;
  let node = (audioEl as any)[fiberKey];
  let depth = 0;
  while (node !== null && node !== undefined && depth < 30) {
    if (node?.memoizedProps?.trackRef) {
      const { trackRef } = node.memoizedProps;
      return {
        participant: trackRef.participant,
        track: trackRef.publication?.track ?? null,
      };
    }
    node = node?.return;
    depth += 1;
  }
  return null;
}

// Strip the LiveKit device suffix from a participant identity
// e.g. "@alice:example.com:DEVICEID" -> "@alice:example.com"
export function matrixUserIdFromIdentity(identity: string): string {
  const parts = identity.split(':');
  if (parts.length > 2) {
    return parts.slice(0, -1).join(':');
  }
  return identity;
}

export const MIN_PARTICIPANT_VOLUME = 0;
export const MAX_PARTICIPANT_VOLUME = 4.0; // 400%
export const DEFAULT_PARTICIPANT_VOLUME = 1.0; // 100%

type ParticipantChain = {
  element: HTMLAudioElement;
  ctx: AudioContext;
  gainNode: GainNode;
  enhanced: boolean;
};

// One audio graph per participant, keyed by Matrix userId
const participantChains = new Map<string, ParticipantChain>();

// Soft-clipping curve: y = (3/2)x - x³/2, maps [-1,1] → [-1,1] with gentle saturation
function buildSoftClipCurve(): Float32Array {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = (3 / 2) * x - (x * x * x) / 2;
  }
  return curve;
}

// Build the Web Audio graph for one participant.
// Enhancement chain: source → compressor → presenceEQ → waveshaper → gainNode → destination
// Plain chain:       source → gainNode → destination
function buildChain(
  ctx: AudioContext,
  el: HTMLAudioElement,
  gain: number,
  enhance: boolean
): GainNode {
  const source = ctx.createMediaElementSource(el);
  const gainNode = ctx.createGain();
  gainNode.gain.value = gain;

  if (enhance) {
    // Compress dynamic range so quiet speech is perceptually louder
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -30;
    compressor.knee.value = 10;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    // Presence peak at 3kHz (+6dB) — boosts speech intelligibility
    const presenceEQ = ctx.createBiquadFilter();
    presenceEQ.type = 'peaking';
    presenceEQ.frequency.value = 3000;
    presenceEQ.gain.value = 6;
    presenceEQ.Q.value = 1.0;

    // Soft clipper — prevents harshness at high gains (e.g. 300–400%)
    const waveshaper = ctx.createWaveShaper();
    waveshaper.curve = buildSoftClipCurve() as Float32Array<ArrayBuffer>;
    waveshaper.oversample = '4x';

    source.connect(compressor);
    compressor.connect(presenceEQ);
    presenceEQ.connect(waveshaper);
    waveshaper.connect(gainNode);
  } else {
    source.connect(gainNode);
  }

  gainNode.connect(ctx.destination);
  return gainNode;
}

// Set volume for a specific participant by Matrix userId.
// gain: 0.0 to 4.0 (1.0 = 100%, 2.0 = 200%, 4.0 = 400%)
// Uses createMediaElementSource so audio plays only through the Web Audio graph —
// no need to mute the HTMLAudioElement separately.
export function setParticipantVolume(doc: Document, userId: string, gain: number): boolean {
  const clampedGain = Math.max(MIN_PARTICIPANT_VOLUME, Math.min(MAX_PARTICIPANT_VOLUME, gain));

  const audioEls = Array.from(
    doc.querySelectorAll<HTMLAudioElement>('.lk-participant-media-audio')
  );

  const matchingEl = audioEls.find((el) => {
    const ref = getTrackRefFromElement(el);
    if (!ref) return false;
    return matrixUserIdFromIdentity(ref.participant?.identity ?? '') === userId;
  });

  if (!matchingEl) return false;

  const enhance = getSettings().enableAudioEnhancement ?? false;
  const existing = participantChains.get(userId);

  if (existing && existing.element === matchingEl && existing.enhanced === enhance) {
    // Same element, same enhancement mode — just update the gain value
    existing.gainNode.gain.value = clampedGain;
    return true;
  }

  // Element changed (rejoin) or enhancement mode toggled — rebuild the graph
  if (existing) {
    existing.ctx.close().catch(() => undefined);
  }

  const ctx = new AudioContext();
  const gainNode = buildChain(ctx, matchingEl, clampedGain, enhance);
  participantChains.set(userId, { element: matchingEl, ctx, gainNode, enhanced: enhance });
  return true;
}

export function cleanupParticipantAudioContext(userId: string): void {
  const chain = participantChains.get(userId);
  if (chain) {
    chain.ctx.close().catch(() => undefined);
    participantChains.delete(userId);
  }
}
