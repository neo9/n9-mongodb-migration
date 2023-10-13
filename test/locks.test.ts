import { N9Error } from '@neo9/n9-node-utils';
import ava, { ExecutionContext } from 'ava';
import { join } from 'path';

import { N9MongodbMigration } from '../src';
import { init, TestContext } from './helpers/utils';

init('locks');

ava('Apply 2 migrations at the same time', async (t: ExecutionContext<TestContext>) => {
	const mongodbPatchApplier = new N9MongodbMigration({
		migrationScriptsFolderPath: join(__dirname, './fixtures/locks'),
		logger: t.context.logger,
		mongodbURI: t.context.mongodbURI,
		lockTimeoutMs: 1000, // 1s (less than the migration duration)
		forcedToAppVersion: '1.0.0',
	});

	mongodbPatchApplier.apply().catch(() => {
		t.context.logger.error('This should not happen');
		t.fail(`The first migration should run well.`);
	});

	// eslint-disable-next-line no-promise-executor-return
	await new Promise((resolve) => setTimeout(resolve, 100)); // let some time to the first apply to connect to mongodb
	await t.throwsAsync(async () => await mongodbPatchApplier.apply(), {
		message: 'lock-unavailable-to-migrate',
		instanceOf: N9Error,
	});
});
