import type { ClassConfig, ClassHierarchy, ClassPassive } from '../types';
import content from './content/classes.json';

export const CLASS_HIERARCHY = content.hierarchy as Record<string, ClassHierarchy>;
export const CLASSES = content.classes as Record<string, ClassConfig>;
export const CLASS_PASSIVES = content.passives as Record<string, ClassPassive>;
