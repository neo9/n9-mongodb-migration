async function up(db, log) {
	log.info(`Start migration script of 2s`);
	await new Promise((resolve) => setTimeout(resolve, 2000));
	log.info(`End migration script of 2s`);
}

async function down(db, log) {}

module.exports = { up, down };
