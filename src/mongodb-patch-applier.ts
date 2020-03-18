import { MongoUtils } from '@neo9/n9-mongo-client';
import { N9Log } from '@neo9/n9-node-log';
import { N9Error } from '@neo9/n9-node-utils';
import * as appRootDir from 'app-root-dir';
import * as FsExtra from 'fs-extra';
import { MongoClientOptions } from 'mongodb';
import * as path from 'path';
import { AppInfosRepository } from './app-infos.repository';
import { Migrator } from './migrator';

interface MongodbPatchApplierOptions {
	migrationScriptsFolderPath: string;
	logger?: N9Log;
	mongodbURI?: string;
	mongodbOptions?: MongoClientOptions;
	appRootDirPath?: string;
	forcedToAppVersion?: string;
}

export class MongodbPatchApplier {
	private readonly scriptsFolderBasePath: string;
	private readonly logger: N9Log;
	private readonly mongodb: { options: MongoClientOptions; uri: string };
	private readonly appRootDirPath: string;
	private readonly forcedToAppVersion: string;

	constructor(options: MongodbPatchApplierOptions) {
		if (!options.migrationScriptsFolderPath) {
			throw new N9Error('missing-migration-script-folder-path', 400);
		}
		this.scriptsFolderBasePath = path.normalize(options.migrationScriptsFolderPath);

		this.logger = options.logger
			? options.logger.module('mongodb-patch-applier')
			: new N9Log('mongodb-patch-applier', {
					formatJSON: process.env.NODE_ENV === 'development' ? false : undefined,
			  });
		this.mongodb = {
			uri: options.mongodbURI ?? process.env.MONGODB_URI,
			options: options.mongodbOptions,
		};
		if (!this.mongodb.uri) {
			throw new N9Error('missing-mongodb-uri', 400);
		}
		this.appRootDirPath = options.appRootDirPath ?? appRootDir.get();

		if (options.forcedToAppVersion?.match('[0-9]+.[0-9]+.[0-9]+.*')) {
			this.forcedToAppVersion = options.forcedToAppVersion;
		}
	}

	public async apply(): Promise<void> {
		const db = await MongoUtils.connect(this.mongodb.uri, this.mongodb.options);

		const appInfosRepository = new AppInfosRepository();
		const currentAppVersion = await appInfosRepository.getCurrentDbVersion();

		const toAppInfos = await this.getToAppInfo(this.appRootDirPath);
		const toVersion = this.forcedToAppVersion ?? toAppInfos.version;
		this.logger.info(
			`Migrate ${toAppInfos.name} from version ${currentAppVersion} to version ${toVersion}`,
		);
		const migrator = new Migrator(db, this.logger, appInfosRepository);
		const startDate = Date.now();
		const result = await migrator.migrate(currentAppVersion, toVersion, this.scriptsFolderBasePath);

		const durationMs = Date.now() - startDate;
		await appInfosRepository.saveResult(
			toAppInfos.name,
			currentAppVersion,
			toVersion,
			result,
			durationMs,
		);

		if (result.isSuccessful) {
			this.logger.info(`Migration OK in ${durationMs / 1000} s !! Saving infos.`);
		} else {
			this.logger.warn(`Migration result (${durationMs} ms) : ${JSON.stringify(result)}`);
			throw new N9Error('migration-failed', 500, { result });
		}
	}

	private async getToAppInfo(appRootDirPath: string): Promise<{ version: string; name: string }> {
		const packageJsonPath = path.join(appRootDirPath, 'package.json');

		if (!(await FsExtra.pathExists(packageJsonPath))) {
			throw new N9Error('package-json-not-found', 404, { packageJsonPath });
		}

		const file = await FsExtra.readJSON(packageJsonPath);
		return {
			version: file.version,
			name: file.name,
		};
	}
}
