const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Создаём папку для базы данных если её нет
const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'sources.db');
const db = new Database(dbPath);

// Создаём таблицу источников
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'website',
      category TEXT,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      last_used TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Таблица для хранения контента из источников
  db.exec(`
    CREATE TABLE IF NOT EXISTS source_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL,
      title TEXT,
      content TEXT,
      url TEXT,
      fetched_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
    )
  `);

  // Таблица для тегов источников
  db.exec(`
    CREATE TABLE IF NOT EXISTS source_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL,
      tag TEXT NOT NULL,
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
    )
  `);

  // Таблица настроек агентов
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_key TEXT NOT NULL UNIQUE,
      custom_prompt TEXT DEFAULT '',
      clarifications TEXT DEFAULT '',
      goals TEXT DEFAULT '',
      constraints TEXT DEFAULT '',
      post_mode TEXT DEFAULT 'short',
      is_active INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Миграция для существующих БД: добавляем post_mode при обновлении.
  try {
    db.exec(`ALTER TABLE agent_settings ADD COLUMN post_mode TEXT DEFAULT 'short'`);
  } catch (e) {
    // Игнорируем ошибку "duplicate column name" на уже обновлённых БД.
  }

  // Таблица истории чата
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      agent_key TEXT,
      agent_json TEXT,
      routing_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Database initialized at:', dbPath);
}

// Настройки агентов
function getAllAgentSettings() {
  const rows = db.prepare('SELECT * FROM agent_settings ORDER BY agent_key ASC').all();
  return rows.map(row => ({
    ...row,
    is_active: row.is_active === 1
  }));
}

function getAgentSetting(agentKey) {
  const row = db.prepare('SELECT * FROM agent_settings WHERE agent_key = ?').get(agentKey);
  if (!row) return null;
  return {
    ...row,
    is_active: row.is_active === 1
  };
}

