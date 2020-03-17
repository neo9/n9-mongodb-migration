import { MongoUtils } from '@neo9/n9-mongo-client';
import { default as ava, ExecutionContext } from 'ava';
import * as mongodb from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

export interface TestContext {
	db: mongodb.Db;
	mongodbURI: string;
}

export function init(): void {
	let mongoMemoryServer: MongoMemoryServer;

	ava.beforeEach(async (t: ExecutionContext<TestContext>) => {
		mongoMemoryServer = new MongoMemoryServer();
		const uri = await mongoMemoryServer.getConnectionString();
		const db = await MongoUtils.connect(uri);
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
