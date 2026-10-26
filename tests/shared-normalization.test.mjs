import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sourceValue} from '../src/catalog/sourceValue.js';
const cases=JSON.parse(readFileSync(new URL('../shared/normalization-cases.json',import.meta.url),'utf8'));
test('browser uses the same versioned normalization examples as Python and SQL',()=>{
 for(const item of cases) assert.equal(sourceValue(item.input),item.expected,String(item.input));
});
