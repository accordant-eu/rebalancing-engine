import Module from 'module';
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'typescript') {
    return originalRequire.call(this, 'typescript6');
  }
  return originalRequire.call(this, id);
};

const eslint = (await import('@eslint/js')).default;
const tseslint = (await import('typescript-eslint')).default;

export default tseslint.config(eslint.configs.recommended, ...tseslint.configs.recommended, {
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',
  },
});
