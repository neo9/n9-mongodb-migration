import { N9MongoLock } from '@neo9/n9-mongo-client';
import { N9Log } from '@neo9/n9-node-log';
import { N9Error } from '@neo9/n9-node-utils';
import * as FsExtra from 'fs-extra';
import { Db } from 'mongodb';
import * as Path from 'path';
import * as Semver from 'semver';
import { MigrationDefinition } from './models/migration-definition.models';
import {
	MigrationResult,
	MigrationResultScript,
	RollbackStatus,
	ScriptStatus,
} from './models/migration-result.models';

export class Migrator {
	private mongoLock: N9MongoLock;
	constructor(private readonly db: Db, private readonly logger: N9Log, lockTimeout: number) {
		this.mongoLock = new N9MongoLock('_migrationLocks', 'execute-lock', {
			timeout: lockTimeout,
		});
	}

	public async migrate(
		fromVersion: string,
		toVersion: string,
		scriptsPath: string,
	): Promise<MigrationResult> {
		await this.mongoLock.ensureIndexes();
		const lock = await this.mongoLock.acquire();
		if (!lock) {
			throw new N9Error('lock-unavailable-to-migrate', 409);
		}
		this.logger.info(`Got the lock to run migration`);
		try {
			const scriptsAvailable = await FsExtra.readdir(scriptsPath);

			const scriptsToExecute = scriptsAvailable.filter((scriptName) => {
				if (!scriptName.endsWith('.js')) {
					this.logger.warn(`File ${scriptName} ignored because it's not JS`);
					return false;
				}

				const v = scriptName.substr(0, scriptName.indexOf('_'));

				// fromVersion < script version <= toVersion
				const toFilter = Semver.gt(v, fromVersion) && Semver.lte(v, toVersion);
				return toFilter;
			});

			if (scriptsToExecute.length === 0) {
				this.logger.warn('No script to execute.');
				this.logger.info(`Scripts available : ${scriptsAvailable.join(' | ')}`);
			} else {
				this.logger.info(`Start executing scripts : ${scriptsToExecute.join(' | ')}`);
			}

			const result: MigrationResult = {
				isSuccessful: true,
				scripts: [],
			};
			const scriptsToRun: MigrationDefinition[] = [];
			for (const scriptName of scriptsToExecute) {
				const scriptFullPath = Path.join(scriptsPath, scriptName);
				try {
					const migrationDef: MigrationDefinition = require(scriptFullPath);
					migrationDef.id = Path.parse(scriptName).name;
					await scriptsToRun.push(migrationDef);
				} catch (error) {
					this.logger.error(`Error while loading file ${scriptFullPath}`, { error });
					this.logger.info(`No script executed.`);
					throw error;
				}
			}

			result.scripts.push(
				...scriptsToRun.map(
					(s): MigrationResultScript => ({
						id: s.id,
						status: ScriptStatus.PENDING,
					}),
				),
			);

			const scriptsToRollback: MigrationDefinition[] = [];
			for (const scriptToRun of scriptsToRun) {
				const executingScriptResult = result.scripts.find((s) => s.id === scriptToRun.id);
				try {
					this.logger.info(`Run up on script ${scriptToRun.id}`);
					await scriptToRun.up(this.db, this.logger.module(scriptToRun.id));
					executingScriptResult.status = ScriptStatus.OK;
				} catch (e) {
					this.logger.error(`Error ${e.message} while running script ${scriptToRun.id}`, { e });
					executingScriptResult.status = ScriptStatus.KO;
					result.isSuccessful = false;
					break;
				} finally {
					// even on success we need to rollback the script
					scriptsToRollback.push(scriptToRun);
				}
			}

			if (!result.isSuccessful && scriptsToRollback.length > 0) {
				this.logger.warn(`Rolling back scripts ${scriptsToRollback.map((s) => s.id).join(', ')}`);
				// rollback from the end
				scriptsToRollback.reverse();
				for (const scriptToRollback of scriptsToRollback) {
					const executingScriptResult = result.scripts.find((s) => s.id === scriptToRollback.id);
					try {
						this.logger.warn(`Run down on script ${scriptToRollback.id}`);
						await scriptToRollback.down(this.db, this.logger.module(scriptToRollback.id));
						executingScriptResult.rollbackStatus = RollbackStatus.OK;
					} catch (e) {
						this.logger.error(`Error while running script ${scriptToRollback.id}`);
						executingScriptResult.rollbackStatus = RollbackStatus.KO;
						break;
					}
				}
			}

			return result;
		} catch (e) {
			throw e;
		} finally {
			await this.mongoLock.release(lock);
		}
	}
}
