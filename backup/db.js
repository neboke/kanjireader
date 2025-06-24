/*
  ファイル: db.js
  既存のテーブルに加え、オフラインゲーミフィケーション用の3テーブルを追加し、
  ユーザ状態、デイリーチャレンジ、セッション記録のCRUD関数を実装。
*/
import * as SQLite from 'expo-sqlite';

// TSVファイルを静的インポート（一時的にコメントアウト）
// import kanjiGrade1TSV from './assets/kanji_grade1.js';
// import kanjiGrade2TSV from './assets/kanji_grade2.js';
// import kanjiGrade3TSV from './assets/kanji_grade3.js';
// import kanjiGrade4TSV from './assets/kanji_grade4.js';
// import kanjiGrade5TSV from './assets/kanji_grade5.js';
// import kanjiGrade6TSV from './assets/kanji_grade6.js';

export const openDb = async () => {
  try {
    return await SQLite.openDatabaseAsync('kanji.db');
  } catch (error) {
    console.error('Failed to open database:', error);
    throw error;
  }
};

export const initDatabase = async () => {
  try {
    const db = await openDb();
    
    // 既存テーブル
    await db.execAsync(`CREATE TABLE IF NOT EXISTS kanji (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kanji TEXT NOT NULL,
      grade INTEGER NOT NULL
    );`);
    
    await db.execAsync(`CREATE TABLE IF NOT EXISTS examples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kanji_id INTEGER NOT NULL,
      sentence TEXT NOT NULL,
      target TEXT NOT NULL,
      reading TEXT NOT NULL,
      difficulty INTEGER NOT NULL
    );`);
    
    // Gamification テーブル追加
    await db.execAsync(`CREATE TABLE IF NOT EXISTS user_state (
      device_id TEXT PRIMARY KEY,
      xp_total INTEGER DEFAULT 0,
      current_level INTEGER DEFAULT 1,
      xp_to_next_level INTEGER DEFAULT 100,
      streak_count INTEGER DEFAULT 0,
      last_play_date TEXT
    );`);
    
    await db.execAsync(`CREATE TABLE IF NOT EXISTS daily_challenge (
      challenge_date TEXT PRIMARY KEY,
      goal INTEGER,
      progress INTEGER DEFAULT 0,
      is_completed INTEGER DEFAULT 0
    );`);
    
    await db.execAsync(`CREATE TABLE IF NOT EXISTS session_record (
      session_id TEXT PRIMARY KEY,
      date TEXT,
      correct_count INTEGER,
      total_count INTEGER,
      avg_response_ms INTEGER,
      stars INTEGER
    );`);
    
    console.log('✅ Tables created & extended for gamification');
  } catch (err) {
    console.error('DB init error:', err);
    throw err;
  }
};

export const insertInitialDataIfNeeded = async () => {
  try {
    const db = await openDb();
    
    // 既存データをチェック
    const result = await db.getFirstAsync('SELECT COUNT(*) as count FROM kanji;');
    const count = result?.count || 0;
    
    console.log(`Current kanji count in DB: ${count}`);
    
    // データが少ない場合のみTSVファイルからの全データを読み込み
    if (count < 10) {
      console.log('Inserting test data...');
      await insertTestData();
      // console.log('TSV loading temporarily disabled for debugging');
      // try {
      //   await loadAllGradesKanjiFromTSV();
      //   console.log('✅ TSV data loaded successfully');
      // } catch (tsvError) {
      //   console.warn('TSV loading failed, but continuing:', tsvError);
      //   // TSVの読み込みに失敗してもアプリは続行
      // }
    } else {
      console.log('✅ Sufficient data already exists, skipping data load');
    }
    
  } catch (error) {
    console.error('Data initialization error:', error);
    // データベースの基本的な初期化エラーの場合はthrow
    throw error;
  }
};

// ユーザ状態取得 or 初期化
export const getUserState = async () => {
  const db = await openDb();
  const today = new Date().toISOString().slice(0,10);
  
  try {
    const result = await db.getFirstAsync(
      'SELECT * FROM user_state WHERE device_id = ?;',
      ['DEVICE']
    );
    
    if (result) {
      return result;
    } else {
      // 初期データを挿入
      await db.runAsync(
        `INSERT INTO user_state (device_id, last_play_date) VALUES (?, ?);`,
        ['DEVICE', today]
      );
      return { 
        device_id: 'DEVICE', 
        xp_total: 0, 
        current_level: 1, 
        xp_to_next_level: 100, 
        streak_count: 0, 
        last_play_date: today 
      };
    }
  } catch (error) {
    console.error('getUserState error:', error);
    throw error;
  }
};

