import ava, { ExecutionContext } from 'ava';
import { join } from 'path';

import { AppInfosEntity, N9MongodbMigration, ScriptStatus } from '../src';
import { init, TestContext } from './helpers/utils';

init('from-empty-db');

ava('Apply migration from V unknown to V2.4.0', async (t: ExecutionContext<TestContext>) => {
	const mongodbPatchApplier = new N9MongodbMigration({
		migrationScriptsFolderPath: join(__dirname, './fixtures/from-empty-db'),
		logger: t.context.logger,
		mongodbURI: t.context.mongodbURI,
		appRootDirPath: join(__dirname, './fixtures/from-empty-db'),
	});

	await mongodbPatchApplier.apply();
	const foundInitialDoc: { test: boolean } = await t.context.db
		.collection<{ test: boolean }>('test-init-db')
		.findOne(
			{},
			{
				projection: {
					_id: 0,
				},
			},
		);
	t.deepEqual(foundInitialDoc, { test: true }, 'found initial doc right');
	const appInfos = await t.context.db.collection<AppInfosEntity>('_appInfos').findOne({});
	t.is(appInfos.version, '2.4.0', 'App version in db is updated');
	t.is(appInfos.result.scripts.length, 1, '1 script executed');
	t.is(appInfos.result.isSuccessful, true, 'Migration successful');
	t.is(appInfos.previousVersion, '0.0.0', 'Unknown version is set to 0.0.0');
	t.is(appInfos.result.scripts[0].id, '1.0.0_init-db', 'script executed is the one expected');
	t.is(appInfos.result.scripts[0].status, ScriptStatus.OK, 'script status is OK');
});
