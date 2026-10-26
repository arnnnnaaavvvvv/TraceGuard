// DETECTS: Removal of whole path endpoints or supported HTTP methods.
// WHY:     Existing clients calling removed endpoints or methods immediately receive HTTP 404 or 405 errors.
// LIMITS:  Cannot detect if an endpoint was moved and handled via an external 301 redirect.

import type { Operation, CompatChange } from '../types/core.js';
import { COMPAT_RULES } from '../types/rules.js';
import { createCompatChange } from './changes.js';

export function compareEndpointsAndMethods(
  baseOps: readonly Operation[],
  headOps: readonly Operation[]
): readonly CompatChange[] {
  const changes: CompatChange[] = [];
  const baseMap = new Map<string, Operation>();
  const headMap = new Map<string, Operation>();

  for (const op of baseOps) {
    baseMap.set(`${op.method}:${op.pathTemplate}`, op);
  }
  for (const op of headOps) {
    headMap.set(`${op.method}:${op.pathTemplate}`, op);
  }

  // Check for removed endpoints / methods
  for (const [key, baseOp] of baseMap.entries()) {
    if (!headMap.has(key)) {
      // Check if path exists with another method
      const pathStillExists = headOps.some((op) => op.pathTemplate === baseOp.pathTemplate);

      if (pathStillExists) {
        changes.push(
          createCompatChange({
            ruleId: COMPAT_RULES.METHOD_REMOVED,
            compatibility: 'BREAKING',
            severity: 'critical',
            method: baseOp.method,
            endpoint: baseOp.pathTemplate,
            location: `#/paths/~1${escapePointer(baseOp.pathTemplate)}/${baseOp.method.toLowerCase()}`,
            description: `HTTP method '${baseOp.method}' was removed from endpoint '${baseOp.pathTemplate}'.`,
            before: `${baseOp.method} ${baseOp.pathTemplate} supported`,
            after: `${baseOp.method} removed`,
          })
        );
      } else {
        changes.push(
          createCompatChange({
            ruleId: COMPAT_RULES.ENDPOINT_REMOVED,
            compatibility: 'BREAKING',
            severity: 'critical',
            method: baseOp.method,
            endpoint: baseOp.pathTemplate,
            location: `#/paths/~1${escapePointer(baseOp.pathTemplate)}`,
            description: `Endpoint '${baseOp.pathTemplate}' was completely removed.`,
            before: `Path ${baseOp.pathTemplate} documented`,
            after: 'Path removed',
          })
        );
      }
    }
  }

  return changes;
}

function escapePointer(str: string): string {
  return str.replace(/^\//, '').replace(/~/g, '~0').replace(/\//g, '~1');
}
