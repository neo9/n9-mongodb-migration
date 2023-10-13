import { MongoUtils } from '@neo9/n9-mongodb-client';
import { MongoClient } from '@neo9/n9-mongodb-client/mongodb';
import { N9Log } from '@neo9/n9-node-log';
import ava, { ExecutionContext } from 'ava';
import type { Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

export interface TestContext {
	db: Db;
	mongodbClient: MongoClient;
	logger: N9Log;
	mongodbURI: string;
}

export function init(name: string): void {
	let mongoMemoryServer: MongoMemoryServer;

	ava.beforeEach(async (t: ExecutionContext<TestContext>) => {
		const logger = new N9Log('tests', { formatJSON: false }).module(name);

		mongoMemoryServer = await MongoMemoryServer.create({
			binary: {
				version: '6.0.9',
			},
		});
		const uri = mongoMemoryServer.getUri();
		const { db, mongodbClient } = await MongoUtils.CONNECT(uri, { logger });
		t.context = {
			logger,
			db,
			mongodbClient,
			mongodbURI: uri,
		};
	});

	ava.afterEach(async (t: ExecutionContext<TestContext>) => {
		t.context.logger.info(`DROP DB after tests OK`);
		await MongoUtils.DISCONNECT(t.context.mongodbClient, t.context.logger);
		await mongoMemoryServer.stop();
	});
}
