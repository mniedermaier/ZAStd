import { SeededRNG, dateSeed, getTodayDateString } from './rng';
import { VALID_MAP_SIZES, VALID_MAP_LAYOUTS, VALID_DIFFICULTIES, ALL_MUTATOR_TYPES, MUTATOR_START_WAVE, MAX_MUTATORS_PER_WAVE } from './constants';
import { GOVERNORS } from './governor';
import type { WaveMutatorType } from './types';

export { SeededRNG, dateSeed, getTodayDateString } from './rng';

export interface DailyChallengeConfig {
  dateString: string;
  mapSize: string;
  mapLayout: string;
  difficulty: string;
  featuredGovernor: string;
  waveMutators: Record<number, WaveMutatorType[]>;
}

/**
 * Generate a deterministic daily challenge config from a date string.
 * Same date = same config every time.
 */
export function generateDailyChallenge(dateStr?: string): DailyChallengeConfig {
  const date = dateStr ?? getTodayDateString();
  const rng = new SeededRNG(dateSeed(date));

  // Map size: weighted toward medium (50% medium, 25% small, 25% large)
  const mapSizeRoll = rng.next();
  let mapSize: string;
  if (mapSizeRoll < 0.25) mapSize = 'small';
  else if (mapSizeRoll < 0.75) mapSize = 'medium';
  else mapSize = 'large';

  // Map layout
  const layouts = [...VALID_MAP_LAYOUTS];
  const mapLayout = layouts[rng.nextInt(layouts.length)];

  // Difficulty: weighted toward normal/hard (20% easy, 35% normal, 35% hard, 10% extreme)
  const diffRoll = rng.next();
  let difficulty: string;
  if (diffRoll < 0.20) difficulty = 'easy';
  else if (diffRoll < 0.55) difficulty = 'normal';
  else if (diffRoll < 0.90) difficulty = 'hard';
  else difficulty = 'extreme';

  // Featured governor
  const govKeys = Object.keys(GOVERNORS);
  const featuredGovernor = govKeys[rng.nextInt(govKeys.length)];

  // Pre-roll wave mutators for waves MUTATOR_START_WAVE through 39 (non-boss)
  const waveMutators: Record<number, WaveMutatorType[]> = {};
  for (let w = MUTATOR_START_WAVE; w <= 39; w++) {
    if (w % 10 === 0) continue; // skip boss waves
    const mutatorCount = rng.nextInt(MAX_MUTATORS_PER_WAVE + 1); // 0, 1, or 2
    if (mutatorCount > 0) {
      const available = [...ALL_MUTATOR_TYPES];
      const chosen: WaveMutatorType[] = [];
      for (let i = 0; i < mutatorCount && available.length > 0; i++) {
        const idx = rng.nextInt(available.length);
        chosen.push(available[idx] as WaveMutatorType);
        available.splice(idx, 1);
      }
      waveMutators[w] = chosen;
    }
  }

  return {
    dateString: date,
    mapSize,
    mapLayout,
    difficulty,
    featuredGovernor,
    waveMutators,
  };
}
