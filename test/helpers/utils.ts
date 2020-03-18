import { MongoUtils } from '@neo9/n9-mongo-client';
import { N9Log } from '@neo9/n9-node-log';
import { default as ava, ExecutionContext } from 'ava';
import * as mongodb from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

export interface TestContext {
	db: mongodb.Db;
	mongodbURI: string;
}

export function init(cleanLogger: boolean = false): void {
	let mongoMemoryServer: MongoMemoryServer;

	ava.beforeEach(async (t: ExecutionContext<TestContext>) => {
		mongoMemoryServer = new MongoMemoryServer();
		const uri = await mongoMemoryServer.getConnectionString();
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
		await (global.db as mongodb.Db).dropDatabase();
		await MongoUtils.disconnect();
		await mongoMemoryServer.stop();
	});
}
