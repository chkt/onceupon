import * as assert from 'assert';
import { describe, it } from 'mocha';

import { createToken, token_type } from "../source/token";
import { tokensToString } from "../source/format";


function assertTokens(descs:ReadonlyArray<[token_type, string]>, result:string) : void {
	const tokens = [];

	for (const desc of descs) tokens.push(createToken(desc[0], desc[1]));

	assert.strictEqual(tokensToString(tokens), result);
}


describe('tokensToString', () => {
	it('should format count tokens', () => {
		assertTokens([[ token_type.count, Number.NaN.toString() ]], '<BADTRN|NaN>');
		assertTokens([[ token_type.count, '0' ]], '<BADTRN|0>');
		assertTokens([[ token_type.count, '0.9' ]], '   1');
		assertTokens([[ token_type.count, '1' ]], '   1');
		assertTokens([[ token_type.count, '10' ]], '  10');
		assertTokens([[ token_type.count, '100' ]], ' 100');
		assertTokens([[ token_type.count, '999' ]], ' 999');
		assertTokens([[ token_type.count, '1000' ]], '1.0K');
		assertTokens([[ token_type.count, '9949' ]], '9.9K');
		assertTokens([[ token_type.count, '9950' ]], ' 10K');
		assertTokens([[ token_type.count, '10000' ]], ' 10K');
		assertTokens([[ token_type.count, '100000' ]], '100K');
		assertTokens([[ token_type.count, '999499' ]], '999K');
		assertTokens([[ token_type.count, '999500' ]], '1.0M');
		assertTokens([[ token_type.count, '1000000' ]], '1.0M');
		assertTokens([[ token_type.count, '9949999' ]], '9.9M');
		assertTokens([[ token_type.count, '9950000' ]], ' 10M');
		assertTokens([[ token_type.count, '10000000' ]], ' 10M');
		assertTokens([[ token_type.count, '100000000' ]], '100M');
		assertTokens([[ token_type.count, '999499999' ]], '999M');
		assertTokens([[ token_type.count, '999500000' ]], '1.0G');
		assertTokens([[ token_type.count, '1000000000' ]], '1.0G');
		assertTokens([[ token_type.count, '9949999999' ]], '9.9G');
		assertTokens([[ token_type.count, '9950000000' ]], ' 10G');
		assertTokens([[ token_type.count, '10000000000' ]], ' 10G');
		assertTokens([[ token_type.count, '100000000000' ]], '100G');
		assertTokens([[ token_type.count, '999499999999' ]], '999G');
		assertTokens([[ token_type.count, '999500000000' ]], '1.0T');
		assertTokens([[ token_type.count, '1000000000000' ]], '1.0T');
		assertTokens([[ token_type.count, '9949999999999' ]], '9.9T');
		assertTokens([[ token_type.count, '9950000000000' ]], ' 10T');
		assertTokens([[ token_type.count, '10000000000000' ]], ' 10T');
		assertTokens([[ token_type.count, '100000000000000' ]], '100T');
		assertTokens([[ token_type.count, '999499999999999' ]], '999T');
		assertTokens([[ token_type.count, '999500000000000' ]], '999T');
		assertTokens([[ token_type.count, Number.MAX_SAFE_INTEGER.toString() ]], '999T');
		assertTokens([[ token_type.count, Number.MAX_VALUE.toString() ]], '999T');
		assertTokens([[ token_type.count, Number.POSITIVE_INFINITY.toString() ]], '999T');
	});

	it('should format level tokens', () => {
		assertTokens([[ token_type.level, 'fatal' ]], 'fatal  ');
		assertTokens([[ token_type.level, 'error' ]], 'error  ');
		assertTokens([[ token_type.level, 'warn' ]], 'warn   ');
		assertTokens([[ token_type.level, 'notice' ]], 'notice ');
		assertTokens([[ token_type.level, 'info' ]], 'info   ');
		assertTokens([[ token_type.level, 'verbose' ]], 'verbose');
		assertTokens([[ token_type.level, 'debug' ]], 'debug  ');
	});

	it('should separate count and level tokens with a pipe', () => {
		assertTokens([[ token_type.count, '10' ], [ token_type.level, 'warn' ]], '  10|warn   ');
	});
});
