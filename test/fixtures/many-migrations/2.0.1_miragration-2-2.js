async function up(db, log) {
	await db.collection('test').insertOne({
		test: '2-2',
	});
}

async function down(db, log) {}

module.exports = { up, down };
