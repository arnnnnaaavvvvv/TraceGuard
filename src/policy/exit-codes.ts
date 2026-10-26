export const EXIT_CODES = {
  PASS: 0,
  POLICY_FAILED: 1,
  BAD_CONFIG_OR_USAGE: 2,
  INFRASTRUCTURE_FAILURE: 3,
} as const;

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];
