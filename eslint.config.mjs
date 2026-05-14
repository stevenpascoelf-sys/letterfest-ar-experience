import path from 'node:path';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default ts.config(
    includeIgnoreFile(gitignorePath),
    js.configs.recommended,
    ...ts.configs.recommended,
    eslintPluginPrettierRecommended,
    {
        ignores: [
            'dist/**',
            'node_modules/**',
            'coverage/**',
            '.agents/skills/**',
            '.claude/skills/**',
            '**/*.config.ts',
            '**/*.config.mjs',
            '**/*.config.js',
            '**/*.config.cjs',
            'src/integrations/supabase/types.ts',
        ],
    },
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2022,
            globals: { ...globals.browser, ...globals.node },
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
        },
    },
    {
        files: ['**/*.{spec,test}.{ts,tsx}'],
        languageOptions: {
            globals: { ...globals.vitest },
        },
    },
);
