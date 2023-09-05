import { BaseMongoObject } from '@neo9/n9-mongo-client';

import { MigrationResult } from './migration-result.models';

export class AppInfosEntity extends BaseMongoObject {
	public name: string;
	public previousVersion: string;
	public version: string;
	public runDate: Date;
	public runDurationMs: number;
	public result: MigrationResult;
}
