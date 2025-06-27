// App.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView, // 追加
  Platform, // 追加
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initDatabase, insertInitialDataIfNeeded } from './db';
import { ScoreBar, ScoreAnimation } from './components/ScoreBar';
import { LevelIndicator } from './components/LevelIndicator'; // 追加
import { BadgeGrid, BadgeSummary } from './components/BadgeDisplay';
import { badgeDefinitions, checkBadges, countEarnedBadges, getNewlyEarnedBadges } from './badges/BadgeDefinitions';
import { loadUserStats, recordSessionResult, recordDailyActivity, updateUserStats, updateBadgeEarnCount } from './utils/UserStatsManager';
import { loadLevelData, addXp, getXpForNextLevel } from './utils/LevelManager'; // 追加

export default function App() {
  const [db, setDb] = useState(null);
  const [mode, setMode] = useState('menu');
  const [filters, setFilters] = useState({ maxGrade: 6, maxDiff: 7 });
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [history, setHistory] = useState([]);
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [qCount, setQCount] = useState(0);
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0); // 累積スコア
  const [showScoreAnimation, setShowScoreAnimation] = useState(false);
  const [userStats, setUserStats] = useState(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [newBadges, setNewBadges] = useState([]);
  const [level, setLevel] = useState(1); // 追加
  const [xp, setXp] = useState(0); // 追加
  const [xpForNextLevel, setXpForNextLevel] = useState(100); // 追加

  // AsyncStorageキー
  const SCORE_KEY = 'kanjiapp_total_score';

  // スコアをAsyncStorageから読み込み
  const loadScore = async () => {
    try {
      const savedScore = await AsyncStorage.getItem(SCORE_KEY);
      if (savedScore !== null) {
        setTotalScore(parseInt(savedScore, 10));
      }
    } catch (error) {
      console.error('スコア読み込みエラー:', error);
    }
  };

  // スコアをAsyncStorageに保存
  const saveScore = async (newScore) => {
    try {
      await AsyncStorage.setItem(SCORE_KEY, newScore.toString());
    } catch (error) {
      console.error('スコア保存エラー:', error);
    }
  };

  // レベルとXPの初期化
  const initializeLevel = async () => {
    const { level, xp } = await loadLevelData();
    setLevel(level);
    setXp(xp);
    setXpForNextLevel(getXpForNextLevel(level));
  };

  // ユーザー統計初期化
  const initializeUserStats = async () => {
    try {
      const stats = await loadUserStats();
      setUserStats(stats);
      // 本日のデイリーチャレンジ初期化
      await recordDailyActivity();
    } catch (error) {
      console.error('ユーザー統計初期化エラー:', error);
    }
  };

  // バッジチェック
  const checkForNewBadges = async (newStats) => {
    try {
      const newUnlockedBadges = await getNewlyEarnedBadges(newStats, userStats);
      if (newUnlockedBadges.length > 0) {
        // 新しく獲得したバッジの獲得回数を更新
        for (const badge of newUnlockedBadges) {
          await updateBadgeEarnCount(badge.id, 1);
        }
        
        setNewBadges(newUnlockedBadges);
        // バッジ獲得アラート
        const badgeNames = newUnlockedBadges.map(b => b.name).join('、');
        Alert.alert(
          '🏆 新しいバッジ獲得！',
          `「${badgeNames}」を獲得しました！`,
          [{ text: 'OK', onPress: () => setNewBadges([]) }]
        );
      }
    } catch (error) {
      console.error('バッジチェックエラー:', error);
    }
  };

  // スコアリセット
  const resetScore = () => {
    Alert.alert(
      'スコアリセット',
      '累積スコアを0にリセットしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: 'リセット', 
          style: 'destructive',
          onPress: async () => {
            setTotalScore(0);
            await saveScore(0);
          }
        }
      ]
    );
  };

  useEffect(() => {
    (async () => {
      await initDatabase();
      await insertInitialDataIfNeeded();
      const database = await SQLite.openDatabaseAsync('kanji.db');
      setDb(database);
      // スコアを読み込み
      await loadScore();
      // レベルとXPを初期化
      await initializeLevel();
      // ユーザー統計を初期化
      await initializeUserStats();
    })();
  }, []);

  // クイズ開始
  const startQuiz = async () => {
    // DBが未設定ならオープン
    let database = db;
    if (!database) {
      database = await SQLite.openDatabaseAsync('kanji.db');
      setDb(database);
    }
    setQCount(0);
    setScore(0);
    setHistory([]);
    setCurrentStreak(0);
    setMode('quiz');
    await loadRandomQuestion(database);
  };

  // ランダム出題
  const loadRandomQuestion = async (databaseParam) => {
    const database = databaseParam || db;
    setFeedback('');
    setAnswer('');
    setLoading(true);
    try {
      // last_answered_dateがNULLまたは古いものを優先して出題
      const row = await database.getFirstAsync(
        `SELECT e.id,e.sentence,e.target,e.reading,e.difficulty,k.grade
         FROM examples e
         JOIN kanji k ON e.kanji_id=k.id
         WHERE k.grade <= ? AND e.difficulty <= ?
         ORDER BY CASE WHEN e.last_answered_date IS NULL THEN 0 ELSE 1 END, e.last_answered_date ASC, RANDOM()
         LIMIT 1;`,
        filters.maxGrade,
        filters.maxDiff
      );
      setQuestion(row);
    } catch (error) {
      console.error('loadRandomQuestion error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 回答チェック
  const checkAnswer = async () => {
    if (!question) return;
    const correct = answer.trim() === question.reading;
    setFeedback(correct ? '✅ 正解！' : `❌ 不正解。正解は「${question.reading}」`);
    setHistory(h => [...h, { question, yourAnswer: answer.trim(), correct }]);
    
    // ストリーク更新
    if (correct) {
      setCurrentStreak(s => s + 1);
    } else {
      setCurrentStreak(0);
    }
    
    // スコア更新
    if (correct) {
      setScore(s => s + 1); // セッション内スコア
      const newTotalScore = totalScore + 10; // 累積スコア +10点
      setTotalScore(newTotalScore);
      await saveScore(newTotalScore);
      
      // アニメーション表示
      setShowScoreAnimation(true);

      // XPを追加
      const xpResult = await addXp(15); // 正解で15XP獲得
      setLevel(xpResult.level);
      setXp(xpResult.xp);
      setXpForNextLevel(xpResult.xpForNextLevel);

      if (xpResult.leveledUp) {
        Alert.alert('🎉 レベルアップ！', `レベル ${xpResult.level} になりました！`);
      }
    }

    // 解答日時を更新
    try {
      const now = new Date().toISOString();
      await db.runAsync(
        'UPDATE examples SET last_answered_date = ? WHERE id = ?;',
        [now, question.id]
      );
    } catch (error) {
      console.error('解答日時の更新に失敗:', error);
    }
  };

  // 次へ or 結果
  const handleNext = async () => {
    const nextCount = qCount + 1;
    setQCount(nextCount);
    if (nextCount < 10) {
      await loadRandomQuestion();
    } else {
      // セッション結果を記録
      await recordSessionResults();
      setMode('result');
    }
  };

  // セッション結果記録
  const recordSessionResults = async () => {
    try {
      const sessionData = {
        correct: score,
        total: 10,
        streak: Math.max(currentStreak, userStats?.maxStreak || 0),
        scoreGained: score * 10
      };
      
      // セッション結果を記録
      await recordSessionResult(sessionData);
      
      // 更新された統計を取得
      const updatedStats = await loadUserStats();
      setUserStats(updatedStats);
      
      // バッジチェック
      await checkForNewBadges(updatedStats);
    } catch (error) {
      console.error('セッション結果記録エラー:', error);
    }
  };

  // データ一覧ロード
  const loadDataList = async () => {
    setLoading(true);
    try {
      const rows = await db.getAllAsync(
        `SELECT e.sentence,e.target,e.reading,e.difficulty,k.grade
         FROM examples e
         JOIN kanji k ON e.kanji_id=k.id
         ORDER BY k.grade, e.difficulty;`
      );
      setDataList(rows);
    } catch (error) {
      console.error('loadDataList error:', error);
    } finally {
      setLoading(false);
    }
  };

  // モード切替
  const goMode = (m) => {
    setMode(m);
    setFeedback('');
    setAnswer('');
    if (m === 'data') loadDataList();
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        
        {/* レベルインジケーター */}
        <LevelIndicator level={level} xp={xp} xpForNextLevel={xpForNextLevel} />
        
        {/* スコアアニメーション */}
        <ScoreAnimation 
          visible={showScoreAnimation} 
          onComplete={() => setShowScoreAnimation(false)} 
        />

        {/* メニュー */}
        {mode === 'menu' && (
          <View style={styles.menuContainer}>
            {/* 統計情報 */}
            <View style={styles.statsContainer}>
              <Text style={styles.statsTitle}>📊 学習統計</Text>
              <Text style={styles.statsText}>累積スコア: {totalScore}点</Text>
              <Text style={styles.statsText}>
                正解数: {Math.floor(totalScore / 10)}問
              </Text>
              {userStats && (
                <>
                  <Text style={styles.statsText}>
                    最高ストリーク: {userStats.maxStreak}連続
                  </Text>
                  <Text style={styles.statsText}>
                    今日の問題数: {userStats.dailyProblemCount}問
                  </Text>
                </>
              )}
            </View>
            
            <TouchableOpacity style={styles.menuCard} onPress={startQuiz}>
              <Text style={styles.menuIcon}>🎯</Text>
              <Text style={styles.menuText}>クイズ開始</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuCard} onPress={() => goMode('badges')}>
              <Text style={styles.menuIcon}>🏆</Text>
              <Text style={styles.menuText}>バッジコレクション</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuCard} onPress={() => goMode('filters')}>
              <Text style={styles.menuIcon}>⚙️</Text>
              <Text style={styles.menuText}>フィルター設定</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuCard} onPress={() => goMode('data')}>
              <Text style={styles.menuIcon}>📊</Text>
              <Text style={styles.menuText}>データ一覧</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuCard} onPress={() => goMode('history')}>
              <Text style={styles.menuIcon}>📜</Text>
              <Text style={styles.menuText}>解答履歴</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* フィルター設定 */}
        {mode === 'filters' && (
          <View>
            <Text style={styles.subtitle}>🔧 フィルター設定</Text>
            <Text>最大学年:</Text>
            <Picker selectedValue={filters.maxGrade} onValueChange={v => setFilters(f => ({ ...f, maxGrade: v }))}>
              {[1,2,3,4,5,6].map(g => <Picker.Item key={g} label={`${g}年`} value={g} />)}
            </Picker>
            <Text>最大難易度:</Text>
            <Picker selectedValue={filters.maxDiff} onValueChange={v => setFilters(f => ({ ...f, maxDiff: v }))}>
              {[1,2,3,4,5,6,7].map(d => <Picker.Item key={d} label={`${d}`} value={d} />)}
            </Picker>
          </View>
        )}

        {/* クイズ */}
        {mode === 'quiz' &&
          (loading ? (
            <ActivityIndicator size="large" />
          ) : (
            question && (
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
              >
                <View style={styles.quizContainer}>
                  <View style={styles.quizMainContent}>
                    <Text style={styles.sentence}>{`${
                      qCount + 1
                    }. ${question.sentence}`}</Text>
                    <Text style={styles.prompt}>「{question.target}」の読みを入力</Text>
                    <TextInput
                      style={styles.input}
                      value={answer}
                      onChangeText={setAnswer}
                      placeholder="ひらがな"
                      autoCorrect={false}
                      autoComplete="off"
                      spellCheck={false}
                      autoCapitalize="none"
                      editable={feedback === ''}
                    />
                    {feedback !== '' && (
                      <View style={styles.feedbackContainer}>
                        <Text style={styles.feedback}>{feedback}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.quizFooter}>
                    {feedback === '' ? (
                      <TouchableOpacity
                        style={[
                          styles.button,
                          styles.primaryButton,
                          answer.trim() === '' && styles.disabledButton,
                        ]}
                        onPress={checkAnswer}
                        disabled={answer.trim() === ''}
                      >
                        <Text style={styles.buttonText}>答える</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.button, styles.primaryButton]}
                        onPress={handleNext}
                      >
                        <Text style={styles.buttonText}>
                          {qCount < 9 ? "次へ" : "結果へ"}
                        </Text>
                      </TouchableOpacity>
                    )}

                    <Text style={styles.diff}>
                      学年:{question.grade} 難易度:{question.difficulty}
                    </Text>

                    <TouchableOpacity
                      style={[styles.button, styles.secondaryButton]}
                      onPress={() => goMode('menu')}
                    >
                      <Text
                        style={[styles.buttonText, styles.secondaryButtonText]}
                      >
                        トップに戻る
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            )
          ))}

        {/* 結果 */}
        {mode === 'result' && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultText}>10問中 {score}問 正解！</Text>
            <Text style={styles.subtitle}>
              今回獲得: +{score * 10}点
            </Text>
            <Text style={styles.subtitle}>
              累積スコア: {totalScore}点
            </Text>
            {currentStreak > 0 && (
              <Text style={styles.subtitle}>
                連続正解: {currentStreak}問
              </Text>
            )}
            {newBadges.length > 0 && (
              <View style={styles.newBadgeContainer}>
                <Text style={styles.newBadgeTitle}>🎉 新しいバッジ獲得！</Text>
                {newBadges.map((badge, index) => (
                  <Text key={index} style={styles.newBadgeText}>
                    🏆 {badge.name}
                  </Text>
                ))}
              </View>
            )}
            <Button title="トップに戻る" onPress={() => goMode('menu')} />
          </View>
        )}

        {/* データ一覧 */}
        {mode === 'data' && (
          loading ? <ActivityIndicator size="large" /> : (
            <FlatList data={dataList} keyExtractor={(_, i) => String(i)} renderItem={({ item }) => (
              <View style={styles.item}>
                <Text>{item.sentence}</Text>
                <Text>→ {item.target}／{item.reading}</Text>
                <Text>学年:{item.grade} diff:{item.difficulty}</Text>
              </View>
            )} />
          )
        )}

        {/* 履歴 */}
        {mode === 'history' && (
          history.length === 0 ? <Text>まだ解答履歴がありません。</Text> : (
            <FlatList data={history} keyExtractor={(_, i) => String(i)} renderItem={({ item, index }) => (
              <View style={styles.item}>
                <Text>{index + 1}. {item.question.sentence}</Text>
                <Text>あなた: {item.yourAnswer} → {item.correct ? '○' : '×'}</Text>
                <Text>学年:{item.question.grade} diff:{item.question.difficulty}</Text>
              </View>
            )} />
          )
        )}

        {/* バッジコレクション */}
        {mode === 'badges' && userStats && (
          <View style={styles.badgeContainer}>
            <Text style={styles.subtitle}>🏆 バッジコレクション</Text>
            <BadgeSummary userStats={userStats} />
            <BadgeGrid userStats={userStats} />
          </View>
        )}

        {/* 共通戻るボタン */}
        {mode !== 'menu' && mode !== 'quiz' && mode !== 'result' && (
          <Button title="メニューに戻る" onPress={() => goMode('menu')} />
        )}

      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  menuContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  menuCard: { width: '48%', backgroundColor: '#f0f8ff', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
  menuIcon: { fontSize: 32, marginBottom: 8 },
  menuText: { fontSize: 16, fontWeight: '600' },
  statsContainer: {
    width: '100%',
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2e7d32',
  },
  statsText: {
    fontSize: 16,
    color: '#388e3c',
    marginBottom: 4,
  },
  subtitle: { fontSize: 20, marginBottom: 12 },
  sentence: { fontSize: 22, marginBottom: 8, textAlign: 'center' },
  prompt: { fontSize: 16, marginBottom: 8, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    padding: 16,
    fontSize: 20,
    marginBottom: 24,
    borderRadius: 10,
    textAlign: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  feedbackContainer: {
    marginTop: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  feedback: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  diff: {
    marginTop: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  item: { padding: 8, borderBottomWidth: 1, borderColor: '#ddd' },
  resultContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  resultText: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
  newBadgeContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 16,
    marginVertical: 16,
    alignItems: 'center',
  },
  newBadgeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  newBadgeText: {
    fontSize: 16,
    color: '#856404',
    marginBottom: 4,
  },
  badgeContainer: {
    flex: 1,
    padding: 16,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  quizContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  quizMainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  quizFooter: {},
  button: {
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  primaryButton: {
    backgroundColor: '#007aff',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007aff',
  },
  disabledButton: {
    backgroundColor: '#a9a9a9',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007aff',
  },
});