// ユーザ状態更新
export const updateUserState = async ({ isCorrect = false, resetStreak = false, dailyBonusXP = 0 }) => {
  try {
    const state = await getUserState();
    console.log('Current state:', state);
    
    // XP計算
    let awardedXP = 0;
    let newStreak = state.streak_count;
    
    if (isCorrect) {
      // 基本XP = 10
      awardedXP = 10;
      
      // 連続正解ボーナス計算
      newStreak = state.streak_count + 1;
      const streakBonus = Math.floor(newStreak / 5) * 5;
      awardedXP += streakBonus;
      
      console.log(`XP awarded: ${awardedXP} (base: 10, streak bonus: ${streakBonus}, daily bonus: ${dailyBonusXP})`);
    } else if (resetStreak) {
      newStreak = 0;
    }
    
    // デイリーチャレンジボーナス
    awardedXP += dailyBonusXP;
    
    // XP合計更新
    let totalXP = state.xp_total + awardedXP;
    let nextXP = state.xp_to_next_level - awardedXP;
    let newLevel = state.current_level;
    
    // レベルアップ計算
    while (nextXP <= 0) {
      newLevel += 1;
      const requiredXP = Math.floor(100 * Math.pow(newLevel, 1.5));
      nextXP += requiredXP;
      console.log(`Level up! New level: ${newLevel}, Required XP for next: ${requiredXP}`);
    }
    
    const today = new Date().toISOString().slice(0, 10);
    const db = await openDb();
    
    await db.runAsync(
      `UPDATE user_state SET xp_total=?, current_level=?, xp_to_next_level=?, streak_count=?, last_play_date=? WHERE device_id=?;`,
      [totalXP, newLevel, nextXP, newStreak, today, 'DEVICE']
    );
    
    const result = {
      xp_total: totalXP, 
      current_level: newLevel, 
      xp_to_next_level: nextXP, 
      streak_count: newStreak,
      last_play_date: today,
      level_up: newLevel > state.current_level,
      awarded_xp: awardedXP
    };
    
    console.log('Updated state:', result);
    return result;
    
  } catch (error) {
    console.error('updateUserState error:', error);
    throw error;
  }
};

// 学年別漢字取得
export const getKanjiByGrade = async (grade) => {
  try {
    const db = await openDb();
    const result = await db.getAllAsync(`
      SELECT k.*, e.sentence, e.target, e.reading, e.difficulty 
      FROM kanji k 
      JOIN examples e ON k.id = e.kanji_id 
      WHERE k.grade = ?
      ORDER BY RANDOM()
    `, [grade]);
    
    console.log(`Found ${result.length} examples for grade ${grade}`);
    return result;
  } catch (error) {
    console.error('getKanjiByGrade error:', error);
    return [];
  }
};

// デイリーチャレンジ取得・作成
export const getDailyChallenge = async () => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const db = await openDb();
    
    let challenge = await db.getFirstAsync(
      'SELECT * FROM daily_challenge WHERE challenge_date = ?;',
      [today]
    );
    
    if (!challenge) {
      // 新しいチャレンジを作成（目標: 20問正解）
      await db.runAsync(
        'INSERT INTO daily_challenge (challenge_date, goal) VALUES (?, ?);',
        [today, 20]
      );
      
      challenge = {
        challenge_date: today,
        goal: 20,
        progress: 0,
        is_completed: 0
      };
    }
    
    return challenge;
  } catch (error) {
    console.error('getDailyChallenge error:', error);
    throw error;
  }
};

// デイリーチャレンジ進捗更新
export const updateDailyChallengeProgress = async (correctCount) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const db = await openDb();
    
    const challenge = await getDailyChallenge();
    const newProgress = challenge.progress + correctCount;
    const isCompleted = newProgress >= challenge.goal ? 1 : 0;
    
    await db.runAsync(
      'UPDATE daily_challenge SET progress = ?, is_completed = ? WHERE challenge_date = ?;',
      [newProgress, isCompleted, today]
    );
    
    return {
      progress: newProgress,
      goal: challenge.goal,
      is_completed: isCompleted,
      bonus_xp: isCompleted && !challenge.is_completed ? 50 : 0 // 初回完了時のみボーナス
    };
  } catch (error) {
    console.error('updateDailyChallengeProgress error:', error);
    return { progress: 0, goal: 20, is_completed: 0, bonus_xp: 0 };
  }
};

// セッション記録保存
export const saveSessionRecord = async (sessionData) => {
  try {
    const db = await openDb();
    
    const { correct_count, total_count, avg_response_ms } = sessionData;
    const stars = Math.min(3, Math.floor((correct_count / total_count) * 3) + 1);
    const sessionId = Date.now().toString();
    const date = new Date().toISOString().slice(0, 10);
    
    await db.runAsync(
      'INSERT INTO session_record (session_id, date, correct_count, total_count, avg_response_ms, stars) VALUES (?, ?, ?, ?, ?, ?);',
      [sessionId, date, correct_count, total_count, avg_response_ms || 0, stars]
    );
    
    return { session_id: sessionId, stars };
  } catch (error) {
    console.error('saveSessionRecord error:', error);
    throw error;
  }
};

// TSVパーサー関数
const parseTSV = (tsvText) => {
  const lines = tsvText.trim().split('\n');
  const headers = lines[0].split('\t');
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t');
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    data.push(row);
  }
  
  return data;
};

