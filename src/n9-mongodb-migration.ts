import * as fs from 'node:fs';
import * as path from 'node:path';

import { MongoUtils } from '@neo9/n9-mongodb-client';
import { N9Log } from '@neo9/n9-node-log';
import { N9Error } from '@neo9/n9-node-utils';
import * as appRootDir from 'app-root-dir';
import type { MongoClientOptions } from 'mongodb';

import { AppInfosRepository } from './app-infos.repository';
import { Migrator } from './migrator';

interface N9MongodbMigrationSettings {
	migrationScriptsFolderPath: string;
	logger: N9Log;
	mongodbURI?: string;
	mongodbOptions?: MongoClientOptions;
	appRootDirPath?: string;
	forcedToAppVersion?: string;
	lockTimeoutMs?: number;
}

export class N9MongodbMigration {
	private readonly scriptsFolderBasePath: string;
	private readonly logger: N9Log;
	private readonly mongodb: { options: MongoClientOptions; uri: string };
	private readonly forcedToAppVersion: string;
	private readonly lockTimeout: number;
	private readonly appInfos: { version: string; name: string };

	constructor(settings: N9MongodbMigrationSettings) {
		if (!settings.migrationScriptsFolderPath) {
			throw new N9Error('missing-migration-script-folder-path', 400);
		}
		this.scriptsFolderBasePath = path.normalize(settings.migrationScriptsFolderPath);
		this.appInfos = this.getToAppInfo(settings.appRootDirPath ?? appRootDir.get());

		this.logger = settings.logger.module('n9-mongodb-migration');

		this.mongodb = {
			uri: settings.mongodbURI ?? process.env.MONGODB_URI,
			options: settings.mongodbOptions,
		};
		if (!this.mongodb.uri) {
			throw new N9Error('missing-mongodb-uri', 400);
		}

		this.lockTimeout = settings.lockTimeoutMs ?? 10 * 60 * 1000; // 10 min

		if (settings.forcedToAppVersion?.match('[0-9]+.[0-9]+.[0-9]+.*')) {
			this.forcedToAppVersion = settings.forcedToAppVersion;
		}
	}

	public async apply(): Promise<void> {
		const { db, mongodbClient } = await MongoUtils.CONNECT(this.mongodb.uri, {
			logger: this.logger,
			nativeDriverOptions: this.mongodb.options,
		});

		const appInfosRepository = new AppInfosRepository(db, this.logger);
		const currentAppVersion = await appInfosRepository.getCurrentDbVersion();

		const toVersion = this.forcedToAppVersion ?? this.appInfos.version;
		this.logger.info(
			`Migrate ${this.appInfos.name} from version ${currentAppVersion} to version ${toVersion}`,
		);
		const migrator = new Migrator(db, this.logger, this.lockTimeout);
		const startDate = Date.now();
		const result = await migrator.migrate(currentAppVersion, toVersion, this.scriptsFolderBasePath);

		const durationMs = Date.now() - startDate;
		await appInfosRepository.saveResult(
			this.appInfos.name,
			currentAppVersion,
			toVersion,
			result,
			durationMs,
		);

		if (result.isSuccessful) {
			this.logger.info(`Migration OK in ${durationMs / 1000} s !! Saving infos.`);
			await MongoUtils.DISCONNECT(mongodbClient, this.logger);
		} else {
			this.logger.warn(`Migration result (${durationMs} ms) : ${JSON.stringify(result)}`);
			throw new N9Error('migration-failed', 500, { result });
		}
	}

	private getToAppInfo(appRootDirPath: string): { version: string; name: string } {
		const packageJsonPath = path.join(appRootDirPath, 'package.json');

		if (!fs.existsSync(packageJsonPath)) {
			throw new N9Error('package-json-not-found', 404, { packageJsonPath });
		}

		const file = JSON.parse(fs.readFileSync(packageJsonPath).toString());
		return {
			version: file.version,
			name: file.name,
		};
	}
}
