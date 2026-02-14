import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";


export default [
  {files: ["src/**/*.{js,ts,tsx}"], languageOptions: {globals: globals.browser}},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Add custom rules here
      '@typescript-eslint/no-explicit-any': 'off',
    }
  }
];
