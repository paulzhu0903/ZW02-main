/* ============================================================
   国际化 (i18n) 翻译系统
   ============================================================ */

export type Language = 'zh-TW' | 'zh-CN'

const translations: Record<Language, Record<string, any>> = {
  'zh-TW': {
    // App 头部
    'app.title': '紫微知道',
    'app.subtitle': 'AI 命理工具',

    // 导航标签
    'nav.cases': '命例',
    'nav.chart': '命盤解讀',
    'nav.fortune': '年度運勢',
    'nav.kline': '人生K線',
    'nav.match': '雙人合盤',
    'nav.share': '分享卡片',
    'nav.settings': '設置',

    // Fortune
    'fortune.view': '查看運勢',
    'fortune.selectYearHint': '選擇年份並點擊「查看運勢」開始分析',
    'fortune.analyzing': '分析中',
    'fortune.configureApi': '請先配置 API',
    'fortune.configureApiLong': '請先在設置中配置 AI 模型的 API Key，即可獲得年度運勢分析。',
    'fortune.analyzingFull': '正在分析 {year} 年運勢...',
    'fortune.previewTitle': '📋 {year} 年運勢分析預查',
    'fortune.yearlyData': '流年數據（JSON）',
    'fortune.userPrompt': '用戶提示詞',
    'fortune.confirmAnalyze': '✓ 確認分析',
    'fortune.cancelAnalyze': '✕ 返回修改',
    'fortune.showPrompt': '顯示 Prompt',
    'fortune.hidePrompt': '隱藏 Prompt',
    'fortune.failedAnalyze': '分析失敗，請重試',

    // AI Interpretation
    'ai.title': 'AI 命盤解讀',
    'ai.start': '開始解讀',
    'ai.loading': '解讀中',
    'ai.showPrompt': '顯示 Prompt',
    'ai.hidePrompt': '隱藏 Prompt',
    'ai.promptPreview': 'Prompt 預覽',
    'ai.promptHintNoApi': '未配置 API 前，也可先點擊「顯示 Prompt」檢查提示詞。',
    'ai.configureApiKey': '請先在設置中配置 API Key',
    'ai.configureApiLong': '請先在設置中配置 AI 模型的 API Key，即可獲得深度命盤解讀。',
    'ai.failedRetry': '解讀失敗，請重試',
    'ai.analyzingChart': '正在分析命盤...',

    // AI Prompt (User Message)s
    'ai.prompt.readChart': '請解讀以下命盤：',
    'ai.prompt.keyIndicators': '關鍵指標 JSON',
    'ai.prompt.indicatorsHint': '以下 JSON 是程式自動整理的關鍵指標，**優先依此做結構判讀**，再參考補充上下文交叉驗證。',
    'ai.prompt.basicInfo': '基本資訊',
    'ai.prompt.analyzeOrder': '先建立座標系（各宮干地支、生年四化、自化、男女星、我宮/他宮），再說明體用與能量流動，最後白話解讀。',

    // AI Prompt Context (JSON Labels)
    'ai.context.complete': '【命盤完整信息】',
    'ai.context.lifePalaceStars': '## 命宮主星',
    'ai.context.bodyPalacePosition': '## 身宮位置',
    'ai.context.bodyPalaceIn': '- 身宮在',
    'ai.context.transformationCoordinate': '## 北派四化座標',
    'ai.context.transformationCoordinateHint': '（以宮干地支、生年四化、離心/向心自化、我宮/他宮為主）',
    'ai.context.natalMutation': '## 生年四化',
    'ai.context.decadalLimits': '## 十二大限',
    'ai.context.decadalHint': '（每個大限10年，按宮位天干飛化）',
    'ai.context.majorStars': '主星',
    'ai.context.genderStars': '男女星',
    'ai.context.centrifugalMutation': '離心自化',
    'ai.context.centripetal': '向心自化',
    'ai.context.decadalAgeRange': '大限天干',
    'ai.context.mutagenList': '大限四化',
    'ai.context.noMajorStars': '無主星',

    // Life K Line
    'kline.generate': '✨ AI 生成人生K線',
    'kline.generating': '生成中...',
    'kline.initializing': '初始化...',
    'kline.calculating': '正在計算運勢...',
    'kline.failedRetry': '生成失敗，請重試',
    'kline.analyzingChart': '正在分析命盤...',
    'kline.aiReasoning': 'AI 正在推演運勢走向...',
    'kline.parsingData': '正在解析數據...',
    'kline.bornSuffix': '年生 · 100 年運勢起伏一目了然',
    'kline.chartTitle': '人生流年大運 K 線圖',
    'kline.goodLuck': '吉運',
    'kline.badLuck': '凶運',
    'kline.age': '年齡',
    'kline.fortuneScore': '運勢分',
    'kline.apiHint': '提示：配置 API Key 可使用 AI 分析命盤生成',
    'kline.aiGenerating': 'AI 正在生成運勢解讀...',
    'kline.daYun': '大運',
    'kline.startOfYear': '年初',
    'kline.endOfYear': '年末',
    'kline.highOfYear': '年內高',
    'kline.lowOfYear': '年內低',
    'kline.interpretationLoading': 'AI 解讀生成中...',
    'kline.belongDaYun': '所屬大運',
    'kline.totalScore': '綜合評分',
    'kline.yearlyMutagens': '流年四化',
    'kline.interpretation': '運勢解讀',
    'kline.scoreExcellent': '大吉',
    'kline.scoreGood': '吉',
    'kline.scoreFlat': '平',
    'kline.scoreBad': '凶',
    'kline.scoreWorst': '大凶',

    // Match Analysis
    'match.year': '年',
    'match.month': '月',
    'match.day': '日',
    'match.hour': '時辰',
    'match.firstPerson': '第一人',
    'match.secondPerson': '第二人',
    'match.startAnalyze': '開始合盤分析',
    'match.configureApiKey': '請先在設置中配置 API Key',
    'match.analysisFailed': '分析失敗，請重試',
    'match.configureApiLong': '請先在設置中配置 AI 模型的 API Key，即可獲得雙人合盤分析。',
    'match.inputHint': '輸入雙方信息並點擊「開始合盤分析」',
    'match.loadingText': '正在分析兩人契合度...',

    // Share Card
    'share.noChart': '請先生成命盤，再建立分享卡片',
    'share.aiTip': '💡 先進行 AI 命盤解讀，即可自動提取專屬金句',
    'share.cardTitle': '紫微命格',
    'share.lifePalaceStars': '命宮主星',
    'share.pattern': '格局',
    'share.defaultQuote': '命由天定，事在人為。\n知命而不懼，順勢而為之。',
    'share.quotePlaceholder': '輸入自定義金句，每句話換行...',
    'share.customizeQuote': '✎ 自定義金句',
    'share.saveImage': '保存分享圖',
    'share.generating': '生成中...',
    'share.footerHint': '長按保存圖片，分享到小紅書 📕',
    'share.downloadFailed': '圖片生成失敗',
    'share.unknownError': '未知錯誤',
    'share.watermark': '─── 紫微知道 ───',

    // BirthForm
    'form.viewCases': '查看命例',
    'form.name': '姓名',
    'form.namePlaceholder': '如：王小明',
    'form.nameHint': '可選，用於保存記錄',
    'form.birthLocation': '出生地（可選）',
    'form.birthLocationPlaceholder': '如：北京、成都、烏魯木齊',
    'form.birthLocationHint': '用於真太陽時校正，可提高準確度',
    'form.remark': '備註',
    'form.remarkPlaceholder': '可選填，不作計算用',
    'form.remarkHint': '此欄位不影響排盤結果',
    'form.date': '出生日期',
    'form.solarCalendar': '陽曆',
    'form.dateHint': '請輸入陽曆（公曆）日期，系統會自動轉為農曆排盤',
    'form.birthTime': '出生時間',
    'form.confirm': '確認',
    'form.cancel': '取消',
    'form.gender': '性別',
    'form.male': '男',
    'form.female': '女',
    'form.submit': '開始排盤',
    'form.submitting': '排盤中...',

    // Modal
    'modal.cases': '查看命例',
    'modal.search': '搜尋...',
    'modal.add': '新增',
    'modal.edit': '修改',
    'modal.delete': '刪除',
    'modal.arrange': '排盤',
    'modal.close': '關閉',
    'modal.selectToEdit': '請先選擇要修改的記錄',
    'modal.selectToDelete': '請先選擇要刪除的記錄',
    'modal.selectToArrange': '請先選擇要排盤的記錄',
    'modal.confirmDelete': '確定要刪除此筆資料嗎？',
    'modal.noRecords': '沒有找到符合的使用者',
    'modal.name': '姓名',
    'modal.gender': '性別',
    'modal.birthLocation': '出生地',
    'modal.birthDate': '生辰',
    'modal.remarks': '備註',
    'modal.male': '男',
    'modal.female': '女',
    'modal.noRemarks': '無',

    // Settings
    'settings.title': '設置',
    'settings.language': '介面語言',
    'settings.traditionalChinese': '繁體中文',
    'settings.simplifiedChinese': '简体中文',
    'settings.defaultChart': '預設盤面',
    'settings.flyingChart': '飛星',
    'settings.triremeChart': '三合',
    'settings.transformationChart': '四化',
    'settings.monthlyArrangement': '排流月',
    'settings.yuanYuePositioning': '正月定位法',
    'settings.douJun': '斗君法',
    'settings.starPlacement': '安星法',
    'settings.yearBranch': '安天馬-依據年支',
    'settings.lunarMonth': '安天馬-依據月支',
    'settings.standardArrangement': '安天空-常規排法',
    'settings.aiProvider': 'AI 提供廠商',
    'settings.provider': '使用廠商',
    'settings.apiKey': 'API Key',
    'settings.apiKeyPlaceholder': '輸入 API Key',
    'settings.getApiKey': '取得 API Key',
    'settings.current': '當前',
    'settings.transformation': '四化盤面設定',
    'settings.showGods': '顯示神煞',
    'settings.showDailyMutagen': '顯示日干四化',
    'settings.showTriremeEnlightenment': '顯示三合八座恩光天貴',
    'settings.useColorMutagen': '使用彩色標識四化和自化',
    'settings.showAnnualAge': '顯示流年和虛歲年齡',
    'settings.showCentralEightCharacters': '中宮顯示八字和大運',
    'settings.showCentralFixBoard': '中宮顯示定盤按鈕',
    'settings.showCausePalace': '顯示來因宮',
    'settings.flying': '飛星盤面設定',
    'settings.trireme': '三合盤面設定',
    'settings.showMinorStars': '顯示小星',
    'settings.showStarBrightness': '顯示星曜亮度',
    'settings.mutagenSquareSize': '四化方塊尺寸',
    'settings.squareSizeSmall': '小 (9px)',
    'settings.squareSizeMedium': '中 (10px)',
    'settings.squareSizeLarge': '大 (11px)',
    'settings.showBodyPalace': '顯示身宮',
    'settings.showCommandMutagen': '顯示命宮四化',
    'settings.useColorMultiArrow': '標識 - 彩色多箭頭標識自化',
    'settings.showTripleQuaternaryLine': '標識 - 中宮顯示三方四正指示線',
    'settings.thinking': '啟用深度思考',
    'settings.thinkingHint': '需模型支持 (Claude/DeepSeek/Gemini 等)',
    'settings.webSearch': '啟用聯網搜尋',
    'settings.webSearchHint': '使用原生搜尋能力',
    'settings.webSearchHintTavily': '需配置 Tavily API',
    'settings.searchApiKey': '搜尋 API Key (Tavily)',
    'settings.advanced': '進階設置',
    'settings.baseUrl': 'BaseURL',
    'settings.baseUrlOverride': '已覆蓋',
    'settings.model': 'Model',
    'settings.modelOverride': '已覆蓋',
    'settings.default': '默認',
    'settings.modified': '已修改',
    'settings.configured': '已配置',
    'settings.cancel': '取消',
    'settings.save': '保存',
    'settings.saveAsterisk': '保存設置 *',
    'settings.saved': '✓ 已保存',
    'settings.unsavedChanges': '當前配置有未保存的修改，切換廠商將丟失這些修改。',
    'settings.discardChanges': '放棄修改',
    'settings.saveAndSwitch': '保存並切換',
    'settings.tavilyApiKeyPlaceholder': '輸入 Tavily API Key',
    'settings.privacyHint': 'API Key 僅保存在本地瀏覽器，不會上傳其他服務器。',
    
    // Provider Labels
    'settings.providerKimi': 'Kimi (月之暗面)',
    'settings.providerGemini': 'Gemini (Google)',
    'settings.providerClaude': 'Claude (Anthropic)',
    'settings.providerDeepseek': 'DeepSeek',
    'settings.providerCustom': '自定義 (OpenAI 兼容)',

    // Empty State
    'empty.noChart': '請先在「命盤解讀」中輸入您的生辰信息',
    'empty.goToInput': '前往輸入',

    // Chart Display
    'chart.birthInfo': '出生信息',
    'chart.gender': '性別',
    'chart.time': '時間',
    'chart.brightness': '亮度',
    'chart.mutagen': '化曜',
    'chart.earthly': '地支',
    'chart.heavenly': '天干',
    'chart.title': '紫微斗數命盤',
    'chart.solarCalendar': '陽曆',
    'chart.lunarCalendar': '農曆',
    'chart.ganZhi': '干支',
    'chart.nayin': '納音',
    'chart.soul': '命主',
    'chart.body': '身主',
    'chart.zodiac': '生肖',
    'chart.astroSign': '星座',
    'chart.nativeName': '命主',
    'chart.solarTime': '真太陽時',
    'chart.birthTime': '出生時間',
    'chart.lunarDate': '農曆',
    'chart.fourPillars': '四柱',
    'chart.fiveElementsClass': '五行局',
    'chart.yinYangGender': '性別',
    'brightness.temple': '廟',
    'brightness.wang': '望',
    'brightness.ping': '平',
    'brightness.xian': '陷',

    // 四化 (Mutagen) - 天干四化
    'mutagen.lucun': '祿',
    'mutagen.quan': '權',
    'mutagen.ke': '科',
    'mutagen.ji': '忌',
    'mutagen.huaLucun': '化祿',
    'mutagen.huaQuan': '化權',
    'mutagen.huaKe': '化科',
    'mutagen.huaJi': '化忌',

    // 十四主星 - 使用英文参数名避免字体混淆
    'star.ziwei': '紫微',
    'star.tianji': '天機',
    'star.taiyang': '太陽',
    'star.wuqu': '武曲',
    'star.tiantong': '天同',
    'star.lianzhen': '廉貞',
    'star.tianfu': '天府',
    'star.taiyin': '太陰',
    'star.tanlang': '貪狼',
    'star.jumen': '巨門',
    'star.tianxiang': '天相',
    'star.tiangliang': '天梁',
    'star.qisha': '七殺',
    'star.pojun': '破軍',

    // 杂曜星 - 使用英文参数名
    'star.qingyang': '擎羊',
    'star.tuoluo': '陀羅',
    'star.huoxing': '火星',
    'star.lingxing': '鈴星',
    'star.dikong': '地空',
    'star.dijie': '地劫',
    'star.zuofu': '左輔',
    'star.youbi': '右弼',
    'star.wenchang': '文昌',
    'star.wenqu': '文曲',
    'star.lucun': '祿存',
    'star.tianma': '天馬',
    'star.hongluan': '紅鸞',
    'star.tianxi': '天喜',
    'star.tianxing': '天刑',
    'star.tianyao': '天姚',
    'star.tiankue': '天哭',
    'star.tianxu': '天虛',
    'star.longchi': '龍池',
    'star.fengge': '鳳閣',
    'star.huagai': '華蓋',
    'star.xianchi': '咸池',
    'star.tiande': '天德',
    'star.yuede': '月德',
    'star.tianguan': '天官',
    'star.tianfu2': '天福',
    'star.jieshen': '解神',
    'star.tianwu': '天巫',
    'star.tianyue': '天月',
    'star.youyue': '天鑰',
    'star.tiankui': '天魁',
    'star.yinsha': '陰煞',
    'star.taifu': '台輔',
    'star.fenggao': '封誥',
    'star.santai': '三台',
    'star.bazuo': '八座',
    'star.enguang': '恩光',
    'star.tiangui': '天貴',
    'star.tianshou': '天壽',
    'star.tianshang': '天傷',
    'star.longde': '龍德',

    // 宫位名称 - 使用英文参数名避免字体混淆
    'palace.life': '命宮',
    'palace.parents': '父母',
    'palace.virtue': '福德',
    'palace.property': '田宅',
    'palace.career': '官祿',
    'palace.spouse': '夫妻',
    'palace.children': '子女',
    'palace.wealth': '財帛',
    'palace.health': '疾厄',
    'palace.travel': '遷移',
    'palace.servants': '交友',
    'palace.siblings': '兄弟',

    // 长生十二神 (12 Longevity Deities)
    'longlifeDeity.longevity': '長生',
    'longlifeDeity.bathing': '沐浴',
    'longlifeDeity.robes': '冠帶',
    'longlifeDeity.ranking': '臨官',
    'longlifeDeity.empire': '帝旺',
    'longlifeDeity.decline': '衰',
    'longlifeDeity.illness': '病',
    'longlifeDeity.death': '死',
    'longlifeDeity.tomb': '墓',
    'longlifeDeity.severance': '絕',
    'longlifeDeity.fetus': '胎',
    'longlifeDeity.nurturing': '養',

    // 博士十二神 (12 Doctoral Deities)
    'boshi12Deity.scholar': '博士',
    'boshi12Deity.warrior': '力士',
    'boshi12Deity.greenDragon': '青龍',
    'boshi12Deity.littleWaste': '小耗',
    'boshi12Deity.general': '將軍',
    'boshi12Deity.report': '奏書',
    'boshi12Deity.feiteline': '飛廉',
    'boshi12Deity.joy': '喜神',
    'boshi12Deity.fortune': '福星',
    'boshi12Deity.official': '官符',
    'boshi12Deity.ghost': '亡神',
    'boshi12Deity.whiteTiger': '白虎',
  },

  'zh-CN': {
    // App 头部
    'app.title': '紫微知道',
    'app.subtitle': 'AI 命理工具',

    // 导航标签
    'nav.cases': '命例',
    'nav.chart': '命盘解读',
    'nav.fortune': '年度运势',
    'nav.kline': '人生K线',
    'nav.match': '双人合盘',
    'nav.share': '分享卡片',
    'nav.settings': '设置',

    // Fortune
    'fortune.view': '查看运势',
    'fortune.selectYearHint': '选择年份并点击「查看运势」开始分析',
    'fortune.analyzing': '分析中',
    'fortune.configureApi': '请先配置 API',
    'fortune.configureApiLong': '请先在设置中配置 AI 模型的 API Key，即可获得年度运势分析。',
    'fortune.analyzingFull': '正在分析 {year} 年运势...',
    'fortune.previewTitle': '📋 {year} 年运势分析预查',
    'fortune.yearlyData': '流年数据（JSON）',
    'fortune.userPrompt': '用户提示词',
    'fortune.confirmAnalyze': '✓ 确认分析',
    'fortune.cancelAnalyze': '✕ 返回修改',
    'fortune.showPrompt': '显示 Prompt',
    'fortune.hidePrompt': '隐藏 Prompt',
    'fortune.failedAnalyze': '分析失败，请重试',

    // AI Interpretation
    'ai.title': 'AI 命盘解读',
    'ai.start': '开始解读',
    'ai.loading': '解读中',
    'ai.showPrompt': '显示 Prompt',
    'ai.hidePrompt': '隐藏 Prompt',
    'ai.promptPreview': 'Prompt 预览',
    'ai.promptHintNoApi': '未配置 API 前，也可先点击「显示 Prompt」检查提示词。',
    'ai.configureApiKey': '请先在设置中配置 API Key',
    'ai.configureApiLong': '请先在设置中配置 AI 模型的 API Key，即可获得深度命盘解读。',
    'ai.failedRetry': '解读失败，请重试',
    'ai.analyzingChart': '正在分析命盘...',

    // AI Prompt (User Message)
    'ai.prompt.readChart': '请解读以下命盘：',
    'ai.prompt.keyIndicators': '关键指标 JSON',
    'ai.prompt.indicatorsHint': '以下 JSON 是程序自动整理的关键指标，**优先依此做结构判读**，再参考补充上下文交叉验证。',
    'ai.prompt.basicInfo': '基本信息',
    'ai.prompt.supplementContext': '补充盘面上下文',
    'ai.prompt.analyzeOrder': '先建立坐标系（各宫干地支、生年四化、自化、男女星、我宫/他宫），再说明体用与能量流动，最后白话解读。',

    // AI Prompt Context (JSON Labels)
    'ai.context.complete': '【命盘完整信息】',
    'ai.context.lifePalaceStars': '## 命宫主星',
    'ai.context.bodyPalacePosition': '## 身宫位置',
    'ai.context.bodyPalaceIn': '- 身宫在',
    'ai.context.transformationCoordinate': '## 北派四化坐标',
    'ai.context.transformationCoordinateHint': '（以宫干、地支、生年四化、离心/向心自化、我宫/他宫为主）',
    'ai.context.natalMutation': '## 生年四化',
    'ai.context.decadalLimits': '## 十二大限',
    'ai.context.decadalHint': '（每个大限10年，按宫位天干飞化）',
    'ai.context.majorStars': '主星',
    'ai.context.genderStars': '男女星',
    'ai.context.centrifugalMutation': '离心自化',
    'ai.context.centripetal': '向心自化',
    'ai.context.decadalAgeRange': '大限天干',
    'ai.context.mutagenList': '大限四化',
    'ai.context.noMajorStars': '无主星',

    // Life K Line
    'kline.generate': '✨ AI 生成人生K线',
    'kline.generating': '生成中...',
    'kline.initializing': '初始化...',
    'kline.calculating': '正在计算运势...',
    'kline.failedRetry': '生成失败，请重试',
    'kline.analyzingChart': '正在分析命盘...',
    'kline.aiReasoning': 'AI 正在推演运势走向...',
    'kline.parsingData': '正在解析数据...',
    'kline.bornSuffix': '年生 · 100 年运势起伏一目了然',
    'kline.chartTitle': '人生流年大运 K 线图',
    'kline.goodLuck': '吉运',
    'kline.badLuck': '凶运',
    'kline.age': '年龄',
    'kline.fortuneScore': '运势分',
    'kline.apiHint': '提示：配置 API Key 可使用 AI 分析命盘生成',
    'kline.aiGenerating': 'AI 正在生成运势解读...',
    'kline.daYun': '大运',
    'kline.startOfYear': '年初',
    'kline.endOfYear': '年末',
    'kline.highOfYear': '年内高',
    'kline.lowOfYear': '年内低',
    'kline.interpretationLoading': 'AI 解读生成中...',
    'kline.belongDaYun': '所属大运',
    'kline.totalScore': '综合评分',
    'kline.yearlyMutagens': '流年四化',
    'kline.interpretation': '运势解读',
    'kline.scoreExcellent': '大吉',
    'kline.scoreGood': '吉',
    'kline.scoreFlat': '平',
    'kline.scoreBad': '凶',
    'kline.scoreWorst': '大凶',

    // Match Analysis
    'match.year': '年',
    'match.month': '月',
    'match.day': '日',
    'match.hour': '时辰',
    'match.firstPerson': '第一人',
    'match.secondPerson': '第二人',
    'match.startAnalyze': '开始合盘分析',
    'match.configureApiKey': '请先在设置中配置 API Key',
    'match.analysisFailed': '分析失败，请重试',
    'match.configureApiLong': '请先在设置中配置 AI 模型的 API Key，即可获得双人合盘分析。',
    'match.inputHint': '输入双方信息并点击「开始合盘分析」',
    'match.loadingText': '正在分析两人契合度...',

    // Share Card
    'share.noChart': '请先生成命盘，再创建分享卡片',
    'share.aiTip': '💡 先进行 AI 命盘解读，即可自动提取专属金句',
    'share.cardTitle': '紫微命格',
    'share.lifePalaceStars': '命宫主星',
    'share.pattern': '格局',
    'share.defaultQuote': '命由天定，事在人为。\n知命而不惧，顺势而为之。',
    'share.quotePlaceholder': '输入自定义金句，每句话换行...',
    'share.customizeQuote': '✎ 自定义金句',
    'share.saveImage': '保存分享图',
    'share.generating': '生成中...',
    'share.footerHint': '长按保存图片，分享到小红书 📕',
    'share.downloadFailed': '图片生成失败',
    'share.unknownError': '未知错误',
    'share.watermark': '─── 紫微知道 ───',

    // BirthForm
    'form.viewCases': '查看命例',
    'form.name': '姓名',
    'form.namePlaceholder': '如：王小明',
    'form.nameHint': '可选，用于保存记录',
    'form.birthLocation': '出生地（可选）',
    'form.birthLocationPlaceholder': '如：北京、成都、乌鲁木齐',
    'form.birthLocationHint': '用于真太阳时校正，可提高准确度',
    'form.remark': '备注',
    'form.remarkPlaceholder': '可选填，不作计算用',
    'form.remarkHint': '此字段不影响排盘结果',
    'form.date': '出生日期',
    'form.solarCalendar': '阳历',
    'form.dateHint': '请输入阳历（公历）日期，系统会自动转为农历排盘',
    'form.birthTime': '出生时间',
    'form.confirm': '确认',
    'form.cancel': '取消',
    'form.gender': '性别',
    'form.male': '男',
    'form.female': '女',
    'form.submit': '开始排盘',
    'form.submitting': '排盘中...',

    // Modal
    'modal.cases': '查看命例',
    'modal.search': '搜索...',
    'modal.add': '新增',
    'modal.edit': '修改',
    'modal.delete': '删除',
    'modal.arrange': '排盘',
    'modal.close': '关闭',
    'modal.selectToEdit': '请先选择要修改的记录',
    'modal.selectToDelete': '请先选择要删除的记录',
    'modal.selectToArrange': '请先选择要排盘的记录',
    'modal.confirmDelete': '确定要删除此笔资料吗？',
    'modal.noRecords': '没有找到符合的使用者',
    'modal.name': '姓名',
    'modal.gender': '性别',
    'modal.birthLocation': '出生地',
    'modal.birthDate': '生辰',
    'modal.remarks': '备注',
    'modal.male': '男',
    'modal.female': '女',
    'modal.noRemarks': '无',

    // Settings
    'settings.title': '设置',
    'settings.language': '接口语言',
    'settings.traditionalChinese': '繁体中文',
    'settings.simplifiedChinese': '简体中文',
    'settings.defaultChart': '预设盘面',
    'settings.flyingChart': '飞星',
    'settings.triremeChart': '三合',
    'settings.transformationChart': '四化',
    'settings.monthlyArrangement': '排流月',
    'settings.yuanYuePositioning': '正月定位法',
    'settings.douJun': '斗君法',
    'settings.starPlacement': '安星法',
    'settings.yearBranch': '安天马-依据年支',
    'settings.lunarMonth': '安天马-依据月支',
    'settings.standardArrangement': '安天空-常规排法',
    'settings.aiProvider': 'AI 提供厂商',
    'settings.provider': '使用厂商',
    'settings.apiKey': 'API Key',
    'settings.apiKeyPlaceholder': '输入 API Key',
    'settings.getApiKey': '获取 API Key',
    'settings.current': '当前',
    'settings.transformation': '四化盘面设定',
    'settings.showGods': '显示神煞',
    'settings.showDailyMutagen': '显示日干四化',
    'settings.showTriremeEnlightenment': '显示三合八座恩光天贵',
    'settings.useColorMutagen': '使用彩色标识四化和自化',
    'settings.showAnnualAge': '显示流年和虚岁年龄',
    'settings.showCentralEightCharacters': '中宫显示八字和大运',
    'settings.showCentralFixBoard': '中宫显示定盘按钮',
    'settings.showCausePalace': '显示来因宫',
    'settings.flying': '飞星盘面设定',
    'settings.trireme': '三合盘面设定',
    'settings.showMinorStars': '显示小星',
    'settings.showStarBrightness': '显示星曜亮度',
    'settings.mutagenSquareSize': '四化方块尺寸',
    'settings.squareSizeSmall': '小 (9px)',
    'settings.squareSizeMedium': '中 (10px)',
    'settings.squareSizeLarge': '大 (11px)',
    'settings.showBodyPalace': '显示身宫',
    'settings.showCommandMutagen': '显示命宫四化',
    'settings.useColorMultiArrow': '标识 - 彩色多箭头标识自化',
    'settings.showTripleQuaternaryLine': '标识 - 中宫显示三方四正指示线',
    'settings.thinking': '启用深度思考',
    'settings.thinkingHint': '需模型支持 (Claude/DeepSeek/Gemini 等)',
    'settings.webSearch': '启用联网搜索',
    'settings.webSearchHint': '使用原生搜索能力',
    'settings.webSearchHintTavily': '需配置 Tavily API',
    'settings.searchApiKey': '搜索 API Key (Tavily)',
    'settings.advanced': '进阶设置',
    'settings.baseUrl': 'BaseURL',
    'settings.baseUrlOverride': '已覆盖',
    'settings.model': 'Model',
    'settings.modelOverride': '已覆盖',
    'settings.default': '默认',
    'settings.modified': '已修改',
    'settings.configured': '已配置',
    'settings.cancel': '取消',
    'settings.save': '保存',
    'settings.saveAsterisk': '保存设置 *',
    'settings.saved': '✓ 已保存',
    'settings.unsavedChanges': '当前配置有未保存的修改，切换厂商将丢失这些修改。',
    'settings.discardChanges': '放弃修改',
    'settings.saveAndSwitch': '保存并切换',
    'settings.tavilyApiKeyPlaceholder': '输入 Tavily API Key',
    'settings.privacyHint': 'API Key 仅保存在你的浏览器本地，不会上传到任何服务器。',
    
    // Provider Labels
    'settings.providerKimi': 'Kimi (月之暗面)',
    'settings.providerGemini': 'Gemini (Google)',
    'settings.providerClaude': 'Claude (Anthropic)',
    'settings.providerDeepseek': 'DeepSeek',
    'settings.providerCustom': '自定义 (OpenAI 兼容)',

    // Empty State
    'empty.noChart': '请先在「命盘解读」中输入您的生辰信息',
    'empty.goToInput': '前往输入',

    // Chart Display
    'chart.birthInfo': '出生信息',
    'chart.gender': '性别',
    'chart.time': '时间',
    'chart.brightness': '亮度',
    'chart.mutagen': '化曜',
    'chart.earthly': '地支',
    'chart.heavenly': '天干',
    'chart.title': '紫微斗数命盘',
    'chart.solarCalendar': '阳历',
    'chart.lunarCalendar': '农历',
    'chart.ganZhi': '干支',
    'chart.nayin': '纳音',
    'chart.soul': '命主',
    'chart.body': '身主',
    'chart.zodiac': '生肖',
    'chart.astroSign': '星座',
    'chart.nativeName': '命主',
    'chart.solarTime': '真太阳时',
    'chart.birthTime': '出生时间',
    'chart.lunarDate': '农历',
    'chart.fourPillars': '四柱',
    'chart.fiveElementsClass': '五行局',
    'chart.yinYangGender': '性别',
    'brightness.temple': '庙',
    'brightness.wang': '望',
    'brightness.ping': '平',
    'brightness.xian': '陷',

    // 四化 (Mutagen) - 天干四化
    'mutagen.lucun': '禄',
    'mutagen.quan': '权',
    'mutagen.ke': '科',
    'mutagen.ji': '忌',
    'mutagen.huaLucun': '化禄',
    'mutagen.huaQuan': '化权',
    'mutagen.huaKe': '化科',
    'mutagen.huaJi': '化忌',

    // 十四主星 - 使用英文参数名
    'star.ziwei': '紫微',
    'star.tianji': '天机',
    'star.taiyang': '太阳',
    'star.wuqu': '武曲',
    'star.tiantong': '天同',
    'star.lianzhen': '廉贞',
    'star.tianfu': '天府',
    'star.taiyin': '太阴',
    'star.tanlang': '贪狼',
    'star.jumen': '巨门',
    'star.tianxiang': '天相',
    'star.tiangliang': '天梁',
    'star.qisha': '七杀',
    'star.pojun': '破军',

    // 杂曜星 - 使用英文参数名
    'star.qingyang': '擎羊',
    'star.tuoluo': '陀罗',
    'star.huoxing': '火星',
    'star.lingxing': '铃星',
    'star.dikong': '地空',
    'star.dijie': '地劫',
    'star.zuofu': '左辅',
    'star.youbi': '右弼',
    'star.wenchang': '文昌',
    'star.wenqu': '文曲',
    'star.lucun': '禄存',
    'star.tianma': '天马',
    'star.hongluan': '红鸾',
    'star.tianxi': '天喜',
    'star.tianxing': '天刑',
    'star.tianyao': '天姚',
    'star.tiankue': '天哭',
    'star.tianxu': '天虚',
    'star.longchi': '龙池',
    'star.fengge': '凤阁',
    'star.huagai': '华盖',
    'star.xianchi': '咸池',
    'star.tiande': '天德',
    'star.yuede': '月德',
    'star.tianguan': '天官',
    'star.tianfu2': '天福',
    'star.jieshen': '解神',
    'star.tianwu': '天巫',
    'star.tianyue': '天月',
    'star.youyue': '天钺',
    'star.tiankui': '天魁',
    'star.yinsha': '阴煞',
    'star.taifu': '台辅',
    'star.fenggao': '封诰',
    'star.santai': '三台',
    'star.bazuo': '八座',
    'star.enguang': '恩光',
    'star.tiangui': '天贵',
    'star.tianshou': '天寿',
    'star.tianshang': '天伤',
    'star.longde': '龙德',

    // 宫位名称 - 使用英文参数名避免字体混淆
    'palace.life': '命宫',
    'palace.parents': '父母',
    'palace.virtue': '福德',
    'palace.property': '田宅',
    'palace.career': '官禄',
    'palace.spouse': '夫妻',
    'palace.children': '子女',
    'palace.wealth': '财帛',
    'palace.health': '疾厄',
    'palace.travel': '迁移',
    'palace.servants': '交友',
    'palace.siblings': '兄弟',

    // 长生十二神 (12 Longevity Deities)
    'longlifeDeity.longevity': '长生',
    'longlifeDeity.bathing': '沐浴',
    'longlifeDeity.robes': '冠带',
    'longlifeDeity.ranking': '临官',
    'longlifeDeity.empire': '帝旺',
    'longlifeDeity.decline': '衰',
    'longlifeDeity.illness': '病',
    'longlifeDeity.death': '死',
    'longlifeDeity.tomb': '墓',
    'longlifeDeity.severance': '绝',
    'longlifeDeity.fetus': '胎',
    'longlifeDeity.nurturing': '养',

    // 博士十二神 (12 Doctoral Deities)
    'boshi12Deity.scholar': '博士',
    'boshi12Deity.warrior': '力士',
    'boshi12Deity.greenDragon': '青龙',
    'boshi12Deity.littleWaste': '小耗',
    'boshi12Deity.general': '将军',
    'boshi12Deity.report': '奏书',
    'boshi12Deity.feiteline': '飞廉',
    'boshi12Deity.joy': '喜神',
    'boshi12Deity.fortune': '福星',
    'boshi12Deity.official': '官符',
    'boshi12Deity.ghost': '亡神',
    'boshi12Deity.whiteTiger': '白虎',
  },
}

