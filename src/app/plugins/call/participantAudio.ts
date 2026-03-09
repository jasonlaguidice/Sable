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

// Map of userId -> AudioContext (one per participant, reused)
const audioContexts = new Map<string, AudioContext>();

// Set volume for a specific participant by Matrix userId
// gain: 0.0 to 4.0 (1.0 = 100%, 2.0 = 200%, 4.0 = 400%)
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

  const ref = getTrackRefFromElement(matchingEl);
  if (!ref?.track) return false;

  const { track } = ref;
  // Always use AudioContext for consistency (el.volume caps at 1.0)
  if (!audioContexts.has(userId)) {
    audioContexts.set(userId, new AudioContext());
  }
  track.setAudioContext(audioContexts.get(userId));
  track.setVolume(clampedGain);
  return true;
}

export function cleanupParticipantAudioContext(userId: string): void {
  const ctx = audioContexts.get(userId);
  if (ctx) {
    ctx.close().catch(() => undefined);
    audioContexts.delete(userId);
  }
}
