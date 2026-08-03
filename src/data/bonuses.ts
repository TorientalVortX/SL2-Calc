import type { FoodBonus, HistoryBonus, LegendExtendConfig, StatKey } from '../types';
import content from './content/bonuses.json';

export const FOODS = content.foods as Record<string, FoodBonus>;
export const HISTORY = content.history as Record<string, HistoryBonus>;
export const LEGEND_EXTEND = content.legendExtend as Record<string, LegendExtendConfig>;
export const ASTROLOGY_PLANETS = content.astrologyPlanets as Record<string, StatKey>;
export const PLANET_ELEMENTS = content.planetElements as Record<string, string>;
