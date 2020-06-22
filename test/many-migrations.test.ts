import { N9Log } from '@neo9/n9-node-log';
import ava, { ExecutionContext } from 'ava';

import { join } from 'path';
import { N9MongodbMigration } from '../src';
import { AppInfosEntity } from '../src/models/app-infos-entity.models';
import { ScriptStatus } from '../src/models/migration-result.models';
import { init, TestContext } from './helpers/utils';

global.log = new N9Log('tests').module('many-migrations');

init();

ava(
	'Apply multiple migrations from 0.0.0 to 1.1.1 then to 2.1.0 then to 3.0.0',
	async (t: ExecutionContext<TestContext>) => {
		const mongodbPatchApplier = new N9MongodbMigration({
			migrationScriptsFolderPath: join(__dirname, './fixtures/many-migrations'),
			mongodbURI: t.context.mongodbURI,
			forcedToAppVersion: '1.1.1',
		});

		await mongodbPatchApplier.apply();
		const foundDoc: { test: string }[] = await (
			await t.context.db.collection('test').find(
				{},
				{
					projection: {
						_id: 0,
					},
					sort: {
						test: 1,
					},
				},
			)
		).toArray();
		t.deepEqual(
			foundDoc,
			['1-1', '1-2', '1-3'].map((s) => ({ test: s })),
			'found doc right 1-3',
		);
		const appInfo: AppInfosEntity = await t.context.db.collection('_appInfos').findOne({});
		t.is(appInfo.result.isSuccessful, true, 'Migration succeeded');
		t.is(appInfo.version, '1.1.1', 'App version in db is updated');
		t.is(appInfo.previousVersion, '0.0.0', 'Unknown version is set to 0.0.0');
		t.is(appInfo.result.scripts.length, 3, '3 scripts executed');
		t.is(
			appInfo.result.scripts[0].id,
			'1.0.0_migration-1-1',
			'script executed is the one expected',
		);
		t.is(appInfo.result.scripts[0].status, ScriptStatus.OK, 'script status is OK');

		const mongodbPatchApplier2 = new N9MongodbMigration({
			migrationScriptsFolderPath: join(__dirname, './fixtures/many-migrations'),
			mongodbURI: t.context.mongodbURI,
			forcedToAppVersion: '2.1.0',
		});
		await mongodbPatchApplier2.apply();
		const foundDocs2: { test: string }[] = await (
			await t.context.db.collection('test').find(
				{},
				{
					projection: {
						_id: 0,
					},
					sort: {
						test: 1,
					},
				},
			)
		).toArray();
		t.deepEqual(
			foundDocs2,
			['2-1', '2-2'].map((s) => ({ test: s })),
			'found doc right 2-1',
		);

		let appInfos: AppInfosEntity[] = await (
			await t.context.db.collection('_appInfos').find({}, { sort: { _id: 1 } })
		).toArray();
		const appInfo2 = appInfos[appInfos.length - 1];
		t.is(appInfo2.result.isSuccessful, true, 'Migration succeeded');
		t.is(appInfo2.version, '2.1.0', 'App version in db is updated');
		t.is(appInfo2.previousVersion, '1.1.1', 'Unknown version is set to 0.0.0');
		t.is(appInfo2.result.scripts.length, 2, '2 scripts executed');
		t.is(
			appInfo2.result.scripts[0].id,
			'1.2.0_miragration-2-1',
			'script (1.2.0_miragration-2-1) executed is the one expected',
		);
		t.is(
			appInfo2.result.scripts[0].status,
			ScriptStatus.OK,
			'script (1.2.0_miragration-2-1) status is OK',
		);
		t.is(
			appInfo2.result.scripts[1].id,
			'2.0.1_miragration-2-2',
			'script executed is the one expected : 2.0.1_miragration-2-2',
		);
		t.is(
			appInfo2.result.scripts[1].status,
			ScriptStatus.OK,
			'script (2.0.1_miragration-2-2) status is OK',
		);

		const mongodbPatchApplier3 = new N9MongodbMigration({
			migrationScriptsFolderPath: join(__dirname, './fixtures/many-migrations'),
			mongodbURI: t.context.mongodbURI,
			forcedToAppVersion: '3.0.0',
		});
		await mongodbPatchApplier3.apply();
		appInfos = await (
			await t.context.db.collection('_appInfos').find({}, { sort: { _id: 1 } })
		).toArray();
		const appInfo3 = appInfos[appInfos.length - 1];
		t.is(appInfo3.result.isSuccessful, true, 'Migration succeeded');
		t.is(appInfo3.version, '3.0.0', 'App version in db is updated');
		t.is(appInfo3.previousVersion, '2.1.0', 'Unknown version is set to 0.0.0');
		t.is(appInfo3.result.scripts.length, 0, '0 script executed');
	},
);
