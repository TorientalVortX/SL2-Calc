import type {
  BuildEvaluation,
  BuildGuideCheck,
  BuildGuideValidation,
  BuildState,
  OptimizationPreset,
  StatKey,
} from '../types';
import { CLASSES } from '../data/classes';

/** Endgame planning baselines sourced from SL2BuildInfo.docx. */
export const SL2_BUILD_GUIDE_TARGETS = {
  endgameLevel: 60,
  scaledAptitude: 48,
  minimumScaledSkill: 57,
  preferredScaledSkill: 60,
  minimumFinalVitality: 35,
  minimumTotalEvade: 195,
  preferredTotalEvade: 200,
  strongTankDefense: 45,
  strongTankResistance: 45,
} as const;

export interface BuildGuideBaselineScore {
  failed: number;
  supportedDeficit: number;
}

/** Lightweight numeric score for the optimizer's inner loop. */
export function scoreBuildGuideBaselines(
  build: BuildState,
  evaluation: BuildEvaluation,
  preset: OptimizationPreset,
): BuildGuideBaselineScore {
  if (build.characterLevel < SL2_BUILD_GUIDE_TARGETS.endgameLevel) return { failed: 0, supportedDeficit: 0 };

  const apt = Math.floor(evaluation.scaledStats.apt);
  const ski = Math.floor(evaluation.scaledStats.ski);
  const vit = Math.floor(evaluation.rawStats.vit);
  let failed = Number(apt !== SL2_BUILD_GUIDE_TARGETS.scaledAptitude)
    + Number(ski < SL2_BUILD_GUIDE_TARGETS.minimumScaledSkill)
    + Number(vit < SL2_BUILD_GUIDE_TARGETS.minimumFinalVitality);
  let supportedDeficit = Math.abs(evaluation.scaledStats.apt - SL2_BUILD_GUIDE_TARGETS.scaledAptitude) / SL2_BUILD_GUIDE_TARGETS.scaledAptitude
    + Math.max(0, SL2_BUILD_GUIDE_TARGETS.minimumScaledSkill - evaluation.scaledStats.ski) / SL2_BUILD_GUIDE_TARGETS.minimumScaledSkill
    + Math.max(0, SL2_BUILD_GUIDE_TARGETS.minimumFinalVitality - evaluation.rawStats.vit) / SL2_BUILD_GUIDE_TARGETS.minimumFinalVitality;

  if (preset.id === 'evade') {
    const evade = Math.floor(evaluation.derived.evade);
    if (evade < SL2_BUILD_GUIDE_TARGETS.minimumTotalEvade) failed++;
    supportedDeficit += Math.max(0, SL2_BUILD_GUIDE_TARGETS.minimumTotalEvade - evaluation.derived.evade) / SL2_BUILD_GUIDE_TARGETS.minimumTotalEvade;
  }
  if (preset.id === 'tank') {
    const defense = Math.floor(evaluation.scaledStats.def);
    const resistance = Math.floor(evaluation.scaledStats.res);
    if (defense < SL2_BUILD_GUIDE_TARGETS.strongTankDefense || resistance < SL2_BUILD_GUIDE_TARGETS.strongTankResistance) failed++;
    supportedDeficit += Math.max(0, SL2_BUILD_GUIDE_TARGETS.strongTankDefense - evaluation.scaledStats.def) / SL2_BUILD_GUIDE_TARGETS.strongTankDefense;
    supportedDeficit += Math.max(0, SL2_BUILD_GUIDE_TARGETS.strongTankResistance - evaluation.scaledStats.res) / SL2_BUILD_GUIDE_TARGETS.strongTankResistance;
  }
  return { failed, supportedDeficit };
}

const weaponCategory = (weaponType?: string): string | null => {
  if (!weaponType) return null;
  return ({
    Sword: 'Swords', Axe: 'Axes', Bow: 'Bows', Dagger: 'Daggers', Fist: 'Fist',
    Gun: 'Guns', Polearm: 'Spears', Spear: 'Spears', Tome: 'Tomes',
  } as Record<string, string>)[weaponType] ?? null;
};

function numericCheck(
  id: string,
  label: string,
  value: number,
  target: number,
  comparison: 'minimum' | 'exact',
  display: string,
): BuildGuideCheck {
  const displayedValue = Math.floor(value);
  const pass = comparison === 'exact' ? displayedValue === target : displayedValue >= target;
  return {
    id,
    label,
    status: pass ? 'pass' : 'fail',
    summary: `${display}: ${displayedValue}; ${comparison === 'exact' ? 'required exactly' : 'minimum'} ${target}.`,
    basis: 'document',
  };
}

