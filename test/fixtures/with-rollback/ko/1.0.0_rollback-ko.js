async function up(db, log) {
	throw new Error('failing-up-function');
}

async function down(db, log) {
	throw new Error('failing-down-function');
}

module.exports = { up, down };
