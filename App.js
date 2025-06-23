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
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import * as SQLite from 'expo-sqlite';
import { initDatabase, insertInitialDataIfNeeded } from './db';

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

  useEffect(() => {
    (async () => {
      await initDatabase();
      await insertInitialDataIfNeeded();
      const database = await SQLite.openDatabaseAsync('kanji.db');
      setDb(database);
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
      const row = await database.getFirstAsync(
        `SELECT e.id,e.sentence,e.target,e.reading,e.difficulty,k.grade
         FROM examples e
         JOIN kanji k ON e.kanji_id=k.id
         WHERE k.grade <= ? AND e.difficulty <= ?
         ORDER BY RANDOM() LIMIT 1;`,
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
  const checkAnswer = () => {
    if (!question) return;
    const correct = answer.trim() === question.reading;
    setFeedback(correct ? '✅ 正解！' : `❌ 不正解。正解は「${question.reading}」`);
    setHistory(h => [...h, { question, yourAnswer: answer.trim(), correct }]);
    setScore(s => s + (correct ? 1 : 0));
  };

  // 次へ or 結果
  const handleNext = async () => {
    const nextCount = qCount + 1;
    setQCount(nextCount);
    if (nextCount < 10) {
      await loadRandomQuestion();
    } else {
      setMode('result');
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

        {/* メニュー */}
        {mode === 'menu' && (
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuCard} onPress={startQuiz}>
              <Text style={styles.menuIcon}>🎯</Text>
              <Text style={styles.menuText}>クイズ開始</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuCard} onPress={() => goMode('filters')}>
              <Text style={styles.menuIcon}>🔧</Text>
              <Text style={styles.menuText}>フィルター設定</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuCard} onPress={() => goMode('data')}>
              <Text style={styles.menuIcon}>📄</Text>
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
        {mode === 'quiz' && (
          loading ? (
            <ActivityIndicator size="large" />
          ) : question && (
            <View>
              <Text style={styles.sentence}>{`${qCount+1}. ${question.sentence}`}</Text>
              <Text style={styles.prompt}>「{question.target}」の読みを入力</Text>
              <TextInput style={styles.input} value={answer} onChangeText={setAnswer} placeholder="ひらがな" />
              <Button title="答える" onPress={checkAnswer} />
              {feedback !== '' && (
                <View style={styles.feedbackContainer}>
                  <Text style={styles.feedback}>{feedback}</Text>
                  <Button title={qCount < 9 ? "次へ" : "結果へ"} onPress={handleNext} />
                </View>
              )}
              <Text style={styles.diff}>学年:{question.grade} 難易度:{question.difficulty}</Text>
              <Button title="トップに戻る" onPress={() => goMode('menu')} />
            </View>
          )
        )}

        {/* 結果 */}
        {mode === 'result' && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultText}>10問中 {score}問 正解！</Text>
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
  subtitle: { fontSize: 20, marginBottom: 12 },
  sentence: { fontSize: 22, marginBottom: 8 },
  prompt: { fontSize: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#888', padding: 8, fontSize: 18, marginBottom: 8 },
  feedbackContainer: { marginTop: 8 },
  feedback: { fontSize: 18, marginBottom: 8 },
  diff: { marginTop: 12, color: '#666' },
  item: { padding: 8, borderBottomWidth: 1, borderColor: '#ddd' },
  resultContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  resultText: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 }
});

