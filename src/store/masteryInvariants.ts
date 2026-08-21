import type { ConceptMastery } from '../types';

/** Repair impossible persisted counter relations without discarding valid history. */
export function enforceMasteryInvariants(value:ConceptMastery):ConceptMastery{
  const attempts=Math.max(0,Math.trunc(value.attempts));
  const successes=Math.min(attempts,Math.max(0,Math.trunc(value.successes)));
  const mistakeCount=Math.min(attempts,Math.max(0,Math.trunc(value.mistakeCount)));
  const independentSuccesses=Math.min(successes,Math.max(0,Math.trunc(value.independentSuccesses)));
  const hintedSuccesses=Math.min(successes,Math.max(0,Math.trunc(value.hintedSuccesses)));
  const transferSuccesses=Math.min(successes,Math.max(0,Math.trunc(value.transferSuccesses)));
  const projectSuccesses=Math.min(successes,Math.max(0,Math.trunc(value.projectSuccesses)));
  const delayedRecallSuccesses=Math.min(independentSuccesses,Math.max(0,Math.trunc(value.delayedRecallSuccesses)));
  return {...value,attempts,successes,mistakeCount,independentSuccesses,hintedSuccesses,transferSuccesses,projectSuccesses,delayedRecallSuccesses};
}
