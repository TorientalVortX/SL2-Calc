import type { ElementKey, OptimizationConstraint, OptimizationDamageProfile } from '../types';

const ELEMENT_PATTERN = 'Fire|Ice|Wind|Earth|Dark|Water|Light|Lightning|Acid|Sound';

export interface InferredOptimizationContract {
  constraints: OptimizationConstraint[];
  damageProfile?: OptimizationDamageProfile;
}

export function inferOptimizationIntentContract(intent: string): InferredOptimizationContract {
  const constraints: OptimizationConstraint[] = [];
  const youkai = intent.match(/(?:at least|minimum(?: of)?|need(?:s|ed)?(?: to support)?(?: having)?)\s+(\d+(?:\.\d+)?)\s+youkai(?:\s+cap)?/i);
  if (youkai) constraints.push({ metric: 'youkaiCap', minimum: Number(youkai[1]) });
  const critical = intent.match(/(?:at least|minimum(?: of)?)\s+(\d+(?:\.\d+)?)\s*(?:%\s*)?(?:weapon\s+)?crit(?:ical)?(?:\s+chance)?/i);
  if (critical) constraints.push({ metric: 'weaponCritical', minimum: Number(critical[1]) });

  const skills: OptimizationDamageProfile['skills'] = [];
  const formula = new RegExp(
    `(\\d+(?:\\.\\d+)?)%\\s*SWA\\s*\\+\\s*(\\d+(?:\\.\\d+)?)%\\s*(${ELEMENT_PATTERN})\\s*(?:element(?:al)?\\s*)?(?:ATK|attack)|`
    + `(\\d+(?:\\.\\d+)?)%\\s*(${ELEMENT_PATTERN})\\s*(?:element(?:al)?\\s*)?(?:ATK|attack)|`
    + `(\\d+(?:\\.\\d+)?)%\\s*SWA`,
    'gi',
  );
  for (const match of intent.matchAll(formula)) {
    if (skills.length >= 4) break;
    if (match[1] && match[2] && match[3]) {
      skills.push({ label: `${match[1]}% SWA + ${match[2]}% ${match[3]} ATK`, swaPercent: Number(match[1]), element: match[3] as ElementKey, elementalAttackPercent: Number(match[2]), weight: 1 });
    } else if (match[4] && match[5]) {
      skills.push({ label: `${match[4]}% ${match[5]} ATK`, swaPercent: 0, element: match[5] as ElementKey, elementalAttackPercent: Number(match[4]), weight: 1 });
    } else if (match[6]) {
      skills.push({ label: `${match[6]}% SWA`, swaPercent: Number(match[6]), element: null, elementalAttackPercent: 0, weight: 1 });
    }
  }
  return { constraints, damageProfile: skills.length ? { skills } : undefined };
}
