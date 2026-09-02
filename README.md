# keiei-tools（経営tools）

経営者向け無料Webサイト「経営tools」のリポジトリです。

**経営の判断を、数字でもっと簡単に。**

経営者が日々直面する判断を、シンプルな数字で考えるための小さなツールを公開しています。公開URL: https://keiei-tools.jp/

## 公開中のツール

| ツール | パス |
| --- | --- |
| 1人採用したら、売上はいくら必要？ | `/hiring/` |
| 月にいくら売れば赤字にならない？（損益分岐点） | `/breakeven/` |
| 欲しい利益を出すには、売上がいくら必要？ | `/target-profit/` |
| 値上げしたら、客数が何％減っても大丈夫？ | `/price-up/` |
| その値引き、何個多く売れば元が取れる？ | `/discount/` |
| いまの現金で、会社はあと何か月もつ？ | `/cash/` |
| この借入、月々の返済額はいくら？ | `/loan/` |
| この設備投資、何年で回収できる？ | `/investment/` |
| その経費削減、売上いくら分の利益効果？ | `/cost-cut/` |
| うちの粗利益率は何％？ | `/margin/` |

## 技術構成

- HTML / CSS / Vanilla JavaScript のみの静的サイト（ビルド不要）
- 外部ライブラリ・CSSフレームワーク・CDN・外部Webフォントに依存しない
- 計算はすべてブラウザ内で完結し、入力内容の保存・送信は行わない
- GitHub Pages でそのまま公開できる（独自ドメイン keiei-tools.jp）
- スマートフォン・タブレット・PC対応のレスポンシブデザイン

## ファイル構成

```text
keiei-tools/
├── index.html          # トップページ（ツール一覧）
├── ツール名/
│   └── index.html      # 各ツールのページ（hiring, breakeven, ...）
├── css/
│   └── style.css       # 共通スタイル
├── js/
│   ├── common.js       # 共通ヘルパー（数値整形・入力検証・エラー表示）
│   └── ツール名.js      # 各ツールの計算処理
├── sitemap.xml
├── robots.txt
├── CNAME               # GitHub Pages 独自ドメイン設定
├── README.md
└── CLAUDE.md           # 実装方針
```

## 開発方針

[CLAUDE.md](CLAUDE.md) を参照してください。
