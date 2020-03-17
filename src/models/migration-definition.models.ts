import { N9Log } from '@neo9/n9-node-log';
import { Db } from 'mongodb';

export interface MigrationDefinition {
	id: string;
	up: (db?: Db, log?: N9Log) => Promise<void>;
	down: (db?: Db, log?: N9Log, brands?: string[]) => Promise<void>;
}
