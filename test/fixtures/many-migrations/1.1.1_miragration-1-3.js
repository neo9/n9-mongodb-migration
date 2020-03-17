async function up(db, log) {
	await db.collection('test').insertOne({
		test: '1-3',
	});
}

async function down(db, log) {}

module.exports = { up, down };
