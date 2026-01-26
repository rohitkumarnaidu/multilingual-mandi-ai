module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: [
    'airbnb-base',
    'plugin:jest/recommended',
  ],
  plugins: [
    'jest',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    // Customize rules for the project
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    
    // Allow console.log in development
    'no-console': 'off',
    
    // Relax some strict rules for better development experience
    'consistent-return': 'warn',
    'no-param-reassign': ['error', { props: false }],
    'no-underscore-dangle': 'off',
    'func-names': 'off',
    
    // Import rules
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    'import/prefer-default-export': 'off',
    
    // Allow longer line lengths for readability
    'max-len': ['error', { code: 120, ignoreComments: true, ignoreStrings: true }],
    
    // Jest specific rules
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/prefer-to-have-length': 'warn',
    'jest/valid-expect': 'error',
    
    // Allow async functions without await
    'require-await': 'off',
    
    // Allow object property shorthand
    'object-shorthand': ['error', 'always'],
    
    // Prefer const over let when possible
    'prefer-const': 'error',
    
    // Allow trailing commas
    'comma-dangle': ['error', 'always-multiline'],
    
    // Enforce semicolons
    'semi': ['error', 'always'],
    
    // Enforce single quotes
    'quotes': ['error', 'single'],
    
    // Allow unused vars that start with underscore
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/__tests__/**/*.js'],
      env: {
        jest: true,
      },
      rules: {
        // Allow longer test descriptions
        'max-len': 'off',
        // Allow magic numbers in tests
        'no-magic-numbers': 'off',
      },
    },
  ],
};