// 全学年の漢字TSVデータを自動読み込み
export const loadAllGradesKanjiFromTSV = async () => {
  const tsvSources = [
    { data: kanjiGrade1TSV, grade: 1 },
    { data: kanjiGrade2TSV, grade: 2 },
    { data: kanjiGrade3TSV, grade: 3 },
    { data: kanjiGrade4TSV, grade: 4 },
    { data: kanjiGrade5TSV, grade: 5 },
    { data: kanjiGrade6TSV, grade: 6 }
  ];
  
  let totalInserted = 0;
  
  for (const source of tsvSources) {
    console.log(`Loading grade ${source.grade} kanji from TSV...`);
    const result = await loadKanjiFromTSV(source.data, source.grade);
    if (result.success) {
      totalInserted += result.count;
    } else {
      console.error(`Failed to load grade ${source.grade}:`, result.error);
    }
  }
  
  console.log(`✅ Total loaded: ${totalInserted} new examples from all grades`);
  return { success: true, totalCount: totalInserted };
};

// TSVファイルから指定学年の漢字を自動読み込み
export const loadKanjiFromTSV = async (tsvData, expectedGrade) => {
  try {
    // TSVテキストをパース
    const kanjiData = parseTSV(tsvData);
    console.log(`Parsed ${kanjiData.length} kanji from grade ${expectedGrade} TSV`);
    
    const db = await openDb();
    let insertedCount = 0;
    
    for (const row of kanjiData) {
      const { kanji, grade, sentence, target, reading, difficulty } = row;
      
      if (!kanji || !sentence || !target || !reading) {
        console.warn('Skipping incomplete row:', row);
        continue;
      }
      
      // 漢字テーブルに挿入（重複チェック）
      let kanjiResult = await db.getFirstAsync(
        'SELECT id FROM kanji WHERE kanji = ?',
        [kanji]
      );
      
      let kanjiId;
      if (!kanjiResult) {
        const result = await db.runAsync(
          'INSERT INTO kanji (kanji, grade) VALUES (?, ?)',
          [kanji, parseInt(grade) || expectedGrade]
        );
        kanjiId = result.lastInsertRowId;
      } else {
        kanjiId = kanjiResult.id;
      }
      
      // 例文の重複チェック
      const existingExample = await db.getFirstAsync(
        'SELECT id FROM examples WHERE kanji_id = ? AND sentence = ? AND target = ?',
        [kanjiId, sentence, target]
      );
      
      if (!existingExample) {
        // 例文テーブルに挿入
        await db.runAsync(
          'INSERT INTO examples (kanji_id, sentence, target, reading, difficulty) VALUES (?, ?, ?, ?, ?)',
          [kanjiId, sentence, target, reading, parseInt(difficulty) || 1]
        );
        insertedCount++;
      }
    }
    
    console.log(`✅ Successfully loaded ${insertedCount} new examples from grade ${expectedGrade} TSV`);
    return { success: true, count: insertedCount };
    
  } catch (error) {
    console.error(`Grade ${expectedGrade} TSV import error:`, error);
    return { success: false, error };
  }
};

// 旧来のgrade1専用関数（互換性のため残しておく）
export const loadGrade1KanjiFromTSV = async () => {
  return await loadKanjiFromTSV(kanjiGrade1TSV, 1);
};

// テスト用のダミーデータ挿入
export const insertTestData = async () => {
  try {
    const db = await openDb();
    
    const testData = [
      {
        kanji: '漢',
        grade: 3,
        examples: [
          { sentence: '漢字を勉強します。', target: '漢字', reading: 'かんじ', difficulty: 1 },
          { sentence: '漢文を読みました。', target: '漢文', reading: 'かんぶん', difficulty: 2 }
        ]
      },
      {
        kanji: '字',
        grade: 1,
        examples: [
          { sentence: '文字を書きます。', target: '文字', reading: 'もじ', difficulty: 1 },
          { sentence: '数字を覚えました。', target: '数字', reading: 'すうじ', difficulty: 2 }
        ]
      }
    ];
    
    for (const item of testData) {
      // 重複チェック
      const existing = await db.getFirstAsync('SELECT id FROM kanji WHERE kanji = ?', [item.kanji]);
      
      if (!existing) {
        const kanjiResult = await db.runAsync(
          'INSERT INTO kanji (kanji, grade) VALUES (?, ?)',
          [item.kanji, item.grade]
        );
        const kanjiId = kanjiResult.lastInsertRowId;
        
        for (const example of item.examples) {
          await db.runAsync(
            'INSERT INTO examples (kanji_id, sentence, target, reading, difficulty) VALUES (?, ?, ?, ?, ?)',
            [kanjiId, example.sentence, example.target, example.reading, example.difficulty]
          );
        }
      }
    }
    
    console.log('✅ Test data inserted successfully');
    return true;
  } catch (error) {
    console.error('Test data insertion failed:', error);
    return false;
  }
};
