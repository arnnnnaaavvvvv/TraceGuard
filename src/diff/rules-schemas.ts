// DETECTS: Breaking schema changes in responses (removed required fields, altered data types, expanded response enums).
// WHY:     Existing clients accessing removed response fields encounter undefined or crash on unexpected types/enum values.
// LIMITS:  Polymorphic compositions (allOf/oneOf/anyOf) that cannot be proven equivalent return UNKNOWN compatibility.

import type { Operation, CompatChange } from '../types/core.js';
import { COMPAT_RULES } from '../types/rules.js';
import { createCompatChange } from './changes.js';
import { normalizeSchemaTypes } from './normalizer.js';

export function compareResponseSchemas(
  baseOp: Operation,
  headOp: Operation
): readonly CompatChange[] {
  const changes: CompatChange[] = [];

  for (const [statusCode, baseRes] of Object.entries(baseOp.responses)) {
    const headRes = headOp.responses[statusCode];
    if (!headRes || !baseRes.content || !headRes.content) continue;

    for (const [mediaType, baseMedia] of Object.entries(baseRes.content)) {
      const headMedia = headRes.content[mediaType];
      if (!headMedia?.schema || !baseMedia.schema) continue;

      const baseSchema = normalizeSchemaTypes(baseMedia.schema);
      const headSchema = normalizeSchemaTypes(headMedia.schema);
      if (!baseSchema || !headSchema) continue;

      const pointer = `#/paths/~1${escapePointer(baseOp.pathTemplate)}/${baseOp.method.toLowerCase()}/responses/${statusCode}/content/${escapePointer(mediaType)}/schema`;

      changes.push(...walkSchemaTree(baseSchema, headSchema, baseOp, pointer));
    }
  }

  return changes;
}

function walkSchemaTree(
  base: Record<string, unknown>,
  head: Record<string, unknown>,
  op: Operation,
  pointer: string
): CompatChange[] {
  const changes: CompatChange[] = [];

  // Check polymorphic composition ambiguity
  if (hasPolymorphicKeywords(base) || hasPolymorphicKeywords(head)) {
    if (JSON.stringify(base) !== JSON.stringify(head)) {
      changes.push(
        createCompatChange({
          ruleId: 'TG-COMPAT-POLYMORPHIC-CHANGED',
          compatibility: 'UNKNOWN',
          severity: 'major',
          method: op.method,
          endpoint: op.pathTemplate,
          location: pointer,
          description: `Polymorphic schema structure (allOf/oneOf/anyOf/not) changed at '${pointer}'. Compatibility cannot be deterministically proven.`,
          before: 'Base polymorphic schema',
          after: 'Head polymorphic schema',
        })
      );
      return changes;
    }
  }

  // 1. Required response property removed
  const baseRequired = (base['required'] as string[]) || [];
  const headRequired = (head['required'] as string[]) || [];

  for (const reqProp of baseRequired) {
    if (!headRequired.includes(reqProp)) {
      changes.push(
        createCompatChange({
          ruleId: COMPAT_RULES.REQUIRED_RESPONSE_FIELD_REMOVED,
          compatibility: 'BREAKING',
          severity: 'critical',
          method: op.method,
          endpoint: op.pathTemplate,
          location: `${pointer}/required`,
          description: `Required response property '${reqProp}' was removed or made optional in '${op.method} ${op.pathTemplate}'. Existing clients expecting this property will break.`,
          before: `Property '${reqProp}' required`,
          after: `Property '${reqProp}' removed or optional`,
        })
      );
    }
  }

  // 2. Type changed
  const baseType = formatType(base['type']);
  const headType = formatType(head['type']);
  if (baseType && headType && baseType !== headType) {
    changes.push(
      createCompatChange({
        ruleId: COMPAT_RULES.RESPONSE_TYPE_CHANGED,
        compatibility: 'BREAKING',
        severity: 'critical',
        method: op.method,
        endpoint: op.pathTemplate,
        location: `${pointer}/type`,
        description: `Response schema type changed from '${baseType}' to '${headType}' in '${op.method} ${op.pathTemplate}'.`,
        before: `Type '${baseType}'`,
        after: `Type '${headType}'`,
      })
    );
  }

  // 3. Response enum expanded (breaking for strict client parsers)
  if (Array.isArray(base['enum']) && Array.isArray(head['enum'])) {
    const baseEnum = base['enum'] as unknown[];
    const headEnum = head['enum'] as unknown[];
    const addedEnum = headEnum.filter((v) => !baseEnum.includes(v));

    if (addedEnum.length > 0) {
      changes.push(
        createCompatChange({
          ruleId: COMPAT_RULES.ENUM_NARROWED,
          compatibility: 'BREAKING',
          severity: 'major',
          method: op.method,
          endpoint: op.pathTemplate,
          location: `${pointer}/enum`,
          description: `Response enum expanded with new values [${addedEnum.join(', ')}]. Clients without exhaustive handling may crash.`,
          before: `Enum: [${baseEnum.join(', ')}]`,
          after: `Enum: [${headEnum.join(', ')}]`,
        })
      );
    }
  }

  // Recurse properties
  const baseProps = (base['properties'] as Record<string, Record<string, unknown>>) || {};
  const headProps = (head['properties'] as Record<string, Record<string, unknown>>) || {};

  for (const [propName, basePropSchema] of Object.entries(baseProps)) {
    const headPropSchema = headProps[propName];
    if (headPropSchema) {
      changes.push(...walkSchemaTree(basePropSchema, headPropSchema, op, `${pointer}/properties/${propName}`));
    }
  }

  return changes;
}

function hasPolymorphicKeywords(schema: Record<string, unknown>): boolean {
  return 'allOf' in schema || 'oneOf' in schema || 'anyOf' in schema || 'not' in schema;
}

function formatType(type: unknown): string {
  if (Array.isArray(type)) return type.join(' | ');
  if (typeof type === 'string') return type;
  return '';
}

function escapePointer(str: string): string {
  return str.replace(/^\//, '').replace(/~/g, '~0').replace(/\//g, '~1');
}
