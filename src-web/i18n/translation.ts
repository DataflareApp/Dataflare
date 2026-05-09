export enum Language {
    de = 'de',
    en = 'en',
    frFR = 'fr-FR',
    zhCN = 'zh-CN',
    ja = 'ja'
}

export const translationText = {
    help: {
        [Language.en]: 'Help & Feedback',
        [Language.de]: 'Hilfe & Feedback',
        [Language.frFR]: 'Aide & Retour',
        [Language.zhCN]: '帮助和反馈',
        [Language.ja]: 'ヘルプとフィードバック'
    },
    bugAndFeature: {
        [Language.en]: 'Bug report & Feature request',
        [Language.de]: 'Fehlerberichte & Verbesserungswünsche',
        [Language.frFR]: 'Rapport de bug & Demande de fonctionnalité',
        [Language.zhCN]: '错误报告和功能请求',
        [Language.ja]: 'バグ報告と機能要望'
    },
    privacyPolicy: {
        [Language.en]: 'Privacy policy',
        [Language.de]: 'Datenschutzerklärung',
        [Language.frFR]: 'Politique de confidentialité',
        [Language.zhCN]: '隐私政策',
        [Language.ja]: 'プライバシーポリシー'
    },
    followDataflare: {
        [Language.en]: 'Follow Dataflare',
        [Language.de]: 'Folge Dataflare',
        [Language.frFR]: 'Suivre Dataflare',
        [Language.zhCN]: '关注 Dataflare',
        [Language.ja]: 'Dataflareをフォローする'
    },
    whatsnew: {
        [Language.en]: `What's new?`,
        [Language.de]: 'Was ist neu?',
        [Language.frFR]: 'Nouveautées',
        [Language.zhCN]: '更新记录',
        [Language.ja]: '新着情報'
    },
    settings: {
        [Language.en]: 'Settings',
        [Language.de]: 'Einstellungen',
        [Language.frFR]: 'Paramètres',
        [Language.zhCN]: '设置',
        [Language.ja]: '設定'
    },
    language: {
        [Language.en]: 'Language',
        [Language.de]: 'Sprache',
        [Language.frFR]: 'Langue',
        [Language.zhCN]: '显示语言',
        [Language.ja]: '言語'
    },
    appearance: {
        [Language.en]: 'Appearance',
        [Language.de]: 'Aussehen',
        [Language.frFR]: 'Apparence',
        [Language.zhCN]: '外观',
        [Language.ja]: '外観'
    },
    zoom: {
        [Language.en]: 'Zoom',
        [Language.de]: 'Vergrößerung',
        [Language.frFR]: 'Zoom',
        [Language.zhCN]: '缩放',
        [Language.ja]: 'ズーム'
    },
    formatNumber: {
        [Language.en]: `Format Number`,
        [Language.de]: 'Formatiere Zahlen',
        [Language.frFR]: `Formater les nombres`,
        [Language.zhCN]: `格式化数字`,
        [Language.ja]: '数値の書式設定'
    },
    displayBytesAs: {
        [Language.en]: `Display Bytes as`,
        [Language.de]: 'Bytes anzeigen als',
        [Language.frFR]: `Afficher octets comme`,
        [Language.zhCN]: `显示字节为`,
        [Language.ja]: 'バイトの表示形式'
    },
    columnTransform: {
        [Language.en]: `Column Transform`,
        [Language.de]: 'Spaltenumwandlung',
        [Language.frFR]: `Transformation de colonne`,
        [Language.zhCN]: `列转换`,
        [Language.ja]: '列の変換'
    },
    columnTransformMsg: {
        [Language.en]: `Transform data in columns that meet the criteria`,
        [Language.de]: 'Daten in Spalten umwandeln, die die Kriterien erfüllen',
        [Language.frFR]: `Transformer les données dans les colonnes qui répondent aux critères`,
        [Language.zhCN]: `将符合条件的列进行数据转换`,
        [Language.ja]: '条件を満たす列のデータを変換する'
    },
    transformTableHelp: {
        [Language.en]: `Use 'Regex' to match table names\nIf empty, it will match all tables (including results from 'SQL Query')\nIf not empty, it will only match specified tables`,
        [Language.de]: `Verwenden Sie 'Regex', um Tabellennamen abzugleichen\nWenn leer, werden alle Tabellen abgeglichen (einschließlich der Ergebnisse von 'SQL-Abfragen')\nWenn nicht leer, werden nur die angegebenen Tabellen abgeglichen`,
        [Language.frFR]: `Utiliser 'Regex' pour faire correspondre les noms de tables\nSi vide, cela correspondra à toutes les tables (y compris les résultats des 'requêtes SQL')\nSi non vide, cela ne correspondra qu'aux tables spécifiées`,
        [Language.zhCN]: `使用 '正则表达式' 匹配表名\n如果为空则将匹配所有表格 (包括 'SQL 查询' 的结果)\n如果不为空则将只匹配指定表格`,
        [Language.ja]: `正規表現を使用してテーブル名を照合します\n空の場合、すべてのテーブル（「SQLクエリ」の結果を含む）が照合されます\n空でない場合、指定されたテーブルのみが照合されます`
    },
    transformColumnHelp: {
        [Language.en]: `Use 'Regex' to match column names\nIf empty, this rule will be ignored\nIf not empty, it will match specified columns`,
        [Language.de]: `Verwenden Sie 'Regex', um Spaltennamen abzugleichen\nWenn leer, wird diese Regel ignoriert\nWenn nicht leer, werden die angegebenen Spalten abgeglichen`,
        [Language.frFR]: `Utiliser 'Regex' pour faire correspondre les noms de colonnes\nSi vide, cette règle sera ignorée\nSi non vide, cela correspondra aux colonnes spécifiées`,
        [Language.zhCN]: `使用 '正则表达式' 匹配列名\n如果为空则会忽略该规则\n如果不为空则将匹配指定列`,
        [Language.ja]: `正規表現を使用して列名を照合します\n空の場合、この規則は無視されます\n空でない場合、指定された列が照合されます`
    },
    on: {
        [Language.en]: `On`,
        [Language.de]: 'An',
        [Language.frFR]: 'Activé',
        [Language.zhCN]: `开`,
        [Language.ja]: 'オン'
    },
    off: {
        [Language.en]: `Off`,
        [Language.de]: 'Aus',
        [Language.frFR]: 'Déasactivé',
        [Language.zhCN]: `关`,
        [Language.ja]: 'オフ'
    },
    fontFamily: {
        [Language.en]: 'Font Family',
        [Language.de]: 'Schriftart',
        [Language.frFR]: 'Police',
        [Language.zhCN]: '字体',
        [Language.ja]: 'フォントファミリー'
    },
    fontSize: {
        [Language.en]: 'Font Size',
        [Language.de]: 'Schriftgröße',
        [Language.frFR]: 'Taille de police',
        [Language.zhCN]: '字体大小',
        [Language.ja]: 'フォントサイズ'
    },
    lineHeight: {
        [Language.en]: 'Line Height',
        [Language.de]: 'Zeilenhöhe',
        [Language.frFR]: 'Hauteur de ligne',
        [Language.zhCN]: '行高',
        [Language.ja]: '行の高さ'
    },
    wordWrap: {
        [Language.en]: 'Word Wrap',
        [Language.de]: 'Umbruch',
        [Language.frFR]: 'Retour à la ligne',
        [Language.zhCN]: '自动换行',
        [Language.ja]: '右端で折り返す'
    },
    about: {
        [Language.en]: 'About',
        [Language.de]: 'Über',
        [Language.frFR]: 'À propos',
        [Language.zhCN]: '关于',
        [Language.ja]: '情報'
    },
    activate: {
        [Language.en]: `Activate`,
        [Language.de]: 'Aktivieren',
        [Language.frFR]: 'Activé',
        [Language.zhCN]: `激活`,
        [Language.ja]: 'アクティベート'
    },
    activateLimit: {
        [Language.en]: `You are currently using the free version, which can create a maximum of 2 database connections.`,
        [Language.de]: `Sie verwenden derzeit die kostenlose Version, die maximal 2 Datenbankverbindungen erstellen kann.`,
        [Language.frFR]: `Vous utilisez actuellement la version gratuite, qui peut créer un maximum de 2 connexions de base de données.`,
        [Language.zhCN]: `您当前使用的是免费版本，最多可以创建 2 个数据库连接。`,
        [Language.ja]: '現在、無料版を使用しています。作成できるデータベース接続は最大2つです。'
    },
    licenseKey: {
        [Language.en]: `License Key`,
        [Language.de]: 'Lizenzschlüssel',
        [Language.frFR]: `Clé de licence`,
        [Language.zhCN]: `许可证密钥`,
        [Language.ja]: 'ライセンスキー'
    },
    activateSuccessTitle: {
        [Language.en]: 'Activation Successful',
        [Language.de]: 'Aktivierung Erfolgreich',
        [Language.frFR]: 'Activation Réussie',
        [Language.zhCN]: '激活成功',
        [Language.ja]: 'アクティベーション成功'
    },
    activateSuccessMessage: {
        [Language.en]: `You have successfully activated Dataflare!`,
        [Language.de]: 'Sie haben Dataflare erfolgreich aktiviert!',
        [Language.frFR]: `Vous avez activé Dataflare avec succès !`,
        [Language.zhCN]: `你已成功激活 Dataflare!`,
        [Language.ja]: 'Dataflareのアクティベーションに成功しました！'
    },
    purchaseLicense: {
        [Language.en]: `Purchase License`,
        [Language.de]: 'Lizenz erwerben',
        [Language.frFR]: `Acheter un license`,
        [Language.zhCN]: `购买许可证`,
        [Language.ja]: 'ライセンスの購入'
    },
    licenseManager: {
        [Language.en]: `License Manager`,
        [Language.de]: 'Lizenz-Verwaltung',
        [Language.frFR]: `Gestionnaire de license`,
        [Language.zhCN]: `许可证管理器`,
        [Language.ja]: 'ライセンスマネージャー'
    },
    table: {
        [Language.en]: `Table`,
        [Language.de]: 'Tabelle',
        [Language.frFR]: `Table`,
        [Language.zhCN]: `表格`,
        [Language.ja]: 'テーブル'
    },
    newTable: {
        [Language.en]: `New Table`,
        [Language.de]: 'Neue Tabelle',
        [Language.frFR]: `Nouvelle table`,
        [Language.zhCN]: `新建表`,
        [Language.ja]: '新規テーブル'
    },
    newQuery: {
        [Language.en]: `New Query`,
        [Language.de]: 'Neue Abfrage',
        [Language.frFR]: `Nouvelle requête`,
        [Language.zhCN]: `新建查询`,
        [Language.ja]: '新規クエリ'
    },
    manageConnection: {
        [Language.en]: `Manage Connections`,
        [Language.de]: 'Verbindungen verwalten',
        [Language.frFR]: `Gérer les connexions`,
        [Language.zhCN]: `管理连接`,
        [Language.ja]: '接続の管理'
    },
    dashboard: {
        [Language.en]: `Dashboard`,
        [Language.de]: 'Dashboard',
        [Language.frFR]: `Tableau de bord`,
        [Language.zhCN]: `仪表盘`,
        [Language.ja]: 'ダッシュボード'
    },
    schemaManager: {
        [Language.en]: `Schema Manager`,
        [Language.de]: 'Schema-Manager',
        [Language.frFR]: `Gestionnaire de schemas`,
        [Language.zhCN]: `模式管理器`,
        [Language.ja]: 'スキーママネージャー'
    },
    functionManager: {
        [Language.en]: `Function Manager`,
        [Language.de]: 'Funktions-Manager',
        [Language.frFR]: `Gestionnaire de functions`,
        [Language.zhCN]: `函数管理器`,
        [Language.ja]: '関数マネージャー'
    },
    triggerManager: {
        [Language.en]: `Trigger Manager`,
        [Language.de]: 'Auslöser-Manager',
        [Language.frFR]: `Gestionnaire de triggers`,
        [Language.zhCN]: `触发器管理器`,
        [Language.ja]: 'トリガーマネージャー'
    },
    extensionManager: {
        [Language.en]: `Extension Manager`,
        [Language.de]: 'Erweiterungs-Manager',
        [Language.frFR]: `Gestionnaire de extensions`,
        [Language.zhCN]: `扩展管理器`,
        [Language.ja]: '拡張機能マネージャー'
    },
    search: {
        [Language.en]: `Search...`,
        [Language.de]: 'Suchen...',
        [Language.frFR]: `Rechercher ...`,
        [Language.zhCN]: `搜索...`,
        [Language.ja]: '検索...'
    },
    noSearchResult: {
        [Language.en]: `No result`,
        [Language.de]: 'Keine Ergebnisse',
        [Language.frFR]: `Aucun résultat`,
        [Language.zhCN]: `无搜索结果`,
        [Language.ja]: '結果なし'
    },
    hiddenPassword: {
        [Language.en]: `Hide password`,
        [Language.de]: 'Passwort ausblenden',
        [Language.frFR]: `Cacher le mot de passe`,
        [Language.zhCN]: `隐藏密码`,
        [Language.ja]: 'パスワードを非表示'
    },
    showPassword: {
        [Language.en]: `Show password`,
        [Language.de]: 'Passwort zeigen',
        [Language.frFR]: `Afficher le mot de passe`,
        [Language.zhCN]: `显示密码`,
        [Language.ja]: 'パスワードを表示'
    },
    showSuggestions: {
        [Language.en]: `Show suggestions`,
        [Language.de]: 'Zeige Vorschläge',
        [Language.frFR]: `Afficher les suggestions`,
        [Language.zhCN]: `显示建议`,
        [Language.ja]: 'サジェストを表示'
    },
    send: {
        [Language.en]: `Send`,
        [Language.de]: 'Senden',
        [Language.frFR]: `Envoyer`,
        [Language.zhCN]: `发送`,
        [Language.ja]: '送信'
    },
    cancel: {
        [Language.en]: `Cancel`,
        [Language.de]: 'Abbrechen',
        [Language.frFR]: `Annuler`,
        [Language.zhCN]: `取消`,
        [Language.ja]: 'キャンセル'
    },
    ok: {
        [Language.en]: `Ok`,
        [Language.de]: 'Annehmen',
        [Language.frFR]: `Ok`,
        [Language.zhCN]: `确定`,
        [Language.ja]: 'OK'
    },
    error: {
        [Language.en]: `Error`,
        [Language.de]: 'Fehler',
        [Language.frFR]: `Erreur`,
        [Language.zhCN]: `错误`,
        [Language.ja]: 'エラー'
    },
    close: {
        [Language.en]: `Close`,
        [Language.de]: 'Schließen',
        [Language.frFR]: `Fermer`,
        [Language.zhCN]: `关闭`,
        [Language.ja]: '閉じる'
    },
    invalidConnectionURL: {
        [Language.en]: `Invalid connection URL`,
        [Language.de]: 'Ungültige Verbindungs-URL',
        [Language.frFR]: `URL de connexion invalide`,
        [Language.zhCN]: `无效的连接 URL`,
        [Language.ja]: '無効な接続URL'
    },
    unsupportedProtocol: {
        [Language.en]: `Unsupported protocol`,
        [Language.de]: 'Nicht unterstütztes Protokoll',
        [Language.frFR]: `Protocole non supporter`,
        [Language.zhCN]: `不支持的协议`,
        [Language.ja]: 'サポートされていないプロトコル'
    },
    connection: {
        [Language.en]: `Connection`,
        [Language.de]: 'Verbindung',
        [Language.frFR]: `Connexion`,
        [Language.zhCN]: `连接`,
        [Language.ja]: '接続'
    },
    noConnections: {
        [Language.en]: `No connection`,
        [Language.de]: 'Keine Verbindungen',
        [Language.frFR]: `Aucune connexion`,
        [Language.zhCN]: `无连接`,
        [Language.ja]: '接続なし'
    },
    import: {
        [Language.en]: `Import`,
        [Language.de]: 'Importieren',
        [Language.frFR]: `Importer`,
        [Language.zhCN]: `导入`,
        [Language.ja]: 'インポート'
    },
    export: {
        [Language.en]: `Export`,
        [Language.de]: 'Exportieren',
        [Language.frFR]: `Exporter`,
        [Language.zhCN]: `导出`,
        [Language.ja]: 'エクスポート'
    },
    success: {
        [Language.en]: `Success`,
        [Language.de]: 'Erfolgreich',
        [Language.frFR]: `Succès`,
        [Language.zhCN]: `成功`,
        [Language.ja]: '成功'
    },
    delete: {
        [Language.en]: `Delete`,
        [Language.de]: 'Löschen',
        [Language.frFR]: `Supprimer`,
        [Language.zhCN]: `删除`,
        [Language.ja]: '削除'
    },
    edit: {
        [Language.en]: `Edit`,
        [Language.de]: `Bearbeiten`,
        [Language.frFR]: `Éditer`,
        [Language.zhCN]: `编辑`,
        [Language.ja]: '編集'
    },
    restore: {
        [Language.en]: `Restore`,
        [Language.de]: 'Wiederherstellen',
        [Language.frFR]: `Restorer`,
        [Language.zhCN]: `还原`,
        [Language.ja]: '復元'
    },
    newConnection: {
        [Language.en]: `New Connection`,
        [Language.de]: 'Neue Verbindung',
        [Language.frFR]: `Nouvelle connexion`,
        [Language.zhCN]: `新建连接`,
        [Language.ja]: '新規接続'
    },
    reconnect: {
        [Language.en]: `Reconnect`,
        [Language.de]: 'Erneut verbinden',
        [Language.frFR]: `Reconnexion`,
        [Language.zhCN]: `重新连接`,
        [Language.ja]: '再接続'
    },
    importFromURL: {
        [Language.en]: `Import from URL`,
        [Language.de]: 'Aus URL importieren',
        [Language.frFR]: `Importer depuis l'URL`,
        [Language.zhCN]: `从 URL 导入`,
        [Language.ja]: 'URLからインポート'
    },
    exportConnectionDesc: {
        [Language.en]: `The file (.json) to be exported is not encrypted. Please securely store it!`,
        [Language.de]:
            'Die exportierte Datei (.json) ist nicht verschlüsselt. Bitte bewahren Sie sie an einem sicheren Ort auf!',
        [Language.frFR]: `Le fichier (.json) à exporter n'est pas crypté. Veuillez le stocker de manière sécurisée !`,
        [Language.zhCN]: `将要导出的文件（.json）未加密，请安全的保存它！`,
        [Language.ja]: 'エクスポートされるファイル（.json）は暗号化されていません。安全に保管してください！'
    },
    deleteConnection: {
        [Language.en]: `Delete Connection`,
        [Language.de]: 'Verbindung entfernen',
        [Language.frFR]: `Supprimer la connexion`,
        [Language.zhCN]: `删除连接`,
        [Language.ja]: '接続の削除'
    },
    duplicate: {
        [Language.en]: `Duplicate`,
        [Language.de]: 'Klonen',
        [Language.frFR]: `Dupliquer`,
        [Language.zhCN]: `制作副本`,
        [Language.ja]: '複製'
    },
    connectionSuccess: {
        [Language.en]: `Connection successful`,
        [Language.de]: 'Verbindung erfolgreich',
        [Language.frFR]: `Connexion réussie`,
        [Language.zhCN]: `连接成功`,
        [Language.ja]: '接続に成功しました'
    },
    insertSuccess: {
        [Language.en]: `Insert successful`,
        [Language.de]: 'Einfügen erfolgreich',
        [Language.frFR]: `Insertion réussie`,
        [Language.zhCN]: `插入成功`,
        [Language.ja]: '挿入に成功しました'
    },
    saveFailed: {
        [Language.en]: `Save failed`,
        [Language.de]: 'Speicher fehlgeschlagen',
        [Language.frFR]: `Échec de la sauvegarde`,
        [Language.zhCN]: `保存失败`,
        [Language.ja]: '保存に失敗しました'
    },
    mode: {
        [Language.en]: `Mode`,
        [Language.de]: 'Modus',
        [Language.frFR]: `Mode`,
        [Language.zhCN]: `模式`,
        [Language.ja]: 'モード'
    },
    test: {
        [Language.en]: `Test`,
        [Language.de]: 'Testen',
        [Language.frFR]: `Tester`,
        [Language.zhCN]: `测试`,
        [Language.ja]: 'テスト'
    },
    connect: {
        [Language.en]: `Connect`,
        [Language.de]: 'Verbinden',
        [Language.frFR]: `Se connecter`,
        [Language.zhCN]: `连接`,
        [Language.ja]: '接続'
    },
    connectInNewWindow: {
        [Language.en]: 'Connect in New Window',
        [Language.de]: 'In neuem Fenster verbinden',
        [Language.frFR]: 'Connecter dans une nouvelle fenêtre',
        [Language.zhCN]: '在新窗口中连接',
        [Language.ja]: '新しいウィンドウで接続'
    },
    port: {
        [Language.en]: `Port`,
        [Language.de]: 'Port',
        [Language.frFR]: `Port`,
        [Language.zhCN]: `端口`,
        [Language.ja]: 'ポート'
    },
    select: {
        [Language.en]: `Select file`,
        [Language.de]: 'Datei auswählen',
        [Language.frFR]: `Sélectionner un fichier`,
        [Language.zhCN]: `选择文件`,
        [Language.ja]: 'ファイルを選択'
    },
    readOnly: {
        [Language.en]: `Read-only`,
        [Language.de]: 'Nur lesen',
        [Language.frFR]: `Lecture seule`,
        [Language.zhCN]: `只读`,
        [Language.ja]: '読み取り専用'
    },
    readWrite: {
        [Language.en]: `Read / Write`,
        [Language.de]: 'Lesen / Schreiben',
        [Language.frFR]: `Lecture / Écriture`,
        [Language.zhCN]: `读 / 写`,
        [Language.ja]: '読み取り/書き込み'
    },
    readOnlyWarning: {
        [Language.en]: `Note: 'Read-only' mode only limits UI changes, It is not entirely secure.`,
        [Language.de]: `Hinweis: „Nur lesen"-Modus beschränkt lediglich die Änderungen über die `,
        [Language.frFR]: `Remarque : le mode "lecture seule" ne fait que limiter les modifications de l'interface utilisateur et n'est pas entièrement sécurisé.`,
        [Language.zhCN]: `注意：'只读' 模式只能限制 UI 方面的更改，它并不完全安全。`,
        [Language.ja]: '注意: 「読み取り専用」モードはUIの変更を制限するだけであり、完全に安全というわけではありません。'
    },
    d1ProxyMsg: {
        [Language.en]: `You only need to set this option when you need to connect to the D1 database through a reverse proxy.`,
        [Language.de]:
            'Diese Einstellung müssen Sie nur aktivieren, wenn Sie sich mit einer D1-Datenbank über einen Reverse Proxy verbinden.',
        [Language.frFR]: `Vous devez uniquement définir cette option lorsque vous avez besoin de vous connecter à la base de données D1 via un proxy inverse.`,
        [Language.zhCN]: `仅当你需要通过反向代理连接到 D1 数据库时才需要设置此项`,
        [Language.ja]: 'リバースプロキシを介してD1データベースに接続する必要がある場合にのみ、このオプションを設定する必要があります。'
    },
    name: {
        [Language.en]: `Name`,
        [Language.de]: 'Name',
        [Language.frFR]: `Nom`,
        [Language.zhCN]: `名称`,
        [Language.ja]: '名前'
    },
    type: {
        [Language.en]: `Type`,
        [Language.de]: 'Typ',
        [Language.frFR]: `Type`,
        [Language.zhCN]: `类型`,
        [Language.ja]: 'タイプ'
    },
    tursoRemote: {
        [Language.en]: `Remote`,
        [Language.de]: 'Remote',
        [Language.frFR]: `Distant`,
        [Language.zhCN]: `远程连接`,
        [Language.ja]: 'リモート'
    },
    host: {
        [Language.en]: `Host`,
        [Language.de]: 'Host',
        [Language.frFR]: `Hôte`,
        [Language.zhCN]: `主机`,
        [Language.ja]: 'ホスト'
    },
    user: {
        [Language.en]: `User`,
        [Language.de]: 'Benutzer',
        [Language.frFR]: `Utilisateur`,
        [Language.zhCN]: `用户名`,
        [Language.ja]: 'ユーザー'
    },
    account: {
        [Language.en]: `Account`,
        [Language.de]: 'Konto',
        [Language.frFR]: `Compte`,
        [Language.zhCN]: `帐户`,
        [Language.ja]: 'アカウント'
    },
    password: {
        [Language.en]: `Password`,
        [Language.de]: 'Passwort',
        [Language.frFR]: `Mot de passe`,
        [Language.zhCN]: `密码`,
        [Language.ja]: 'パスワード'
    },
    database: {
        [Language.en]: `Database`,
        [Language.de]: 'Datenbank',
        [Language.frFR]: `Base de données`,
        [Language.zhCN]: `数据库`,
        [Language.ja]: 'データベース'
    },
    auth: {
        [Language.en]: `Auth`,
        [Language.de]: 'Authentifizierung',
        [Language.frFR]: `Authentification`,
        [Language.zhCN]: `认证`,
        [Language.ja]: '認証'
    },
    sqlserverLogged: {
        [Language.en]: `Currently logged in user`,
        [Language.de]: 'Aktuell angemeldeter Benutzer',
        [Language.frFR]: `Utilisateur connecté`,
        [Language.zhCN]: `当前登录的用户`,
        [Language.ja]: '現在ログインしているユーザー'
    },
    sslMode: {
        [Language.en]: `SSL Mode`,
        [Language.de]: 'SSL-Modus',
        [Language.frFR]: `Mode SSL`,
        [Language.zhCN]: `SSL 模式`,
        [Language.ja]: 'SSLモード'
    },
    proxy: {
        [Language.en]: `Proxy`,
        [Language.de]: 'Proxy',
        [Language.frFR]: `Proxy`,
        [Language.zhCN]: `代理`,
        [Language.ja]: 'プロキシ'
    },
    initialSQL: {
        [Language.en]: 'Initial SQL',
        [Language.de]: 'Initiales SQL',
        [Language.frFR]: 'SQL initial',
        [Language.zhCN]: '初始 SQL',
        [Language.ja]: '初期SQL'
    },
    initialSQLDesc: {
        [Language.en]: `SQL statements to be executed immediately after establishing a connection.`,
        [Language.de]: `SQL-Anweisungen, die unmittelbar nach dem Aufbau einer Verbindung ausgeführt werden.`,
        [Language.frFR]: `Instructions SQL à exécuter immédiatement après l'établissement d'une connexion.`,
        [Language.zhCN]: `在建立连接后立即执行的 SQL 语句。`,
        [Language.ja]: '接続確立直後に実行されるSQLステートメント。'
    },
    tursoNotSupportedInitialSQL: {
        [Language.en]: `Note: Only local Turso/libSQL supports this option, it will be ignored for remote connections.`,
        [Language.de]: `Hinweis: Nur lokales Turso/libSQL unterstützt diese Option, sie wird für Fernverbindungen ignoriert.`,
        [Language.frFR]: `Note : Seul Turso/libSQL local prend en charge cette option, elle sera ignorée pour les connexions distantes.`,
        [Language.zhCN]: `注意：仅本地 Turso/libSQL 支持该选项，对于远程连接将会忽略。`,
        [Language.ja]: '注意: ローカルのTurso/libSQLのみがこのオプションをサポートしています。リモート接続では無視されます。'
    },
    disable: {
        [Language.en]: `Disable`,
        [Language.de]: 'Deaktivieren',
        [Language.frFR]: `Désactiver`,
        [Language.zhCN]: `禁用`,
        [Language.ja]: '無効'
    },
    defaultSchema: {
        [Language.en]: `Default Schema`,
        [Language.de]: 'Standard Schema',
        [Language.frFR]: `Schéma par défaut`,
        [Language.zhCN]: `默认模式`,
        [Language.ja]: 'デフォルトスキーマ'
    },
    installExtAt: {
        [Language.en]: `Install extension's objects at:`,
        [Language.de]: 'Erweiterungen hier installieren:',
        [Language.frFR]: `Installez les objets de l'extension à :`,
        [Language.zhCN]: `将扩展的对象安装在：`,
        [Language.ja]: '拡張機能オブジェクトのインストール先:'
    },
    proxyDisabled: {
        [Language.en]: `Disabled`,
        [Language.de]: 'Deaktivieren',
        [Language.frFR]: `Désactivé`,
        [Language.zhCN]: `已禁用`,
        [Language.ja]: '無効'
    },
    key: {
        [Language.en]: `Key`,
        [Language.de]: 'Schlüssel',
        [Language.frFR]: `Clé`,
        [Language.zhCN]: `密钥`,
        [Language.ja]: 'キー'
    },
    privateKey: {
        [Language.en]: `Private Key`,
        [Language.de]: 'Privater Schlüssel',
        [Language.frFR]: `Clé privé`,
        [Language.zhCN]: `私钥`,
        [Language.ja]: '秘密鍵'
    },
    importPrivateKey: {
        [Language.en]: `Import Private Key`,
        [Language.de]: 'Privaten Schlüssel importieren',
        [Language.frFR]: `Importer la clé privé`,
        [Language.zhCN]: `导入私钥`,
        [Language.ja]: '秘密鍵のインポート'
    },
    protocol: {
        [Language.en]: `Protocol`,
        [Language.de]: 'Protokoll',
        [Language.frFR]: `Procotole`,
        [Language.zhCN]: `协议`,
        [Language.ja]: 'プロトコル'
    },
    cert: {
        [Language.en]: `Certificate`,
        [Language.de]: 'Zertifikat',
        [Language.frFR]: `Certificat`,
        [Language.zhCN]: `证书`,
        [Language.ja]: '証明書'
    },
    ca: {
        [Language.en]: `CA`,
        [Language.de]: 'CA',
        [Language.frFR]: `CA`,
        [Language.zhCN]: `根证书`,
        [Language.ja]: 'CA'
    },
    allowInvalidCerts: {
        [Language.en]: `Allow Invalid Certs`,
        [Language.de]: 'Ungültige Zertifikate erlauben',
        [Language.frFR]: `Autoriser les certificats non valides`,
        [Language.zhCN]: `允许无效证书`,
        [Language.ja]: '無効な証明書を許可'
    },
    system: {
        [Language.en]: `System`,
        [Language.de]: 'System',
        [Language.frFR]: `Système`,
        [Language.zhCN]: `系统`,
        [Language.ja]: 'システム'
    },
    certWarning: {
        [Language.en]: `Warning: Any certificate from any site will be used with trust, which poses a serious risk.`,
        [Language.de]:
            'Warnung: Es wird jedem Zertifikat uneingeschränkt vertraut. Dies stellt ein ernsthaftes Risiko dar.',
        [Language.frFR]: `Avertissement : Tout certificat provenant de n'importe quel site sera utilisé avec confiance, ce qui présente un risque sérieux.`,
        [Language.zhCN]: `注意：来自任何站点的任何证书都将被信任，这可能会带来严重的风险。`,
        [Language.ja]: '警告: あらゆるサイトの証明書が無条件で信頼されるため、重大なリスクを伴います。'
    },
    disableHostnameVerificationWarning: {
        [Language.en]:
            'Warning: Disabling hostname verification will accept any valid certificate, which may pose serious man-in-the-middle attack risks.',
        [Language.de]:
            'Warnung: Die Deaktivierung der Hostnamenüberprüfung akzeptiert jedes gültige Zertifikat, was ernsthafte Man-in-the-Middle-Angriffsrisiken birgt.',
        [Language.frFR]:
            'Avertissement : La désactivation de la vérification du nom d\'hôte acceptera tout certificat valide, ce qui peut présenter de graves risques d\'attaque de type "homme du milieu".',
        [Language.zhCN]: '警告：禁用主机名验证将接受任何有效的证书，这可能会带来严重的中间人攻击风险。',
        [Language.ja]: '警告: ホスト名検証を無効にすると、すべての有効な証明書が受け入れられ、重大な中間者攻撃のリスクが発生する可能性があります。'
    },
    general: {
        [Language.en]: `General`,
        [Language.de]: 'Allgemein',
        [Language.frFR]: `Général`,
        [Language.zhCN]: `通用`,
        [Language.ja]: '一般'
    },
    security: {
        [Language.en]: `Security`,
        [Language.de]: 'Sicherheit',
        [Language.frFR]: `Sécurtité`,
        [Language.zhCN]: `安全`,
        [Language.ja]: 'セキュリティ'
    },
    reselect: {
        [Language.en]: `Reselect`,
        [Language.de]: 'Erneut auswählen',
        [Language.frFR]: `Re-sélectionner`,
        [Language.zhCN]: `重新选择`,
        [Language.ja]: '再選択'
    },
    clear: {
        [Language.en]: `Clear`,
        [Language.de]: 'Leeren',
        [Language.frFR]: `Éffacer`,
        [Language.zhCN]: `清除`,
        [Language.ja]: 'クリア'
    },
    column: {
        [Language.en]: `Column`,
        [Language.de]: 'Spalte',
        [Language.frFR]: `Colonne`,
        [Language.zhCN]: `列`,
        [Language.ja]: '列'
    },
    datatype: {
        [Language.en]: `Data Type`,
        [Language.de]: 'Datentyp',
        [Language.frFR]: `Type de donnée`,
        [Language.zhCN]: `数据类型`,
        [Language.ja]: 'データ型'
    },
    defaultValue: {
        [Language.en]: `Default`,
        [Language.de]: 'Standard',
        [Language.frFR]: `Défaut`,
        [Language.zhCN]: `默认值`,
        [Language.ja]: 'デフォルト'
    },
    check: {
        [Language.en]: `Check`,
        [Language.de]: 'Prüfen',
        [Language.frFR]: `Vérification`,
        [Language.zhCN]: `检查`,
        [Language.ja]: 'チェック'
    },
    expression: {
        [Language.en]: `Expression`,
        [Language.de]: 'Ausdruck',
        [Language.frFR]: `Expression`,
        [Language.zhCN]: `表达式`,
        [Language.ja]: '式'
    },
    automatic: {
        [Language.en]: `Automatic`,
        [Language.de]: 'Automatisch',
        [Language.frFR]: `Automatique`,
        [Language.zhCN]: `自动`,
        [Language.ja]: '自動'
    },
    foreignKey: {
        [Language.en]: `Foreign Key`,
        [Language.de]: 'Fremdschlüssel',
        [Language.frFR]: `Clé étrangère`,
        [Language.zhCN]: `外键`,
        [Language.ja]: '外部キー'
    },
    add: {
        [Language.en]: `Add`,
        [Language.de]: 'Hinzufügen',
        [Language.frFR]: `Ajouter`,
        [Language.zhCN]: `添加`,
        [Language.ja]: '追加'
    },
    addForeignKey: {
        [Language.en]: `Add Foreign Key`,
        [Language.de]: 'Fremdschlüssel hinzufügen',
        [Language.frFR]: `Ajouter une clé étrangère`,
        [Language.zhCN]: `添加外键`,
        [Language.ja]: '外部キーの追加'
    },
    referencedSchema: {
        [Language.en]: `Referenced Schema`,
        [Language.de]: 'Referenziertes Schema',
        [Language.frFR]: `Schéma référencé`,
        [Language.zhCN]: `引用的模式`,
        [Language.ja]: '参照スキーマ'
    },
    referencedTable: {
        [Language.en]: `Referenced Table`,
        [Language.de]: 'Referenzierte Tabelle',
        [Language.frFR]: `Table référencé`,
        [Language.zhCN]: `引用的表`,
        [Language.ja]: '参照テーブル'
    },
    referencedColumn: {
        [Language.en]: `Referenced Column`,
        [Language.de]: 'Referenzierte Spalte',
        [Language.frFR]: `Colonne référencé`,
        [Language.zhCN]: `引用的列`,
        [Language.ja]: '参照列'
    },
    constraint: {
        [Language.en]: `Constraint`,
        [Language.de]: 'Bedingung',
        [Language.frFR]: `Contrainte`,
        [Language.zhCN]: `约束`,
        [Language.ja]: '制約'
    },
    constraintName: {
        [Language.en]: `Constraint Name`,
        [Language.de]: 'Bedingungsname',
        [Language.frFR]: `Nom de contrainte`,
        [Language.zhCN]: `约束名`,
        [Language.ja]: '制約名'
    },
    create: {
        [Language.en]: `Create`,
        [Language.de]: 'Erstellen',
        [Language.frFR]: `Créer`,
        [Language.zhCN]: `创建`,
        [Language.ja]: '作成'
    },
    createFailed: {
        [Language.en]: `Create failed`,
        [Language.de]: 'Erstellen fehlgeschlagen',
        [Language.frFR]: `Échec de la création`,
        [Language.zhCN]: `创建失败`,
        [Language.ja]: '作成に失敗しました'
    },
    tableName: {
        [Language.en]: `Table Name`,
        [Language.de]: 'Tabellenname',
        [Language.frFR]: `Nom de table`,
        [Language.zhCN]: `表名`,
        [Language.ja]: 'テーブル名'
    },
    index: {
        [Language.en]: `Index`,
        [Language.de]: 'Index',
        [Language.frFR]: `Index`,
        [Language.zhCN]: `索引`,
        [Language.ja]: 'インデックス'
    },
    indexColumn: {
        [Language.en]: `Index Column`,
        [Language.de]: 'Index-Spalte',
        [Language.frFR]: `Colonne de l'index`,
        [Language.zhCN]: `索引列`,
        [Language.ja]: 'インデックス列'
    },
    indexOption: {
        [Language.en]: `Index Option`,
        [Language.de]: 'Index-Option',
        [Language.frFR]: `Option de l'index`,
        [Language.zhCN]: `索引选项`,
        [Language.ja]: 'インデックスオプション'
    },
    addIndexColumn: {
        [Language.en]: `Add Index Column`,
        [Language.de]: 'Index-Spalte hinzufügen',
        [Language.frFR]: `Ajouter un index à la colonne`,
        [Language.zhCN]: `添加索引列`,
        [Language.ja]: 'インデックス列の追加'
    },
    option: {
        [Language.en]: `Option`,
        [Language.de]: 'Option',
        [Language.frFR]: `Option`,
        [Language.zhCN]: `选项`,
        [Language.ja]: 'オプション'
    },
    discard: {
        [Language.en]: `Discard`,
        [Language.de]: 'Verwerfen',
        [Language.frFR]: `Abandon`,
        [Language.zhCN]: `放弃`,
        [Language.ja]: '破棄'
    },
    discardChanges: {
        [Language.en]: `Discard Changes`,
        [Language.de]: 'Änderungen verwerfen',
        [Language.frFR]: `Abandonner les changements`,
        [Language.zhCN]: `放弃更改`,
        [Language.ja]: '変更を破棄'
    },
    discardChangesMessage: {
        [Language.en]: `You have some changes that have not been saved yet.`,
        [Language.de]: 'Sie haben nicht gespeicherte Änderungen.',
        [Language.frFR]: `Certaines modifications n'ont pas encore été enregistrées.`,
        [Language.zhCN]: `你有一些更改还未保存。`,
        [Language.ja]: 'まだ保存されていない変更があります。'
    },
    save: {
        [Language.en]: `Save`,
        [Language.de]: 'Speichern',
        [Language.frFR]: `Sauvegarder`,
        [Language.zhCN]: `保存`,
        [Language.ja]: '保存'
    },
    loading: {
        [Language.en]: `Loading...`,
        [Language.de]: 'Laden...',
        [Language.frFR]: `Chargement ...`,
        [Language.zhCN]: `加载中...`,
        [Language.ja]: '読み込み中...'
    },
    running: {
        [Language.en]: `Running...`,
        [Language.de]: 'Ausführen...',
        [Language.frFR]: `Éxécution en cours ...`,
        [Language.zhCN]: `运行中...`,
        [Language.ja]: '実行中...'
    },
    waiting: {
        [Language.en]: `Waiting...`,
        [Language.de]: 'Warte...',
        [Language.frFR]: `En attente ...`,
        [Language.zhCN]: `等待中...`,
        [Language.ja]: '待機中...'
    },
    noQuery: {
        [Language.en]: `No Query`,
        [Language.de]: 'Keine Abfrage',
        [Language.frFR]: `Pas de requête`,
        [Language.zhCN]: `没有查询`,
        [Language.ja]: 'クエリなし'
    },
    noTable: {
        [Language.en]: `No Table`,
        [Language.de]: 'Keine Tabelle',
        [Language.frFR]: `Pas de table`,
        [Language.zhCN]: `没有表`,
        [Language.ja]: 'テーブルなし'
    },
    noFunction: {
        [Language.en]: `No Function`,
        [Language.de]: 'Keine Funktion',
        [Language.frFR]: `Pas de function`,
        [Language.zhCN]: `没有相关函数`,
        [Language.ja]: '関数なし'
    },
    noTrigger: {
        [Language.en]: `No Trigger`,
        [Language.de]: 'Kein Auslöser',
        [Language.frFR]: `Pas de trigger`,
        [Language.zhCN]: `没有相关触发器`,
        [Language.ja]: 'トリガーなし'
    },
    noExtension: {
        [Language.en]: `No Extension`,
        [Language.de]: 'Keine Erweiterung',
        [Language.frFR]: `Pas de extension`,
        [Language.zhCN]: `没有相关扩展`,
        [Language.ja]: '拡張機能なし'
    },
    noComment: {
        [Language.en]: `No comment`,
        [Language.de]: 'Kein Kommentar',
        [Language.frFR]: `Pas de comment`,
        [Language.zhCN]: `没有评论`,
        [Language.ja]: 'コメントなし'
    },
    args: {
        [Language.en]: `Arguments`,
        [Language.de]: 'Argumente',
        [Language.frFR]: `Arguments`,
        [Language.zhCN]: `参数`,
        [Language.ja]: '引数'
    },
    returnType: {
        [Language.en]: `Return type`,
        [Language.de]: 'Rückgabewerte',
        [Language.frFR]: `Type de retour`,
        [Language.zhCN]: `返回类型`,
        [Language.ja]: '戻り値の型'
    },
    stopped: {
        [Language.en]: `Stopped`,
        [Language.de]: 'Gestoppt',
        [Language.frFR]: `Arrêtée`,
        [Language.zhCN]: `已停止`,
        [Language.ja]: '停止'
    },
    stop: {
        [Language.en]: `Stop`,
        [Language.de]: 'Stop',
        [Language.frFR]: `Arrêter`,
        [Language.zhCN]: `停止`,
        [Language.ja]: '停止'
    },
    asRawSqlValue: {
        [Language.en]: `As Raw SQL Value`,
        [Language.de]: 'Als purer SQL Wert',
        [Language.frFR]: `Comme valeur SQL brut`,
        [Language.zhCN]: `作为原始 SQL 值`,
        [Language.ja]: '生のSQL値として'
    },
    setAsNull: {
        [Language.en]: `Set as NULL`,
        [Language.de]: 'Setze als NULL',
        [Language.frFR]: `Définir comme NULL`,
        [Language.zhCN]: `设置为 NULL`,
        [Language.ja]: 'NULLに設定'
    },
    setAsDefault: {
        [Language.en]: 'Set As DEFAULT',
        [Language.de]: 'Setze als DEFAULT',
        [Language.frFR]: 'Définir comme DEFAULT',
        [Language.zhCN]: '设置为 DEFAULT',
        [Language.ja]: 'DEFAULTに設定'
    },
    setAsEmpty: {
        [Language.en]: `Set As Empty`,
        [Language.de]: 'Setze als Leer',
        [Language.frFR]: `Définir comme Vide`,
        [Language.zhCN]: `设置为 Empty`,
        [Language.ja]: '空に設定'
    },
    selectTextFile: {
        [Language.en]: `Select text file`,
        [Language.de]: 'Textdatei auswählen',
        [Language.frFR]: `Sélectionner un fichier texte`,
        [Language.zhCN]: `选择文本文件`,
        [Language.ja]: 'テキストファイルを選択'
    },
    selectBinaryFile: {
        [Language.en]: `Select binary file`,
        [Language.de]: 'Binärdatei auswählen',
        [Language.frFR]: `Sélectionner un fichier binaire`,
        [Language.zhCN]: `选择二进制文件`,
        [Language.ja]: 'バイナリファイルを選択'
    },
    currentDatetime: {
        [Language.en]: `Current datetime`,
        [Language.de]: 'Aktuelles Datum und Uhrzeit',
        [Language.frFR]: `Date actuelle`,
        [Language.zhCN]: `当前时间`,
        [Language.ja]: '現在の日時'
    },
    currentUnixTimestamp: {
        [Language.en]: `Current Unix timestamp`,
        [Language.de]: 'Aktueller Unix-Zeitstempel',
        [Language.frFR]: `Horodatage Unix actuel`,
        [Language.zhCN]: `当前 Unix 时间戳`,
        [Language.ja]: '現在のUnixタイムスタンプ'
    },
    selectColumn: {
        [Language.en]: `Select Column`,
        [Language.de]: 'Spalte auswählen',
        [Language.frFR]: `Colonnes sélectionnées`,
        [Language.zhCN]: `选择列`,
        [Language.ja]: '列を選択'
    },
    selectAll: {
        [Language.en]: `Select All`,
        [Language.de]: 'Alles auswählen',
        [Language.frFR]: `Tout sélectionner`,
        [Language.zhCN]: `全选`,
        [Language.ja]: 'すべて選択'
    },
    deselectAll: {
        [Language.en]: `Deselect All`,
        [Language.de]: 'Alles abwählen',
        [Language.frFR]: `Tout désélectionner`,
        [Language.zhCN]: `取消全选`,
        [Language.ja]: 'すべての選択を解除'
    },
    noRows: {
        [Language.en]: `No Rows`,
        [Language.de]: 'Keine Zeilen',
        [Language.frFR]: `Aucune lignes`,
        [Language.zhCN]: `没有数据`,
        [Language.ja]: '行なし'
    },
    insertRow: {
        [Language.en]: `Insert Row`,
        [Language.de]: 'Zeile einfügen',
        [Language.frFR]: `Ajouter une ligne`,
        [Language.zhCN]: `插入行`,
        [Language.ja]: '行を挿入'
    },
    viewSQL: {
        [Language.en]: `View SQL`,
        [Language.de]: 'SQL ansehen',
        [Language.frFR]: `Voir le SQL`,
        [Language.zhCN]: `查看 SQL`,
        [Language.ja]: 'SQLを表示'
    },
    updateRow: {
        [Language.en]: `Update Row`,
        [Language.de]: 'Zeile aktualisieren',
        [Language.frFR]: `Mettre à jour la ligne`,
        [Language.zhCN]: `更新行`,
        [Language.ja]: '行を更新'
    },
    insert: {
        [Language.en]: `Insert`,
        [Language.de]: 'Einfügen',
        [Language.frFR]: `Insérer`,
        [Language.zhCN]: `插入`,
        [Language.ja]: '挿入'
    },
    update: {
        [Language.en]: `Update`,
        [Language.de]: 'Aktualisieren',
        [Language.frFR]: `Mise à jour`,
        [Language.zhCN]: `更新`,
        [Language.ja]: '更新'
    },
    primaryKey: {
        [Language.en]: `Primary Key`,
        [Language.de]: 'Primärschlüssel',
        [Language.frFR]: `Clé Primaire`,
        [Language.zhCN]: `主键`,
        [Language.ja]: '主キー'
    },
    primaryKeyNotFound: {
        [Language.en]: `Primary key not found`,
        [Language.de]: 'Primärschlüssel nicht gefunden',
        [Language.frFR]: `Clé primaire introuvable`,
        [Language.zhCN]: `找不到主键`,
        [Language.ja]: '主キーが見つかりません'
    },
    sqlEditor: {
        [Language.en]: `SQL Editor`,
        [Language.de]: 'SQL-Editor',
        [Language.frFR]: `Editeur SQL`,
        [Language.zhCN]: `SQL 编辑器`,
        [Language.ja]: 'SQLエディタ'
    },
    deleteFailed: {
        [Language.en]: `Delete failed`,
        [Language.de]: 'Löschen fehlgeschlagen',
        [Language.frFR]: `Échec de la suppression`,
        [Language.zhCN]: `删除失败`,
        [Language.ja]: '削除に失敗しました'
    },
    updateFailed: {
        [Language.en]: `Update failed`,
        [Language.de]: 'Aktualisieren fehlgeschlagen',
        [Language.frFR]: `Échec de la mise à jour`,
        [Language.zhCN]: `更新失败`,
        [Language.ja]: '更新に失敗しました'
    },
    editTable: {
        [Language.en]: `Edit Table`,
        [Language.de]: 'Tabelle editieren',
        [Language.frFR]: `Modifier la table`,
        [Language.zhCN]: `编辑表`,
        [Language.ja]: 'テーブルを編集'
    },
    refresh: {
        [Language.en]: `Refresh`,
        [Language.de]: 'Aktualisieren',
        [Language.frFR]: `Actualiser`,
        [Language.zhCN]: `刷新`,
        [Language.ja]: '再読み込み'
    },
    query: {
        [Language.en]: `Query`,
        [Language.de]: 'Abfrage',
        [Language.frFR]: `Requête`,
        [Language.zhCN]: `查询`,
        [Language.ja]: 'クエリ'
    },
    createQuery: {
        [Language.en]: `Create Query`,
        [Language.de]: 'Abfrage erstellen',
        [Language.frFR]: `Créer une requête`,
        [Language.zhCN]: `创建查询`,
        [Language.ja]: 'クエリを作成'
    },
    previousPage: {
        [Language.en]: `Previous Page`,
        [Language.de]: 'Vorherige Seite',
        [Language.frFR]: `Page précédente`,
        [Language.zhCN]: `上一页`,
        [Language.ja]: '前のページ'
    },
    nextPage: {
        [Language.en]: `Next Page`,
        [Language.de]: 'Nächste Seite',
        [Language.frFR]: `Page suivante`,
        [Language.zhCN]: `下一页`,
        [Language.ja]: '次のページ'
    },
    firstPage: {
        [Language.en]: `First Page`,
        [Language.de]: 'Erste Seite',
        [Language.frFR]: `Première page`,
        [Language.zhCN]: `第一页`,
        [Language.ja]: '最初のページ'
    },
    lastPage: {
        [Language.en]: `Last Page`,
        [Language.de]: 'Letzte Seite',
        [Language.frFR]: `Dernière page`,
        [Language.zhCN]: `最后一页`,
        [Language.ja]: '最後のページ'
    },
    rows: {
        [Language.en]: `Rows`,
        [Language.de]: 'Zeilen',
        [Language.frFR]: `Lignes`,
        [Language.zhCN]: `行`,
        [Language.ja]: '行'
    },
    now: {
        [Language.en]: `just now`,
        [Language.de]: 'jetzt',
        [Language.frFR]: `à l'instant`,
        [Language.zhCN]: `现在`,
        [Language.ja]: 'たった今'
    },
    page: {
        [Language.en]: `Page`,
        [Language.de]: 'Seite',
        [Language.frFR]: `Page`,
        [Language.zhCN]: `页数`,
        [Language.ja]: 'ページ'
    },
    limit: {
        [Language.en]: `Limit`,
        [Language.de]: 'Limit',
        [Language.frFR]: `Limite`,
        [Language.zhCN]: `限制`,
        [Language.ja]: '制限'
    },
    allPage: {
        [Language.en]: `All Pages`,
        [Language.de]: `Alle Seiten`,
        [Language.frFR]: `Toutes les pages`,
        [Language.zhCN]: `所有页`,
        [Language.ja]: 'すべてのページ'
    },
    currentPage: {
        [Language.en]: `Current Page`,
        [Language.de]: `Aktuelle Seite`,
        [Language.frFR]: `Page actuelle`,
        [Language.zhCN]: `当前页`,
        [Language.ja]: '現在のページ'
    },
    format: {
        [Language.en]: `Format`,
        [Language.de]: `Format`,
        [Language.frFR]: `Format`,
        [Language.zhCN]: `格式`,
        [Language.ja]: 'フォーマット'
    },
    sort: {
        [Language.en]: `Sort`,
        [Language.de]: 'Sortieren',
        [Language.frFR]: `Trier`,
        [Language.zhCN]: `排序`,
        [Language.ja]: 'ソート'
    },
    apply: {
        [Language.en]: `Apply`,
        [Language.de]: 'Anwenden',
        [Language.frFR]: `Appliquer`,
        [Language.zhCN]: `应用`,
        [Language.ja]: '適用'
    },
    connectionReadonlyError: {
        [Language.en]: `Error: The current connection is 'Read-only' mode`,
        [Language.de]: `Fehler: Die aktuelle Verbindung befinden sich im „Nur lesen"-Modus`,
        [Language.frFR]: `Erreur : La connexion actuelle est en mode "lecture seule".`,
        [Language.zhCN]: `错误：当前连接是 '只读' 模式`,
        [Language.ja]: 'エラー: 現在の接続は「読み取り専用」モードです'
    },
    history: {
        [Language.en]: `History`,
        [Language.de]: 'Verlauf',
        [Language.frFR]: `Historique`,
        [Language.zhCN]: `历史记录`,
        [Language.ja]: '履歴'
    },
    queryHistory: {
        [Language.en]: `Query history`,
        [Language.de]: 'Verlauf abfragen',
        [Language.frFR]: `Historique des requêtes`,
        [Language.zhCN]: `查询历史记录`,
        [Language.ja]: 'クエリ履歴'
    },
    noHistory: {
        [Language.en]: `No history`,
        [Language.de]: 'Kein Verlauf',
        [Language.frFR]: `Aucun historique`,
        [Language.zhCN]: `没有历史记录`,
        [Language.ja]: '履歴なし'
    },
    run: {
        [Language.en]: `Run`,
        [Language.de]: 'Ausführen',
        [Language.frFR]: `Éxecuter`,
        [Language.zhCN]: `运行`,
        [Language.ja]: '実行'
    },
    runSelectionSQL: {
        [Language.en]: `Run Selection SQL`,
        [Language.de]: 'Ausgewähltes SQL ausführen',
        [Language.frFR]: `Éxecuter la sélection SQL`,
        [Language.zhCN]: `运行选中的 SQL`,
        [Language.ja]: '選択したSQLを実行'
    },
    runCurrentStatement: {
        [Language.en]: `Run Current Statement`,
        [Language.de]: 'Aktuellen Befehl ausführen',
        [Language.frFR]: `Éxecuter la requête courante`,
        [Language.zhCN]: `运行当前语句`,
        [Language.ja]: '現在のステートメントを実行'
    },
    runAllStatement: {
        [Language.en]: `Run All Statement`,
        [Language.de]: 'Alle Befehle ausführen',
        [Language.frFR]: `Éxecuter toute les requêtes`,
        [Language.zhCN]: `运行所有语句`,
        [Language.ja]: 'すべてのステートメントを実行'
    },
    executeSuccess: {
        [Language.en]: `Execution succeeded`,
        [Language.de]: 'Ausführung erfolgreich',
        [Language.frFR]: `Exécution réussie`,
        [Language.zhCN]: `执行成功`,
        [Language.ja]: '実行に成功しました'
    },
    importFailed: {
        [Language.en]: `Import failed`,
        [Language.de]: 'Importieren fehlgeschlagen',
        [Language.frFR]: `Échec de l'import`,
        [Language.zhCN]: `导入失败`,
        [Language.ja]: 'インポートに失敗しました'
    },
    exportFailed: {
        [Language.en]: `Export failed`,
        [Language.de]: 'Exportieren fehlgeschlagen',
        [Language.frFR]: `Échec de l'export`,
        [Language.zhCN]: `导出失败`,
        [Language.ja]: 'エクスポートに失敗しました'
    },
    raedFileFailed: {
        [Language.en]: `Read file failed`,
        [Language.de]: 'Datei lesen fehlgeschlagen',
        [Language.frFR]: `Échec de lecture du fichier`,
        [Language.zhCN]: `读取文件失败`,
        [Language.ja]: 'ファイルの読み込みに失敗しました'
    },
    writeFileFailed: {
        [Language.en]: `Write file failed`,
        [Language.de]: 'Datei schreiben fehlgeschlagen',
        [Language.frFR]: `Échec de l'écriture du fichier`,
        [Language.zhCN]: `写入文件失败`,
        [Language.ja]: 'ファイルの書き込みに失敗しました'
    },
    rename: {
        [Language.en]: `Rename`,
        [Language.de]: 'Umbenennen',
        [Language.frFR]: `Renommer`,
        [Language.zhCN]: `重命名`,
        [Language.ja]: '名前変更'
    },
    formatSQL: {
        [Language.en]: `Format SQL`,
        [Language.de]: 'SQL formatieren',
        [Language.frFR]: `Formater SQL`,
        [Language.zhCN]: `格式化 SQL`,
        [Language.ja]: 'SQLをフォーマット'
    },
    minifySQL: {
        [Language.en]: `Minify SQL`,
        [Language.de]: 'SQL minimieren',
        [Language.frFR]: `Minifier SQL`,
        [Language.zhCN]: `压缩 SQL`,
        [Language.ja]: 'SQLをミニファイ'
    },
    cut: {
        [Language.en]: `Cut`,
        [Language.de]: 'Ausschneiden',
        [Language.frFR]: `Couper`,
        [Language.zhCN]: `剪切`,
        [Language.ja]: '切り取り'
    },
    copy: {
        [Language.en]: `Copy`,
        [Language.de]: 'Kopieren',
        [Language.frFR]: `Copier`,
        [Language.zhCN]: `复制`,
        [Language.ja]: 'コピー'
    },
    paste: {
        [Language.en]: `Paste`,
        [Language.de]: 'Einfügen',
        [Language.frFR]: `Couler`,
        [Language.zhCN]: `粘贴`,
        [Language.ja]: '貼り付け'
    },
    saveAsFile: {
        [Language.en]: `Save as file`,
        [Language.de]: 'Speichern unter...',
        [Language.frFR]: `Enregistrer comme fichier`,
        [Language.zhCN]: `保存为文件`,
        [Language.ja]: 'ファイルとして保存'
    },
    copyCell: {
        [Language.en]: `Copy Cell`,
        [Language.de]: 'Zelle kopieren',
        [Language.frFR]: `Copier la cellule`,
        [Language.zhCN]: `复制`,
        [Language.ja]: 'セルをコピー'
    },
    copyColumnValues: {
        [Language.en]: `Copy Column Values`,
        [Language.de]: 'Spaltenwerte kopieren',
        [Language.frFR]: `Copier les valeurs de colonne`,
        [Language.zhCN]: `复制列`,
        [Language.ja]: '列の値をコピー'
    },
    copyRowsAs: {
        [Language.en]: `Copy Rows As`,
        [Language.de]: 'Zeilen kopieren als...',
        [Language.frFR]: `Copier les lignes en tant que`,
        [Language.zhCN]: `复制行...`,
        [Language.ja]: '形式を指定して行をコピー'
    },
    copyAsURL: {
        [Language.en]: `Copy as URL`,
        [Language.de]: 'Als URL kopieren',
        [Language.frFR]: `Copier comme URL`,
        [Language.zhCN]: `复制 URL`,
        [Language.ja]: 'URLとしてコピー'
    },
    filter: {
        [Language.en]: `Filter`,
        [Language.de]: 'Filter',
        [Language.frFR]: `Filtrer`,
        [Language.zhCN]: `过滤`,
        [Language.ja]: 'フィルター'
    },
    updateCellAs: {
        [Language.en]: `Update Cell As`,
        [Language.de]: 'Zelle aktualisieren als...',
        [Language.frFR]: `Mettre à jour la cellule en tant que`,
        [Language.zhCN]: `更新为...`,
        [Language.ja]: '形式を指定してセルを更新'
    },
    fromCipboard: {
        [Language.en]: `From Clipboard`,
        [Language.de]: 'Aus der Zwischenablage',
        [Language.frFR]: `Depuis le presse-papiers`,
        [Language.zhCN]: `来自剪贴板`,
        [Language.ja]: 'クリップボードから'
    },
    editRow: {
        [Language.en]: `Edit Row`,
        [Language.de]: 'Zeile bearbeiten',
        [Language.frFR]: `Éditer la ligne`,
        [Language.zhCN]: `编辑行`,
        [Language.ja]: '行を編集'
    },
    duplicateRow: {
        [Language.en]: `Duplicate Row`,
        [Language.de]: 'Zeile duplizieren',
        [Language.frFR]: `Dupliquer la ligne`,
        [Language.zhCN]: `制作此行的副本`,
        [Language.ja]: '行を複製'
    },
    deleteRow: {
        [Language.en]: 'Delete Row',
        [Language.de]: 'Zeile löschen',
        [Language.frFR]: 'Supprimer la ligne',
        [Language.zhCN]: '删除行',
        [Language.ja]: '行を削除'
    },
    deleteRows: {
        [Language.en]: 'Delete Rows',
        [Language.de]: 'Zeilen löschen',
        [Language.frFR]: 'Supprimer les lignes',
        [Language.zhCN]: '删除行',
        [Language.ja]: '複数の行を削除'
    },
    copyTableName: {
        [Language.en]: `Copy Name`,
        [Language.de]: 'Namen Kopieren',
        [Language.frFR]: `Copier le nom`,
        [Language.zhCN]: `复制表名`,
        [Language.ja]: '名前をコピー'
    },
    copyColumnName: {
        [Language.en]: `Copy Name`,
        [Language.de]: 'Namen kopieren',
        [Language.frFR]: `Copier le nom`,
        [Language.zhCN]: `复制列名`,
        [Language.ja]: '名前をコピー'
    },
    copyDataType: {
        [Language.en]: `Copy Data Type`,
        [Language.de]: 'Datentyp kopieren',
        [Language.frFR]: `Copier le type`,
        [Language.zhCN]: `复制数据类型`,
        [Language.ja]: 'データ型をコピー'
    },
    resizeColumnToFixContent: {
        [Language.en]: `Resize column to fix content`,
        [Language.de]: 'Spaltenbreite dem Inhalt anpassen',
        [Language.frFR]: `Ajuster la colonne au contenu`,
        [Language.zhCN]: `调整列宽以适应内容`,
        [Language.ja]: 'コンテンツに合わせて列幅を調整'
    },
    resizeColumnToMinimum: {
        [Language.en]: `Resize column to minimum`,
        [Language.de]: 'Spaltenbreite minimieren',
        [Language.frFR]: `Ajuster la colonne au minimum`,
        [Language.zhCN]: `调整列宽到最小`,
        [Language.ja]: '列幅を最小に調整'
    },
    sortNone: {
        [Language.en]: `Unsorted`,
        [Language.de]: 'Unsortiert',
        [Language.frFR]: `Aucune tri`,
        [Language.zhCN]: `取消排序`,
        [Language.ja]: 'ソートなし'
    },
    sortAscending: {
        [Language.en]: `Sort Ascending`,
        [Language.de]: 'Aufsteigend sortieren',
        [Language.frFR]: `Trier par ordre croissant`,
        [Language.zhCN]: `按升序排序`,
        [Language.ja]: '昇順でソート'
    },
    sortDescending: {
        [Language.en]: `Sort Descending`,
        [Language.de]: 'Absteigend sortieren',
        [Language.frFR]: `Trier par ordre décroissant`,
        [Language.zhCN]: `按降序排序`,
        [Language.ja]: '降順でソート'
    },
    moveTo: {
        [Language.en]: `Move To`,
        [Language.de]: 'Gehe zu',
        [Language.frFR]: `Déplacer vers`,
        [Language.zhCN]: `移动到...`,
        [Language.ja]: '移動先'
    },
    menu: {
        [Language.en]: `Menu`,
        [Language.de]: 'Menü',
        [Language.frFR]: `Menu`,
        [Language.zhCN]: `菜单`,
        [Language.ja]: 'メニュー'
    },
    newSchema: {
        [Language.en]: `New Schema`,
        [Language.de]: 'Neues Schema',
        [Language.frFR]: `Nouveau Schéma`,
        [Language.zhCN]: `新建模式`,
        [Language.ja]: '新規スキーマ'
    },
    newDatabase: {
        [Language.en]: `New Database`,
        [Language.de]: 'Neue Datenbank',
        [Language.frFR]: `Nouvelle Base de Données`,
        [Language.zhCN]: `新建数据库`,
        [Language.ja]: '新規データベース'
    },
    backupDatabase: {
        [Language.en]: 'Backup Database',
        [Language.de]: 'Datenbank sichern',
        [Language.frFR]: 'Sauvegarder la base de données',
        [Language.zhCN]: '备份数据库',
        [Language.ja]: 'データベースのバックアップ'
    },
    backup: {
        [Language.en]: `Backup`,
        [Language.de]: 'Sicherung',
        [Language.frFR]: `Sauvegarde`,
        [Language.zhCN]: `备份`,
        [Language.ja]: 'バックアップ'
    },
    renameSchema: {
        [Language.en]: `Rename Schema`,
        [Language.de]: 'Schema umbenennen',
        [Language.frFR]: `Renommer Schéma`,
        [Language.zhCN]: `重命名模式`,
        [Language.ja]: 'スキーマの名前変更'
    },
    dropSchema: {
        [Language.en]: `Drop Schema`,
        [Language.de]: 'Schema löschen',
        [Language.frFR]: `Supprimer le Schéma`,
        [Language.zhCN]: `删除模式`,
        [Language.ja]: 'スキーマの削除'
    },
    selectAllRows: {
        [Language.en]: `Select All Rows`,
        [Language.de]: 'Alle Zeilen auswählen',
        [Language.frFR]: `Sélectionner toutes les lignes`,
        [Language.zhCN]: `选择所有行`,
        [Language.ja]: 'すべての行を選択'
    },
    unselectAllRows: {
        [Language.en]: `Unselect All Rows`,
        [Language.de]: 'Alle Zeilen abwählen',
        [Language.frFR]: `Désélectionner toutes les lignes`,
        [Language.zhCN]: `取消选择所有行`,
        [Language.ja]: 'すべての行の選択を解除'
    },
    copySelectedRows: {
        [Language.en]: 'Copy Selected Rows',
        [Language.de]: 'Ausgewählte Zeilen kopieren',
        [Language.frFR]: 'Copier les lignes sélectionnées',
        [Language.zhCN]: '复制所选行',
        [Language.ja]: '選択した行をコピー'
    },
    editCell: {
        [Language.en]: 'Edit Cell',
        [Language.de]: 'Zelle bearbeiten',
        [Language.frFR]: 'Éditer la cellule',
        [Language.zhCN]: '编辑单元格',
        [Language.ja]: 'セルを編集'
    },
    restart: {
        [Language.en]: `Restart`,
        [Language.de]: 'Neu starten',
        [Language.frFR]: `Redémarrer`,
        [Language.zhCN]: `重启`,
        [Language.ja]: '再起動'
    },
    restartMessage: {
        [Language.en]: `Do you want to restart now?`,
        [Language.de]: 'Möchten Sie jetzt neu starten?',
        [Language.frFR]: `Souhaitez-vous redémarrer maintenant ?`,
        [Language.zhCN]: `你想要现在重启吗？`,
        [Language.ja]: '今すぐ再起動しますか？'
    },
    deleteQuery: {
        [Language.en]: `Delete Query`,
        [Language.de]: 'Abfrage löschen',
        [Language.frFR]: `Supprimer la Requête`,
        [Language.zhCN]: `删除查询`,
        [Language.ja]: 'クエリを削除'
    },
    keyboardShortcuts: {
        [Language.en]: `Keyboard Shortcuts`,
        [Language.de]: 'Tastaturkürzel',
        [Language.frFR]: `Raccourcis clavier`,
        [Language.zhCN]: `键盘快捷键`,
        [Language.ja]: 'キーボードショートカット'
    },
    quickSearch: {
        [Language.en]: `Quick Search`,
        [Language.de]: 'Schnellsuche',
        [Language.frFR]: `Recherche rapide`,
        [Language.zhCN]: `快速搜索`,
        [Language.ja]: 'クイック検索'
    },
    tab: {
        [Language.en]: `Tab`,
        [Language.de]: 'Reiter',
        [Language.frFR]: `Onglet`,
        [Language.zhCN]: `标签页`,
        [Language.ja]: 'タブ'
    },
    switchTab: {
        [Language.en]: `Switch Tab`,
        [Language.de]: 'Reiter wechseln',
        [Language.frFR]: `Changer d'onglet`,
        [Language.zhCN]: `切换标签页`,
        [Language.ja]: 'タブを切り替え'
    },
    closeTab: {
        [Language.en]: `Close Tab`,
        [Language.de]: 'Reiter schließen',
        [Language.frFR]: `Fermer l'onglet`,
        [Language.zhCN]: `关闭标签页`,
        [Language.ja]: 'タブを閉じる'
    },
    closeAllTab: {
        [Language.en]: `Close All Tabs`,
        [Language.de]: 'Alle Reiter schließen',
        [Language.frFR]: `Fermer tous les onglets`,
        [Language.zhCN]: `关闭所有标签页`,
        [Language.ja]: 'すべてのタブを閉じる'
    },
    closeOtherTabs: {
        [Language.en]: 'Close Other Tabs',
        [Language.de]: 'Andere Reiter schließen',
        [Language.frFR]: `Fermer les autres onglets`,
        [Language.zhCN]: '关闭其他标签页',
        [Language.ja]: '他のタブを閉じる'
    },
    prevTab: {
        [Language.en]: `Previous Tab`,
        [Language.de]: 'Vorhergehender Reiter',
        [Language.frFR]: `Onglet précédent`,
        [Language.zhCN]: `上一个标签页`,
        [Language.ja]: '前のタブ'
    },
    nextTab: {
        [Language.en]: `Next Tab`,
        [Language.de]: 'Nächster Reiter',
        [Language.frFR]: `Onglet suivant`,
        [Language.zhCN]: `下一个标签页`,
        [Language.ja]: '次のタブ'
    },
    zoomIn: {
        [Language.en]: `Zoom In`,
        [Language.de]: 'Vergrößern',
        [Language.frFR]: `Zoom avant`,
        [Language.zhCN]: `放大`,
        [Language.ja]: '拡大'
    },
    zoomOut: {
        [Language.en]: `Zoom Out`,
        [Language.de]: 'Verkleinern',
        [Language.frFR]: `Zoom arrière`,
        [Language.zhCN]: `缩小`,
        [Language.ja]: '縮小'
    },
    find: {
        [Language.en]: `Find`,
        [Language.de]: 'Suchen',
        [Language.frFR]: `Rechercher`,
        [Language.zhCN]: `查找`,
        [Language.ja]: '検索'
    },
    dataGeneration: {
        [Language.en]: `Data Generation`,
        [Language.de]: 'Daten generieren',
        [Language.frFR]: `Génération de données`,
        [Language.zhCN]: `数据生成`,
        [Language.ja]: 'データ生成'
    },
    randomSelect: {
        [Language.en]: `Random selection`,
        [Language.de]: 'Zufällige auswahl',
        [Language.frFR]: `Sélection aléatoire`,
        [Language.zhCN]: `随机选择`,
        [Language.ja]: 'ランダム選択'
    },
    customValue: {
        [Language.en]: `Custom value`,
        [Language.de]: 'Benutzerdefinierter Wert',
        [Language.frFR]: `Valeur personnalisée`,
        [Language.zhCN]: `自定义值`,
        [Language.ja]: 'カスタム値'
    },
    randomText: {
        [Language.en]: `Random text`,
        [Language.de]: 'Zufälliger Text',
        [Language.frFR]: `Texte aléatoire`,
        [Language.zhCN]: `随机文本`,
        [Language.ja]: 'ランダムテキスト'
    },
    randomBoolean: {
        [Language.en]: `Random boolean`,
        [Language.de]: 'Zufälliger Wahrheitswert',
        [Language.frFR]: `Booléen aléatoire`,
        [Language.zhCN]: `随机布尔值`,
        [Language.ja]: 'ランダムブーリアン'
    },
    randomInteger: {
        [Language.en]: `Random integer`,
        [Language.de]: 'Zufallszahl',
        [Language.frFR]: `Entier aléatoire`,
        [Language.zhCN]: `随机整数`,
        [Language.ja]: 'ランダム整数'
    },
    randomFloat: {
        [Language.en]: `Random float`,
        [Language.de]: 'Zufalls-Gleitkommazahl',
        [Language.frFR]: `Flottant aléatoire`,
        [Language.zhCN]: `随机浮点数`,
        [Language.ja]: 'ランダム浮動小数点数'
    },
    randomUuid: {
        [Language.en]: `Random UUID`,
        [Language.de]: 'Zufällige UUID',
        [Language.frFR]: `UUID aléatoire`,
        [Language.zhCN]: `随机 UUID`,
        [Language.ja]: 'ランダムUUID'
    },
    randomEmail: {
        [Language.en]: `Random Email address`,
        [Language.de]: 'Zufällige E-Mail-Adresse',
        [Language.frFR]: `Adresse Email aléatoire`,
        [Language.zhCN]: `随机邮箱地址`,
        [Language.ja]: 'ランダムメールアドレス'
    },
    randomDate: {
        [Language.en]: `Random date`,
        [Language.de]: 'Zufälliges Datum',
        [Language.frFR]: `Date aléatoire`,
        [Language.zhCN]: `随机日期`,
        [Language.ja]: 'ランダムな日付'
    },
    randomTime: {
        [Language.en]: `Random time`,
        [Language.de]: 'Zufällige Uhrzeit',
        [Language.frFR]: `Heure aléatoire`,
        [Language.zhCN]: `随机时间`,
        [Language.ja]: 'ランダムな時間'
    },
    randomDatetime: {
        [Language.en]: `Random datetime`,
        [Language.de]: 'Zufälliger Zeitstempel',
        [Language.frFR]: `Date et heure aléatoires`,
        [Language.zhCN]: `随机日期时间`,
        [Language.ja]: 'ランダムな日時'
    },
    randomUnixTimestamp: {
        [Language.en]: `Random Unix timestamp`,
        [Language.de]: 'Zufälliger Unix-Zeitstempel',
        [Language.frFR]: `Timestamp Unix aléatoire`,
        [Language.zhCN]: `随机 Unix 时间戳`,
        [Language.ja]: 'ランダムUnixタイムスタンプ'
    },
    randomIpAddress: {
        [Language.en]: `Random IP address`,
        [Language.de]: 'Zufällige IP-Adresse',
        [Language.frFR]: `Adresse IP aléatoire`,
        [Language.zhCN]: `随机 IP 地址`,
        [Language.ja]: 'ランダムIPアドレス'
    },
    min: {
        [Language.en]: `Min`,
        [Language.de]: 'Minimum',
        [Language.frFR]: `Min`,
        [Language.zhCN]: `最小值`,
        [Language.ja]: '最小'
    },
    max: {
        [Language.en]: `Max`,
        [Language.de]: 'Maximum',
        [Language.frFR]: `Max`,
        [Language.zhCN]: `最大值`,
        [Language.ja]: '最大'
    },
    minLength: {
        [Language.en]: `Min length`,
        [Language.de]: 'Mindestlänge',
        [Language.frFR]: `Longueur min`,
        [Language.zhCN]: `最小长度`,
        [Language.ja]: '最小長'
    },
    maxLength: {
        [Language.en]: `Max length`,
        [Language.de]: 'Maximallänge',
        [Language.frFR]: `Longueur max`,
        [Language.zhCN]: `最大长度`,
        [Language.ja]: '最大長'
    },
    invalidNumber: {
        [Language.en]: `Invalid number`,
        [Language.de]: 'Ungültige Nummer',
        [Language.frFR]: `Nombre invalide`,
        [Language.zhCN]: `无效的数字`,
        [Language.ja]: '無効な数値'
    },
    deleteWidegt: {
        [Language.en]: `Delete Widget`,
        [Language.de]: `Widget löschen`,
        [Language.frFR]: `Supprimer le Widget`,
        [Language.zhCN]: `删除小组件`,
        [Language.ja]: 'ウィジェットを削除'
    },
    noWidget: {
        [Language.en]: `No Widget`,
        [Language.de]: `Kein Widget`,
        [Language.frFR]: `Aucun Widget`,
        [Language.zhCN]: `无小组件`,
        [Language.ja]: 'ウィジェットなし'
    },
    newWidget: {
        [Language.en]: `New Widget`,
        [Language.de]: `Neues Widget`,
        [Language.frFR]: `Nouveau Widget`,
        [Language.zhCN]: `新建小组件`,
        [Language.ja]: '新規ウィジェット'
    },
    composedChart: {
        [Language.en]: `Composed Chart`,
        [Language.de]: `Kombiniertes Diagramm`,
        [Language.frFR]: `Graphique composé`,
        [Language.zhCN]: `组合图表`,
        [Language.ja]: '複合グラフ'
    },
    pieChart: {
        [Language.en]: `Pie Chart`,
        [Language.de]: `Kreisdiagramm`,
        [Language.frFR]: `Diagramme circulaire`,
        [Language.zhCN]: `饼状图表`,
        [Language.ja]: '円グラフ'
    },
    autoRefresh: {
        [Language.en]: `Auto refresh`,
        [Language.de]: `Auto-Aktualisierung`,
        [Language.frFR]: `Actualisation automatique`,
        [Language.zhCN]: `自动刷新`,
        [Language.ja]: '自動更新'
    },
    layout: {
        [Language.en]: `Layout`,
        [Language.de]: `Layout`,
        [Language.frFR]: `Mise en page`,
        [Language.zhCN]: `布局`,
        [Language.ja]: 'レイアウト'
    },
    category: {
        [Language.en]: `Category`,
        [Language.de]: `Kategorie`,
        [Language.frFR]: `Catégorie`,
        [Language.zhCN]: `分类`,
        [Language.ja]: 'カテゴリ'
    },
    direction: {
        [Language.en]: 'Direction',
        [Language.de]: 'Richtung',
        [Language.frFR]: 'Direction',
        [Language.zhCN]: '方向',
        [Language.ja]: '方向'
    },
    xLabel: {
        [Language.en]: 'X Label',
        [Language.de]: 'X-Beschriftung',
        [Language.frFR]: 'Étiquette X',
        [Language.zhCN]: 'X 轴标签',
        [Language.ja]: 'X軸ラベル'
    },
    yLabel: {
        [Language.en]: 'Y Label',
        [Language.de]: 'Y-Beschriftung',
        [Language.frFR]: 'Étiquette Y',
        [Language.zhCN]: 'Y 轴标签',
        [Language.ja]: 'Y軸ラベル'
    },
    auto: {
        [Language.en]: 'Auto',
        [Language.de]: 'Automatisch',
        [Language.frFR]: 'Automatique',
        [Language.zhCN]: `自动`,
        [Language.ja]: '自動'
    },
    bars: {
        [Language.en]: `Bars`,
        [Language.de]: `Balken`,
        [Language.frFR]: `Barres`,
        [Language.zhCN]: `柱/条`,
        [Language.ja]: '棒グラフ'
    },
    lines: {
        [Language.en]: `Lines`,
        [Language.de]: `Linien`,
        [Language.frFR]: `Lignes`,
        [Language.zhCN]: `线`,
        [Language.ja]: '折れ線'
    },
    areas: {
        [Language.en]: `Areas`,
        [Language.de]: `Flächen`,
        [Language.frFR]: `Zones`,
        [Language.zhCN]: `区域`,
        [Language.ja]: '面グラフ'
    },
    widgetSourceMessage: {
        [Language.en]: `Write SQL query to be the data source of the Widget`,
        [Language.de]: `Schreiben Sie eine SQL-Abfrage als Datenquelle für das Widget`,
        [Language.frFR]: `Écrivez une requête SQL comme source de données du Widget`,
        [Language.zhCN]: `编写 SQL 查询来作为小组件的数据来源`,
        [Language.ja]: 'ウィジェットのデータソースとなるSQLクエリを記述してください'
    },
    label: {
        [Language.en]: `Label`,
        [Language.de]: `Beschriftung`,
        [Language.frFR]: `Étiquette`,
        [Language.zhCN]: `标签`,
        [Language.ja]: 'ラベル'
    },
    value: {
        [Language.en]: `Value`,
        [Language.de]: `Wert`,
        [Language.frFR]: `Valeur`,
        [Language.zhCN]: `值`,
        [Language.ja]: '値'
    },
    color: {
        [Language.en]: `Color`,
        [Language.de]: `Farbe`,
        [Language.frFR]: `Couleur`,
        [Language.zhCN]: `颜色`,
        [Language.ja]: '色'
    },
    size: {
        [Language.en]: `Size`,
        [Language.de]: `Größe`,
        [Language.frFR]: `Taille`,
        [Language.zhCN]: `大小`,
        [Language.ja]: 'サイズ'
    },
    checkingForUpdates: {
        [Language.en]: 'Checking for updates...',
        [Language.de]: 'Updates suchen...',
        [Language.frFR]: 'Recherche de nouvelles versions...',
        [Language.zhCN]: '检查更新中...',
        [Language.ja]: 'アップデートを確認中...'
    },
    latestVersion: {
        [Language.en]: 'Dataflare is up to date!',
        [Language.de]: 'Dataflare ist aktuell!',
        [Language.frFR]: 'Dataflare est à jour!',
        [Language.zhCN]: 'Dataflare 已是最新版本！',
        [Language.ja]: 'Dataflareは最新です！'
    },
    installUpdate: {
        [Language.en]: 'Install Update',
        [Language.de]: 'Aktualisieren',
        [Language.frFR]: 'Actualiser',
        [Language.zhCN]: '安装更新',
        [Language.ja]: 'アップデートをインストール'
    },
    installNow: {
        [Language.en]: 'Install Now',
        [Language.de]: 'Jetzt installieren',
        [Language.frFR]: 'Installer maintenant',
        [Language.zhCN]: '立即安装',
        [Language.ja]: '今すぐインストール'
    },
    copyKey: {
        [Language.en]: 'Copy Key',
        [Language.de]: 'Schlüssel kopieren',
        [Language.frFR]: 'Copier la clé',
        [Language.zhCN]: '复制键名',
        [Language.ja]: 'キーをコピー'
    },
    fullKeyName: {
        [Language.en]: 'Full Key Name',
        [Language.de]: 'Vollständiger Schlüsselname',
        [Language.frFR]: 'Nom de la clé complet',
        [Language.zhCN]: '完整键名',
        [Language.ja]: '完全なキー名'
    },
    sqliteOnServer: {
        [Language.en]: 'SQLite on the server?',
        [Language.de]: 'SQLite auf dem Server?',
        [Language.frFR]: 'SQLite sur le serveur ?',
        [Language.zhCN]: '服务器上的 SQLite？',
        [Language.ja]: 'サーバー上のSQLite？'
    },
    sqliteOnServerMsg: {
        [Language.en]: 'To access SQLite databases on a remote server, create an EchoLite connection.',
        [Language.de]:
            'Um auf SQLite-Datenbanken auf einem entfernten Server zuzugreifen, erstellen Sie eine EchoLite-Verbindung.',
        [Language.frFR]:
            'Pour accéder aux bases de données SQLite sur un serveur distant, créez une connexion EchoLite.',
        [Language.zhCN]: '若要访问远程服务器上的 SQLite 数据库，请新建一个 EchoLite 连接。',
        [Language.ja]: 'リモートサーバー上のSQLiteデータベースにアクセスするには、EchoLite接続を作成してください。'
    },
    command: {
        [Language.en]: 'Command',
        [Language.de]: 'Befehl',
        [Language.frFR]: 'Commande',
        [Language.zhCN]: '命令',
        [Language.ja]: 'コマンド'
    },
    doc: {
        [Language.en]: 'Documentation',
        [Language.de]: 'Dokumentation',
        [Language.frFR]: 'Documentation',
        [Language.zhCN]: '文档',
        [Language.ja]: 'ドキュメント'
    },
    betaMessage: {
        [Language.en]: 'Currently in beta stage, please use with caution!',
        [Language.de]: 'Derzeit in der Beta-Phase, bitte mit Vorsicht verwenden!',
        [Language.frFR]: 'Actuellement en phase bêta, veuillez utiliser avec prudence!',
        [Language.zhCN]: '当前处于测试阶段，请谨慎使用！',
        [Language.ja]: '現在はベータ版です。注意して使用してください！'
    },
    devMessage: {
        [Language.en]: 'Currently in development stage, for testing purposes only!',
        [Language.de]: 'Derzeit in der Entwicklungsphase, nur für Testzwecke!',
        [Language.frFR]: 'Actuellement en phase de développement, uniquement à des fins de test!',
        [Language.zhCN]: '当前处于开发阶段，仅供测试使用！',
        [Language.ja]: '現在は開発版です。テスト目的のみに使用してください！'
    },
    console: {
        [Language.en]: 'Console',
        [Language.de]: 'Konsole',
        [Language.frFR]: 'Console',
        [Language.zhCN]: '控制台',
        [Language.ja]: 'コンソール'
    },
    clearScreen: {
        [Language.en]: 'Clear Screen',
        [Language.de]: 'Bildschirm löschen',
        [Language.frFR]: "Effacer l'écran",
        [Language.zhCN]: '清除屏幕',
        [Language.ja]: '画面をクリア'
    },
    namespace: {
        [Language.en]: 'Namespace',
        [Language.de]: 'Namensraum',
        [Language.frFR]: 'Espace de noms',
        [Language.zhCN]: '命名空间',
        [Language.ja]: '名前空間'
    },
    bucket: {
        [Language.en]: 'Bucket',
        [Language.de]: 'Bucket',
        [Language.frFR]: 'Bucket',
        [Language.zhCN]: '存储桶',
        [Language.ja]: 'バケット'
    },
    region: {
        [Language.en]: 'Region',
        [Language.de]: 'Region',
        [Language.frFR]: 'Région',
        [Language.zhCN]: '区域',
        [Language.ja]: 'リージョン'
    },
    endpoint: {
        [Language.en]: 'Endpoint',
        [Language.de]: 'Endpunkt',
        [Language.frFR]: 'Point de terminaison',
        [Language.zhCN]: '端点',
        [Language.ja]: 'エンドポイント'
    },
    s3FileTooLarge: {
        [Language.en]:
            'This file is too large to preview here. Please download it to your local computer and then preview it.',
        [Language.de]:
            'Diese Datei ist zu groß für eine Vorschau hier. Bitte laden Sie sie auf Ihren lokalen Computer herunter und zeigen Sie dann eine Vorschau an.',
        [Language.frFR]:
            'Ce fichier est trop volumineux pour être prévisualisé ici. Veuillez le télécharger sur votre ordinateur local, puis le prévisualiser.',
        [Language.zhCN]: '此文件过大，无法在此处预览。请将其下载到本地后再进行预览。',
        [Language.ja]: 'このファイルは大きすぎるため、ここではプレビューできません。ローカルのコンピューターにダウンロードしてからプレビューしてください。'
    },
    newChat: {
        [Language.en]: 'New Chat',
        [Language.de]: 'Neuer Chat',
        [Language.frFR]: 'Nouveau Chat',
        [Language.zhCN]: '新建会话',
        [Language.ja]: '新規チャット'
    },
    chats: {
        [Language.en]: 'Chats',
        [Language.de]: 'Chats',
        [Language.frFR]: 'Chats',
        [Language.zhCN]: '会话',
        [Language.ja]: 'チャット'
    },
    clearChat: {
        [Language.en]: 'Clear Chat',
        [Language.de]: 'Chat löschen',
        [Language.frFR]: 'Effacer le chat',
        [Language.zhCN]: '清除会话',
        [Language.ja]: 'チャットをクリア'
    },
    deleteAllChats: {
        [Language.en]: 'Delete All Chats',
        [Language.de]: 'Alle Chats löschen',
        [Language.frFR]: 'Supprimer tous les chats',
        [Language.zhCN]: '删除所有会话',
        [Language.ja]: 'すべてのチャットを削除'
    },
    newProvider: {
        [Language.en]: 'New Provider',
        [Language.de]: 'Neuer Anbieter',
        [Language.frFR]: 'Nouveau fournisseur',
        [Language.zhCN]: '新建提供商',
        [Language.ja]: '新規プロバイダー'
    },
    noProvider: {
        [Language.en]: 'No Provider',
        [Language.de]: 'Kein Anbieter',
        [Language.frFR]: 'Aucun fournisseur',
        [Language.zhCN]: '无提供商',
        [Language.ja]: 'プロバイダーなし'
    },
    aiAssistant: {
        [Language.en]: 'AI Assistant',
        [Language.de]: 'KI-Assistent',
        [Language.frFR]: 'Assistant IA',
        [Language.zhCN]: 'AI 助手',
        [Language.ja]: 'AIアシスタント'
    },
    selectModel: {
        [Language.en]: 'Select Model',
        [Language.de]: 'Modell auswählen',
        [Language.frFR]: 'Sélectionner le modèle',
        [Language.zhCN]: '选择模型',
        [Language.ja]: 'モデルを選択'
    },
    manageModels: {
        [Language.en]: 'Manage Models...',
        [Language.de]: 'Modelle verwalten...',
        [Language.frFR]: 'Gérer les modèles...',
        [Language.zhCN]: '管理模型...',
        [Language.ja]: 'モデルを管理...'
    },
    noModelSelected: {
        [Language.en]: 'No Model selected',
        [Language.de]: 'Kein Modell ausgewählt',
        [Language.frFR]: 'Aucun modèle sélectionné',
        [Language.zhCN]: '未选择模型',
        [Language.ja]: 'モデルが選択されていません'
    },
    askAnything: {
        [Language.en]: 'Ask Anything...',
        [Language.de]: 'Frag mich alles...',
        [Language.frFR]: "Demandez n'importe quoi...",
        [Language.zhCN]: '问我任何问题...',
        [Language.ja]: '何でも聞いてください...'
    },
    cancelled: {
        [Language.en]: 'Cancelled',
        [Language.de]: 'Abgebrochen',
        [Language.frFR]: 'Annulé',
        [Language.zhCN]: '已取消',
        [Language.ja]: 'キャンセルされました'
    },
    regenerate: {
        [Language.en]: 'Regenerate',
        [Language.de]: 'Erneut generieren',
        [Language.frFR]: 'Régénérer',
        [Language.zhCN]: '重新生成',
        [Language.ja]: '再生成'
    },
    onlySupportSqlDatabase: {
        [Language.en]: 'Currently only SQL databases are supported.',
        [Language.de]: 'Derzeit werden nur SQL-Datenbanken unterstützt.',
        [Language.frFR]: 'Actuellement, seules les bases de données SQL sont prises en charge.',
        [Language.zhCN]: '当前仅支持 SQL 数据库。',
        [Language.ja]: '現在、SQLデータベースのみがサポートされています。'
    },
    aiResponseWarning: {
        [Language.en]: 'AI responses may be inaccurate.',
        [Language.de]: 'KI-Antworten können ungenau sein.',
        [Language.frFR]: "Les réponses de l'IA peuvent être inexactes.",
        [Language.zhCN]: 'AI 的回答可能不准确。',
        [Language.ja]: 'AIの回答は不正確な場合があります。'
    },
    allow: {
        [Language.en]: 'Allow',
        [Language.de]: 'Erlauben',
        [Language.frFR]: 'Permettre',
        [Language.zhCN]: '允许',
        [Language.ja]: '許可'
    },
    skip: {
        [Language.en]: 'Skip',
        [Language.de]: 'Überspringen',
        [Language.frFR]: 'Passer',
        [Language.zhCN]: '跳过',
        [Language.ja]: 'スキップ'
    },
    toolAutoApproval: {
        [Language.en]: 'Tool auto-approval',
        [Language.de]: 'Automatische Tool-Freigabe',
        [Language.frFR]: "Approbation automatique de l'outil",
        [Language.zhCN]: '工具自动批准',
        [Language.ja]: 'ツールの自動承認'
    },
    manuallyApprovedMsg: {
        [Language.en]: 'Must be manually approved',
        [Language.de]: 'Muss manuell genehmigt werden',
        [Language.frFR]: 'Doit être approuvé manuellement',
        [Language.zhCN]: '必须手动批准',
        [Language.ja]: '手動で承認する必要があります'
    },
    duration: {
        [Language.en]: 'Duration',
        [Language.de]: 'Dauer',
        [Language.frFR]: 'Durée',
        [Language.zhCN]: '持续时间',
        [Language.ja]: '処理時間'
    }
} as const

