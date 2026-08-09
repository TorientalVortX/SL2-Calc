import { cx } from '../cx';
import { RAMP_RING } from '../rampClasses';
import type { RampName } from '../tokens';

/** Which surface the control sits on. `control` is the app default (was gray-700);
 *  `raised` is used where the control sits *inside* a gray-800 panel and needs to
 *  read as part of it (was gray-800); `sunken` is for textareas. */
export type FieldTone = 'control' | 'raised' | 'sunken';
export type FieldSize = 'sm' | 'md' | 'lg' | 'xl';

const TONES: Record<FieldTone, string> = {
  control: 'bg-surface-control border-edge',
  raised: 'bg-surface-raised border-edge',
  sunken: 'bg-surface-sunken border-edge',
};

const SIZES: Record<FieldSize, string> = {
  sm: 'px-2 py-1 text-sm',
  md: 'px-2 py-2 text-sm',
  lg: 'px-3 py-2',
  xl: 'p-3',
};

export interface FieldStyleProps {
  tone?: FieldTone;
  fieldSize?: FieldSize;
  radius?: 'md' | 'lg';
  /** Adds a coloured 2px focus ring instead of the global blue-ish default. */
  ring?: RampName;
  /** Stretch to the container width. On by default — nearly every field does. */
  fullWidth?: boolean;
  tapTarget?: boolean;
}

/** Shared class computation for Input, Select and Textarea so the three cannot drift. */
export function fieldClasses({
  tone = 'control',
  fieldSize = 'md',
  radius = 'md',
  ring,
  fullWidth = true,
  tapTarget = false,
}: FieldStyleProps): string {
  return cx(
    fullWidth && 'w-full',
    'border',
    radius === 'lg' ? 'rounded-lg' : 'rounded',
    TONES[tone],
    SIZES[fieldSize],
    ring && cx('focus:outline-none focus:ring-2 focus:border-transparent', RAMP_RING[ring]),
    tapTarget && 'tap-target',
  );
}
