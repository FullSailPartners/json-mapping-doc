import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getFile } from '../setup.mjs';
import { runParseMap } from '../../map-doc-parser.js';

describe('ADP', () => {
    it('Should Parse', () => {
        const map = getFile('test/adp/adp-pay-instruct-map.json');
        const data = getFile('test/adp/adp-pay-instruct.json');

        const res = JSON.stringify(runParseMap(map, data));
        const expected = JSON.stringify(getFile('test/adp/adp-result.json'));

        assert.equal(res, expected);
    });
});
