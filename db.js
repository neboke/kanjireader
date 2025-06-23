// db.js
import * as SQLite from 'expo-sqlite';

// 学年ごとに分割したJSONファイルを静的インポート
import data1 from './assets/kanji/grade1.json';
import data2 from './assets/kanji/grade2.json';
import data3 from './assets/kanji/grade3.json';
import data4 from './assets/kanji/grade4.json';
import data5 from './assets/kanji/grade5.json';
import data6 from './assets/kanji/grade6.json';

// フラット化してまとめる
const kanjiData = [
  ...data1,
  ...data2,
  ...data3,
  ...data4,
  ...data5,
  ...data6,
];

/**
 * データベースファイルを開く
 */
export const openDb = () => {
  return SQLite.openDatabase('kanji.db');
};

/**
 * テーブル作成
 */
export const initDatabase = () => {
  const db = openDb();
  db.transaction(tx => {
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS kanji (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kanji TEXT NOT NULL,
        grade INTEGER NOT NULL
      );
    `);
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS examples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kanji_id INTEGER NOT NULL,
        sentence TEXT NOT NULL,
        target TEXT NOT NULL,
        reading TEXT NOT NULL,
        difficulty INTEGER NOT NULL
      );
    `);
  }, err => console.error('DB init error:', err),
  () => console.log('✅ Tables created'));
};

/**
 * 初期データ投入（1回のみ）
 */
export const insertInitialDataIfNeeded = () => {
  const db = openDb();
  db.transaction(tx => {
    tx.executeSql(
      'SELECT COUNT(*) as count FROM kanji;',
      [],
      (_, res) => {
        const count = res.rows._array[0].count;
        if (count > 0) {
          console.log('📦 Data already exists, skip import.');
          return;
        }
        // JSONからINSERT
        kanjiData.forEach(k => {
          tx.executeSql(
            'INSERT INTO kanji (kanji, grade) VALUES (?, ?);',
            [k.kanji, k.grade],
            (_, result) => {
              const kanjiId = result.insertId;
              k.examples.forEach(ex => {
                tx.executeSql(
                  `INSERT INTO examples
                   (kanji_id, sentence, target, reading, difficulty)
                   VALUES (?, ?, ?, ?, ?);`,
                  [kanjiId, ex.sentence, ex.target, ex.reading, ex.difficulty]
                );
              });
            }
          );
        });
        console.log('✅ Initial data imported');
      }
    );
  }, err => console.error('DB import error:', err));
};

