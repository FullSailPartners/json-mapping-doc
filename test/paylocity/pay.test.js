import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getFile } from '../setup.mjs';
import { runParseMap } from '../../map-doc-parser.js';

describe('Paylocity', () => {
    it('Should Parse', () => {
        const map = getFile('test/paylocity/pay-emp-map.json');
        const data = getFile('test/paylocity/pay-emp.json');

        const res = JSON.stringify(runParseMap(map, data));
        const expected = JSON.stringify(getFile('test/paylocity/pay-result.json'));

        assert.equal(res, expected);
    });
});
