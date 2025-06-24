#!/bin/bash

# kanji-data.jsファイルを作成
cat > assets/kanji-data.js << 'DATA_EOF'
// assets/kanji-data.js
// kanji1_6.tsvファイルの内容を静的にエクスポート

export const kanjiTsvData = `DATA_EOF

# TSVファイルの内容を追加
cat assets/kanji1_6.tsv >> assets/kanji-data.js

# ファイルの終了部分を追加
cat >> assets/kanji-data.js << 'END_EOF'
`;
END_EOF

echo "✅ kanji-data.js が作成されました"
echo "データ行数: $(cat assets/kanji1_6.tsv | wc -l)"
