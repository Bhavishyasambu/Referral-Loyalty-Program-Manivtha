const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'travel_loyalty.db');
const dumpPath = path.join(__dirname, 'database_content.json');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
});

db.serialize(() => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
    if (err) {
      console.error(err);
      return;
    }
    
    let dbData = {};
    let pending = tables.length;
    
    tables.forEach(table => {
      db.all(`SELECT * FROM ${table.name}`, [], (err, rows) => {
        if (!err) {
          dbData[table.name] = rows;
        }
        pending--;
        if (pending === 0) {
          fs.writeFileSync(dumpPath, JSON.stringify(dbData, null, 2));
          console.log(`\n✅ Database successfully dumped to: ${dumpPath}\n`);
          console.log(`You can now open 'database_content.json' in VS Code to see all the data clearly!`);
        }
      });
    });
  });
});
