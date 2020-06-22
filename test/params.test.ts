import { N9Log } from '@neo9/n9-node-log';
import ava, { Assertions, ExecutionContext } from 'ava';

import { join } from 'path';
import { N9MongodbMigration } from '../src';
import { init, TestContext } from './helpers/utils';

init(true);

ava('Missing params', async (t: ExecutionContext<TestContext>) => {
	t.throws(
		() => new N9MongodbMigration({} as any),
		{ message: 'missing-migration-script-folder-path' },
		'missing-migration-script-folder-path',
	);

	t.throws(
		() => new N9MongodbMigration({ migrationScriptsFolderPath: 'test' }),
		{ message: 'missing-mongodb-uri' },
		'missing-mongodb-uri',
	);

	t.throws(
		() =>
			new N9MongodbMigration({
				migrationScriptsFolderPath: join(__dirname, './fixtures/from-empty-db'),
				mongodbURI: t.context.mongodbURI,
				appRootDirPath: join(__dirname, './fixtures/wrong-folder'),
			}),
		{ message: 'package-json-not-found' },
		'package-json-not-found',
	);

	const m = new N9MongodbMigration({
		migrationScriptsFolderPath: join(__dirname, './fixtures/from-empty-db'),
		mongodbURI: t.context.mongodbURI,
		appRootDirPath: join(__dirname, './fixtures/from-empty-db'),
	});

	await t.notThrowsAsync(async () => await m.apply());
});
