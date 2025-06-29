import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Constants from 'expo-constants';

const FilterScreen = ({
  maxGrade, setMaxGrade,
  maxDiff, setMaxDiff,
  minGrade, setMinGrade,
  onNavigate,
}) => {

  const handleMinGradeChange = (value) => {
    if (value > maxGrade) {
      setMaxGrade(value);
    }
    // 最高難易度が新しい最低学年より小さい場合は調整
    if (maxDiff < value) {
      setMaxDiff(value);
    }
    setMinGrade(value);
  };

  const handleMaxGradeChange = (value) => {
    if (value < minGrade) {
      setMinGrade(value);
    }
    setMaxGrade(value);
  };

  const openContactForm = async () => {
    const appVersion = Constants.expoConfig.version;
    const url = `https://docs.google.com/forms/d/e/1FAIpQLSfv4S7c-bzcITZCrQ4BHtVFztUom-lfcvY7GQsDUoP4sf4fvw/viewform?usp=pp_url&entry.1348739971=${appVersion}`;
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('エラー', 'フォームを開けませんでした。');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>出題範囲フィルター</Text>

      <View style={styles.filterRow}>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>最低学年</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={minGrade}
              style={styles.picker}
              onValueChange={(itemValue) => handleMinGradeChange(itemValue)}
            >
              {[...Array(6).keys()].map((i) => (
                <Picker.Item key={i + 1} label={`${i + 1}年`} value={i + 1} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>最高学年</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={maxGrade}
              style={styles.picker}
              onValueChange={(itemValue) => handleMaxGradeChange(itemValue)}
            >
              {[...Array(6).keys()].map((i) => (
                <Picker.Item key={i + 1} label={`${i + 1}年`} value={i + 1} />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      <View style={styles.singlePickerRow}>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>最高難易度</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={maxDiff}
              style={styles.picker}
              onValueChange={(itemValue) => setMaxDiff(itemValue)}
            >
              {[...Array(7 - minGrade + 1).keys()].map((i) => (
                <Picker.Item key={minGrade + i} label={`${minGrade + i}`} value={minGrade + i} />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>情報</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={openContactForm}
        >
          <Text style={styles.settingsButtonText}>お問い合わせ</Text>
          <Text style={styles.settingsButtonChevron}>&gt;</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => onNavigate('terms')}
        >
          <Text style={styles.settingsButtonText}>利用規約</Text>
          <Text style={styles.settingsButtonChevron}>&gt;</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  singlePickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pickerContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  pickerLabel: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  pickerWrapper: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    height: 150, // iOSでの表示改善のため高さを調整
  },
  picker: {
    width: '100%',
  },
  infoSection: {
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  settingsButton: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  settingsButtonText: {
    fontSize: 16,
  },
  settingsButtonChevron: {
    fontSize: 16,
    color: '#c7c7cc',
  },
});

export default FilterScreen;
