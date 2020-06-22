import { MongoUtils } from '@neo9/n9-mongo-client';
import { N9Log } from '@neo9/n9-node-log';
import { N9Error } from '@neo9/n9-node-utils';
import * as appRootDir from 'app-root-dir';
import * as FsExtra from 'fs-extra';
import { MongoClientOptions } from 'mongodb';
import * as path from 'path';
import { AppInfosRepository } from './app-infos.repository';
import { Migrator } from './migrator';

interface N9MongodbMigrationOptions {
	migrationScriptsFolderPath: string;
	logger?: N9Log;
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

	constructor(options: N9MongodbMigrationOptions) {
		if (!options.migrationScriptsFolderPath) {
			throw new N9Error('missing-migration-script-folder-path', 400);
		}
		this.scriptsFolderBasePath = path.normalize(options.migrationScriptsFolderPath);
		this.appInfos = this.getToAppInfo(options.appRootDirPath ?? appRootDir.get());

		this.logger =
			options.logger ??
			global.log ??
			new N9Log(this.appInfos.name, {
				formatJSON:
					process.env.NODE_ENV === 'development' ? /* istanbul ignore next */ false : undefined,
			});
		this.logger = this.logger.module('n9-mongodb-migration');
		// istanbul ignore next
		if (!global.log) {
			global.log = this.logger;
		}

		this.mongodb = {
			uri: options.mongodbURI ?? process.env.MONGODB_URI,
			options: options.mongodbOptions,
		};
		if (!this.mongodb.uri) {
			throw new N9Error('missing-mongodb-uri', 400);
		}

		this.lockTimeout = options.lockTimeoutMs ?? 10 * 60 * 1000; // 10 min

		if (options.forcedToAppVersion?.match('[0-9]+.[0-9]+.[0-9]+.*')) {
			this.forcedToAppVersion = options.forcedToAppVersion;
		}
	}

	public async apply(): Promise<void> {
		const db = await MongoUtils.connect(this.mongodb.uri, this.mongodb.options);

		const appInfosRepository = new AppInfosRepository();
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
		} else {
			this.logger.warn(`Migration result (${durationMs} ms) : ${JSON.stringify(result)}`);
			throw new N9Error('migration-failed', 500, { result });
		}
	}

	private getToAppInfo(appRootDirPath: string): { version: string; name: string } {
		const packageJsonPath = path.join(appRootDirPath, 'package.json');

		if (!FsExtra.pathExistsSync(packageJsonPath)) {
			throw new N9Error('package-json-not-found', 404, { packageJsonPath });
		}

		const file = FsExtra.readJSONSync(packageJsonPath);
		return {
			version: file.version,
			name: file.name,
		};
	}
}
