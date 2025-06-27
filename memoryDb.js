/*
  ファイル: memoryDb.js
  SQLiteを使わないメモリベースのデータ管理システム
*/

// メモリ内データストレージ
let kanjiData = [];
let examplesData = [];
let userState = {
  device_id: 'DEVICE',
  xp_total: 0,
  current_level: 1,
  xp_to_next_level: 100,
  streak_count: 0,
  last_play_date: new Date().toISOString().slice(0, 10)
};
let nextKanjiId = 1;
let nextExampleId = 1;

// 基本的なテストデータ
const testKanjiData = [
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
  },
  {
    kanji: '学',
    grade: 1,
    examples: [
      { sentence: '学校に行きます。', target: '学校', reading: 'がっこう', difficulty: 1 },
      { sentence: '数学を勉強します。', target: '数学', reading: 'すうがく', difficulty: 2 }
    ]
  },
  {
    kanji: '年',
    grade: 1,
    examples: [
      { sentence: '今年は2025年です。', target: '今年', reading: 'ことし', difficulty: 1 },
      { sentence: '来年も頑張ります。', target: '来年', reading: 'らいねん', difficulty: 2 }
    ]
  },
  {
    kanji: '日',
    grade: 1,
    examples: [
      { sentence: '今日は晴れです。', target: '今日', reading: 'きょう', difficulty: 1 },
      { sentence: '毎日勉強します。', target: '毎日', reading: 'まいにち', difficulty: 2 }
    ]
  }
];

export const openDb = async () => {
  console.log('✅ Memory database initialized');
  return Promise.resolve(true);
};

export const initDatabase = async () => {
  try {
    console.log('✅ Memory database tables created');
    return Promise.resolve(true);
  } catch (error) {
    console.error('Memory DB init error:', error);
    throw error;
  }
};

export const insertInitialDataIfNeeded = async () => {
  try {
    console.log(`Current kanji count in memory: ${kanjiData.length}`);
    
    if (kanjiData.length === 0) {
      console.log('Loading test data into memory...');
      
      for (const item of testKanjiData) {
        const kanjiId = nextKanjiId++;
        kanjiData.push({
          id: kanjiId,
          kanji: item.kanji,
          grade: item.grade
        });
        
        for (const example of item.examples) {
          examplesData.push({
            id: nextExampleId++,
            kanji_id: kanjiId,
            sentence: example.sentence,
            target: example.target,
            reading: example.reading,
            difficulty: example.difficulty
          });
        }
      }
      
      console.log(`✅ Loaded ${kanjiData.length} kanji into memory`);
    }
    
    return Promise.resolve(true);
  } catch (error) {
    console.error('Memory data initialization error:', error);
    throw error;
  }
};

export const getUserState = async () => {
  try {
    console.log('Getting user state from memory:', userState);
    return Promise.resolve(userState);
  } catch (error) {
    console.error('getUserState error:', error);
    throw error;
  }
};

export const updateUserState = async ({ isCorrect = false, resetStreak = false, dailyBonusXP = 0 }) => {
  try {
    console.log('Current state:', userState);
    
    // XP計算
    let awardedXP = 0;
    let newStreak = userState.streak_count;
    
    if (isCorrect) {
      // 基本XP = 10
      awardedXP = 10;
      
      // 連続正解ボーナス計算
      newStreak = userState.streak_count + 1;
      const streakBonus = Math.floor(newStreak / 5) * 5;
      awardedXP += streakBonus;
      
      console.log(`XP awarded: ${awardedXP} (base: 10, streak bonus: ${streakBonus}, daily bonus: ${dailyBonusXP})`);
    } else if (resetStreak) {
      newStreak = 0;
    }
    
    // デイリーチャレンジボーナス
    awardedXP += dailyBonusXP;
    
    // XP合計更新
    let totalXP = userState.xp_total + awardedXP;
    let nextXP = userState.xp_to_next_level - awardedXP;
    let newLevel = userState.current_level;
    
    // レベルアップ計算
    while (nextXP <= 0) {
      newLevel += 1;
      const requiredXP = Math.floor(100 * Math.pow(newLevel, 1.5));
      nextXP += requiredXP;
      console.log(`Level up! New level: ${newLevel}, Required XP for next: ${requiredXP}`);
    }
    
    const today = new Date().toISOString().slice(0, 10);
    
    // メモリ内のユーザー状態を更新
    userState = {
      ...userState,
      xp_total: totalXP,
      current_level: newLevel,
      xp_to_next_level: nextXP,
      streak_count: newStreak,
      last_play_date: today
    };
    
    const result = {
      xp_total: totalXP,
      current_level: newLevel,
      xp_to_next_level: nextXP,
      streak_count: newStreak,
      last_play_date: today,
      level_up: newLevel > userState.current_level,
      awarded_xp: awardedXP
    };
    
    console.log('Updated state:', result);
    return Promise.resolve(result);
    
  } catch (error) {
    console.error('updateUserState error:', error);
    throw error;
  }
};

export const getKanjiByGrade = async (grade) => {
  try {
    // 指定された学年の漢字とその例文を取得
    const gradeKanji = kanjiData.filter(k => k.grade === grade);
    const result = [];
    
    for (const kanji of gradeKanji) {
      const examples = examplesData.filter(e => e.kanji_id === kanji.id);
      for (const example of examples) {
        result.push({
          ...kanji,
          ...example
        });
      }
    }
    
    // ランダムに並び替え
    const shuffled = result.sort(() => 0.5 - Math.random());
    
    console.log(`Found ${shuffled.length} examples for grade ${grade}`);
    return Promise.resolve(shuffled);
  } catch (error) {
    console.error('getKanjiByGrade error:', error);
    return Promise.resolve([]);
  }
};

// 互換性のための空の実装
export const insertTestData = async () => {
  console.log('insertTestData called (no-op in memory mode)');
  return Promise.resolve(true);
};

export const getDailyChallenge = async () => {
  return Promise.resolve({
    challenge_date: new Date().toISOString().slice(0, 10),
    goal: 20,
    progress: 0,
    is_completed: 0
  });
};

export const updateDailyChallengeProgress = async (correctCount) => {
  return Promise.resolve({
    progress: correctCount,
    goal: 20,
    is_completed: 0,
    bonus_xp: 0
  });
};

export const saveSessionRecord = async (sessionData) => {
  return Promise.resolve({
    session_id: Date.now().toString(),
    stars: 3
  });
};
