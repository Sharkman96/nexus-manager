const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const config = require('../../config');

class DatabaseMigration {
  constructor() {
    this.dbPath = config.dbPath;
    this.schemaPath = path.join(__dirname, '../../../database/schema.sql');
  }

  async init() {
    try {
      // Создаем папку для базы данных если её нет
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Создаем лог папку
      const logDir = path.dirname(config.logging.file);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const db = new sqlite3.Database(this.dbPath);
      
      // Читаем SQL схему
      const schema = fs.readFileSync(this.schemaPath, 'utf8');
      
      // Выполняем миграцию
      await this.executeMigration(db, schema);
      
      console.log('✅ Database migration completed successfully');
      console.log(`📁 Database location: ${this.dbPath}`);
      
      db.close();
      
    } catch (error) {
      console.error('❌ Database migration failed:', error);
      process.exit(1);
    }
  }

  executeMigration(db, schema) {
    return new Promise((resolve, reject) => {
      db.exec(schema, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async reset() {
    try {
      if (fs.existsSync(this.dbPath)) {
        fs.unlinkSync(this.dbPath);
        console.log('🗑️  Database reset completed');
      }
      await this.init();
    } catch (error) {
      console.error('❌ Database reset failed:', error);
      process.exit(1);
    }
  }
}

// Если запускается напрямую
if (require.main === module) {
  const migration = new DatabaseMigration();
  
  const command = process.argv[2];
  
  if (command === 'reset') {
    migration.reset();
  } else {
    migration.init();
  }
}

module.exports = DatabaseMigration; 