const verify = (
  id: string,
  label: string,
  summary: string,
  basis: BuildGuideCheck['basis'] = 'calculator-data',
): BuildGuideCheck => ({ id, label, status: 'verify', summary, basis });

function primaryScalingSummary(build: BuildState): BuildGuideCheck {
  const weapon = build.equipment.primaryWeapon;
  if (!weapon) return verify('damage', 'Damage path', 'REQUIRES CALCULATOR DATA: no primary weapon is configured, so damage stat and scaling cannot be checked.');
  const scaling = Object.entries(weapon.customScaling)
    .filter((entry): entry is [StatKey, number] => typeof entry[1] === 'number' && entry[1] > 0)
    .sort((a, b) => b[1] - a[1]);
  if (!scaling.length) return verify('damage', 'Damage path', 'REQUIRES CALCULATOR DATA: the configured weapon has no positive scaling values.');
  const top = scaling[0][1];
  const leaders = scaling.filter(([, value]) => value === top).map(([stat]) => stat.toUpperCase());
  if (leaders.length !== 1) {
    return verify('damage', 'Damage path', `REQUIRES VERIFICATION: ${weapon.weaponType} has tied primary scaling (${leaders.join(' / ')} at ${top}%). Confirm a proven split or special-scaling interaction.`);
  }
  return {
    id: 'damage', label: 'Damage path', status: 'pass', basis: 'calculator-data',
    summary: `Calculator data identifies ${leaders[0]} as the configured ${weapon.weaponType}'s primary scaling (${top}%). Class-skill scaling still requires verification.`,
  };
}

function classWeaponCheck(build: BuildState): BuildGuideCheck {
  const category = weaponCategory(build.equipment.primaryWeapon?.weaponType);
  if (!category) return verify('class-weapon', 'Class and weapon fit', 'REQUIRES CALCULATOR DATA: configure a primary weapon before checking class weapon access.');
  const listed = [build.mainClass, build.subClass].filter(className => CLASSES[className]?.validWeapons?.includes(category));
  if (listed.length) {
    return {
      id: 'class-weapon', label: 'Class and weapon fit', status: 'pass', basis: 'calculator-data',
      summary: `${category} is listed for ${listed.join(' and ')}. Class actions and buffs are not modeled and still require verification.`,
    };
  }
  return verify('class-weapon', 'Class and weapon fit', `REQUIRES VERIFICATION: ${category} is not listed for either class. The document says talents may still grant access, so this is not treated as a failure.`);
}

function endgameNumericChecks(build: BuildState, evaluation: BuildEvaluation, preset: OptimizationPreset): BuildGuideCheck[] {
  if (build.characterLevel < SL2_BUILD_GUIDE_TARGETS.endgameLevel) {
    return [verify(
      'endgame-targets',
      'Endgame attribute targets',
      `REQUIRES VERIFICATION: the build is level ${build.characterLevel}. The document presents final-build baselines; the calculator has no documented leveling curve for safely prorating them.`,
      'document',
    )];
  }

  const checks: BuildGuideCheck[] = [
    numericCheck('aptitude', 'Aptitude', evaluation.scaledStats.apt, SL2_BUILD_GUIDE_TARGETS.scaledAptitude, 'exact', 'Scaled APT'),
    {
      ...numericCheck('accuracy', 'Accuracy', evaluation.scaledStats.ski, SL2_BUILD_GUIDE_TARGETS.minimumScaledSkill, 'minimum', 'Scaled SKI'),
      summary: `Scaled SKI: ${Math.floor(evaluation.scaledStats.ski)}; minimum 57, with 60+ preferred when possible.`,
    },
    {
      ...numericCheck('vitality', 'Vitality', evaluation.rawStats.vit, SL2_BUILD_GUIDE_TARGETS.minimumFinalVitality, 'minimum', 'Calculator raw VIT'),
      basis: 'assumption',
      summary: `ASSUMPTION: calculator raw VIT is treated as the document's final VIT. Calculator raw VIT: ${Math.floor(evaluation.rawStats.vit)}; minimum 35.`,
    },
  ];

  if (preset.id === 'evade') {
    checks.push({
      ...numericCheck('defense', 'Evade defense', evaluation.derived.evade, SL2_BUILD_GUIDE_TARGETS.minimumTotalEvade, 'minimum', 'Calculator total Evade'),
      summary: `Calculator total Evade: ${Math.floor(evaluation.derived.evade)}; minimum 195, with 200+ preferred. Buff uptime still requires verification.`,
    });
  } else if (preset.id === 'tank') {
    const defPass = evaluation.scaledStats.def >= SL2_BUILD_GUIDE_TARGETS.strongTankDefense;
    const resPass = evaluation.scaledStats.res >= SL2_BUILD_GUIDE_TARGETS.strongTankResistance;
    checks.push({
      id: 'defense', label: 'Non-evade defense', status: defPass && resPass ? 'pass' : 'fail', basis: 'assumption',
      summary: `ASSUMPTION: the document's approximately 45+ DEF/RES tank target is interpreted as scaled. Calculator scaled DEF/RES: ${Math.floor(evaluation.scaledStats.def)}/${Math.floor(evaluation.scaledStats.res)}. Armor and magic armor still require verification.`,
    });
  } else if (preset.id === 'glass_cannon') {
    checks.push(verify('defense', 'Defense plan', 'DOCUMENT WARNING: glass defense is explicitly not recommended. Confirm that the risk is intentional.', 'document'));
  } else {
    checks.push(verify('defense', 'Defense plan', 'ASSUMPTION REQUIRING VERIFICATION: select an explicit Evade, non-evade, bruiser, or hybrid defense plan. The preset name alone does not prove the plan.', 'assumption'));
  }
  return checks;
}

