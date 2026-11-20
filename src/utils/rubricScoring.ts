import {
  AssessmentType,
  Exercise,
  RubricBreakdown,
  RubricCriterion,
  StudentLabRecordSubmission,
  Submission,
  Violation,
} from '../types';

export function roundHalf(val: number): number {
  return Math.round(val * 2) / 2;
}

export function clampScore(val: number, max: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.min(max, Math.max(0, roundHalf(val)));
}

/**
 * Calculate max total marks for a list of rubric criteria.
 */
export function getCriteriaMaxTotal(criteria: RubricCriterion[]): number {
  return criteria.reduce((sum, c) => sum + (Number(c.maxMarks) || 0), 0);
}

/**
 * Extract dynamicScores map from an evaluation record, falling back to legacy LAB breakdown if present.
 */
export function extractDynamicScores(
  evaluation: Partial<StudentLabRecordSubmission> | undefined,
  criteria: RubricCriterion[]
): Record<string, number> | null {
  if (!evaluation) return null;
  if (evaluation.dynamicScores && Object.keys(evaluation.dynamicScores).length > 0) {
    const out: Record<string, number> = {};
    criteria.forEach((c) => {
      if (evaluation.dynamicScores && evaluation.dynamicScores[c.id] !== undefined) {
        out[c.id] = clampScore(Number(evaluation.dynamicScores[c.id]), c.maxMarks);
      }
    });
    if (Object.keys(out).length > 0) return out;
  }

  // Fallback for legacy LAB rubric rows without dynamicScores JSON
  const rb = evaluation.rubrics || evaluation.rubric;
  if (rb && (evaluation.assessmentType || 'LAB') === 'LAB') {
    const out: Record<string, number> = {};
    criteria.forEach((c) => {
      if (c.id === 'conceptImplemented') out[c.id] = clampScore(rb.conceptImplemented ?? 0, c.maxMarks);
      else if (c.id === 'namingConventions') out[c.id] = clampScore(rb.namingConventions ?? 0, c.maxMarks);
      else if (c.id === 'documentation') out[c.id] = clampScore(rb.documentation ?? 0, c.maxMarks);
      else if (c.id === 'output') out[c.id] = clampScore(rb.output ?? 0, c.maxMarks);
    });
    if (Object.keys(out).length > 0) return out;
  }

  return null;
}

/**
 * Auto-score dynamic criteria from code submissions and proctoring flags.
 */
