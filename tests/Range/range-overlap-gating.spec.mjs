import { format } from 'prettier';
import { expect, test } from 'vitest';

import * as plugin from '../../src/index.ts';

const defaultImportOrder = [
    '<BUILTIN_MODULES>',
    '<THIRD_PARTY_MODULES>',
    '^[.]',
];

async function formatWithPlugin(code, options = {}) {
    return format(code, {
        endOfLine: 'lf',
        importOrder: defaultImportOrder,
        importOrderSafeSideEffects: [],
        plugins: [plugin],
        ...options,
    });
}

function expectInOrder(code, firstNeedle, secondNeedle) {
    const firstIndex = code.indexOf(firstNeedle);
    const secondIndex = code.indexOf(secondNeedle);

    expect(firstIndex).toBeGreaterThanOrEqual(0);
    expect(secondIndex).toBeGreaterThan(firstIndex);
}

// Verifies a partial range below imports leaves import order untouched in the default parser path.
test('range formatting outside imports does not sort imports in typescript files', async () => {
    const code = `import z from 'z';
import a from 'a';

const value=1;
`;

    const output = await formatWithPlugin(code, {
        filepath: 'range-gating.ts',
        parser: 'typescript',
        rangeStart: code.indexOf('const'),
        rangeEnd: code.length,
    });

    expect(output).toBe(`import z from 'z';
import a from 'a';

const value = 1;
`);
});

// Verifies Vue skips import sorting when the selected range does not overlap script imports.
test('range formatting outside imports does not sort imports in vue files', async () => {
    const code = `<script setup>
import z from 'z';
import a from 'a';

const value=1;
</script>

<template>
  <div>{{ value }}</div>
</template>
`;

    const output = await formatWithPlugin(code, {
        filepath: 'component.vue',
        parser: 'vue',
        rangeStart: code.indexOf('const value'),
        rangeEnd: code.indexOf('</script>'),
    });

    expectInOrder(output, 'import z', 'import a');
    expect(output).not.toContain(`import a from "a";\nimport z from "z";`);
});

// Verifies Ember template-tag files also leave imports alone when the partial range is below the import block.
test('range formatting outside imports does not sort imports in ember template-tag files', async () => {
    const code = `import z from 'z';
import a from 'a';

const value=1;

export default <template>
  <div>{{value}}</div>
</template>;
`;

    const output = await format(code, {
        endOfLine: 'lf',
        filepath: 'component.gjs',
        importOrder: defaultImportOrder,
        importOrderParserPlugins: ['jsx'],
        importOrderSafeSideEffects: [],
        parser: 'ember-template-tag',
        plugins: ['prettier-plugin-ember-template-tag', plugin],
        rangeStart: code.indexOf('const value'),
        rangeEnd: code.length,
    });

    expectInOrder(output, `import z from 'z';`, `import a from 'a';`);
    expect(output).not.toContain(`import a from 'a';\nimport z from 'z';`);
});
