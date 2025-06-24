// db.js
import * as SQLite from 'expo-sqlite';
import { kanjiTsvData } from './assets/kanji-data.js';

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
        difficulty INTEGER NOT NULL
      );
    `);
    
    console.log('✅ Tables created');
    return db;
  } catch (error) {
    console.error('❌ DB init error:', error);
    throw error;
  }
};

/**
 * 初期データ投入（1回のみ）
 */
export const insertInitialDataIfNeeded = async () => {
  try {
    const db = await SQLite.openDatabaseAsync('kanji.db');
    
    // データが既に存在するかチェック
    const result = await db.getFirstAsync('SELECT COUNT(*) as count FROM kanji;');
    const count = result.count;
    
    if (count > 0) {
      console.log('📦 Data already exists, skip import.');
      return;
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
    
    console.log(`✅ Initial data imported: ${insertedKanji} kanji, ${insertedExamples} examples`);
  } catch (error) {
    console.error('❌ DB import error:', error);
  }
};

