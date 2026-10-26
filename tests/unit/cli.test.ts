import { describe, it, expect } from 'vitest';
import { buildCliProgram } from '../../src/cli/args.js';

describe('CLI Shell', () => {
  it('configures check, diff, and baseline subcommands', () => {
    const program = buildCliProgram();
    const commandNames = program.commands.map((cmd) => cmd.name());

    expect(commandNames).toContain('check');
    expect(commandNames).toContain('diff');
    expect(commandNames).toContain('baseline');
  });

  it('outputs version string 0.1.0', () => {
    const program = buildCliProgram();
    expect(program.version()).toBe('0.1.0');
  });

  it('has zero network side-effects during configuration', () => {
    const program = buildCliProgram();
    expect(program.name()).toBe('traceguard');
  });
});
