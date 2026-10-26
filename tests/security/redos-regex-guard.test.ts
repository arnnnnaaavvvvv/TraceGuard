import { describe, it, expect } from 'vitest';
import { validateSchema } from '../../src/checker/validate.js';

describe('Security: ReDoS Regex Complexity Guard (VULN-02)', () => {
  it('blocks catastrophic nested quantifier regexes from causing ReDoS', () => {
    const catastrophicSchema = {
      type: 'object',
      properties: {
        evil: {
          type: 'string',
          pattern: '^(a+)+$',
        },
      },
    };

    const hostilePayload = {
      evil: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!',
    };

    const start = Date.now();
    const errors = validateSchema(catastrophicSchema, hostilePayload, '3.1');
    const elapsedMs = Date.now() - start;

    expect(elapsedMs).toBeLessThan(100); // Must not hang CPU
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain('Potentially catastrophic regular expression pattern detected');
  });

  it('blocks nested quantifiers with alternation like (a|b+)+', () => {
    const schema = {
      type: 'string',
      pattern: '^([a-z]+|foo+)+$',
    };

    const errors = validateSchema(schema, 'test', '3.0');
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain('Potentially catastrophic regular expression pattern detected');
  });

  it('rejects excessively long regex patterns over 256 characters', () => {
    const oversizedPattern = 'a'.repeat(300);
    const schema = {
      type: 'string',
      pattern: oversizedPattern,
    };

    const errors = validateSchema(schema, 'test', '3.1');
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain('exceeds maximum safe length');
  });

  it('allows safe, legitimate regex patterns and validates properly', () => {
    const safeSchema = {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          pattern: '^[a-zA-Z0-9_]{3,16}$',
        },
      },
    };

    expect(validateSchema(safeSchema, { username: 'alice_123' }, '3.1')).toHaveLength(0);
    const errors = validateSchema(safeSchema, { username: 'bad user!' }, '3.1');
    expect(errors).toHaveLength(1);
    expect(errors[0]?.keyword).toBe('pattern');
  });
});
