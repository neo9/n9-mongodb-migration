import { N9Error } from '@neo9/n9-node-utils';

async function up(db, log) {
	new N9Error('can-t-use -external-libs');
}

async function down(db, log) {}

module.exports = { up, down };
