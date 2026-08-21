export type CurriculumWarningPolicyEntry={expectedCount:number;rationale:string};

/**
 * Reviewed curriculum debt. These warnings are not ignored: CI requires the
 * exact known count for every class and rejects any new warning code. Reducing a
 * count is welcome, but the policy must then be updated in the same reviewed
 * change so the remaining debt stays explicit.
 */
export const CURRICULUM_WARNING_POLICY:Record<string,CurriculumWarningPolicyEntry>={
  'reinforces-before-introduction':{
    expectedCount:31,
    rationale:'Legacy pedagogy metadata marks reinforcement before the formal introduces tag in a limited set of lessons. Tracked until the editorial sequencing pass rewrites those lesson annotations.'
  },
  'concept-dependency-gap':{
    expectedCount:6,
    rationale:'Six concept definitions declare a prerequisite that is formally introduced later than the current lesson metadata. Kept visible as graph debt rather than silently weakening dependency validation.'
  },
  'reference-gap':{
    expectedCount:68,
    rationale:'Some lesson relatedCommands still point to syntax tokens without a dedicated reference entry. The course remains usable, but the standalone reference catalogue is not yet complete.'
  },
  'reference-token-collision':{
    expectedCount:10,
    rationale:'Known reference aliases/titles normalize to the same search token. Search ranking disambiguates them today; the collisions remain tracked for a later reference-taxonomy cleanup.'
  },
  'unobserved-concept':{
    expectedCount:4,
    rationale:'Four graph concepts currently have no direct lesson/practice/reference/project evidence. They remain explicit graph debt and may not increase unnoticed.'
  }
};
