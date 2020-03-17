import { N9Log } from '@neo9/n9-node-log';
import ava, { ExecutionContext } from 'ava';

import { N9Error } from '@neo9/n9-node-utils';
import { join } from 'path';
import { MongodbPatchApplier } from '../src';
import { AppInfosEntity } from '../src/models/app-infos-entity.models';
import { RollbackStatus, ScriptStatus } from '../src/models/migration-result.models';
import { init, TestContext } from './helpers/utils';

global.log = new N9Log('tests').module('issues');

init();

ava(
	'Apply migration from 0.0.0 to V2.0.0 with error in up',
	async (t: ExecutionContext<TestContext>) => {
		const mongodbPatchApplier = new MongodbPatchApplier({
			migrationScriptsFolderPath: join(__dirname, './fixtures/with-rollback/ok'),
			mongodbURI: t.context.mongodbURI,
			forcedToAppVersion: '1.0.0',
		});

		await t.throwsAsync(async () => await mongodbPatchApplier.apply(), {
			message: 'migration-failed',
			instanceOf: N9Error,
		});
		const foundInitialDoc: { test: boolean } = await t.context.db
			.collection('test-rollback')
			.findOne(
				{},
				{
					projection: {
						_id: 0,
					},
				},
			);
		t.deepEqual(foundInitialDoc, { test: true }, 'found initial doc right');
		const appInfos: AppInfosEntity = await t.context.db.collection('_appInfos').findOne({});
		t.is(appInfos.result.isSuccessful, false, 'Migration failed');
		t.is(
			appInfos.version,
			'1.0.0',
			'App version in db is updated, but ignored due to isSuccessFul === false',
		);
		t.is(appInfos.previousVersion, '0.0.0', 'Unknown version is set to 0.0.0');
		t.is(appInfos.result.scripts.length, 1, '1 script executed');
		t.is(appInfos.result.scripts[0].id, '1.0.0_rollback-ok', 'script executed is the one expected');
		t.is(appInfos.result.scripts[0].status, ScriptStatus.KO, 'script status is KO');
		t.is(
			appInfos.result.scripts[0].rollbackStatus,
			RollbackStatus.OK,
			'script rollback status is OK',
		);
	},
);

ava(
	'Apply migration from 0.0.0 to V2.0.0 with errors in up and down',
	async (t: ExecutionContext<TestContext>) => {
		const mongodbPatchApplier = new MongodbPatchApplier({
			migrationScriptsFolderPath: join(__dirname, './fixtures/with-rollback/ko'),
			mongodbURI: t.context.mongodbURI,
			forcedToAppVersion: '2.0.0',
		});

		await t.throwsAsync(async () => await mongodbPatchApplier.apply());
		const notFoundInitialDoc: { test: boolean } = await t.context.db
			.collection('test-rollback')
			.findOne({});
		t.falsy(
			notFoundInitialDoc,
			'doc created by upgrade to V 2.0.0 not found due to 1.0.0 upgrade failed',
		);
		const appInfos: AppInfosEntity = await t.context.db.collection('_appInfos').findOne({});
		t.is(appInfos.result.isSuccessful, false, 'Migration failed');
		t.is(
			appInfos.version,
			'2.0.0',
			'App version in db is updated, but ignored due to isSuccessFul === false',
		);
		t.is(appInfos.previousVersion, '0.0.0', 'Unknown version is set to 0.0.0');
		t.is(appInfos.result.scripts.length, 2, '1 script executed');
		t.is(appInfos.result.scripts[0].id, '1.0.0_rollback-ko', 'script executed is the one expected');
		t.is(appInfos.result.scripts[0].status, ScriptStatus.KO, 'script status is KO');
		t.is(
			appInfos.result.scripts[0].rollbackStatus,
			RollbackStatus.KO,
			'script rollback status is KO',
		);
		t.is(
			appInfos.result.scripts[1].id,
			'2.0.0_never-run-blocked-by-previous-one',
			'script executed is the one expected',
		);
		t.is(appInfos.result.scripts[1].status, ScriptStatus.PENDING, 'script status is KO');
	},
);
