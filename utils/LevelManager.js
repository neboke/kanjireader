// utils/LevelManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const LEVEL_KEY = 'kanjiapp_level';
const XP_KEY = 'kanjiapp_xp';

// 各レベルに必要なXPの計算式
export const getXpForNextLevel = (level) => {
  // 簡単な計算式: 次のレベル = 50 * (現在のレベル ^ 1.5)
  return Math.floor(50 * Math.pow(level, 1.5));
};

// レベルとXPを読み込む
export const loadLevelData = async () => {
  try {
    const savedLevel = await AsyncStorage.getItem(LEVEL_KEY);
    const savedXp = await AsyncStorage.getItem(XP_KEY);
    
    const level = savedLevel ? parseInt(savedLevel, 10) : 1;
    const xp = savedXp ? parseInt(savedXp, 10) : 0;
    
    return { level, xp };
  } catch (error) {
    console.error('レベルデータの読み込みエラー:', error);
    return { level: 1, xp: 0 };
  }
};

// レベルとXPを保存する
export const saveLevelData = async (level, xp) => {
  try {
    await AsyncStorage.setItem(LEVEL_KEY, level.toString());
    await AsyncStorage.setItem(XP_KEY, xp.toString());
  } catch (error) {
    console.error('レベルデータの保存エラー:', error);
  }
};

// XPを追加し、レベルアップを処理する
export const addXp = async (xpToAdd) => {
  let { level, xp } = await loadLevelData();
  let xpForNext = getXpForNextLevel(level);
  let leveledUp = false;

  xp += xpToAdd;

  while (xp >= xpForNext) {
    xp -= xpForNext;
    level++;
    leveledUp = true;
    xpForNext = getXpForNextLevel(level);
  }

  await saveLevelData(level, xp);

  return { level, xp, leveledUp, xpForNextLevel: xpForNext };
};
