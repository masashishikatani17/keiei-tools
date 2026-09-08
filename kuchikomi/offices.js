/* 事務所設定
   トークン（URLの ?t= の値）ごとに事務所情報を登録する。
   本番ではサーバー側で管理するが、試作版はこのファイルで代用する。
   reviewUrl は Googleビジネスプロフィールの「クチコミを書いてもらう」リンク
   （https://g.page/r/... または https://search.google.com/local/writereview?placeid=...） */
window.OFFICES = {
  'demo': {
    name: 'サンプル税理士事務所',
    reviewUrl: ''
  }
};
