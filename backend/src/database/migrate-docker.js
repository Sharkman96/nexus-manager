const Database = require('./db');

class DockerMigration {
  constructor() {
    this.db = new Database();
  }

  async init() {
    try {
      console.log('🔧 Running Docker migration...');
      
      await this.db.connect();
      
      // Проверяем существование новых полей
      const tableInfo = await this.db.all("PRAGMA table_info(nodes)");
      const existingColumns = tableInfo.map(col => col.name);
      
      const migrations = [
        {
          name: 'Add node_type column',
          check: () => !existingColumns.includes('node_type'),
          sql: 'ALTER TABLE nodes ADD COLUMN node_type TEXT DEFAULT "cli"'
        },
        {
          name: 'Add container_name column',
          check: () => !existingColumns.includes('container_name'),
          sql: 'ALTER TABLE nodes ADD COLUMN container_name TEXT'
        },
        {
          name: 'Add container_id column',
          check: () => !existingColumns.includes('container_id'),
          sql: 'ALTER TABLE nodes ADD COLUMN container_id TEXT'
        }
      ];

      for (const migration of migrations) {
        if (migration.check()) {
          console.log(`📦 Running migration: ${migration.name}`);
          await this.db.run(migration.sql);
          console.log(`✅ Migration completed: ${migration.name}`);
        } else {
          console.log(`⏭️  Migration skipped: ${migration.name} (already exists)`);
        }
      }

      // Обновляем существующие записи
      await this.updateExistingRecords();
      
      console.log('✅ Docker migration completed successfully');
      
    } catch (error) {
      console.error('❌ Docker migration failed:', error);
      throw error;
    }
  }

  async updateExistingRecords() {
    try {
      console.log('🔄 Updating existing records...');
      
      // Обновляем существующие ноды, устанавливая node_type = 'cli'
      const result = await this.db.run(
        'UPDATE nodes SET node_type = "cli" WHERE node_type IS NULL'
      );
      
      if (result.changes > 0) {
        console.log(`✅ Updated ${result.changes} existing nodes to CLI type`);
      }
      
    } catch (error) {
      console.error('❌ Error updating existing records:', error);
      throw error;
    }
  }

  async cleanup() {
    if (this.db) {
      await this.db.close();
    }
  }
}

// Запуск миграции если файл запущен напрямую
if (require.main === module) {
  const migration = new DockerMigration();
  migration.init()
    .then(() => {
      console.log('🎉 Docker migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Docker migration failed:', error);
      process.exit(1);
    })
    .finally(() => {
      migration.cleanup();
    });
}

module.exports = DockerMigration; 