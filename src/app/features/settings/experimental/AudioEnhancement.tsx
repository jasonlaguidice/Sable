import { Box, Switch, Text } from 'folds';
import { useState, useEffect } from 'react';
import { SettingTile } from '$components/setting-tile';
import { SequenceCard } from '$components/sequence-card';
import { getSettings, setSettings } from '$state/settings';
import { SequenceCardStyle } from '../styles.css';

export function AudioEnhancement() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(getSettings().enableAudioEnhancement ?? false);
  }, []);

  const handleChange = (value: boolean) => {
    setSettings({ ...getSettings(), enableAudioEnhancement: value });
    setEnabled(value);
  };

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">Call Audio Enhancement</Text>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="100"
      >
        <SettingTile
          title="Enable audio enhancement for calls"
          description="Applies dynamic compression, presence EQ (+6dB at 3kHz), and soft-clipping to each participant's audio. Makes quiet speakers louder and prevents harshness at high volumes. Takes effect the next time you adjust a participant's volume."
          after={<Switch variant="Primary" value={enabled} onChange={handleChange} />}
        />
      </SequenceCard>
    </Box>
  );
}
