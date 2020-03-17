import { N9Log } from '@neo9/n9-node-log';
import { Db } from 'mongodb';

export enum ScriptStatus {
	OK = 'ok',
	KO = 'ko',
	PENDING = 'pending',
}

export enum RollbackStatus {
	OK = 'ok',
	KO = 'ko',
}

export interface MigrationResultScript {
	id: string;
	status: ScriptStatus;
	rollbackStatus?: RollbackStatus;
}

export interface MigrationResult {
	isSuccessful: boolean;
	scripts: MigrationResultScript[];
}
