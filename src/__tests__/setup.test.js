const fc = require('fast-check');

describe('Test Setup Verification', () => {
  test('Jest is working correctly', () => {
    expect(1 + 1).toBe(2);
  });

  test('fast-check is working correctly', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => a + b === b + a) // Commutative property of addition
    );
  });

  test('Environment variables are loaded', () => {
    // This test ensures dotenv is working
    expect(process.env.NODE_ENV).toBeDefined();
  });
});