/**
 * 获取翻译文本
 * @param key - 翻译键，格式为 'section.key'
 * @param language - 语言代码
 * @returns 翻译后的文本
 */
export function t(key: string, language: Language = 'zh-TW'): string {
  // ================================
  // 步骤0: 提取 prefix 后的值进行映射
  // ================================
  
  // 如果 key 以 brightness. 开头，提取后缀部分进行映射
  if (key.startsWith('brightness.')) {
    const value = key.substring('brightness.'.length)
    
    // 亮度映射表（中文 → 英文参数名）
    const brightnessMap: Record<string, string> = {
      '廟': 'temple',
      '庙': 'temple',
      '望': 'wang',
      '平': 'ping',
      '陷': 'xian',
    }
    
    // 如果后缀值在映射表中，转换为英文 key
    if (brightnessMap[value]) {
      key = `brightness.${brightnessMap[value]}`
    }
  }
  
  // 如果 key 以 boshi12Deity. 开头，提取后缀部分进行映射
  if (key.startsWith('boshi12Deity.')) {
    const value = key.substring('boshi12Deity.'.length)
    
    // 博士十二神映射表（中文 → 英文参数名）
    const boshi12Map: Record<string, string> = {
      '博士': 'scholar',
      '力士': 'warrior',
      '青龍': 'greenDragon',
      '青龙': 'greenDragon',
      '小耗': 'littleWaste',
      '將軍': 'general',
      '将军': 'general',
      '奏書': 'report',
      '奏书': 'report',
      '飛廉': 'feiteline',
      '飞廉': 'feiteline',
      '喜神': 'joy',
      '福星': 'fortune',
      '官符': 'official',
      '亡神': 'ghost',
      '白虎': 'whiteTiger',
    }
    
    // 如果后缀值在映射表中，转换为英文 key
    if (boshi12Map[value]) {
      key = `boshi12Deity.${boshi12Map[value]}`
    }
  }
  
  // 如果 key 以 longlifeDeity. 开头，提取后缀部分进行映射
  if (key.startsWith('longlifeDeity.')) {
    const value = key.substring('longlifeDeity.'.length)
    
    // 长生十二神映射表（中文 → 英文参数名）
    const longlifeMap: Record<string, string> = {
      '長生': 'longevity',
      '长生': 'longevity',
      '沐浴': 'bathing',
      '冠帶': 'robes',
      '冠带': 'robes',
      '臨官': 'ranking',
      '临官': 'ranking',
      '帝旺': 'empire',
      '衰': 'decline',
      '病': 'illness',
      '死': 'death',
      '墓': 'tomb',
      '絕': 'severance',
      '绝': 'severance',
      '胎': 'fetus',
      '養': 'nurturing',
      '养': 'nurturing',
    }
    
    // 如果后缀值在映射表中，转换为英文 key
    if (longlifeMap[value]) {
      key = `longlifeDeity.${longlifeMap[value]}`
    }
  }

  // ================================
  // 步骤1: 处理星星名称的特殊情况
  // ================================
  if (key.startsWith('star.')) {
    const starNameOrKey = key.substring(5)  // 移除 'star.' 前缀
    
    // 定义映射表
    const starNameMap: Record<string, string> = {
      '紫微': 'ziwei',
      '天机': 'tianji', '天機': 'tianji',
      '太阳': 'taiyang', '太陽': 'taiyang',
      '武曲': 'wuqu',
      '天同': 'tiantong',
      '廉贞': 'lianzhen', '廉貞': 'lianzhen',
      '天府': 'tianfu',
      '太阴': 'taiyin', '太陰': 'taiyin',
      '贪狼': 'tanlang', '貪狼': 'tanlang',
      '巨门': 'jumen', '巨門': 'jumen',
      '天相': 'tianxiang',
      '天梁': 'tiangliang',
      '七杀': 'qisha', '七殺': 'qisha',
      '破军': 'pojun', '破軍': 'pojun',
      '擎羊': 'qingyang',
      '陀罗': 'tuoluo', '陀羅': 'tuoluo',
      '火星': 'huoxing',
      '铃星': 'lingxing', '鈴星': 'lingxing',
      '地空': 'dikong',
      '地劫': 'dijie',
      '左辅': 'zuofu', '左輔': 'zuofu',
      '右弼': 'youbi',
      '文昌': 'wenchang',
      '文曲': 'wenqu',
      '禄存': 'lucun', '祿存': 'lucun',
      '天马': 'tianma', '天馬': 'tianma',
      '红鸾': 'hongluan', '紅鸞': 'hongluan',
      '天喜': 'tianxi',
      '天刑': 'tianxing',
      '天姚': 'tianyao',
      '天哭': 'tiankue',
      '天虚': 'tianxu', '天虛': 'tianxu',
      '龙池': 'longchi', '龍池': 'longchi',
      '凤阁': 'fengge', '鳳閣': 'fengge',
      '华盖': 'huagai', '華蓋': 'huagai',
      '咸池': 'xianchi',
      '天德': 'tiande',
      '月德': 'yuede',
      '天官': 'tianguan',
      '天福': 'tianfu2',
      '解神': 'jieshen',
      '天巫': 'tianwu',
      '天月': 'tianyue',
      '阴煞': 'yinsha', '陰煞': 'yinsha',
      '台辅': 'taifu',
      '封诰': 'fenggao',
      '三台': 'santai',
      '八座': 'bazuo',
      '恩光': 'enguang',
      '天贵': 'tiangui', '天貴': 'tiangui',
      '天寿': 'tianshou', '天壽': 'tianshou',
      '天伤': 'tianshang', '天傷': 'tianshang',
      '龙德': 'longde', '龍德': 'longde',
    }
    
    // 尝试映射中文名称到英文参数名
    const mappedKey = starNameMap[starNameOrKey]
    if (mappedKey) {
      key = `star.${mappedKey}`
    }
  }

  // 直接从翻译对象中查找键
  const dict = translations[language]
  let value = dict[key]

  // 如果翻译不存在，尝试返回繁中版本
  if (!value && language !== 'zh-TW') {
    value = translations['zh-TW'][key]
  }

  // 如果还是不存在，处理特殊情况（带后缀的星星名称）
  if (!value && key.startsWith('star.')) {
    const starName = key.substring(5)  // 移除 'star.' 前缀
    
    // 常见的色系后缀：红、绿、黄、黑、白等
    const suffixes = ['红', '绿', '黄', '黑', '白', '光', '暗', '紅', '綠', '黃', '黑', '白', '光', '暗']
    
    for (const suffix of suffixes) {
      if (starName.endsWith(suffix)) {
        const baseName = starName.slice(0, -suffix.length)
        const baseKey = `star.${baseName}`
        
        // 尝试查找基础星星名称的翻译
        let baseValue = dict[baseKey]
        if (!baseValue && language !== 'zh-TW') {
          baseValue = translations['zh-TW'][baseKey]
        }
        
        if (baseValue) {
          // 如果找到基础名称的翻译，添加上后缀并返回
          return baseValue + suffix
        }
      }
    }
    
    // 如果没有找到翻译，直接返回星星名称（不返回 key）
    return starName
  }

  // ================================
  // 最后的 fallback 处理
  // ================================
  
  // 如果还是没找到翻译，检查是否是带前缀的特殊项
  if (!value) {
    // 如果是 mutagen.* 的形式，尝试返回本地化的后缀部分
    if (key.startsWith('mutagen.')) {
      const mutagenKey = key.substring('mutagen.'.length)
      const mutagenMap: Record<string, string> = {
        'lucun': '祿', 'quan': '權', 'ke': '科', 'ji': '忌',
        'huaLucun': '化祿', 'huaQuan': '化權', 'huaKe': '化科', 'huaJi': '化忌',
      }
      if (language === 'zh-CN') {
        const mutagenMapCN: Record<string, string> = {
          'lucun': '禄', 'quan': '权', 'ke': '科', 'ji': '忌',
          'huaLucun': '化禄', 'huaQuan': '化权', 'huaKe': '化科', 'huaJi': '化忌',
        }
        return mutagenMapCN[mutagenKey] || mutagenKey
      }
      return mutagenMap[mutagenKey] || mutagenKey
    }
    // 如果是 boshi12Deity.* 的形式，提取并返回后缀部分（不返回参数名）
    if (key.startsWith('boshi12Deity.')) {
      return key.substring('boshi12Deity.'.length)
    }
    // 如果是 longlifeDeity.* 的形式，提取并返回后缀部分（不返回参数名）
    if (key.startsWith('longlifeDeity.')) {
      return key.substring('longlifeDeity.'.length)
    }
  }

  // 返回翻译值，或返回原始中文字符（不返回 key）
  return value || key
}

