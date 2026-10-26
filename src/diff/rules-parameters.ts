// DETECTS: New required request parameters or request body properties, and narrowed request enums.
// WHY:     Old clients that do not supply newly required request fields receive HTTP 400 Bad Request errors.
// LIMITS:  Cannot detect whether server code supplies implicit dynamic fallbacks for missing request parameters.

import type { Operation, CompatChange } from '../types/core.js';
import { COMPAT_RULES } from '../types/rules.js';
import { createCompatChange } from './changes.js';

export function compareRequestParameters(
  baseOp: Operation,
  headOp: Operation
): readonly CompatChange[] {
  const changes: CompatChange[] = [];
  const baseParamMap = new Map<string, (typeof baseOp.parameters)[0]>();
  for (const p of baseOp.parameters) {
    baseParamMap.set(`${p.in}:${p.name}`, p);
  }

  // 1. Check for newly added required parameters
  for (const headParam of headOp.parameters) {
    const key = `${headParam.in}:${headParam.name}`;
    const baseParam = baseParamMap.get(key);

    if (!baseParam && headParam.required) {
      changes.push(
        createCompatChange({
          ruleId: COMPAT_RULES.REQUIRED_REQUEST_FIELD_ADDED,
          compatibility: 'BREAKING',
          severity: 'critical',
          method: headOp.method,
          endpoint: headOp.pathTemplate,
          location: `#/paths/~1${escapePointer(headOp.pathTemplate)}/${headOp.method.toLowerCase()}/parameters/${headParam.name}`,
          description: `New required ${headParam.in} parameter '${headParam.name}' was added. Existing clients omitting this parameter will receive 400 Bad Request.`,
          before: `Parameter '${headParam.name}' did not exist`,
          after: `Required ${headParam.in} parameter '${headParam.name}'`,
        })
      );
    } else if (baseParam && !baseParam.required && headParam.required) {
      changes.push(
        createCompatChange({
          ruleId: COMPAT_RULES.REQUIRED_REQUEST_FIELD_ADDED,
          compatibility: 'BREAKING',
          severity: 'critical',
          method: headOp.method,
          endpoint: headOp.pathTemplate,
          location: `#/paths/~1${escapePointer(headOp.pathTemplate)}/${headOp.method.toLowerCase()}/parameters/${headParam.name}`,
          description: `Existing ${headParam.in} parameter '${headParam.name}' changed from optional to required.`,
          before: `Optional ${headParam.in} parameter`,
          after: `Required ${headParam.in} parameter`,
        })
      );
    }

    // 2. Enum narrowing on request parameters
    if (baseParam?.schema?.['enum'] && headParam.schema?.['enum']) {
      const baseEnums = baseParam.schema['enum'] as unknown[];
      const headEnums = headParam.schema['enum'] as unknown[];
      const removedEnums = baseEnums.filter((val) => !headEnums.includes(val));

      if (removedEnums.length > 0) {
        changes.push(
          createCompatChange({
            ruleId: COMPAT_RULES.ENUM_NARROWED,
            compatibility: 'BREAKING',
            severity: 'major',
            method: headOp.method,
            endpoint: headOp.pathTemplate,
            location: `#/paths/~1${escapePointer(headOp.pathTemplate)}/${headOp.method.toLowerCase()}/parameters/${headParam.name}/schema/enum`,
            description: `Request parameter '${headParam.name}' enum was narrowed (removed: [${removedEnums.join(', ')}]). Old clients sending these values will be rejected.`,
            before: `Enum: [${baseEnums.join(', ')}]`,
            after: `Enum: [${headEnums.join(', ')}]`,
          })
        );
      }
    }
  }

  // 3. Request Body Required Fields
  changes.push(...compareRequestBodySchemas(baseOp, headOp));

  return changes;
}

function compareRequestBodySchemas(baseOp: Operation, headOp: Operation): CompatChange[] {
  const changes: CompatChange[] = [];
  const baseContent = baseOp.requestBody?.content?.['application/json']?.schema;
  const headContent = headOp.requestBody?.content?.['application/json']?.schema;

  if (!baseContent || !headContent) return changes;

  const baseRequired = (baseContent['required'] as string[]) || [];
  const headRequired = (headContent['required'] as string[]) || [];

  for (const field of headRequired) {
    if (!baseRequired.includes(field)) {
      changes.push(
        createCompatChange({
          ruleId: COMPAT_RULES.REQUIRED_REQUEST_FIELD_ADDED,
          compatibility: 'BREAKING',
          severity: 'critical',
          method: headOp.method,
          endpoint: headOp.pathTemplate,
          location: `#/paths/~1${escapePointer(headOp.pathTemplate)}/${headOp.method.toLowerCase()}/requestBody/content/application~1json/schema/required`,
          description: `Required property '${field}' was added to request body. Existing clients will be rejected.`,
          before: `Field '${field}' was optional or not present`,
          after: `Field '${field}' is required`,
        })
      );
    }
  }

  return changes;
}

function escapePointer(str: string): string {
  return str.replace(/^\//, '').replace(/~/g, '~0').replace(/\//g, '~1');
}
