const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'travel_loyalty.db');
const db = new sqlite3.Database(dbPath);

db.all("SELECT * FROM campaigns WHERE (is_active = 1 OR is_active = TRUE)", [], (err, rows) => {
  if (err) {
    console.error("SQLITE ERROR:", err);
  } else {
    console.log("SUCCESS:", rows.length);
  }
});
