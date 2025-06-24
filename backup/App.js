import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { initDatabase, getKanjiByGrade, updateUserState, getUserState, insertInitialDataIfNeeded } from './db-memory';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('menu'); // 'menu', 'quiz', 'result'
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [quizData, setQuizData] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [score, setScore] = useState(0);
  const [userState, setUserState] = useState({
    xp_total: 0,
    current_level: 1,
    xp_to_next_level: 100,
    streak_count: 0
  });

  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('Step 1: Initializing database...');
        await initDatabase();
        console.log('✅ Database initialized');
        
        console.log('Step 2: Loading user state...');
        const state = await getUserState();
        setUserState(state);
        console.log('✅ User state loaded:', state);
        
        console.log('Step 3: Loading initial data...');
        await insertInitialDataIfNeeded();
        console.log('✅ Initial data loaded');
        
      } catch (error) {
        console.error('Initialization error:', error);
        Alert.alert('エラー', `アプリの初期化に失敗しました: ${error.message}`);
      }
    };
    
    initialize();
  }, []);

  const startQuiz = async (grade) => {
    try {
      const data = await getKanjiByGrade(grade);
      if (data.length === 0) {
        Alert.alert('エラー', `${grade}年生の漢字データが見つかりません`);
        return;
      }
      
      // ランダムに10問選択
      const shuffled = data.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, Math.min(10, data.length));
      
      setSelectedGrade(grade);
      setQuizData(selected);
      setCurrentQuestion(0);
      setUserAnswers([]);
      setScore(0);
      setCurrentScreen('quiz');
    } catch (error) {
      console.error('Quiz start error:', error);
      Alert.alert('エラー', 'クイズの開始に失敗しました');
    }
  };

  const handleAnswer = async (selectedAnswer) => {
    const currentQuiz = quizData[currentQuestion];
    const isCorrect = selectedAnswer === currentQuiz.reading;
    
    const newAnswers = [...userAnswers, {
      question: currentQuiz,
      selectedAnswer,
      isCorrect
    }];
    
    setUserAnswers(newAnswers);
    
    if (isCorrect) {
      setScore(score + 1);
    }

    if (currentQuestion + 1 < quizData.length) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // クイズ終了
      setCurrentScreen('result');
      
      // XP更新
      try {
        await updateUserState({ 
          isCorrect: isCorrect,
          resetStreak: !isCorrect 
        });
        
        // ユーザー状態を再取得
        const updatedState = await getUserState();
        setUserState(updatedState);
      } catch (error) {
        console.error('XP update error:', error);
      }
    }
  };

  const backToMenu = async () => {
    // メニューに戻る際にユーザー状態を更新
    try {
      const updatedState = await getUserState();
      setUserState(updatedState);
    } catch (error) {
      console.error('Failed to update user state:', error);
    }
    
    setCurrentScreen('menu');
    setSelectedGrade(null);
    setQuizData([]);
    setCurrentQuestion(0);
    setUserAnswers([]);
    setScore(0);
  };

  const renderMenu = () => (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>漢字クイズ</Text>
      
      <View style={styles.userStats}>
        <Text style={styles.statsText}>レベル: {userState.current_level}</Text>
        <Text style={styles.statsText}>XP: {userState.xp_total}</Text>
        <Text style={styles.statsText}>連続正解: {userState.streak_count}</Text>
        <Text style={styles.statsText}>次のレベルまで: {userState.xp_to_next_level}XP</Text>
      </View>

      <Text style={styles.gradeTitle}>学年を選択してください</Text>
      
      {[1, 2, 3, 4, 5, 6].map(grade => (
        <TouchableOpacity
          key={grade}
          style={styles.gradeButton}
          onPress={() => startQuiz(grade)}
        >
          <Text style={styles.gradeButtonText}>{grade}年生</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderQuiz = () => {
    if (quizData.length === 0) return null;
    
    const currentQuiz = quizData[currentQuestion];
    
    // 選択肢を生成（正解 + 3つのダミー）
    const options = [currentQuiz.reading];
    const allReadings = quizData.map(q => q.reading).filter(r => r !== currentQuiz.reading);
    
    while (options.length < 4 && allReadings.length > 0) {
      const randomReading = allReadings.splice(Math.floor(Math.random() * allReadings.length), 1)[0];
      if (!options.includes(randomReading)) {
        options.push(randomReading);
      }
    }
    
    // 選択肢をシャッフル
    const shuffledOptions = options.sort(() => 0.5 - Math.random());

    return (
      <View style={styles.container}>
        <Text style={styles.questionCounter}>
          問題 {currentQuestion + 1} / {quizData.length}
        </Text>
        
        <Text style={styles.sentence}>{currentQuiz.sentence}</Text>
        <Text style={styles.target}>「{currentQuiz.target}」の読み方は？</Text>
        
        {shuffledOptions.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={styles.optionButton}
            onPress={() => handleAnswer(option)}
          >
            <Text style={styles.optionText}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderResult = () => (
    <View style={styles.container}>
      <Text style={styles.title}>結果</Text>
      <Text style={styles.score}>
        {score} / {quizData.length} 問正解
      </Text>
      
      <Text style={styles.resultDetails}>詳細:</Text>
      
      <ScrollView style={styles.resultList}>
        {userAnswers.map((answer, index) => (
          <View key={index} style={styles.resultItem}>
            <Text style={styles.resultQuestion}>
              {answer.question.sentence}
            </Text>
            <Text style={styles.resultTarget}>
              「{answer.question.target}」
            </Text>
            <Text style={[
              styles.resultAnswer,
              { color: answer.isCorrect ? 'green' : 'red' }
            ]}>
              あなたの答え: {answer.selectedAnswer}
            </Text>
            {!answer.isCorrect && (
              <Text style={styles.correctAnswer}>
                正解: {answer.question.reading}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
      
      <TouchableOpacity style={styles.backButton} onPress={backToMenu}>
        <Text style={styles.backButtonText}>メニューに戻る</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'menu':
        return renderMenu();
      case 'quiz':
        return renderQuiz();
      case 'result':
        return renderResult();
      default:
        return renderMenu();
    }
  };

  return (
    <View style={styles.app}>
      <StatusBar style="auto" />
      {renderCurrentScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 50,
    marginBottom: 30,
    color: '#333',
  },
  userStats: {
    backgroundColor: '#e8f4fd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  statsText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  gradeTitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  gradeButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  gradeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  questionCounter: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  sentence: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    color: '#333',
  },
  target: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  optionButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  optionText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  score: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#4CAF50',
  },
  resultDetails: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  resultList: {
    flex: 1,
    marginBottom: 20,
  },
  resultItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  resultQuestion: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  resultTarget: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  resultAnswer: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  correctAnswer: {
    fontSize: 16,
    color: 'green',
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#FF9800',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
