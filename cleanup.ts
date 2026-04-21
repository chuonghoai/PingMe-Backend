import * as mysql from 'mysql2/promise';

async function run() {
  try {
    const con = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Nampro1595@',
      database: 'demo_gogo'
    });
    console.log('Connected to DB');
    await con.execute("DELETE FROM ping_coin_transactions WHERE type='DAILY_REWARD'");
    console.log('Deleted ping_coin_transactions rows');
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