export const translationFn = {
    newVersionInstalled: {
        [Language.en]: (v: string) => `New version(${v}) installed!`,
        [Language.de]: (v: string) => `Neue Version (${v}) installiert!`,
        [Language.frFR]: (v: string) => `Nouvelle version (${v}) installée !`,
        [Language.zhCN]: (v: string) => `新版本(${v}) 已安装！`,
        [Language.ja]: (v: string) => `新バージョン(${v})がインストールされました！`
    },
    activate: {
        [Language.en]: (v: string) => `Activate ${v}`,
        [Language.de]: (v: string) => `${v} aktivieren`,
        [Language.frFR]: (v: string) => `Activé ${v}`,
        [Language.zhCN]: (v: string) => `激活 ${v}`,
        [Language.ja]: (v: string) => `${v}をアクティベート`
    },
    connectTo: {
        [Language.en]: (v: string) => `Connect to: ${v}`,
        [Language.de]: (v: string) => `Mit ${v} verbinden`,
        [Language.frFR]: (v: string) => `Se connecter à : ${v}`,
        [Language.zhCN]: (v: string) => `连接到：${v}`,
        [Language.ja]: (v: string) => `${v}に接続`
    },
    deleteMessage: {
        [Language.en]: (v: string) => `Are you sure you want to delete '${v}'?`,
        [Language.de]: (v: string) => `Möchten Sie '${v}' wirklich löschen?`,
        [Language.frFR]: (v: string) => `Êtes-vous sûr de vouloir supprimer "${v}" ?`,
        [Language.zhCN]: (v: string) => `确定要删除 '${v}' 吗？`,
        [Language.ja]: (v: string) => `本当に '${v}' を削除しますか？`
    },
    dropSchemaMessage: {
        [Language.en]: (v: string) => `Are you sure you want to drop schema '${v}'?`,
        [Language.de]: (v: string) => `Möchten Sie das Schema '${v}' wirklich löschen?`,
        [Language.frFR]: (v: string) => `Êtes-vous sûr de vouloir supprimer le schéma "${v}" ?`,
        [Language.zhCN]: (v: string) => `确定要删除 '${v}' 吗？`,
        [Language.ja]: (v: string) => `本当にスキーマ '${v}' を削除しますか？`
    },
    hidenPrimaryColumnMsg: {
        [Language.en]: (v: string) => `Do not hide the primary key column '${v}'`,
        [Language.de]: (v: string) => `Zeile des Primärschlüssels '${v}' nicht verstecken`,
        [Language.frFR]: (v: string) => `Ne pas masquer la colonne "${v}" de la clé primaire`,
        [Language.zhCN]: (v: string) => `不要隐藏包含主键的列 '${v}'`,
        [Language.ja]: (v: string) => `主キー列 '${v}' を非表示にしないでください`
    },
    rowsCount: {
        [Language.en]: (v: string) => `${v} rows`,
        [Language.de]: (v: string) => `${v} Zeilen`,
        [Language.frFR]: (v: string) => `${v} lignes`,
        [Language.zhCN]: (v: string) => `${v} 行`,
        [Language.ja]: (v: string) => `${v} 行`
    },
    colsCount: {
        [Language.en]: (v: string) => `${v} cols`,
        [Language.de]: (v: string) => `${v} Spalten`,
        [Language.frFR]: (v: string) => `${v} col.`,
        [Language.zhCN]: (v: string) => `${v} 列`,
        [Language.ja]: (v: string) => `${v} 列`
    },
    ms: {
        [Language.en]: (v: string) => `${v}ms`,
        [Language.de]: (v: string) => `${v}ms`,
        [Language.frFR]: (v: string) => `${v}ms`,
        [Language.zhCN]: (v: string) => `${v}毫秒`,
        [Language.ja]: (v: string) => `${v}ミリ秒`
    },
    sec: {
        [Language.en]: (v: string) => `${v}s`,
        [Language.de]: (v: string) => `${v}s`,
        [Language.frFR]: (v: string) => `${v}s`,
        [Language.zhCN]: (v: string) => `${v}秒`,
        [Language.ja]: (v: string) => `${v}秒`
    },
    rowsAffected: {
        [Language.en]: (v: string) => `${v} rows affected`,
        [Language.de]: (v: string) => `${v} Zeilen betroffen`,
        [Language.frFR]: (v: string) => `${v} lignes affectées`,
        [Language.zhCN]: (v: string) => `${v} 行受到影响`,
        [Language.ja]: (v: string) => `${v} 行が影響を受けました`
    },
    deleteCommitMsg: {
        [Language.en]: (v: string) => `Delete ${v} rows of data`,
        [Language.de]: (v: string) => `${v} Datenzeilen löschen`,
        [Language.frFR]: (v: string) => `Supprimer ${v} lignes de données`,
        [Language.zhCN]: (v: string) => `删除 ${v} 行数据`,
        [Language.ja]: (v: string) => `${v}行のデータを削除`
    },
    updateCommitMsg: {
        [Language.en]: (v: string) => `Update ${v} rows of data`,
        [Language.de]: (v: string) => `${v} Datenzeilen aktualisieren`,
        [Language.frFR]: (v: string) => `Mettre à jour ${v} lignes de données`,
        [Language.zhCN]: (v: string) => `更新 ${v} 行数据`,
        [Language.ja]: (v: string) => `${v}行のデータを更新`
    }
} as const
