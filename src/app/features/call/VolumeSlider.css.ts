import { globalStyle, style } from '@vanilla-extract/css';

export const volumeSlider = style({
  flex: 1,
  appearance: 'none',
  WebkitAppearance: 'none',
  height: '4px',
  borderRadius: '2px',
  background: 'var(--sable-surface-var-container)',
  outline: 'none',
  cursor: 'pointer',

  selectors: {
    '&:focus-visible': {
      outline: '2px solid var(--sable-focus-ring)',
      outlineOffset: '2px',
    },
  },
});

globalStyle(`${volumeSlider}::-webkit-slider-runnable-track`, {
  height: '4px',
  borderRadius: '2px',
  background: 'var(--sable-surface-var-container)',
});

globalStyle(`${volumeSlider}::-webkit-slider-thumb`, {
  WebkitAppearance: 'none',
  appearance: 'none',
  width: '14px',
  height: '14px',
  borderRadius: '50%',
  background: 'var(--sable-primary-main)',
  cursor: 'pointer',
  marginTop: '-5px',
  transition: 'width 0.1s ease, height 0.1s ease',
});

globalStyle(`${volumeSlider}:hover::-webkit-slider-thumb`, {
  width: '16px',
  height: '16px',
  marginTop: '-6px',
  background: 'var(--sable-primary-main-hover)',
});

globalStyle(`${volumeSlider}::-moz-range-track`, {
  height: '4px',
  borderRadius: '2px',
  background: 'var(--sable-surface-var-container)',
  border: 'none',
});

globalStyle(`${volumeSlider}::-moz-range-thumb`, {
  width: '14px',
  height: '14px',
  borderRadius: '50%',
  background: 'var(--sable-primary-main)',
  border: 'none',
  cursor: 'pointer',
  transition: 'width 0.1s ease, height 0.1s ease',
});

globalStyle(`${volumeSlider}:hover::-moz-range-thumb`, {
  width: '16px',
  height: '16px',
  background: 'var(--sable-primary-main-hover)',
});
