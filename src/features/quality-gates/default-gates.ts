import type { GateDefinition } from '../../types/quality-gate.ts';

export function createDefaultGates(): GateDefinition[] {
  return [
    {
      name: 'require-user-confirmation',
      transition: 'think->plan',
      description: 'Requires user confirmation before transitioning from think to plan phase',
      evaluate: (ctx) => {
        const confirmed = ctx.metadata['user_confirmed'] === true;
        return {
          gateName: 'require-user-confirmation',
          verdict: confirmed ? 'pass' : 'warn',
          message: confirmed
            ? 'User has confirmed direction'
            : 'User has not confirmed direction — ask for confirmation before planning',
        };
      },
    },
    {
      name: 'require-approved-plan',
      transition: 'plan->build',
      description: 'Requires an approved plan before transitioning to build phase',
      evaluate: (ctx) => {
        const approved = ctx.metadata['plan_approved'] === true;
        return {
          gateName: 'require-approved-plan',
          verdict: approved ? 'pass' : 'warn',
          message: approved
            ? 'Plan has been approved'
            : 'No approved plan found — present a plan and get approval before building',
        };
      },
    },
    {
      name: 'require-passing-tests',
      transition: 'build->review',
      description: 'Requires passing tests before transitioning to review phase',
      evaluate: (ctx) => {
        const testsPassed = ctx.metadata['tests_passed'] === true;
        return {
          gateName: 'require-passing-tests',
          verdict: testsPassed ? 'pass' : 'warn',
          message: testsPassed
            ? 'Tests are passing'
            : 'Tests have not been verified — run tests before requesting review',
        };
      },
    },
  ];
}
