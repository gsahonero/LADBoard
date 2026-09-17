/**
 * Active Layer Types for LAD Board
 */

import { LADActiveAlert, LADObject } from '../standard/types';

export interface ActiveTriggerRule {
  ruleId: string;
  name: string;
  domain?: string;
  type: 'staleness' | 'temporal_due' | 'unresolved_state' | 'followup' | 'custom';
  stalenessThresholdDays?: number;
  dueWindowDays?: number;
  evaluate: (object: LADObject, context: { now: Date }) => LADActiveAlert | null;
}