/**
 * 星星名称映射表（中文 → 英文参数名）
 * 支持繁體和简体
 */
export const STAR_NAME_MAP: Record<string, string> = {
  // 十四主星
  '紫微': 'ziwei',
  '天机': 'tianji', '天機': 'tianji',
  '太阳': 'taiyang', '太陽': 'taiyang',
  '武曲': 'wuqu',
  '天同': 'tiantong',
  '廉贞': 'lianzhen', '廉貞': 'lianzhen',
  '天府': 'tianfu',
  '太阴': 'taiyin', '太陰': 'taiyin',
  '贪狼': 'tanlang', '貪狼': 'tanlang',
  '巨门': 'jumen', '巨門': 'jumen',
  '天相': 'tianxiang',
  '天梁': 'tiangliang',
  '七杀': 'qisha', '七殺': 'qisha',
  '破军': 'pojun', '破軍': 'pojun',

  // 杂曜星 - 六吉六煞
  '擎羊': 'qingyang',
  '陀罗': 'tuoluo', '陀羅': 'tuoluo',
  '火星': 'huoxing',
  '铃星': 'lingxing', '鈴星': 'lingxing',
  '地空': 'dikong',
  '地劫': 'dijie',
  '左辅': 'zuofu', '左輔': 'zuofu',
  '右弼': 'youbi',
  '文昌': 'wenchang',
  '文曲': 'wenqu',
  '禄存': 'lucun', '祿存': 'lucun',
  '天马': 'tianma', '天馬': 'tianma',

  // 其他辅星 - 喜庆系
  '红鸾': 'hongluan', '紅鸞': 'hongluan',
  '天喜': 'tianxi',

  // 其他辅星 - 克制系
  '天刑': 'tianxing',
  '天姚': 'tianyao',
  '天哭': 'tiankue',
  '天虚': 'tianxu', '天虛': 'tianxu',

  // 其他辅星 - 龙凤池系
  '龙池': 'longchi', '龍池': 'longchi',
  '凤阁': 'fengge', '鳳閣': 'fengge',

  // 其他辅星 - 其他2
  '华盖': 'huagai', '華蓋': 'huagai',
  '咸池': 'xianchi',
  '天德': 'tiande',
  '月德': 'yuede',
  '天官': 'tianguan',
  '天福': 'tianfu2',
  '解神': 'jieshen',
  '天巫': 'tianwu',
  '天月': 'tianyue',
  '阴煞': 'yinsha', '陰煞': 'yinsha',

  // 其他辅星 - 三台八座等
  '台辅': 'taifu',
  '封诰': 'fenggao',
  '三台': 'santai',
  '八座': 'bazuo',
  '恩光': 'enguang',
  '天贵': 'tiangui', '天貴': 'tiangui',
  '天寿': 'tianshou', '天壽': 'tianshou',
  '天伤': 'tianshang', '天傷': 'tianshang',
  '龙德': 'longde', '龍德': 'longde',
}

