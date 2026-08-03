import type { BuildType, StatInfo } from '../types';
import content from './content/stats.json';

export const STAT_INFO = content.statInfo as Record<string, StatInfo>;
export const BUILD_TYPES = content.buildTypes as Record<string, BuildType>;
