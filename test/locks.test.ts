import { N9Log } from '@neo9/n9-node-log';
import ava, { ExecutionContext } from 'ava';

import { N9Error } from '@neo9/n9-node-utils';
import { join } from 'path';
import { N9MongodbMigration } from '../src';
import { init, TestContext } from './helpers/utils';

global.log = new N9Log('tests').module('from-empty-db');

init();

ava('Apply 2 migrations at the same time', async (t: ExecutionContext<TestContext>) => {
	const mongodbPatchApplier = new N9MongodbMigration({
		migrationScriptsFolderPath: join(__dirname, './fixtures/locks'),
		mongodbURI: t.context.mongodbURI,
		lockTimeoutMs: 5000, // 5s
		forcedToAppVersion: '1.0.0',
	});

	mongodbPatchApplier.apply().catch(() => {
		global.log('This should not happen');
	});
	await t.throwsAsync(async () => await mongodbPatchApplier.apply(), {
		message: 'lock-unavailable-to-migrate',
		instanceOf: N9Error,
	});
});
