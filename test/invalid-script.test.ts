import ava, { ExecutionContext } from 'ava';
import { join } from 'path';

import { AppInfosEntity, N9MongodbMigration } from '../src';
import { init, TestContext } from './helpers/utils';

init('invalid-scripts');

ava(
	'Apply migration from 0.0.0 to V2.0.0 with error while loading script',
	async (t: ExecutionContext<TestContext>) => {
		const mongodbPatchApplier = new N9MongodbMigration({
			migrationScriptsFolderPath: join(__dirname, './fixtures/invalid-script'),
			logger: t.context.logger,
			mongodbURI: t.context.mongodbURI,
			forcedToAppVersion: '1.0.0',
		});

		await t.throwsAsync(async () => await mongodbPatchApplier.apply(), {
			message: 'Cannot use import statement outside a module',
		});
		const appInfos = await t.context.db.collection<AppInfosEntity>('_appInfos').findOne({});
		t.falsy(appInfos, 'Migration failed');
	},
);
