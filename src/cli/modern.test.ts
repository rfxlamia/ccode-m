/**
 * Basic tests for the Claude Modern CLI Launcher
 *
 * Tests focus on ensuring the module loads correctly and exports are accessible.
 * Full integration testing is done via the story's manual E2E checklist.
 */

import { describe, it, expect } from 'vitest';

describe('Module Structure', () => {
  it('should load the modern CLI module without errors', async () => {
    // This tests that the module can be imported
    // The module won't execute main() because of the require.main guard
    const modern = await import('./modern.js');

    // Verify the module has expected structure
    expect(modern).toBeDefined();
  });

  it('should have valid module exports', async () => {
    const modern = await import('./modern.js');

    // The module should load without errors
    expect(modern).toBeDefined();
  });
});

describe('Port Manager Type Declarations', () => {
  it('should export getPidFilePath type', async () => {
    // This test verifies the type declarations work correctly
    const portManager = await import('../server/services/port-manager.js');

    // Verify the functions are accessible (type-level check)
    expect(typeof portManager.getPidFilePath).toBe('function');
    expect(typeof portManager.getPortFilePath).toBe('function');
  });
});
