import { createContext, useCallback, useContext } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { CallPreferences, CallPreferencesAtom } from '../callPreferences';
import { DEFAULT_PARTICIPANT_VOLUME } from '../../plugins/call/participantAudio';
import { callEmbedAtom } from '../callEmbed';

const CallPreferencesAtomContext = createContext<CallPreferencesAtom | null>(null);
export const CallPreferencesProvider = CallPreferencesAtomContext.Provider;

export const useCallPreferencesAtom = (): CallPreferencesAtom => {
  const atom = useContext(CallPreferencesAtomContext);
  if (!atom) {
    throw new Error('CallPreferencesAtom not provided!');
  }

  return atom;
};

export const useCallPreferences = (): CallPreferences & {
  toggleMicrophone: () => void;
  toggleVideo: () => void;
  toggleSound: () => void;
} => {
  const callPrefAtom = useCallPreferencesAtom();
  const [pref, setPref] = useAtom(callPrefAtom);

  const toggleMicrophone = useCallback(() => {
    const microphone = !pref.microphone;

    setPref({
      microphone,
      video: pref.video,
      sound: !pref.sound && microphone ? true : pref.sound,
    });
  }, [setPref, pref]);

  const toggleVideo = useCallback(() => {
    const video = !pref.video;

    setPref({
      microphone: pref.microphone,
      video,
      sound: pref.sound,
    });
  }, [setPref, pref]);

  const toggleSound = useCallback(() => {
    const sound = !pref.sound;

    setPref({
      microphone: !sound ? false : pref.microphone,
      video: pref.video,
      sound,
    });
  }, [setPref, pref]);

  return {
    ...pref,
    toggleMicrophone,
    toggleVideo,
    toggleSound,
  };
};

export const useParticipantVolume = (userId: string): [number, (gain: number) => void] => {
  const callPrefAtom = useCallPreferencesAtom();
  const [pref, setPref] = useAtom(callPrefAtom);
  const callEmbed = useAtomValue(callEmbedAtom);

  const volume = pref.participantVolumes?.[userId] ?? DEFAULT_PARTICIPANT_VOLUME;

  const setVolume = useCallback(
    (gain: number) => {
      setPref({
        ...pref,
        participantVolumes: {
          ...pref.participantVolumes,
          [userId]: gain,
        },
      });
      callEmbed?.control.setParticipantVolume(userId, gain);
    },
    [setPref, pref, userId, callEmbed]
  );

  return [volume, setVolume];
};
