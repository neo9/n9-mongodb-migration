async function up(db, log) {
	await db.collection('test-rollback').insertOne({
		test: true,
	});
}

async function down(db, log) {
	await db.collection('test-rollback').insertOne({
		test: true,
	});
}

module.exports = { up, down };
