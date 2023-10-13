import { N9MongoDBClient } from '@neo9/n9-mongodb-client';
import { Db } from '@neo9/n9-mongodb-client/mongodb';
import { N9Log } from '@neo9/n9-node-log';

import { AppInfosEntity } from './models/app-infos-entity.models';
import { MigrationResult } from './models/migration-result.models';

export class AppInfosRepository {
	private readonly mongoClient: N9MongoDBClient<AppInfosEntity, AppInfosEntity>;

	constructor(db: Db, logger: N9Log) {
		this.mongoClient = new N9MongoDBClient<AppInfosEntity, AppInfosEntity>(
			'_appInfos',
			AppInfosEntity,
			AppInfosEntity,
			{
				db,
				logger,
			},
		);
	}

	public async getCurrentDbVersion(): Promise<string> {
		const appInfos = await this.mongoClient
			// eslint-disable-next-line @typescript-eslint/naming-convention
			.find({ 'result.isSuccessful': true }, 0, 1, { _id: -1 })
			.toArray();
		if (!appInfos.length) {
			return '0.0.0';
		}
		return appInfos[0].version;
	}

	public async saveResult(
		name: string,
		fromVersion: string,
		toVersion: string,
		result: MigrationResult,
		durationMs: number,
	): Promise<void> {
		await this.mongoClient.insertOne(
			{
				name,
				result,
				previousVersion: fromVersion,
				version: toVersion,
				runDate: new Date(),
				runDurationMs: durationMs,
			},
			'N9-MONGODB-MIGRATION',
		);
	}
}
