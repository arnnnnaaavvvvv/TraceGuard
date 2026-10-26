export abstract class TraceGuardError extends Error {
  public abstract readonly code: string;
  public abstract readonly hint: string;
  public readonly exitCode: number;

  constructor(message: string, exitCode: number = 2) {
    super(message);
    this.name = new.target.name;
    this.exitCode = exitCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConfigError extends TraceGuardError {
  public readonly code = 'ERR_CONFIG';
  public readonly hint: string;

  constructor(message: string, hint: string = 'Check your configuration file and CLI flags against schema.') {
    super(`Configuration error: ${message}`, 2);
    this.hint = hint;
  }
}

export class SpecError extends TraceGuardError {
  public readonly code = 'ERR_SPEC';
  public readonly hint: string;
  public readonly specPath?: string;
  public readonly location?: string;

  constructor(
    message: string,
    specPath?: string,
    location?: string,
    hint: string = 'Validate OpenAPI syntax with a linter or check line references in the document.'
  ) {
    const locPrefix = location ? ` at [${location}]` : '';
    const filePrefix = specPath ? ` in '${specPath}'` : '';
    super(`OpenAPI specification error${filePrefix}${locPrefix}: ${message}`, 2);
    this.specPath = specPath;
    this.location = location;
    this.hint = hint;
  }
}

export class UnresolvedRefError extends TraceGuardError {
  public readonly code = 'ERR_UNRESOLVED_REF';
  public readonly hint: string;
  public readonly ref: string;
  public readonly location?: string;

  constructor(
    ref: string,
    location?: string,
    hint: string = 'Ensure the referenced schema or component exists locally under #/components/.'
  ) {
    const loc = location ? ` at ${location}` : '';
    super(`Unresolved local reference '${ref}'${loc}`, 2);
    this.ref = ref;
    this.location = location;
    this.hint = hint;
  }
}

export class NetworkError extends TraceGuardError {
  public readonly code = 'ERR_NETWORK';
  public readonly hint: string;
  public readonly targetUrl: string;

  constructor(
    message: string,
    targetUrl: string,
    hint: string = 'Verify that the target API server is running and reachable from this network.'
  ) {
    super(`Network failure when contacting '${targetUrl}': ${message}`, 3);
    this.targetUrl = targetUrl;
    this.hint = hint;
  }
}

export class TimeoutError extends TraceGuardError {
  public readonly code = 'ERR_TIMEOUT';
  public readonly hint: string;
  public readonly targetUrl: string;
  public readonly timeoutMs: number;

  constructor(
    targetUrl: string,
    timeoutMs: number,
    hint: string = 'Increase timeoutMs in configuration or check for slow endpoints.'
  ) {
    super(`Request to '${targetUrl}' timed out after ${timeoutMs}ms`, 3);
    this.targetUrl = targetUrl;
    this.timeoutMs = timeoutMs;
    this.hint = hint;
  }
}

export class PolicyViolationError extends TraceGuardError {
  public readonly code = 'ERR_POLICY';
  public readonly hint: string;
  public readonly failureReasons: readonly string[];

  constructor(
    failureReasons: readonly string[],
    hint: string = 'Review breaking changes and contract mismatches or update the baseline snapshot.'
  ) {
    super(`CI Policy failed with ${failureReasons.length} violation(s):\n- ${failureReasons.join('\n- ')}`, 1);
    this.failureReasons = failureReasons;
    this.hint = hint;
  }
}