function upsertAgentSetting(agentKey, payload = {}) {
  const existing = getAgentSetting(agentKey);
  const merged = {
    custom_prompt: payload.custom_prompt ?? existing?.custom_prompt ?? '',
    clarifications: payload.clarifications ?? existing?.clarifications ?? '',
    goals: payload.goals ?? existing?.goals ?? '',
    constraints: payload.constraints ?? existing?.constraints ?? '',
    post_mode: payload.post_mode ?? existing?.post_mode ?? 'short',
    is_active: payload.is_active ?? existing?.is_active ?? true
  };

  if (existing) {
    const stmt = db.prepare(`
      UPDATE agent_settings
      SET custom_prompt = ?, clarifications = ?, goals = ?, constraints = ?, post_mode = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE agent_key = ?
    `);
    stmt.run(
      merged.custom_prompt,
      merged.clarifications,
      merged.goals,
      merged.constraints,
      merged.post_mode,
      merged.is_active ? 1 : 0,
      agentKey
    );
  } else {
    const stmt = db.prepare(`
      INSERT INTO agent_settings (agent_key, custom_prompt, clarifications, goals, constraints, post_mode, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      agentKey,
      merged.custom_prompt,
      merged.clarifications,
      merged.goals,
      merged.constraints,
      merged.post_mode,
      merged.is_active ? 1 : 0
    );
  }

  return getAgentSetting(agentKey);
}

// История чата
function addChatMessage(message) {
  const stmt = db.prepare(`
    INSERT INTO chat_history (role, content, agent_key, agent_json, routing_json, created_at)
    VALUES (?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
  `);

  const createdAt = message.created_at || message.createdAt || null;
  return stmt.run(
    message.role,
    message.content,
    message.agent_key || message.agent?.key || null,
    message.agent ? JSON.stringify(message.agent) : null,
    message.routing ? JSON.stringify(message.routing) : null,
    createdAt
  ).lastInsertRowid;
}

function getChatHistory(limit = 200) {
  const rows = db.prepare(`
    SELECT * FROM chat_history
    ORDER BY id DESC
    LIMIT ?
  `).all(limit);

  return rows.reverse().map(row => ({
    id: String(row.id),
    role: row.role,
    content: row.content,
    agent_key: row.agent_key,
    agent: row.agent_json ? JSON.parse(row.agent_json) : null,
    routing: row.routing_json ? JSON.parse(row.routing_json) : null,
    created_at: row.created_at
  }));
}

function clearChatHistory() {
  const result = db.prepare('DELETE FROM chat_history').run();
  return result.changes;
}

// Источники
function getAllSources() {
  return db.prepare('SELECT * FROM sources ORDER BY created_at DESC').all();
}

function getActiveSources() {
  return db.prepare('SELECT * FROM sources WHERE is_active = 1 ORDER BY name').all();
}

function getSourceById(id) {
  return db.prepare('SELECT * FROM sources WHERE id = ?').get(id);
}

function createSource(source) {
  const stmt = db.prepare(`
    INSERT INTO sources (name, url, type, category, description, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    source.name,
    source.url,
    source.type || 'website',
    source.category || '',
    source.description || '',
    source.is_active !== undefined ? (source.is_active ? 1 : 0) : 1
  );
  
  // Добавляем теги если есть
  if (source.tags && Array.isArray(source.tags)) {
    const tagStmt = db.prepare('INSERT INTO source_tags (source_id, tag) VALUES (?, ?)');
    const insertTags = db.transaction((tags) => {
      for (const tag of tags) {
        tagStmt.run(result.lastInsertRowid, tag);
      }
    });
    insertTags(source.tags);
  }
  
  return result.lastInsertRowid;
}

function updateSource(id, source) {
  const stmt = db.prepare(`
    UPDATE sources 
    SET name = ?, url = ?, type = ?, category = ?, description = ?, 
        is_active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  const result = stmt.run(
    source.name,
    source.url,
    source.type || 'website',
    source.category || '',
    source.description || '',
    source.is_active !== undefined ? (source.is_active ? 1 : 0) : 1,
    id
  );
  
  // Обновляем теги
  if (source.tags && Array.isArray(source.tags)) {
    db.prepare('DELETE FROM source_tags WHERE source_id = ?').run(id);
    const tagStmt = db.prepare('INSERT INTO source_tags (source_id, tag) VALUES (?, ?)');
    const insertTags = db.transaction((tags) => {
      for (const tag of tags) {
        tagStmt.run(id, tag);
      }
    });
    insertTags(source.tags);
  }
  
  return result.changes > 0;
}

function deleteSource(id) {
  const result = db.prepare('DELETE FROM sources WHERE id = ?').run(id);
  return result.changes > 0;
}

function toggleSourceActive(id) {
  const source = getSourceById(id);
  if (!source) return false;
  
  const newStatus = source.is_active ? 0 : 1;
  const result = db.prepare('UPDATE sources SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, id);
  return result.changes > 0;
}

function getSourceTags(sourceId) {
  return db.prepare('SELECT tag FROM source_tags WHERE source_id = ?').all(sourceId).map(r => r.tag);
}

function getSourcesWithTags() {
  const sources = getAllSources();
  return sources.map(source => ({
    ...source,
    tags: getSourceTags(source.id)
  }));
}

// Контент источников
function addSourceContent(sourceId, content) {
  const stmt = db.prepare(`
    INSERT INTO source_content (source_id, title, content, url)
    VALUES (?, ?, ?, ?)
  `);
  return stmt.run(sourceId, content.title || '', content.content || '', content.url || '').lastInsertRowid;
}

function getSourceContent(sourceId) {
  return db.prepare('SELECT * FROM source_content WHERE source_id = ? ORDER BY fetched_at DESC').all(sourceId);
}

function getRecentContent(limit = 10) {
  return db.prepare(`
    SELECT sc.*, s.name as source_name, s.url as source_url
    FROM source_content sc
    JOIN sources s ON sc.source_id = s.id
    ORDER BY sc.fetched_at DESC
    LIMIT ?
  `).all(limit);
}

// Поиск по контенту
function searchContent(query) {
  return db.prepare(`
    SELECT sc.*, s.name as source_name
    FROM source_content sc
    JOIN sources s ON sc.source_id = s.id
    WHERE sc.content LIKE ? OR sc.title LIKE ?
    ORDER BY sc.fetched_at DESC
  `).all(`%${query}%`, `%${query}%`);
}

// Инициализация
initDatabase();

module.exports = {
  db,
  getAllSources,
  getActiveSources,
  getSourceById,
  createSource,
  updateSource,
  deleteSource,
  toggleSourceActive,
  getSourceTags,
  getSourcesWithTags,
  addSourceContent,
  getSourceContent,
  getRecentContent,
  searchContent,
  getAllAgentSettings,
  getAgentSetting,
  upsertAgentSetting,
  addChatMessage,
  getChatHistory,
  clearChatHistory
};
