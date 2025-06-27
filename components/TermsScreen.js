// components/TermsScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

const termsText = `
漢字リーダー 利用規約

本利用規約（以下「本規約」といいます。）は、Hideaki Yasukawa（以下「提供者」といいます。）が提供するアプリ「漢字リーダー」（以下「本サービス」といいます。）の利用条件を定めるものです。ユーザーは、本規約に同意の上で本サービスを利用するものとします。

第1条（適用）
本規約は、ユーザーが本サービスを利用するにあたり、提供者とユーザーとの間の一切の関係に適用されます。

第2条（利用条件）
本サービスは無料で提供され、ユーザー登録や個人情報の入力は一切必要ありません。

本サービスは、主に漢字の読みを問う問題を出題し、学習支援を目的としています。

第3条（禁止事項）
ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。

・法令または公序良俗に違反する行為
・本サービスの運営を妨げる行為
・本サービスの内容を無断で複製、改変、再配布する行為
・その他、提供者が不適切と判断する行為

第4条（免責事項）
本サービスの内容は、可能な限り正確を期しておりますが、誤りが含まれる可能性があります。提供者はその正確性・完全性・有用性を保証するものではありません。

本サービスの利用または利用不能により発生したいかなる損害についても、提供者は一切の責任を負いません。

第5条（著作権等）
本サービス内に掲載されているすべてのテキスト、デザイン、プログラム、その他の情報に関する著作権およびその他の知的財産権は、提供者であるHideaki Yasukawaに帰属します。これらを無断で使用・転載することを禁止します。

第6条（準拠法および裁判管轄）
本規約は日本法に準拠し、本サービスに関連して生じた紛うについては、日本の裁判所を第一審の専属的合意管轄裁判所とします。

第7条（Appleの使用許諾）
ユーザーは、本サービスがAppleのApp Storeから配布されるiOSアプリである場合、Appleのエンドユーザー使用許諾契約（EULA）に従って利用するものとします。
`;

export const TermsScreen = ({ onBack }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>利用規約</Text>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.termsText}>{termsText}</Text>
      </ScrollView>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>戻る</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  termsText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
  },
  backButton: {
    backgroundColor: '#007aff',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 16,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
