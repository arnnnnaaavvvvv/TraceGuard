import type { CompatibilityType, Severity } from './rules.js';

export type HttpMethod = 'GET' | 'HEAD' | 'OPTIONS' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ParameterDefinition {
  readonly name: string;
  readonly in: 'path' | 'query' | 'header';
  readonly required: boolean;
  readonly schema?: Record<string, unknown>;
  readonly example?: unknown;
}

export interface ResponseDefinition {
  readonly statusCode: string;
  readonly description: string;
  readonly headers?: Record<string, { required?: boolean; schema?: Record<string, unknown> }>;
  readonly content?: Record<string, { schema?: Record<string, unknown> }>;
}

export interface Operation {
  readonly operationId?: string;
  readonly method: HttpMethod;
  readonly pathTemplate: string;
  readonly parameters: readonly ParameterDefinition[];
  readonly requestBody?: {
    readonly required: boolean;
    readonly content: Record<string, { schema?: Record<string, unknown> }>;
  };
  readonly responses: Record<string, ResponseDefinition>;
  readonly security?: readonly Record<string, readonly string[]>[];
}

export interface Finding {
  readonly id: string;
  readonly ruleId: string;
  readonly severity: Severity;
  readonly compatibility: CompatibilityType;
  readonly method: HttpMethod;
  readonly endpoint: string;
  readonly location: string;
  readonly expected: string;
  readonly actual: string;
  readonly message: string;
  readonly suggestion: string;
  readonly suppressed?: boolean;
}

export interface CompatChange {
  readonly ruleId: string;
  readonly compatibility: CompatibilityType;
  readonly severity: Severity;
  readonly method?: HttpMethod;
  readonly endpoint?: string;
  readonly location: string;
  readonly description: string;
  readonly before?: string;
  readonly after?: string;
}

export interface BaselineEntry {
  readonly fingerprint: string;
  readonly ruleId: string;
  readonly method: string;
  readonly endpoint: string;
  readonly location: string;
  readonly recordedAt: string;
}

export interface BaselineFile {
  readonly version: '1';
  readonly createdAt: string;
  readonly entries: readonly BaselineEntry[];
}

export interface Policy {
  readonly failOnBreaking: boolean;
  readonly failOnPotentiallyBreaking: boolean;
  readonly maxCriticalFindings: number;
  readonly maxMajorFindings: number;
  readonly ignoredRules: readonly string[];
}

export interface ReportSummary {
  readonly totalOperations: number;
  readonly checkedOperations: number;
  readonly skippedOperations: number;
  readonly totalFindings: number;
  readonly criticalCount: number;
  readonly majorCount: number;
  readonly minorCount: number;
  readonly infoCount: number;
  readonly suppressedCount: number;
  readonly breakingChangesCount: number;
}

export interface Report {
  readonly schemaVersion: '1.0.0';
  readonly toolVersion: string;
  readonly timestamp: string;
  readonly mode: 'check' | 'diff';
  readonly summary: ReportSummary;
  readonly findings: readonly Finding[];
  readonly changes?: readonly CompatChange[];
  readonly policyResult: {
    readonly passed: boolean;
    readonly failureReasons: readonly string[];
  };
}
