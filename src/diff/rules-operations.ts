// DETECTS: Removal of response status codes, content-type media types, and security requirement tightening.
// WHY:     Removing expected status codes or media types, or adding auth barriers breaks existing consumers.
// LIMITS:  Cannot detect whether server dynamically accepts grandfathered auth schemes.

import type { Operation, CompatChange } from '../types/core.js';
import { COMPAT_RULES } from '../types/rules.js';
import { createCompatChange } from './changes.js';

export function compareOperationMetadata(
  baseOp: Operation,
  headOp: Operation
): readonly CompatChange[] {
  const changes: CompatChange[] = [];

  // 1. Status Code Removal
  for (const statusCode of Object.keys(baseOp.responses)) {
    if (!(statusCode in headOp.responses)) {
      changes.push(
        createCompatChange({
          ruleId: COMPAT_RULES.STATUS_REMOVED,
          compatibility: 'BREAKING',
          severity: 'major',
          method: baseOp.method,
          endpoint: baseOp.pathTemplate,
          location: `#/paths/~1${escapePointer(baseOp.pathTemplate)}/${baseOp.method.toLowerCase()}/responses/${statusCode}`,
          description: `Documented status code '${statusCode}' was removed from ${baseOp.method} ${baseOp.pathTemplate}.`,
          before: `Status '${statusCode}' documented`,
          after: `Status '${statusCode}' removed`,
        })
      );
    }
  }

  // 2. Response Media Type Removal
  for (const [statusCode, baseRes] of Object.entries(baseOp.responses)) {
    const headRes = headOp.responses[statusCode];
    if (!headRes || !baseRes.content) continue;

    for (const mediaType of Object.keys(baseRes.content)) {
      if (!headRes.content || !(mediaType in headRes.content)) {
        changes.push(
          createCompatChange({
            ruleId: COMPAT_RULES.MEDIA_TYPE_REMOVED,
            compatibility: 'BREAKING',
            severity: 'major',
            method: baseOp.method,
            endpoint: baseOp.pathTemplate,
            location: `#/paths/~1${escapePointer(baseOp.pathTemplate)}/${baseOp.method.toLowerCase()}/responses/${statusCode}/content/${escapePointer(mediaType)}`,
            description: `Response media type '${mediaType}' was removed for status '${statusCode}'.`,
            before: `Media type '${mediaType}' accepted`,
            after: 'Media type removed',
          })
        );
      }
    }
  }

  // 3. Security Requirements
  const baseSecCount = baseOp.security?.length ?? 0;
  const headSecCount = headOp.security?.length ?? 0;
  if (baseSecCount === 0 && headSecCount > 0) {
    changes.push(
      createCompatChange({
        ruleId: COMPAT_RULES.AUTH_CHANGED,
        compatibility: 'BREAKING',
        severity: 'critical',
        method: baseOp.method,
        endpoint: baseOp.pathTemplate,
        location: `#/paths/~1${escapePointer(baseOp.pathTemplate)}/${baseOp.method.toLowerCase()}/security`,
        description: `Security requirements were added to previously unauthenticated operation ${baseOp.method} ${baseOp.pathTemplate}.`,
        before: 'No authentication required',
        after: `${headSecCount} security scheme(s) required`,
      })
    );
  }

  return changes;
}

function escapePointer(str: string): string {
  return str.replace(/^\//, '').replace(/~/g, '~0').replace(/\//g, '~1');
}
