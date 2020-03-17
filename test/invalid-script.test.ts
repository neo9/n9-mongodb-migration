import { N9Log } from '@neo9/n9-node-log';
import ava, { ExecutionContext } from 'ava';
import { join } from 'path';
import { MongodbPatchApplier } from '../src';
import { AppInfosEntity } from '../src/models/app-infos-entity.models';
import { init, TestContext } from './helpers/utils';

global.log = new N9Log('tests').module('invalid-scripts');

init();

ava(
	'Apply migration from 0.0.0 to V2.0.0 with error while loading script',
	async (t: ExecutionContext<TestContext>) => {
		const mongodbPatchApplier = new MongodbPatchApplier({
			migrationScriptsFolderPath: join(__dirname, './fixtures/invalid-script'),
			mongodbURI: t.context.mongodbURI,
			forcedToAppVersion: '1.0.0',
		});

		await t.throwsAsync(async () => await mongodbPatchApplier.apply(), {
			message: 'Cannot use import statement outside a module',
		});
		const appInfos: AppInfosEntity = await t.context.db.collection('_appInfos').findOne({});
		t.falsy(appInfos, 'Migration failed');
	},
);
