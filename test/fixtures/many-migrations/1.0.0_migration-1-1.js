async function up(db, log) {
	await db.collection('test').insertOne({
		test: '1-1',
	});
}

async function down(db, log) {}

module.exports = { up, down };
