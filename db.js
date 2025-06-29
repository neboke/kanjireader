// db.js
import * as SQLite from 'expo-sqlite';
import { kanjiTsvData, kanjiDataVersion } from './assets/kanji-data.js';

/**
 * TSVデータからパースされたデータを取得
 */
const loadTSVData = () => {
  try {
    const allData = [];
    
    if (!kanjiTsvData) {
      console.warn('⚠️ TSV data is not available');
      return [];
    }
    
    // TSVをパース
    const lines = kanjiTsvData.trim().split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const values = lines[i].split('\t');
      if (values.length >= 6) {
        allData.push({
          kanji: values[0],
          grade: parseInt(values[1]),
          sentence: values[2],
          target: values[3],
          reading: values[4],
          difficulty: parseInt(values[5])
        });
      }
    }
    
    console.log(`✅ Loaded ${allData.length} entries from TSV data`);
    return allData;
  } catch (error) {
    console.error('❌ Error loading TSV data:', error);
    return [];
  }
};

/**
 * データベースファイルを開く
 */
export const openDb = () => {
  return SQLite.openDatabase('kanji.db');
};

/**
 * テーブル作成
 */
export const initDatabase = async () => {
  try {
    const db = await SQLite.openDatabaseAsync('kanji.db');
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS kanji (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kanji TEXT NOT NULL,
        grade INTEGER NOT NULL
      );
    `);
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS examples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kanji_id INTEGER NOT NULL,
        sentence TEXT NOT NULL,
        target TEXT NOT NULL,
        reading TEXT NOT NULL,
        difficulty INTEGER NOT NULL,
        last_answered_date DATETIME
      );
    `);

    // データバージョン管理用テーブル
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS data_version (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        version TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // For users who already have the database, add the column if it's missing.
    const columns = await db.getAllAsync('PRAGMA table_info(examples);');
    if (!columns.some(c => c.name === 'last_answered_date')) {
      await db.execAsync('ALTER TABLE examples ADD COLUMN last_answered_date DATETIME;');
      console.log('✅ Migrated DB: Added last_answered_date column.');
    }
    
    console.log('✅ Tables initialized.');
    return db;
  } catch (error) {
    console.error('❌ DB init error:', error);
    throw error;
  }
};

/**
 * 保存されているデータバージョンを取得
 */
const getCurrentDataVersion = async (db) => {
  try {
    const result = await db.getFirstAsync('SELECT version FROM data_version WHERE id = 1;');
    return result ? result.version : null;
  } catch (error) {
    console.log('📝 No data version found (first time setup)');
    return null;
  }
};

/**
 * データバージョンを更新
 */
const updateDataVersion = async (db, version) => {
  try {
    await db.runAsync(
      `INSERT OR REPLACE INTO data_version (id, version, updated_at) 
       VALUES (1, ?, CURRENT_TIMESTAMP);`,
      [version]
    );
    console.log(`✅ Data version updated to: ${version}`);
  } catch (error) {
    console.error('❌ Failed to update data version:', error);
  }
};

/**
 * 既存のデータを削除
 */
const clearExistingData = async (db) => {
  try {
    await db.execAsync('DELETE FROM examples;');
    await db.execAsync('DELETE FROM kanji;');
    console.log('🗑️ Cleared existing data');
  } catch (error) {
    console.error('❌ Failed to clear existing data:', error);
    throw error;
  }
};

/**
 * 初期データ投入（バージョン管理対応）
 */
export const insertInitialDataIfNeeded = async () => {
  try {
    const db = await SQLite.openDatabaseAsync('kanji.db');
    
    // 現在のデータバージョンを確認
    const currentVersion = await getCurrentDataVersion(db);
    const newVersion = kanjiDataVersion;
    
    console.log(`📊 Current data version: ${currentVersion || 'none'}`);
    console.log(`📊 Available data version: ${newVersion}`);
    
    // バージョンが同じ場合はスキップ
    if (currentVersion === newVersion) {
      console.log('📦 Data is up to date, skip import.');
      return;
    }
    
    // バージョンが異なる場合は再インポート
    if (currentVersion) {
      console.log('🔄 Data version mismatch, reimporting data...');
      await clearExistingData(db);
    } else {
      console.log('🆕 First time setup, importing initial data...');
    }
    
    // TSVデータを読み込む（同期処理）
    const tsvData = loadTSVData();
    
    if (tsvData.length === 0) {
      console.warn('⚠️ No TSV data loaded');
      return;
    }
    
    // 漢字ごとにグループ化
    const kanjiGroups = {};
    tsvData.forEach(item => {
      if (!kanjiGroups[item.kanji]) {
        kanjiGroups[item.kanji] = {
          kanji: item.kanji,
          grade: item.grade,
          examples: []
        };
      }
      kanjiGroups[item.kanji].examples.push({
        sentence: item.sentence,
        target: item.target,
        reading: item.reading,
        difficulty: item.difficulty
      });
    });
    
    // データベースに挿入
    let insertedKanji = 0;
    let insertedExamples = 0;
    
    for (const kanjiKey in kanjiGroups) {
      const kanjiData = kanjiGroups[kanjiKey];
      
      // 漢字を挿入
      const kanjiResult = await db.runAsync(
        'INSERT INTO kanji (kanji, grade) VALUES (?, ?);',
        [kanjiData.kanji, kanjiData.grade]
      );
      
      const kanjiId = kanjiResult.lastInsertRowId;
      insertedKanji++;
      
      // 例文を挿入
      for (const example of kanjiData.examples) {
        await db.runAsync(
          `INSERT INTO examples
           (kanji_id, sentence, target, reading, difficulty)
           VALUES (?, ?, ?, ?, ?);`,
          [kanjiId, example.sentence, example.target, example.reading, example.difficulty]
        );
        insertedExamples++;
      }
    }
    
    // データバージョンを更新
    await updateDataVersion(db, newVersion);
    
    console.log(`✅ Data import completed: ${insertedKanji} kanji, ${insertedExamples} examples (version: ${newVersion})`);
  } catch (error) {
    console.error('❌ DB import error:', error);
  }
};