export function computeAutoDynamicScores(
  criteria: RubricCriterion[],
  assessmentExercises: Exercise[],
  studentSubmissions: Submission[],
  studentViolations: Violation[],
  hasFormalSubmission: boolean
): { scores: Record<string, number>; total: number; maxTotal: number; passedCount: number } {
  const relevantIds = new Set(assessmentExercises.map((e) => e.id));
  const filteredSubs =
    relevantIds.size > 0
      ? studentSubmissions.filter((s) => relevantIds.has(s.exerciseId))
      : studentSubmissions;

  const passedIds = new Set(filteredSubs.filter((s) => s.score === 100).map((s) => s.exerciseId));
  const partialOrAny = filteredSubs.length > 0;
  const passedCount = passedIds.size;
  const denom = Math.max(1, assessmentExercises.length);
  const ratio = Math.min(1, passedCount / denom);
  const bestScoreRatio =
    filteredSubs.length > 0
      ? Math.max(...filteredSubs.map((s) => Number(s.score) || 0)) / 100
      : 0;
  const effectiveRatio = assessmentExercises.length > 0 ? Math.max(ratio, bestScoreRatio * 0.6) : bestScoreRatio;

  const hasHighViolations = studentViolations.some((v) => v.severity === 'high');

  const scores: Record<string, number> = {};
  let total = 0;
  let maxTotal = 0;

  criteria.forEach((c) => {
    const max = Number(c.maxMarks) || 0;
    maxTotal += max;

    let raw = 0;
    switch (c.autoRule || 'MANUAL') {
      case 'CODE_IMPLEMENTATION': {
        if (assessmentExercises.length > 0 && passedCount >= assessmentExercises.length) {
          raw = max;
        } else if (partialOrAny) {
          raw = Math.max(max * 0.4, max * effectiveRatio);
        } else if (hasFormalSubmission) {
          raw = max * 0.4;
        }
        if (hasHighViolations) {
          raw = Math.max(0, raw - Math.max(0.5, max * 0.2));
        }
        break;
      }
      case 'OUTPUT_TESTS': {
        if (assessmentExercises.length > 0 && passedCount >= assessmentExercises.length) {
          raw = max;
        } else if (partialOrAny) {
          raw = max * effectiveRatio;
        } else if (hasFormalSubmission) {
          raw = max * 0.3;
        }
        break;
      }
      case 'DOCUMENTATION': {
        if (passedCount > 0 || partialOrAny || hasFormalSubmission) {
          raw = max;
        } else {
          raw = max * 0.5;
        }
        break;
      }
      case 'MANUAL':
      default: {
        // For viva / manual criteria during auto-eval or defaults, start at 80% if student attempted, else 0
        raw = partialOrAny || hasFormalSubmission ? max * 0.8 : 0;
        break;
      }
    }

    const clamped = clampScore(raw, max);
    scores[c.id] = clamped;
    total += clamped;
  });

  return {
    scores,
    total: Number(total.toFixed(1)),
    maxTotal: Number(maxTotal.toFixed(1)),
    passedCount,
  };
}

/**
 * Convert dynamicScores + criteria into a backward-compatible RubricBreakdown object (used for LAB Sheet columns F-K & PDF).
 */
export function buildLegacyRubricBreakdown(
  scores: Record<string, number>,
  total: number,
  assessmentType: AssessmentType
): RubricBreakdown {
  if (assessmentType === 'LAB') {
    const concept = scores.conceptImplemented ?? 0;
    const naming = scores.namingConventions ?? 0;
    const doc = scores.documentation ?? 0;
    const output = scores.output ?? 0;
    const labSum = concept + naming + doc + output;
    const finalTotal = Number((labSum > 0 ? total : total).toFixed(1));
    return {
      conceptImplemented: concept,
      namingConventions: naming,
      documentation: doc,
      output,
      total: finalTotal,
      totalMarks: finalTotal,
    };
  }

  return {
    conceptImplemented: scores.implementation ?? scores.conceptImplemented ?? 0,
    namingConventions: scores.algorithm ?? scores.namingConventions ?? 0,
    documentation: scores.viva ?? scores.documentation ?? 0,
    output: scores.execution ?? scores.output ?? 0,
    total: Number(total.toFixed(1)),
    totalMarks: Number(total.toFixed(1)),
  };
}

/**
 * Get display total & max for any evaluation row under current rubric criteria.
 */
export function getEvaluationDisplayTotals(
  item: StudentLabRecordSubmission,
  criteria: RubricCriterion[]
): { total: number; maxTotal: number; hasMarks: boolean } {
  const configuredMax = getCriteriaMaxTotal(criteria);
  const maxTotal = configuredMax > 0 ? configuredMax : (item.maxTotalMarks || (item.assessmentType === 'ESE' ? 50 : 10));

  if (item.dynamicScores && Object.keys(item.dynamicScores).length > 0) {
    const sum = Object.values(item.dynamicScores).reduce((s, v) => s + (Number(v) || 0), 0);
    return { total: Number(sum.toFixed(1)), maxTotal, hasMarks: true };
  }

  if (item.rubrics && (item.isVerifiedAndApproved || (item.rubrics.total ?? 0) > 0)) {
    return { total: Number((item.rubrics.total ?? 0).toFixed(1)), maxTotal, hasMarks: true };
  }

  return { total: 0, maxTotal, hasMarks: false };
}
