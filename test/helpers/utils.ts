import { MongoUtils } from '@neo9/n9-mongodb-client';
import { N9Log } from '@neo9/n9-node-log';
import ava, { ExecutionContext } from 'ava';
import type { Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

export interface TestContext {
	db: Db;
	mongodbURI: string;
}

export function init(cleanLogger: boolean = false): void {
	let mongoMemoryServer: MongoMemoryServer;

	ava.beforeEach(async (t: ExecutionContext<TestContext>) => {
		mongoMemoryServer = await MongoMemoryServer.create({
			binary: {
				version: '6.0.9',
			},
		});
		const uri = mongoMemoryServer.getUri();
		global.log = new N9Log('tests');
		const db = await MongoUtils.connect(uri);
		if (cleanLogger) delete global.log;
		t.context = {
			db,
			mongodbURI: uri,
		};
	});

	ava.afterEach(async () => {
		global.log.info(`DROP DB after tests OK`);
		await global.db.dropDatabase();
		await MongoUtils.disconnect();
		await mongoMemoryServer.stop();
	});
}
