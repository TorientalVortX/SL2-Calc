import type { StatInfo } from '../types';
import content from './content/stats.json';

export const STAT_INFO = content.statInfo as Record<string, StatInfo>;