/**
 * 十二长生神映射表（中文 → 英文参数名）
 * 支持繁體和简体
 */
export const LONGLIFE_DEITY_MAP: Record<string, string> = {
  '长生': 'longevity', '長生': 'longevity',
  '沐浴': 'bathing',
  '冠帶': 'robes', '冠带': 'robes',
  '臨官': 'ranking', '临官': 'ranking',
  '帝旺': 'empire',
  '衰': 'decline',
  '病': 'illness',
  '死': 'death',
  '墓': 'tomb',
  '絕': 'severance', '绝': 'severance',
  '胎': 'fetus',
  '養': 'nurturing', '养': 'nurturing',
}

/**
 * 十二博士神映射表（中文 → 英文参数名）
 * 支持繁體和简体
 */
export const BOSHI_DEITY_MAP: Record<string, string> = {
  '博士': 'scholar',
  '力士': 'warrior',
  '青龍': 'greenDragon', '青龙': 'greenDragon',
  '小耗': 'littleWaste',
  '將軍': 'general', '将军': 'general',
  '奏書': 'report', '奏书': 'report',
  '飛廉': 'feiteline', '飞廉': 'feiteline',
  '喜神': 'joy',
  '福星': 'fortune',
  '官符': 'official',
  '亡神': 'ghost',
  '白虎': 'whiteTiger',
}

/**
 * 亮度映射表（中文 → 英文参数名）
 * 支持繁體和简体
 */
export const BRIGHTNESS_MAP: Record<string, string> = {
  '廟': 'temple', '庙': 'temple',
  '望': 'wang',
  '平': 'ping',
  '陷': 'xian',
}

export function getTranslations(language: Language) {
  return translations[language]
}
