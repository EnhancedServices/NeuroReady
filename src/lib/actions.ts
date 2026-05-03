import type { RiskType, PlannedSessionType, DomainStatus, SessionCall } from '../types';

export interface ActionContext {
  primaryRisk: RiskType;
  secondaryRisk: RiskType | null;
  plannedSessionType: PlannedSessionType;
  controlStatus: DomainStatus;
  adaptStatus: DomainStatus;
  focusStatus: DomainStatus;
  sessionCall: SessionCall;
}

const DEFAULT_ACTIONS: Record<RiskType, [string, string]> = {
  pacing: [
    'Cap the first 20 to 30 minutes.',
    'Use fixed pace or power targets.',
  ],
  fueling: [
    'Start fueling in the first 10 minutes.',
    'Set 20-minute fuel reminders.',
  ],
  focus: [
    'Keep the route simple and lower risk.',
    'Avoid technical or high-risk environments.',
  ],
  complexity: [
    'Replace variable work with steady blocks.',
    'Pre-commit intervals and recovery.',
  ],
  recovery: [
    'Swap to easy aerobic work or reduce session demand.',
    'Prioritise sleep, food, and recovery today.',
  ],
};

export function selectActions(context: ActionContext): { action1: string; action2: string | null } {
  const { primaryRisk, plannedSessionType, sessionCall } = context;

  let action1 = DEFAULT_ACTIONS[primaryRisk][0];
  let action2: string | null = DEFAULT_ACTIONS[primaryRisk][1];

  if (plannedSessionType === 'group_ride_run') {
    if (primaryRisk === 'pacing' || primaryRisk === 'focus') {
      action1 = 'Avoid reactive surges in the group.';
      action2 = 'Use fixed effort caps and early fueling.';
    }
  }

  if (plannedSessionType === 'technical_session') {
    if (primaryRisk === 'focus' || primaryRisk === 'recovery') {
      action1 = 'Avoid technical terrain today.';
      action2 = 'Choose a safer, simpler session.';
    }
  }

  const highIntensityTypes: PlannedSessionType[] = ['threshold', 'vo2_high_intensity', 'race_simulation'];
  if (highIntensityTypes.includes(plannedSessionType) && sessionCall !== 'ready_for_quality') {
    action1 = 'Simplify or downgrade the session.';
    action2 = 'Use a warm-up check before committing.';
  }

  return { action1, action2 };
}

export function getGenericActionsForRisk(risk: RiskType): string[] {
  return [...DEFAULT_ACTIONS[risk]];
}
