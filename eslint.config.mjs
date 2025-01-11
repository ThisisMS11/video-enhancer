import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

const eslintConfig = [
    ...compat.extends('next/core-web-vitals', 'next/typescript'),
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        plugins: ['@typescript-eslint', 'unused-imports'],
        rules: {
            // Suppress 'prefer-const' warnings
            'prefer-const': 'off',

            // Suppress 'Unexpected any' warnings
            '@typescript-eslint/no-explicit-any': 'off',

            // Warn about unused imports
            'unused-imports/no-unused-imports': 'warn',

            // Warn about unused vars and allow underscore-prefixed ones
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    vars: 'all',
                    varsIgnorePattern: '^_',
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                },
            ],

            // Allow unused variables starting with '_'
            'unused-imports/no-unused-vars': [
                'warn',
                {
                    vars: 'all',
                    varsIgnorePattern: '^_',
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                },
            ],
        },
    },
];

export default eslintConfig;
