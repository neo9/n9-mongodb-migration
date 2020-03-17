import { MongoClient } from '@neo9/n9-mongo-client';
import { AppInfosEntity } from './models/app-infos-entity.models';
import { MigrationResult } from './models/migration-result.models';

export class AppInfosRepository {
	private readonly mongoClient: MongoClient<AppInfosEntity, AppInfosEntity>;

	constructor() {
		this.mongoClient = new MongoClient<AppInfosEntity, AppInfosEntity>(
			'_appInfos',
			AppInfosEntity,
			AppInfosEntity,
		);
	}

	public async getCurrentDbVersion(): Promise<string> {
		const appInfos = await (
			await this.mongoClient.find({ 'result.isSuccessful': true }, 0, 1, { _id: -1 })
		).toArray();
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
			'MONGODB-PATCH-APPLIER',
		);
	}
}