export function validateBuildAgainstGuide(
  build: BuildState,
  evaluation: BuildEvaluation,
  preset: OptimizationPreset,
): BuildGuideValidation {
  const checks: BuildGuideCheck[] = [
    verify('concept', 'Concept', 'REQUIRES USER INPUT: confirm that every mechanical choice supports one intended combat role or theme.'),
    verify('class-pairing', 'Class pairing', 'REQUIRES VERIFICATION: class actions, skills, buff uptime, and utility are not represented by structured calculator data.'),
    primaryScalingSummary(build),
    classWeaponCheck(build),
    ...endgameNumericChecks(build, evaluation, preset),
    verify('extra-stats', 'Extra-stat package', 'REQUIRES VERIFICATION: confirm that Critical, Faith, or Sanctity investment pays for mechanics the build actually uses. Complete package interactions are not modeled.'),
    verify('casting', 'Casting tools', build.equipment.primaryWeapon?.weaponType === 'Tome'
      ? 'PARTIAL CALCULATOR SUPPORT: the configured Tome is a casting tool under the document, but spell list and best-tool selection are not tracked.'
      : 'REQUIRES VERIFICATION: spells and class/racial/enchant-granted casting-tool permissions are not tracked.'),
    verify('equipment', 'Equipment plan', build.equipment.primaryWeapon && build.equipment.armorName
      ? 'PARTIAL CALCULATOR SUPPORT: a weapon and torso are configured. Off-hand, gloves, boots, accessories, torso upgrades, and acquisition order are not tracked.'
      : 'REQUIRES CALCULATOR DATA: configure both a primary weapon and torso; remaining slots and upgrade order still require verification.'),
    verify('off-hand', 'Off-hand', 'REQUIRES VERIFICATION: off-hand equipment and Twin Dance/Akimbo permissions are not represented in build data.'),
    verify('battle-weight', 'Battle weight', evaluation.primaryWeapon
      ? `PARTIAL CALCULATOR SUPPORT: primary weapon weight is ${evaluation.primaryWeapon.weight}; calculated maximum battle weight is ${evaluation.derived.battleWeight}. Total equipped weight is unavailable, so the full check cannot be completed.`
      : 'REQUIRES CALCULATOR DATA: total equipped battle weight is not represented.'),
    verify('reliability', 'Reliability', 'REQUIRES VERIFICATION: test buffs, resources, positioning, and action reliability in the target content.'),
    verify('version', 'Version check', 'REQUIRES VERIFICATION: confirm version-sensitive class, item, and mechanic claims against the target patch and current calculator data.', 'document'),
  ];

  const baselineScore = scoreBuildGuideBaselines(build, evaluation, preset);

  return {
    checks,
    passed: checks.filter(check => check.status === 'pass').length,
    failed: checks.filter(check => check.status === 'fail').length,
    requiresVerification: checks.filter(check => check.status === 'verify').length,
    supportedDeficit: baselineScore.supportedDeficit,
  };
}
