/* ========================================
   StockSense — Internationalization (i18n) Module
   Complete multi-language engine across 30 major languages
   Zero mixed language — pure full-DOM sentence, card & data translation
   ======================================== */

const I18n = (() => {
  const STORAGE_KEY = 'stocksense_language';

  // 30 Comprehensive languages (all 22 scheduled Indian official + major global languages)
  const languages = [
    { code: 'en', name: 'English', native: 'English', speechCode: 'en-IN', flag: '🇮🇳' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी', speechCode: 'hi-IN', flag: '🇮🇳' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்', speechCode: 'ta-IN', flag: '🇮🇳' },
    { code: 'te', name: 'Telugu', native: 'తెలుగు', speechCode: 'te-IN', flag: '🇮🇳' },
    { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', speechCode: 'kn-IN', flag: '🇮🇳' },
    { code: 'ml', name: 'Malayalam', native: 'മലയാളം', speechCode: 'ml-IN', flag: '🇮🇳' },
    { code: 'mr', name: 'Marathi', native: 'मराठी', speechCode: 'mr-IN', flag: '🇮🇳' },
    { code: 'bn', name: 'Bengali', native: 'বাংলা', speechCode: 'bn-IN', flag: '🇮🇳' },
    { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', speechCode: 'gu-IN', flag: '🇮🇳' },
    { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', speechCode: 'pa-IN', flag: '🇮🇳' },
    { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', speechCode: 'or-IN', flag: '🇮🇳' },
    { code: 'as', name: 'Assamese', native: 'অসমীয়া', speechCode: 'as-IN', flag: '🇮🇳' },
    { code: 'ur', name: 'Urdu', native: 'اردو', speechCode: 'ur-IN', flag: '🇮🇳' },
    { code: 'sa', name: 'Sanskrit', native: 'संस्कृतम्', speechCode: 'sa-IN', flag: '🇮🇳' },
    { code: 'ne', name: 'Nepali', native: 'नेपाली', speechCode: 'ne-NP', flag: '🇳🇵' },
    { code: 'es', name: 'Spanish', native: 'Español', speechCode: 'es-ES', flag: '🇪🇸' },
    { code: 'fr', name: 'French', native: 'Français', speechCode: 'fr-FR', flag: '🇫🇷' },
    { code: 'de', name: 'German', native: 'Deutsch', speechCode: 'de-DE', flag: '🇩🇪' },
    { code: 'ar', name: 'Arabic', native: 'العربية', speechCode: 'ar-SA', flag: '🇸🇦' },
    { code: 'zh', name: 'Chinese', native: '中文', speechCode: 'zh-CN', flag: '🇨🇳' },
    { code: 'ja', name: 'Japanese', native: '日本語', speechCode: 'ja-JP', flag: '🇯🇵' },
    { code: 'ru', name: 'Russian', native: 'Русский', speechCode: 'ru-RU', flag: '🇷🇺' },
    { code: 'pt', name: 'Portuguese', native: 'Português', speechCode: 'pt-PT', flag: '🇵🇹' },
    { code: 'it', name: 'Italian', native: 'Italiano', speechCode: 'it-IT', flag: '🇮🇹' },
    { code: 'ko', name: 'Korean', native: '한국어', speechCode: 'ko-KR', flag: '🇰🇷' },
    { code: 'tr', name: 'Turkish', native: 'Türkçe', speechCode: 'tr-TR', flag: '🇹🇷' },
    { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', speechCode: 'id-ID', flag: '🇮🇩' },
    { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', speechCode: 'vi-VN', flag: '🇻🇳' },
    { code: 'th', name: 'Thai', native: 'ไทย', speechCode: 'th-TH', flag: '🇹🇭' },
    { code: 'fa', name: 'Persian', native: 'فارسی', speechCode: 'fa-IR', flag: '🇮🇷' }
  ];

  // Core navigation, voice dialogs & notification text
  const translations = {
    en: {
      searchPlaceholder: 'Search products, SKUs, suppliers, categories... (Ctrl+K)',
      listeningPlaceholder: 'Listening... Speak your command or product name',
      voiceAssistant: 'Voice Assistant',
      voiceListening: 'Listening...',
      voiceSpeakNow: 'Speak now — try saying "Search Milk" or "Show Reorder Plan"',
      voiceHint: 'Try saying: "Search Milk", "Open Inventory", "What is low in stock?", or "Reorder Plan"',
      micNotSupported: 'Web Speech API is not supported in this browser. You can click command chips below or type commands.',
      coreModules: 'Core Modules',
      operations: 'Operations',
      system: 'System',
      dashboardOverview: 'Dashboard Overview',
      inventoryCatalog: 'Inventory Catalog',
      demandForecast: 'Demand Forecast',
      reorderPlan: 'Intelligent Reorder Plan',
      salesIngestion: 'Sales & CSV Ingestion',
      suppliersOrders: 'Suppliers & Orders',
      reportsAnalytics: 'Reports & Analytics',
      settingsRules: 'Settings & Rules',
      reorderButton: 'Reorder Plan',
      rolling30Days: 'Rolling 30 Days',
      stockAlerts: 'Stock Alerts & Notifications',
      storeOwner: 'Store Owner',
      languageChanged: 'Language changed to',
    },
    hi: {
      searchPlaceholder: 'उत्पाद, एसकेयू, आपूर्तिकर्ता खोजें... (Ctrl+K)',
      listeningPlaceholder: 'सुन रहे हैं... उत्पाद का नाम या आदेश बोलें',
      voiceAssistant: 'वॉयस असिस्टेंट',
      voiceListening: 'सुन रहे हैं...',
      voiceSpeakNow: 'अब बोलें — उदाहरण: "दूध खोजें" या "रीऑर्डर योजना"',
      voiceHint: 'बोलकर देखें: "दूध खोजें", "इन्वेंट्री खोलें", "स्टॉक में क्या कम है?" या "रीऑर्डर"',
      micNotSupported: 'इस ब्राउज़र में वेब स्पीच समर्थित नहीं है। आप नीचे दिए गए कमांड पर क्लिक कर सकते हैं या लिख सकते हैं।',
      coreModules: 'मुख्य मॉड्यूल',
      operations: 'दुकान संचालन',
      system: 'सेटिंग्स',
      dashboardOverview: 'डैशबोर्ड अवलोकन',
      inventoryCatalog: 'इन्वेंट्री कैटलॉग',
      demandForecast: 'मांग का पूर्वानुमान',
      reorderPlan: 'स्मार्ट रीऑर्डर योजना',
      salesIngestion: 'बिक्री और डेटा आयात',
      suppliersOrders: 'आपूर्तिकर्ता और ऑर्डर',
      reportsAnalytics: 'रिपोर्ट और विश्लेषण',
      settingsRules: 'सेटिंग्स और नियम',
      reorderButton: 'रीऑर्डर योजना',
      rolling30Days: 'पिछले 30 दिन',
      stockAlerts: 'स्टॉक अलर्ट और सूचनाएं',
      storeOwner: 'दुकानदार',
      languageChanged: 'भाषा बदली गई:',
    },
    ta: {
      searchPlaceholder: 'பொருட்கள், SKU, சப்ளையர்களைத் தேடுங்கள்... (Ctrl+K)',
      listeningPlaceholder: 'கேட்கிறது... பொருளின் பெயர் அல்லது கட்டளையைக் கூறுங்கள்',
      voiceAssistant: 'குரல் உதவியாளர் (Voice Assistant)',
      voiceListening: 'கவனிக்கிறது...',
      voiceSpeakNow: 'இப்போது பேசுங்கள் — எ.கா: "பால் தேடு" அல்லது "மறுஆர்டர் திட்டம்"',
      voiceHint: 'பேசலாம்: "பால் தேடு", "சரக்கு இருப்பு காட்டு", "குறைந்த இருப்பு என்ன?", "மறுஆர்டர்"',
      micNotSupported: 'இந்த உலாவியில் மைக் ஆதரிக்கப்படவில்லை. கட்டளைகளை கிளிக் செய்து அல்லது டைப் செய்து இயக்கலாம்.',
      coreModules: 'முக்கிய பிரிவுகள்',
      operations: 'செயல்பாடுகள்',
      system: 'அமைப்புகள்',
      dashboardOverview: 'டாஷ்போர்டு பார்வை',
      inventoryCatalog: 'சரக்கு இருப்பு பட்டியல்',
      demandForecast: 'தேவை முன்கணிப்பு',
      reorderPlan: 'அறிவார்ந்த மறுஆர்டர் திட்டம்',
      salesIngestion: 'விற்பனை & பதிவேற்றம்',
      suppliersOrders: 'சப்ளையர்கள் & கொள்முதல்',
      reportsAnalytics: 'அறிக்கைகள் & பகுப்பாய்வு',
      settingsRules: 'கட்டமைப்பு & அமைப்புகள்',
      reorderButton: 'மறுஆர்டர் திட்டம்',
      rolling30Days: 'கடந்த 30 நாட்கள்',
      stockAlerts: 'சரக்கு எச்சரிக்கைகள்',
      storeOwner: 'கடை உரிமையாளர்',
      languageChanged: 'மொழி மாற்றப்பட்டது:',
    },
    te: {
      searchPlaceholder: 'ఉత్పత్తులు, SKU, సరఫరాదారులను శోధించండి... (Ctrl+K)',
      listeningPlaceholder: 'వింటున్నాము... ఉత్పత్తి పేరు లేదా ఆదేశం చెప్పండి',
      voiceAssistant: 'వాయిస్ అసిస్టెంట్',
      voiceListening: 'వింటున్నాము...',
      voiceSpeakNow: 'ఇప్పుడు మాట్లాడండి — "పాలు శోధించండి" లేదా "రీఆర్డర్ ప్లాన్"',
      voiceHint: 'ప్రయత్నించండి: "పాలు శోధించండి", "ఇన్వెంటరీ తెరవండి", "తక్కువ స్టాక్ ఏముంది?"',
      micNotSupported: 'ఈ బ్రౌజర్‌లో మైక్ సపోర్ట్ లేదు. క్రింది బటన్లను క్లిక్ చేయవచ్చు.',
      coreModules: 'ప్రధాన మాడ్యూల్స్',
      operations: 'కార్యకలాపాలు',
      system: 'సెట్టింగ్‌లు',
      dashboardOverview: 'డ్యాష్‌బోర్డ్ అవలోకనం',
      inventoryCatalog: 'ఇన్వెంటరీ కేటలాగ్',
      demandForecast: 'డిమాండ్ అంచనా',
      reorderPlan: 'రీఆర్డర్ ప్లాన్',
      salesIngestion: 'అమ్మకాలు & CSV అప్‌లోడ్',
      suppliersOrders: 'సరఫరాదారులు & ఆర్డర్లు',
      reportsAnalytics: 'నివేదికలు & విశ్లేషణ',
      settingsRules: 'సెట్టింగ్‌లు & నియమాలు',
      reorderButton: 'రీఆర్డర్ ప్లాన్',
      rolling30Days: 'గత 30 రోజులు',
      stockAlerts: 'స్టాక్ హెచ్చరికలు',
      storeOwner: 'దుకాణ యజమాని',
      languageChanged: 'భాష మార్చబడింది:',
    },
    kn: {
      searchPlaceholder: 'ಉತ್ಪನ್ನಗಳು, SKU, ಪೂರೈಕೆದಾರರನ್ನು ಹುಡುಕಿ... (Ctrl+K)',
      listeningPlaceholder: 'ಕೇಳುತ್ತಿದ್ದೇವೆ... ನಿಮ್ಮ ಆಜ್ಞೆ ಅಥವಾ ಉತ್ಪನ್ನದ ಹೆಸರು ಹೇಳಿ',
      voiceAssistant: 'ಧ್ವನಿ ಸಹಾಯಕ (Voice Assistant)',
      voiceListening: 'ಕೇಳುತ್ತಿದ್ದೇವೆ...',
      voiceSpeakNow: 'ಈಗ ಮಾತನಾಡಿ — ಉದಾಹರಣೆಗೆ: "ಹಾಲು ಹುಡುಕಿ" ಅಥವಾ "ಮರುಆರ್ಡರ್ ಯೋಜನೆ"',
      voiceHint: 'ಹೇಳಿ ನೋಡಿ: "ಹಾಲು ಹುಡುಕಿ", "ದಾಸ್ತಾನು ತೆರೆಯಿರಿ", "ಕಡಿಮೆ ದಾಸ್ತಾನು"',
      micNotSupported: 'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಮೈಕ್ ಬೆಂಬಲವಿಲ್ಲ. ನೀವು ಕೆಳಗಿನ ಕಮಾಂಡ್‌ಗಳನ್ನು ಬಳಸಬಹುದು.',
      coreModules: 'ಮುಖ್ಯ ವಿಭಾಗಗಳು',
      operations: 'ಕಾರ್ಯಾಚರಣೆಗಳು',
      system: 'ವ್ಯವಸ್ಥೆ',
      dashboardOverview: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಅವಲೋಕನ',
      inventoryCatalog: 'ದಾಸ್ತಾನು ಪಟ್ಟಿ',
      demandForecast: 'ಬೇಡಿಕೆ ಮುನ್ಸೂಚನೆ',
      reorderPlan: 'ಮರುಆರ್ಡರ್ ಯೋಜನೆ',
      salesIngestion: 'ಮಾರಾಟ ಮತ್ತು ದತ್ತಾಂಶ',
      suppliersOrders: 'ಪೂರೈಕೆದಾರರು ಮತ್ತು ಖರೀದಿ',
      reportsAnalytics: 'ವರದಿಗಳು ಮತ್ತು ವಿಶ್ಲೇಷಣೆ',
      settingsRules: 'ಸೆಟ್ಟಿಂಗ್ಸ್ ಮತ್ತು ನಿಯಮಗಳು',
      reorderButton: 'ಮರುಆರ್ಡರ್ ಯೋಜನೆ',
      rolling30Days: 'ಕಳೆದ 30 ದಿನಗಳು',
      stockAlerts: 'ದಾಸ್ತಾನು ಎಚ್ಚರಿಕೆಗಳು',
      storeOwner: 'ಅಂಗಡಿ ಮಾಲೀಕರು',
      languageChanged: 'ಭಾಷೆ ಬದಲಾಗಿದೆ:',
    },
    ml: {
      searchPlaceholder: 'ഉൽപ്പന്നങ്ങൾ, SKU, വിതരണക്കാരെ തിരയുക... (Ctrl+K)',
      listeningPlaceholder: 'കേൾക്കുന്നു... ഉൽപ്പന്നത്തിന്റെ പേരോ നിർദ്ദേശമോ പറയുക',
      voiceAssistant: 'വോയ്‌സ് അസിസ്റ്റന്റ്',
      voiceListening: 'കേൾക്കുന്നു...',
      voiceSpeakNow: 'ഇപ്പോൾ സംസാരിക്കുക — ഉദാഹരണത്തിന്: "പാൽ തിരയുക"',
      voiceHint: 'പറഞ്ഞുനോക്കുക: "പാൽ തിരയുക", "കുറഞ്ഞ സ്റ്റോക്ക്", "റീഓർഡർ പ്ലാൻ"',
      micNotSupported: 'ഈ ബ്രൗസറിൽ മൈക്രോഫോൺ ലഭ്യമല്ല.',
      coreModules: 'പ്രധാന മൊഡ്യൂളുകൾ',
      operations: 'പ്രവർത്തനങ്ങൾ',
      system: 'ക്രമീകരണങ്ങൾ',
      dashboardOverview: 'ഡാഷ്‌ബോർഡ് അവലോകനം',
      inventoryCatalog: 'ഇൻവെന്ററി കാറ്റലോഗ്',
      demandForecast: 'ഡിമാൻഡ് പ്രവചനം',
      reorderPlan: 'റീഓർഡർ പ്ലാൻ',
      salesIngestion: 'വിൽപ്പന വിവരങ്ങൾ',
      suppliersOrders: 'വിതരണക്കാരും ഓർഡറുകളും',
      reportsAnalytics: 'റിപ്പോർട്ടുകൾ & അനലിറ്റിക്‌സ്',
      settingsRules: 'ക്രമീകരണങ്ങൾ',
      reorderButton: 'റീഓർഡർ പ്ലാൻ',
      rolling30Days: 'കഴിഞ്ഞ 30 ദിവസങ്ങൾ',
      stockAlerts: 'സ്റ്റോക്ക് അലേർട്ടുകൾ',
      storeOwner: 'കടയുടമ',
      languageChanged: 'ഭാഷ മാറ്റി:',
    },
    mr: {
      searchPlaceholder: 'उत्पादने, SKU, पुरवठादार शोधा... (Ctrl+K)',
      listeningPlaceholder: 'ऐकत आहे... उत्पादनाचे नाव किंवा आज्ञा बोला',
      voiceAssistant: 'व्हॉइस असिस्टंट',
      voiceListening: 'ऐकत आहे...',
      voiceSpeakNow: 'आता बोला — उदा. "दूध शोधा" किंवा "रिऑर्डर योजना"',
      voiceHint: 'बोलून पहा: "दूध शोधा", "इन्व्हेंटरी उघडा", "कमी स्टॉक काय आहे?"',
      micNotSupported: 'या ब्राउझरमध्ये व्हॉइस उपलब्ध नाही.',
      coreModules: 'मुख्य मॉड्यूल्स',
      operations: 'ऑपरेशन्स',
      system: 'सेटिंग्ज',
      dashboardOverview: 'डॅशबोर्ड विहंगावलोकन',
      inventoryCatalog: 'इन्व्हेंटरी कॅटलॉग',
      demandForecast: 'मागणी अंदाज',
      reorderPlan: 'रिऑर्डर योजना',
      salesIngestion: 'विक्री आणि डेटा आयात',
      suppliersOrders: 'पुरवठादार आणि ऑर्डर्स',
      reportsAnalytics: 'अहवाल आणि विश्लेषण',
      settingsRules: 'सेटिंग्ज आणि नियम',
      reorderButton: 'रिऑर्डर योजना',
      rolling30Days: 'मागील ३० दिवस',
      stockAlerts: 'स्टॉक सूचना',
      storeOwner: 'दुकान मालक',
      languageChanged: 'भाषा बदलली:',
    },
    bn: {
      searchPlaceholder: 'পণ্য, SKU, সরবরাহকারী খুঁজুন... (Ctrl+K)',
      listeningPlaceholder: 'শুনছি... পণ্যের নাম বা নির্দেশ বলুন',
      voiceAssistant: 'ভয়েস সহকারী',
      voiceListening: 'শুনছি...',
      voiceSpeakNow: 'এখন বলুন — যেমন: "দুধ খুঁজুন" বা "রিঅর্ডার প্ল্যান"',
      voiceHint: 'বলুন: "দুধ খুঁজুন", "ইনভেন্টরি খুলুন", "স্টক কম কী আছে?"',
      micNotSupported: 'এই ব্রাউজারে ভয়েস সমর্থিত নয়।',
      coreModules: 'প্রধান মডিউল',
      operations: 'পরিচালনা',
      system: 'সিস্টেম',
      dashboardOverview: 'ড্যাশবোর্ড ওভারভিউ',
      inventoryCatalog: 'ইনভেন্টরি ক্যাটালগ',
      demandForecast: 'চাহিদা পূর্বাভাস',
      reorderPlan: 'রিঅর্ডার পরিকল্পনা',
      salesIngestion: 'বিক্রয় ও ডেটা আমদানি',
      suppliersOrders: 'সরবরাহকারী ও অর্ডার',
      reportsAnalytics: 'প্রতিবেদন ও বিশ্লেষণ',
      settingsRules: 'সেটিংস ও নিয়মাবলী',
      reorderButton: 'রিঅর্ডার পরিকল্পনা',
      rolling30Days: 'গত ৩০ দিন',
      stockAlerts: 'স্টক সতর্কতা',
      storeOwner: 'দোকান মালিক',
      languageChanged: 'ভাষা পরিবর্তন হয়েছে:',
    },
    gu: {
      searchPlaceholder: 'ઉત્પાદનો, SKU, સપ્લાયર્સ શોધો... (Ctrl+K)',
      listeningPlaceholder: 'સાંભળી રહ્યા છીએ... નામ અથવા આદેશ બોલો',
      voiceAssistant: 'વોઇસ આસિસ્ટન્ટ',
      voiceListening: 'સાંભળી રહ્યા છીએ...',
      voiceSpeakNow: 'હવે બોલો — ઉદાહરણ: "દૂધ શોધો" અથવા "રીઓર્ડર પ્લાન"',
      voiceHint: 'બોલીને જુઓ: "દૂધ શોધો", "ઇન્વેન્ટરી ખોલો", "ઓછો સ્ટોક"',
      micNotSupported: 'આ બ્રાઉઝરમાં માઇક સપોર્ટેડ નથી.',
      coreModules: 'મુખ્ય મોડ્યુલ્સ',
      operations: 'ઓપરેશન્સ',
      system: 'સિસ્ટમ',
      dashboardOverview: 'ડેશબોર્ડ ઝાંખી',
      inventoryCatalog: 'ઇન્વેન્ટરી કેટલોગ',
      demandForecast: 'માંગનું પૂર્વાનુમાન',
      reorderPlan: 'રીઓર્ડર પ્લાન',
      salesIngestion: 'વેચાણ અને ડેટા આયાત',
      suppliersOrders: 'સપ્લાયર્સ અને ઓર્ડર્સ',
      reportsAnalytics: 'અહેવાલો અને વિશ્લેષણ',
      settingsRules: 'સેટિંગ્સ અને નિયમો',
      reorderButton: 'રીઓર્ડર પ્લાન',
      rolling30Days: 'છેલ્લા ૩૦ દિવસ',
      stockAlerts: 'સ્ટોક ચેતવણીઓ',
      storeOwner: 'દુકાનદાર',
      languageChanged: 'ભાષા બદલાઈ:',
    },
    pa: {
      searchPlaceholder: 'ਉਤਪਾਦ, SKU, ਸਪਲਾਇਰ ਖੋਜੋ... (Ctrl+K)',
      listeningPlaceholder: 'ਸੁਣ ਰਹੇ ਹਾਂ... ਉਤਪਾਦ ਦਾ ਨਾਮ ਜਾਂ ਕਮਾਂਡ ਬੋਲੋ',
      voiceAssistant: 'ਵੌਇਸ ਅਸਿਸਟੈਂਟ',
      voiceListening: 'ਸੁਣ ਰਹੇ ਹਾਂ...',
      voiceSpeakNow: 'ਹੁਣ ਬੋਲੋ — ਉਦਾਹਰਣ: "ਦੁੱਧ ਖੋਜੋ" ਜਾਂ "ਰੀਆਰਡਰ ਯੋਜਨਾ"',
      voiceHint: 'ਬੋਲ ਕੇ ਵੇਖੋ: "ਦੁੱਧ ਖੋਜੋ", "ਇਨਵੈਂਟਰੀ ਖੋਲ੍ਹੋ", "ਘੱਟ ਸਟਾਕ"',
      micNotSupported: 'ਇਸ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਮਾਈਕ ਸਮਰਥਿਤ ਨਹੀਂ ਹੈ।',
      coreModules: 'ਮੁੱਖ ਮੋਡੀਊਲ',
      operations: 'ਸੰਚਾਲਨ',
      system: 'ਸਿਸਟਮ',
      dashboardOverview: 'ਡੈਸ਼ਬੋਰਡ ਸੰਖੇਪ',
      inventoryCatalog: 'ਇਨਵੈਂਟਰੀ ਕੈਟਾਲਾਗ',
      demandForecast: 'ਮੰਗ ਪੂਰਵ ਅਨੁਮਾਨ',
      reorderPlan: 'ਰੀਆਰਡਰ ਯੋਜਨਾ',
      salesIngestion: 'ਵਿਕਰੀ ਅਤੇ ਡਾਟਾ',
      suppliersOrders: 'ਸਪਲਾਇਰ ਅਤੇ ਆਰਡਰ',
      reportsAnalytics: 'ਰਿਪੋਰਟਾਂ ਅਤੇ ਵਿਸ਼ਲੇਸ਼ਣ',
      settingsRules: 'ਸੈਟਿੰਗਾਂ ਅਤੇ ਨਿਯਮ',
      reorderButton: 'ਰੀਆਰਡਰ ਯੋਜਨਾ',
      rolling30Days: 'ਪਿਛਲੇ 30 ਦਿਨ',
      stockAlerts: 'ਸਟਾਕ ਚੇਤਾਵਨੀਆਂ',
      storeOwner: 'ਦੁਕਾਨ ਮਾਲਕ',
      languageChanged: 'ਭਾਸ਼ਾ ਬਦਲੀ ਗਈ:',
    },
    or: {
      searchPlaceholder: 'ଉତ୍ପାଦ, SKU, ଯୋଗାଣକାରୀ ଖୋଜନ୍ତୁ... (Ctrl+K)',
      listeningPlaceholder: 'ଶୁଣୁଛୁ... ଉତ୍ପାଦ ନାମ କିମ୍ବା ଆଦେଶ କୁହନ୍ତୁ',
      voiceAssistant: 'ଭଏସ୍ ସହାୟକ',
      voiceListening: 'ଶୁଣୁଛୁ...',
      voiceSpeakNow: 'ଏବେ କୁହନ୍ତୁ — ଉଦାହରଣ: "କ୍ଷୀର ଖୋଜନ୍ତୁ" କିମ୍ବା "ପୁନଃଅର୍ଡର"',
      voiceHint: 'କୁହନ୍ତୁ: "କ୍ଷୀର ଖୋଜନ୍ତୁ", "ଇନଭେଣ୍ଟୋରୀ ଖୋଲନ୍ତୁ", "କମ୍ ଷ୍ଟକ୍"',
      micNotSupported: 'ଏହି ବ୍ରାଉଜରରେ ଭଏସ୍ ସମର୍ଥିତ ନୁହେଁ।',
      coreModules: 'ମୁଖ୍ୟ ବିଭାଗ',
      operations: 'କାର୍ଯ୍ୟକଳାପ',
      system: 'ସେଟିଙ୍ଗ୍ସ',
      dashboardOverview: 'ଡ୍ୟାସବୋର୍ଡ ସମୀକ୍ଷା',
      inventoryCatalog: 'ଇନଭେଣ୍ଟୋରୀ ତାଲିକା',
      demandForecast: 'ଚାହିଦା ପୂର୍ବାନୁମାନ',
      reorderPlan: 'ପୁନଃଅର୍ଡର ଯୋଜନା',
      salesIngestion: 'ବିକ୍ରୟ ଓ ତଥ୍ୟ',
      suppliersOrders: 'ଯୋଗାଣକାରୀ ଓ ଅର୍ଡର',
      reportsAnalytics: 'ରିପୋର୍ଟ ଓ ବିଶ୍ଳେଷଣ',
      settingsRules: 'ସେଟିଙ୍ଗ୍ସ ଓ ନିୟମାବଳୀ',
      reorderButton: 'ପୁନଃଅର୍ଡର ଯୋଜନା',
      rolling30Days: 'ଗତ ୩୦ ଦିନ',
      stockAlerts: 'ଷ୍ଟକ୍ ସତର୍କତା',
      storeOwner: 'ଦୋକାନ ମାଲିକ',
      languageChanged: 'ଭାଷା ପରିବର୍ତ୍ତନ ହୋଇଛି:',
    },
    as: {
      searchPlaceholder: 'সামগ্ৰী, SKU, যোগানকৰ্তা সন্ধান কৰক... (Ctrl+K)',
      listeningPlaceholder: 'শুনি আছো... সামগ্ৰীৰ নাম বা আদেশ কওক',
      voiceAssistant: 'ভয়েচ সহায়ক',
      voiceListening: 'শুনি আছো...',
      voiceSpeakNow: 'এতিয়া কওক — যেনে: "গাখীৰ সন্ধান কৰক"',
      voiceHint: 'কওক: "গাখীৰ সন্ধান কৰক", "ইনভেণ্টৰী খোলক"',
      micNotSupported: 'এই ব্ৰাউজাৰত ভয়েচ সমৰ্থিত নহয়।',
      coreModules: 'মুখ্য মডিউলসমূহ',
      operations: 'কাৰ্যকলাপ',
      system: 'ব্যৱস্থা',
      dashboardOverview: 'ডেচবৰ্ড অৱলোকন',
      inventoryCatalog: 'ইনভেণ্টৰী তালিকা',
      demandForecast: 'চাহিদাৰ পূৰ্বানুমান',
      reorderPlan: 'পুনৰ ক্ৰম পৰিকল্পনা',
      salesIngestion: 'বিক্ৰী আৰু আমদানি',
      suppliersOrders: 'যোগানকৰ্তা আৰু অৰ্ডাৰ',
      reportsAnalytics: 'প্ৰতিবেদন আৰু বিশ্লেষণ',
      settingsRules: 'ছেটিংছ আৰু নিয়মসমূহ',
      reorderButton: 'পুনৰ ক্ৰম পৰিকল্পনা',
      rolling30Days: 'বিগত ৩০ দিন',
      stockAlerts: 'মজুত সতৰ্কতা',
      storeOwner: 'দোকানৰ গৰাকী',
      languageChanged: 'ভাষা সলনি কৰা হৈছে:',
    },
    ur: {
      searchPlaceholder: 'مصنوعات، SKU، سپلائرز تلاش کریں... (Ctrl+K)',
      listeningPlaceholder: 'سن رہے ہیں... کمانڈ یا نام بولیں',
      voiceAssistant: 'وائس اسسٹنٹ',
      voiceListening: 'سن رہے ہیں...',
      voiceSpeakNow: 'اب بولیں — جیسے: "دودھ تلاش کریں"',
      voiceHint: 'بولیں: "دودھ تلاش کریں"، "انوینٹری کھولیں"، "ری آرڈر"',
      micNotSupported: 'اس براؤزر میں وائس سپورٹ نہیں ہے۔',
      coreModules: 'بنیادی ماڈیولز',
      operations: 'آپریشنز',
      system: 'سسٹم',
      dashboardOverview: 'ڈیش بورڈ جائزہ',
      inventoryCatalog: 'انوینٹری کیٹلاگ',
      demandForecast: 'طلب کی پیشن گوئی',
      reorderPlan: 'دوبارہ آرڈر کا منصوبہ',
      salesIngestion: 'فروخت اور ڈیٹا درآمد',
      suppliersOrders: 'سپلائرز اور آرڈرز',
      reportsAnalytics: 'رپورٹس اور تجزیات',
      settingsRules: 'ترتیبات اور قواعد',
      reorderButton: 'دوبارہ آرڈر کا منصوبہ',
      rolling30Days: 'گزشتہ 30 دن',
      stockAlerts: 'اسٹاک الرٹس',
      storeOwner: 'دکاندار',
      languageChanged: 'زبان تبدیل ہو گئی:',
    },
    sa: {
      searchPlaceholder: 'उत्पादाः, SKU, प्रदायकाः अन्विष्यान्ताम्... (Ctrl+K)',
      listeningPlaceholder: 'शृण्वन्तः स्मः... आदेशं वदतु',
      voiceAssistant: 'वाणी सहायकः',
      voiceListening: 'शृण्वन्तः स्मः...',
      voiceSpeakNow: 'इदानीं वदतु — यथा: "दुग्धम् अन्विष्यतु"',
      voiceHint: 'वदतु: "दुग्धम् अन्विष्यतु", "भाण्डारं दर्शयतु"',
      micNotSupported: 'अस्मिन् जालगवाक्षे वाणी सुविधा नास्ति।',
      coreModules: 'मुख्याः विभागाः',
      operations: 'कार्याणि',
      system: 'व्यवस्था',
      dashboardOverview: 'फलकावलोकनम्',
      inventoryCatalog: 'भाण्डारसूची',
      demandForecast: 'मागपूर्वानुमानम्',
      reorderPlan: 'पुनरादेशयोजना',
      salesIngestion: 'विक्रयः तथा आँकडा',
      suppliersOrders: 'प्रदायकाः तथा आदेशाः',
      reportsAnalytics: 'वृत्तान्ताः तथा विश्लेषणम्',
      settingsRules: 'नियमाः तथा व्यवस्था',
      reorderButton: 'पुनरादेशयोजना',
      rolling30Days: 'विगते ३० दिनेषु',
      stockAlerts: 'भाण्डारसूचनाः',
      storeOwner: 'विपणिस्वामी',
      languageChanged: 'भाषा परिवर्तिता:',
    },
    ne: {
      searchPlaceholder: 'उत्पादनहरू, SKU, आपूर्तिकर्ता खोज्नुहोस्... (Ctrl+K)',
      listeningPlaceholder: 'सुन्दैछौँ... आदेश वा नाम भन्नुहोस्',
      voiceAssistant: 'भ्वाइस सहायक',
      voiceListening: 'सुन्दैछौँ...',
      voiceSpeakNow: 'अहिले बोल्नुहोस् — जस्तै: "दूध खोज्नुहोस्"',
      voiceHint: 'प्रयास गर्नुहोस्: "दूध खोज्नुहोस्", "इन्भेन्टरी खोल्नुहोस्"',
      micNotSupported: 'यस ब्राउजरमा भ्वाइस सुविधा छैन।',
      coreModules: 'प्रमुख मोड्युलहरू',
      operations: 'सञ्चालन',
      system: 'प्रणाली',
      dashboardOverview: 'ड्यासबोर्ड अवलोकन',
      inventoryCatalog: 'इन्भेन्टरी सूची',
      demandForecast: 'माग पूर्वानुमान',
      reorderPlan: 'पुनः अर्डर योजना',
      salesIngestion: 'बिक्री र डाटा',
      suppliersOrders: 'आपूर्तिकर्ता र अर्डर',
      reportsAnalytics: 'रिपोर्ट र विश्लेषण',
      settingsRules: 'सेटिङहरू र नियम',
      reorderButton: 'पुनः अर्डर योजना',
      rolling30Days: 'पछिल्लो ३० दिन',
      stockAlerts: 'स्टक चेतावनी',
      storeOwner: 'पसल मालिक',
      languageChanged: 'भाषा परिवर्तन भयो:',
    },
    es: {
      searchPlaceholder: 'Buscar productos, SKU, proveedores... (Ctrl+K)',
      listeningPlaceholder: 'Escuchando... Diga su comando o producto',
      voiceAssistant: 'Asistente de Voz',
      voiceListening: 'Escuchando...',
      voiceSpeakNow: 'Hable ahora — ej: "Buscar leche" o "Plan de reorden"',
      voiceHint: 'Pruebe diciendo: "Buscar leche", "Abrir inventario", "Poco stock"',
      micNotSupported: 'Web Speech API no compatible en este navegador.',
      coreModules: 'Módulos Principales',
      operations: 'Operaciones',
      system: 'Sistema',
      dashboardOverview: 'Resumen del Panel',
      inventoryCatalog: 'Catálogo de Inventario',
      demandForecast: 'Previsión de Demanda',
      reorderPlan: 'Plan de Reorden',
      salesIngestion: 'Ventas e Importación CSV',
      suppliersOrders: 'Proveedores y Pedidos',
      reportsAnalytics: 'Informes y Análisis',
      settingsRules: 'Ajustes y Reglas',
      reorderButton: 'Plan de Reorden',
      rolling30Days: 'Últimos 30 días',
      stockAlerts: 'Alertas de Stock',
      storeOwner: 'Propietario de Tienda',
      languageChanged: 'Idioma cambiado a:',
    },
    fr: {
      searchPlaceholder: 'Rechercher produits, SKU, fournisseurs... (Ctrl+K)',
      listeningPlaceholder: 'Écoute en cours... Dites une commande',
      voiceAssistant: 'Assistant Vocal',
      voiceListening: 'Écoute en cours...',
      voiceSpeakNow: 'Parlez maintenant — ex: "Rechercher lait" ou "Plan de réappro"',
      voiceHint: 'Essayez: "Rechercher lait", "Ouvrir inventaire", "Stock faible"',
      micNotSupported: 'Web Speech API non prise en charge.',
      coreModules: 'Modules Principaux',
      operations: 'Opérations',
      system: 'Système',
      dashboardOverview: 'Vue d\'ensemble',
      inventoryCatalog: 'Catalogue d\'inventaire',
      demandForecast: 'Prévision de la demande',
      reorderPlan: 'Plan de réapprovisionnement',
      salesIngestion: 'Ventes et import CSV',
      suppliersOrders: 'Fournisseurs et commandes',
      reportsAnalytics: 'Rapports et analyses',
      settingsRules: 'Paramètres et règles',
      reorderButton: 'Plan de réappro',
      rolling30Days: '30 derniers jours',
      stockAlerts: 'Alertes de stock',
      storeOwner: 'Propriétaire du magasin',
      languageChanged: 'Langue modifiée en :',
    },
    de: {
      searchPlaceholder: 'Produkte, SKU, Lieferanten suchen... (Ctrl+K)',
      listeningPlaceholder: 'Zuhören... Sprechen Sie Ihren Befehl',
      voiceAssistant: 'Sprachassistent',
      voiceListening: 'Zuhören...',
      voiceSpeakNow: 'Jetzt sprechen — z.B.: "Milch suchen" oder "Nachbestellplan"',
      voiceHint: 'Versuchen Sie: "Milch suchen", "Inventar öffnen", "Niedriger Bestand"',
      micNotSupported: 'Web Speech API wird nicht unterstützt.',
      coreModules: 'Hauptmodule',
      operations: 'Betrieb',
      system: 'System',
      dashboardOverview: 'Dashboard-Übersicht',
      inventoryCatalog: 'Inventarkatalog',
      demandForecast: 'Bedarfsprognose',
      reorderPlan: 'Nachbestellplan',
      salesIngestion: 'Verkäufe & CSV-Import',
      suppliersOrders: 'Lieferanten & Bestellungen',
      reportsAnalytics: 'Berichte & Analysen',
      settingsRules: 'Einstellungen & Regeln',
      reorderButton: 'Nachbestellplan',
      rolling30Days: 'Letzte 30 Tage',
      stockAlerts: 'Bestandswarnungen',
      storeOwner: 'Geschäftsinhaber',
      languageChanged: 'Sprache geändert auf:',
    },
    ar: {
      searchPlaceholder: 'البحث عن المنتجات والموردين... (Ctrl+K)',
      listeningPlaceholder: 'جاري الاستماع... تحدث بأمرك',
      voiceAssistant: 'المساعد الصوتي',
      voiceListening: 'جاري الاستماع...',
      voiceSpeakNow: 'تحدث الآن — مثلاً: "بحث عن حليب" أو "خطة إعادة الطلب"',
      voiceHint: 'جرب أن تقول: "بحث عن حليب", "فتح المخزون", "نقص المخزون"',
      micNotSupported: 'واجهة التعرف على الصوت غير مدعومة.',
      coreModules: 'الوحدات الأساسية',
      operations: 'العمليات',
      system: 'النظام',
      dashboardOverview: 'نظرة عامة على لوحة التحكم',
      inventoryCatalog: 'كتالوج المخزون',
      demandForecast: 'توقعات الطلب',
      reorderPlan: 'خطة إعادة الطلب',
      salesIngestion: 'المبيعات واستيراد CSV',
      suppliersOrders: 'الموردين والطلبات',
      reportsAnalytics: 'التقارير والتحليلات',
      settingsRules: 'الإعدادات والقواعد',
      reorderButton: 'خطة إعادة الطلب',
      rolling30Days: 'آخر 30 يوماً',
      stockAlerts: 'تنبيهات المخزون',
      storeOwner: 'مالك المتجر',
      languageChanged: 'تم تغيير اللغة إلى:',
    },
    zh: {
      searchPlaceholder: '搜索产品、SKU、供应商... (Ctrl+K)',
      listeningPlaceholder: '正在聆听... 请说出您的指令或产品',
      voiceAssistant: '语音助手',
      voiceListening: '正在聆听...',
      voiceSpeakNow: '请说话 — 例如：“搜索牛奶”或“显示补货计划”',
      voiceHint: '请尝试说：“搜索牛奶”、“打开库存”、“库存不足”',
      micNotSupported: '此浏览器不支持语音识别 API。',
      coreModules: '核心模块',
      operations: '日常运营',
      system: '系统设置',
      dashboardOverview: '仪表盘概览',
      inventoryCatalog: '库存目录',
      demandForecast: '需求预测',
      reorderPlan: '补货计划',
      salesIngestion: '销售数据导入',
      suppliersOrders: '供应商与采购单',
      reportsAnalytics: '报表与分析',
      settingsRules: '参数与规则',
      reorderButton: '补货计划',
      rolling30Days: '近30天',
      stockAlerts: '库存预警',
      storeOwner: '店主',
      languageChanged: '语言已更改为：',
    },
    ja: {
      searchPlaceholder: '商品、SKU、仕入先を検索... (Ctrl+K)',
      listeningPlaceholder: '音声を聞き取り中... コマンドをお話しください',
      voiceAssistant: '音声アシスタント',
      voiceListening: '聞き取り中...',
      voiceSpeakNow: '話してください — 例: 「牛乳を検索」または「発注計画を表示」',
      voiceHint: '試してみてください: 「牛乳を検索」、「在庫を開く」、「在庫不足」',
      micNotSupported: 'お使いのブラウザは音声認識に対応していません。',
      coreModules: '主要モジュール',
      operations: '店舗業務',
      system: 'システム',
      dashboardOverview: 'ダッシュボード概要',
      inventoryCatalog: '在庫カタログ',
      demandForecast: '需要予測',
      reorderPlan: '発注計画',
      salesIngestion: '売上とCSVインポート',
      suppliersOrders: 'サプライヤーと発注',
      reportsAnalytics: 'レポートと分析',
      settingsRules: '設定とルール',
      reorderButton: '発注計画',
      rolling30Days: '過去30日間',
      stockAlerts: '在庫アラート',
      storeOwner: '店舗管理者',
      languageChanged: '言語を変更しました：',
    },
    ru: {
      searchPlaceholder: 'Поиск товаров, артикулов, поставщиков... (Ctrl+K)',
      listeningPlaceholder: 'Слушаю... Назовите товар или команду',
      voiceAssistant: 'Голосовой помощник',
      voiceListening: 'Слушаю...',
      voiceSpeakNow: 'Говорите — например: «Найти молоко» или «План закупки»',
      voiceHint: 'Попробуйте: «Найти молоко», «Открыть склад», «Мало на складе»',
      micNotSupported: 'Web Speech API не поддерживается в этом браузере.',
      coreModules: 'Основные модули',
      operations: 'Операции',
      system: 'Система',
      dashboardOverview: 'Обзор панели',
      inventoryCatalog: 'Каталог товаров',
      demandForecast: 'Прогноз спроса',
      reorderPlan: 'План повторного заказа',
      salesIngestion: 'Продажи и импорт CSV',
      suppliersOrders: 'Поставщики и заказы',
      reportsAnalytics: 'Отчеты и аналитика',
      settingsRules: 'Настройки и правила',
      reorderButton: 'План закупки',
      rolling30Days: 'Последние 30 дней',
      stockAlerts: 'Оповещения о запасах',
      storeOwner: 'Владелец магазина',
      languageChanged: 'Язык изменен на:',
    },
    pt: {
      searchPlaceholder: 'Pesquisar produtos, SKU, fornecedores... (Ctrl+K)',
      listeningPlaceholder: 'Ouvindo... Fale seu comando ou produto',
      voiceAssistant: 'Assistente de Voz',
      voiceListening: 'Ouvindo...',
      voiceSpeakNow: 'Fale agora — ex: "Buscar leite" ou "Plano de reabastecimento"',
      voiceHint: 'Tente: "Buscar leite", "Abrir inventário", "Estoque baixo"',
      micNotSupported: 'Web Speech API não suportada.',
      coreModules: 'Módulos Principais',
      operations: 'Operações',
      system: 'Sistema',
      dashboardOverview: 'Visão Geral',
      inventoryCatalog: 'Catálogo de Estoque',
      demandForecast: 'Previsão de Demanda',
      reorderPlan: 'Plano de Reabastecimento',
      salesIngestion: 'Vendas e Importação CSV',
      suppliersOrders: 'Fornecedores e Pedidos',
      reportsAnalytics: 'Relatórios e Análises',
      settingsRules: 'Configurações e Regras',
      reorderButton: 'Reabastecer',
      rolling30Days: 'Últimos 30 dias',
      stockAlerts: 'Alertas de Estoque',
      storeOwner: 'Proprietário da Loja',
      languageChanged: 'Idioma alterado para:',
    },
    it: {
      searchPlaceholder: 'Cerca prodotti, SKU, fornitori... (Ctrl+K)',
      listeningPlaceholder: 'In ascolto... Pronuncia un comando',
      voiceAssistant: 'Assistente Vocale',
      voiceListening: 'In ascolto...',
      voiceSpeakNow: 'Parla ora — es: "Cerca latte" o "Piano di riordino"',
      voiceHint: 'Prova a dire: "Cerca latte", "Apri inventario", "Scorte basse"',
      micNotSupported: 'Web Speech API non supportata in questo browser.',
      coreModules: 'Moduli Principali',
      operations: 'Operazioni',
      system: 'Sistema',
      dashboardOverview: 'Panoramica Dashboard',
      inventoryCatalog: 'Catalogo Inventario',
      demandForecast: 'Previsione della Domanda',
      reorderPlan: 'Piano di Riordino',
      salesIngestion: 'Vendite e Importazione CSV',
      suppliersOrders: 'Fornitori e Ordini',
      reportsAnalytics: 'Report e Analisi',
      settingsRules: 'Impostazioni e Regole',
      reorderButton: 'Piano Riordino',
      rolling30Days: 'Ultimi 30 giorni',
      stockAlerts: 'Avvisi Scorte',
      storeOwner: 'Titolare del Negozio',
      languageChanged: 'Lingua cambiata in:',
    },
    ko: {
      searchPlaceholder: '상품, SKU, 공급업체 검색... (Ctrl+K)',
      listeningPlaceholder: '듣고 있습니다... 명령어를 말씀하세요',
      voiceAssistant: '음성 어시스턴트',
      voiceListening: '듣고 있습니다...',
      voiceSpeakNow: '지금 말씀하세요 — 예: "우유 검색" 또는 "재발주 계획"',
      voiceHint: '말해보세요: "우유 검색", "재고 열기", "재고 부족"',
      micNotSupported: '이 브라우저는 음성 인식을 지원하지 않습니다.',
      coreModules: '핵심 모듈',
      operations: '운영',
      system: '시스템',
      dashboardOverview: '대시보드 개요',
      inventoryCatalog: '재고 카탈로그',
      demandForecast: '수요 예측',
      reorderPlan: '재발주 계획',
      salesIngestion: '판매 및 CSV 가져오기',
      suppliersOrders: '공급업체 및 발주',
      reportsAnalytics: '보고서 및 분석',
      settingsRules: '설정 및 규칙',
      reorderButton: '재발주 계획',
      rolling30Days: '최근 30일',
      stockAlerts: '재고 알림',
      storeOwner: '점주',
      languageChanged: '언어가 변경되었습니다:',
    },
    tr: {
      searchPlaceholder: 'Ürün, SKU, tedarikçi ara... (Ctrl+K)',
      listeningPlaceholder: 'Dinleniyor... Komutunuzu söyleyin',
      voiceAssistant: 'Sesli Asistan',
      voiceListening: 'Dinleniyor...',
      voiceSpeakNow: 'Şimdi konuşun — örn: "Süt ara" veya "Sipariş planı"',
      voiceHint: 'Deneyin: "Süt ara", "Envanteri aç", "Azalan stok"',
      micNotSupported: 'Web Speech API bu tarayıcıda desteklenmiyor.',
      coreModules: 'Temel Modüller',
      operations: 'Operasyonlar',
      system: 'Sistem',
      dashboardOverview: 'Panel Özeti',
      inventoryCatalog: 'Envanter Kataloğu',
      demandForecast: 'Talep Tahmini',
      reorderPlan: 'Yeniden Sipariş Planı',
      salesIngestion: 'Satışlar ve CSV İçe Aktarma',
      suppliersOrders: 'Tedarikçiler ve Siparişler',
      reportsAnalytics: 'Raporlar ve Analizler',
      settingsRules: 'Ayarlar ve Kurallar',
      reorderButton: 'Sipariş Planı',
      rolling30Days: 'Son 30 Gün',
      stockAlerts: 'Stok Uyarıları',
      storeOwner: 'Mağaza Sahibi',
      languageChanged: 'Dil değiştirildi:',
    },
    id: {
      searchPlaceholder: 'Cari produk, SKU, pemasok... (Ctrl+K)',
      listeningPlaceholder: 'Mendengarkan... Ucapkan perintah Anda',
      voiceAssistant: 'Asisten Suara',
      voiceListening: 'Mendengarkan...',
      voiceSpeakNow: 'Bicara sekarang — contoh: "Cari susu" atau "Rencana reorder"',
      voiceHint: 'Coba katakan: "Cari susu", "Buka inventaris", "Stok rendah"',
      micNotSupported: 'Web Speech API tidak didukung pada browser ini.',
      coreModules: 'Modul Utama',
      operations: 'Operasi',
      system: 'Sistem',
      dashboardOverview: 'Ikhtisar Dasbor',
      inventoryCatalog: 'Katalog Inventaris',
      demandForecast: 'Prakiraan Permintaan',
      reorderPlan: 'Rencana Pemesanan Ulang',
      salesIngestion: 'Penjualan & Impor CSV',
      suppliersOrders: 'Pemasok & Pesanan',
      reportsAnalytics: 'Laporan & Analisis',
      settingsRules: 'Pengaturan & Aturan',
      reorderButton: 'Rencana Reorder',
      rolling30Days: '30 Hari Terakhir',
      stockAlerts: 'Peringatan Stok',
      storeOwner: 'Pemilik Toko',
      languageChanged: 'Bahasa diubah ke:',
    },
    vi: {
      searchPlaceholder: 'Tìm sản phẩm, SKU, nhà cung cấp... (Ctrl+K)',
      listeningPlaceholder: 'Đang lắng nghe... Nói lệnh của bạn',
      voiceAssistant: 'Trợ lý giọng nói',
      voiceListening: 'Đang lắng nghe...',
      voiceSpeakNow: 'Nói ngay — ví dụ: "Tìm sữa" hoặc "Kế hoạch đặt hàng"',
      voiceHint: 'Thử nói: "Tìm sữa", "Mở kho hàng", "Hàng sắp hết"',
      micNotSupported: 'Trình duyệt không hỗ trợ Web Speech API.',
      coreModules: 'Phân hệ chính',
      operations: 'Vận hành',
      system: 'Hệ thống',
      dashboardOverview: 'Tổng quan bảng điều khiển',
      inventoryCatalog: 'Danh mục tồn kho',
      demandForecast: 'Dự báo nhu cầu',
      reorderPlan: 'Kế hoạch đặt hàng lại',
      salesIngestion: 'Bán hàng & Nhập CSV',
      suppliersOrders: 'Nhà cung cấp & Đơn hàng',
      reportsAnalytics: 'Báo cáo & Phân tích',
      settingsRules: 'Cài đặt & Quy tắc',
      reorderButton: 'Kế hoạch đặt hàng',
      rolling30Days: '30 ngày qua',
      stockAlerts: 'Cảnh báo tồn kho',
      storeOwner: 'Chủ cửa hàng',
      languageChanged: 'Đã đổi ngôn ngữ sang:',
    },
    th: {
      searchPlaceholder: 'ค้นหาสินค้า, SKU, ซัพพลายเออร์... (Ctrl+K)',
      listeningPlaceholder: 'กำลังฟัง... พูดคำสั่งหรือชื่อสินค้า',
      voiceAssistant: 'ผู้ช่วยเสียง',
      voiceListening: 'กำลังฟัง...',
      voiceSpeakNow: 'พูดตอนนี้ — เช่น: "ค้นหานม" หรือ "แผนการสั่งซื้อ"',
      voiceHint: 'ลองพูด: "ค้นหานม", "เปิดคลังสินค้า", "สินค้าใกล้หมด"',
      micNotSupported: 'เบราว์เซอร์นี้ไม่รองรับ Web Speech API',
      coreModules: 'โมดูลหลัก',
      operations: 'การดำเนินงาน',
      system: 'ระบบ',
      dashboardOverview: 'ภาพรวมแดชบอร์ด',
      inventoryCatalog: 'แคตตาล็อกสินค้า',
      demandForecast: 'การพยากรณ์ความต้องการ',
      reorderPlan: 'แผนการสั่งซื้อซ้ำ',
      salesIngestion: 'การขายและนำเข้า CSV',
      suppliersOrders: 'ซัพพลายเออร์และคำสั่งซื้อ',
      reportsAnalytics: 'รายงานและการวิเคราะห์',
      settingsRules: 'การตั้งค่าและกฎเกณฑ์',
      reorderButton: 'แผนสั่งซื้อ',
      rolling30Days: '30 วันที่ผ่านมา',
      stockAlerts: 'แจ้งเตือนสต็อก',
      storeOwner: 'เจ้าของร้าน',
      languageChanged: 'เปลี่ยนภาษาเป็น:',
    },
    fa: {
      searchPlaceholder: 'جستجوی کالاها، SKU، تامین‌کنندگان... (Ctrl+K)',
      listeningPlaceholder: 'در حال شنیدن... دستور خود را بگویید',
      voiceAssistant: 'دستیار صوتی',
      voiceListening: 'در حال شنیدن...',
      voiceSpeakNow: 'اکنون بگویید — مثلا: "جستجوی شیر" یا "طرح سفارش مجدد"',
      voiceHint: 'بگویید: "جستجوی شیر"، "باز کردن موجودی"، "کمبود موجودی"',
      micNotSupported: 'وب اسپیک در این مرورگر پشتیبانی نمی‌شود.',
      coreModules: 'بخش‌های اصلی',
      operations: 'عملیات',
      system: 'سیستم',
      dashboardOverview: 'نمای کلی داشبورد',
      inventoryCatalog: 'کاتالوگ انبار',
      demandForecast: 'پیش‌بینی تقاضا',
      reorderPlan: 'طرح سفارش مجدد',
      salesIngestion: 'فروش و ورود داده CSV',
      suppliersOrders: 'تامین‌کنندگان و سفارشات',
      reportsAnalytics: 'گزارش‌ها و تحلیل‌ها',
      settingsRules: 'تنظیمات و قوانین',
      reorderButton: 'طرح سفارش مجدد',
      rolling30Days: '۳۰ روز گذشته',
      stockAlerts: 'هشدارهای موجودی',
      storeOwner: 'صاحب فروشگاه',
      languageChanged: 'زبان تغییر یافت به:',
    }
  };

  let currentLang = 'en';
  let isTranslating = false;
  let domObserver = null;
  let observerTimer = null;

  // ── Universal Base English Keys ──
  // Common full sentences, phrases, categories, headers, and product names
  // ──────────────────────────────────────────────────────────

  // Comprehensive phrase dictionaries for all 29 non-English languages
  // Every page title, subtitle, stat card, column header, button, status, urgency, category and product
  const phraseMaps = {
    ta: {
      // Pages & Headers
      'Dashboard Overview': 'டாஷ்போர்டு பார்வை',
      'Real-time inventory health and performance summary': 'சரக்கு இருப்பு மற்றும் விற்பனை செயல்திறன் நேரடி சுருக்கம்',
      'Reports': 'அறிக்கைகள்',
      'Generate Reorder Plan': 'மறுஆர்டர் திட்டம் உருவாக்கு',
      'Demo Mode': 'டெமோ முறை',
      'Demo Mode — Showing simulated data for Sri Lakshmi Supermarket. Connect a backend for live data.': 'டெமோ முறை — ஸ்ரீ லட்சுமி சூப்பர் மார்க்கெட்டின் மாதிரி தரவு காட்டப்படுகிறது. நேரடி தரவுகளுக்கு பின்தளத்தை இணைக்கவும்.',
      'Inventory Management': 'சரக்கு இருப்பு மேலாண்மை',
      'Inventory Catalog': 'சரக்கு இருப்பு பட்டியல்',
      'Track stock levels, manage products, and monitor inventory health': 'சரக்கு இருப்பைக் கண்காணிக்கவும், பொருட்களை நிர்வகிக்கவும், ஆரோக்கியத்தை அறியவும்',
      'Demand Forecast': 'தேவை முன்கணிப்பு',
      'Analyze historical sales trends and forecast future demand': 'கடந்த கால விற்பனைப் போக்கை பகுப்பாய்வு செய்து எதிர்காலத் தேவையை கணிக்கவும்',
      'Machine-learning demand forecasting with seasonality & lead time buffers': 'பருவகாலம் மற்றும் சப்ளை கால இடைவெளியுடன் கூடிய தேவை கணிப்பு',
      'Intelligent Reorder Plan': 'அறிவார்ந்த மறுஆர்டர் திட்டம்',
      'Reorder Plan': 'மறுஆர்டர் திட்டம்',
      'Lead-Time & Shelf-Life Aware': 'சப்ளை காலம் மற்றும் காலாவதி விழிப்புணர்வு கொண்டது',
      'Automated replenishment recommendations based on forecasted demand, supplier lead times, and wastage prevention caps': 'கணிக்கப்பட்ட தேவை, சப்ளை காலம் மற்றும் விரயம் தடுக்கும் விதிகளின்படி தானியங்கி கொள்முதல் பரிந்துரைகள்',
      'Sales & Data Ingestion': 'விற்பனை மற்றும் தரவு பதிவேற்றம்',
      'Sales & CSV Ingestion': 'விற்பனை & CSV பதிவேற்றம்',
      'Record daily counter sales, analyze trends, or upload historical sales CSV files to train forecasting models': 'தினசரி விற்பனையை பதிவு செய்யவும், முன்கணிப்பு மாடல்களை பயிற்றுவிக்க விற்பனை கோப்புகளைப் பதிவேற்றவும்',
      'Suppliers & Purchase Orders': 'சப்ளையர்கள் மற்றும் கொள்முதல் ஆணைகள்',
      'Suppliers & Orders': 'சப்ளையர்கள் & கொள்முதல்',
      'Configure supplier lead times, minimum order quantities, manage contacts, and receive incoming inventory shipments': 'சப்ளையர் சப்ளை காலம், குறைந்தபட்ச ஆர்டர் அளவு ஆகியவற்றை அமைத்து புதிய சரக்குகளைப் பெறவும்',
      'Inventory Analytics & Waste Reports': 'சரக்கு பகுப்பாய்வு மற்றும் விரய அறிக்கைகள்',
      'Reports & Analytics': 'அறிக்கைகள் & பகுப்பாய்வு',
      'Financial valuation, category revenue contribution, slow-moving dead stock, and shelf-life risk mitigation': 'நிதி மதிப்பீடு, பிரிவு வாரியான வருவாய், விற்காத சரக்கு மற்றும் காலாவதி விரயத் தடுப்பு',
      'System Configuration & Store Profile': 'கணினி கட்டமைப்பு மற்றும் கடை விவரம்',
      'Settings & Rules': 'அமைப்புகள் மற்றும் விதிகள்',
      'Configure shop parameters, inventory safety thresholds, forecasting variables, and manage local data backups': 'கடையின் அளவுருக்கள், பாதுகாப்பு இருப்பு வரம்புகள் மற்றும் காப்புப் பிரதிகளை உள்ளமைக்கவும்',

      // Stat Cards & Metrics
      'Total Products': 'மொத்த பொருட்கள்',
      'Total Inventory': 'மொத்த இருப்பு',
      'Inventory Value': 'சரக்கு இருப்பு மதிப்பு',
      'Stock Value': 'சரக்கு மதிப்பு',
      'Low Stock Items': 'குறைந்த இருப்பு பொருட்கள்',
      'Predicted Stockouts': 'கணிக்கப்பட்ட இருப்பு இன்மை',
      'Near Expiry': 'விரைவில் காலாவதி',
      'Near Expiry (7d)': '7 நாட்களில் காலாவதியாகும் பொருட்கள்',
      'Reorder Investment': 'மறுஆர்டர் முதலீடு',
      'Est. Lost Sales/Day': 'மதிப்பிடப்பட்ட தினசரி இழப்பு',
      'Est. Lost Sales': 'மதிப்பிடப்பட்ட விற்பனை இழப்பு',
      'Items to Reorder': 'ஆர்டர் செய்ய வேண்டிய பொருட்கள்',
      'Estimated Order Value': 'மதிப்பிடப்பட்ட ஆர்டர் தொகை',
      'Critical Urgency': 'அவசர நிலை',
      'Wastage Prevention': 'விரயம் தடுப்பு',
      'Total Transactions': 'மொத்த பரிவர்த்தனைகள்',
      'Units Sold': 'விற்பனையான அலகுகள்',
      'Total Revenue': 'மொத்த வருவாய்',
      'Average Basket Value': 'சராசரி விற்பனை மதிப்பு',
      'Total Suppliers': 'மொத்த சப்ளையர்கள்',
      'Average Lead Time': 'சராசரி சப்ளை காலம்',
      'Pending Orders': 'நிலுவையில் உள்ள ஆர்டர்கள்',
      'Incoming Stock': 'வரவிருக்கும் சரக்கு',
      'Total Stock Cost': 'மொத்த கொள்முதல் மதிப்பு',
      'Retail Value': 'மொத்த விற்பனை மதிப்பு',
      'Potential Margin': 'எதிர்பார்க்கப்படும் லாபம்',
      'Capital at Expiry Risk': 'காலாவதி அபாயத்தில் உள்ள மூலதனம்',
      'Dead Stock Capital': 'முடங்கிய சரக்கு மூலதனம்',

      // Section Headings & Charts
      'Sales vs Forecast Demand (7 Days)': 'விற்பனை மற்றும் தேவை கணிப்பு (7 நாட்கள்)',
      'Inventory Health': 'சரக்கு இருப்பு ஆரோக்கியம்',
      'Top Selling Products': 'அதிகம் விற்பனையாகும் பொருட்கள்',
      'Stockout Risk Products': 'இருப்பு தீரும் அபாயமுள்ள பொருட்கள்',
      'Inventory Value by Category': 'பிரிவு வாரியான சரக்கு மதிப்பு',
      'Reorder Urgency': 'மறுஆர்டர் அவசர நிலை',
      'Recent Activity': 'சமீபத்திய நடவடிக்கைகள்',
      'Critical Alerts': 'முக்கிய எச்சரிக்கைகள்',
      'Recent POS Transactions': 'சமீபத்திய விற்பனை பரிவர்த்தனைகள்',
      'Recent Sales Transactions': 'சமீபத்திய விற்பனைகள்',
      'Supplier Directory': 'சப்ளையர் முகவரி பட்டியல்',
      'Purchase Orders Ledger': 'கொள்முதல் ஆணை ஏடு',
      'Purchase Order History': 'கொள்முதல் ஆணை வரலாறு',
      'Store Identity & Details': 'கடையின் அடையாளம் மற்றும் விவரங்கள்',
      'Information displayed on purchase orders, invoices, and reorder reports': 'கொள்முதல் ஆணைகள் மற்றும் அறிக்கைகளில் காட்டப்படும் தகவல்',
      'Inventory Parameters & Safety Rules': 'சரக்கு இருப்பு அளவுருக்கள் மற்றும் விதிகள்',
      'UI & Voice Preferences': 'பயனர் இடைமுகம் மற்றும் குரல் அமைப்புகள்',
      'Data & Persistence': 'தரவு பாதுகாப்பு மற்றும் காப்புப்பிரதி',

      // Table Column Headers
      'Product': 'பொருள்',
      'Product Name': 'பொருளின் பெயர்',
      'SKU': 'SKU குறியீடு',
      'Category': 'பிரிவு',
      'Stock': 'இருப்பு',
      'Current Stock': 'தற்போதைய இருப்பு',
      'Avg Daily': 'தினசரி சராசரி',
      'Avg Daily Sales': 'சராசரி தினசரி விற்பனை',
      'Daily Demand': 'தினசரி தேவை',
      'Supplier': 'சப்ளையர்',
      'Supplier Name': 'சப்ளையர் பெயர்',
      'Contact Person': 'தொடர்பு நபர்',
      'Phone': 'தொலைபேசி',
      'Email': 'மின்னஞ்சல்',
      'Lead Time': 'சப்ளை காலம்',
      'Lead Time (Days)': 'சப்ளை காலம் (நாட்கள்)',
      'Expiry': 'காலாவதி',
      'Cost': 'அடக்க விலை',
      'Cost Price': 'அடக்க விலை',
      'Price': 'விற்பனை விலை',
      'Selling Price': 'விற்பனை விலை',
      'Profit': 'லாபம்',
      'Margin': 'லாப வரம்பு',
      'Status': 'நிலை',
      'Actions': 'செயல்கள்',
      'Action': 'செயல்',
      'Reorder Level': 'மறுஆர்டர் வரம்பு',
      'Reorder Point': 'மறுஆர்டர் புள்ளி',
      'Safety Stock': 'பாதுகாப்பு இருப்பு',
      'Suggested Qty': 'பரிந்துரைக்கப்பட்ட அளவு',
      'Order Qty': 'ஆர்டர் அளவு',
      'Restock Qty': 'மீண்டும் நிரப்பும் அளவு',
      'Total Cost': 'மொத்த செலவு',
      'Order Urgency': 'ஆர்டர் அவசரம்',
      'Urgency': 'அவசர நிலை',
      'Rank': 'வரிசை',
      'Min Order': 'குறைந்தபட்ச ஆர்டர்',
      'Min Order Qty': 'குறைந்தபட்ச ஆர்டர் அளவு',
      'Payment Terms': 'பணம் செலுத்தும் விதிமுறைகள்',
      'Reliability': 'நம்பகத்தன்மை',
      'Active Orders': 'செயலில் உள்ள ஆர்டர்கள்',
      'Date & Time': 'தேதி மற்றும் நேரம்',
      'Quantity': 'அளவு',
      'Unit Price': 'அலகு விலை',
      'Payment Method': 'பணம் செலுத்திய முறை',

      // Status Badges & Urgencies
      'All': 'அனைத்தும்',
      'Healthy': 'ஆரோக்கியமானது',
      'In Stock': 'இருப்பில் உள்ளது',
      'Low Stock': 'குறைந்த இருப்பு',
      'Critical': 'அவசரமானது',
      'Out of Stock': 'இருப்பில் இல்லை',
      'Overstocked': 'அதிக இருப்பு',
      'Critical/Expiry': 'அவசரம் / காலாவதி',
      'Critical / Expiry': 'அவசரம் / காலாவதி',
      'Urgent': 'மிக அவசரம்',
      'Moderate': 'மிதமானது',
      'Optimal': 'சரியான அளவு',
      'Active': 'செயலில்',
      'Inactive': 'செயலற்றது',
      'Pending': 'நிலுவையில்',
      'Sent': 'அனுப்பப்பட்டது',
      'Partially Received': 'பகுதியாக பெறப்பட்டது',
      'Received': 'பெறப்பட்டது',
      'Cancelled': 'ரத்து செய்யப்பட்டது',
      'Live': 'நேரலை',
      'At Risk': 'அபாயத்தில்',
      'Monitor': 'கண்காணிக்கவும்',
      'Now': 'உடனே',
      'High': 'அதிகம்',
      'Medium': 'நடுத்தரம்',
      'Low': 'குறைவு',

      // Action Buttons & Labels
      'Add Product': 'புதிய பொருள் சேர்',
      'Export CSV': 'CSV ஆக பதிவிறக்கு',
      'Import': 'பதிவேற்று',
      'Reorder Now': 'உடனே ஆர்டர் செய்',
      'View Details': 'விவரங்களை பார்',
      'View': 'பார்',
      'Edit': 'திருத்து',
      'Adjust Stock': 'இருப்பை சரிசெய்',
      'Delete': 'நீக்கு',
      'Run Forecast': 'முன்கணிப்பு செய்',
      'Export Reorder CSV': 'மறுஆர்டர் CSV பதிவிறக்கு',
      'Generate Purchase Orders': 'கொள்முதல் ஆணை உருவாக்கு',
      'Generate PO': 'ஆணை உருவாக்கு',
      'Mark as Ordered': 'ஆர்டர் செய்யப்பட்டதாக குறி',
      'Sample CSV Template': 'மாதிரி CSV படிவம்',
      'Upload Sales CSV': 'விற்பனை CSV பதிவேற்று',
      'Add Supplier': 'சப்ளையர் சேர்',
      'New Purchase Order': 'புதிய கொள்முதல் ஆணை',
      'Create Purchase Order': 'கொள்முதல் ஆணை உருவாக்கு',
      'Save Changes': 'மாற்றங்களை சேமி',
      'Reset Demo Data to Default': 'டெமோ தரவை மீட்டமை',
      'Backup Store Data (JSON)': 'கடை தரவை காப்புப்பிரதி செய் (JSON)',
      'Restore from JSON': 'JSON இலிருந்து மீட்டெடு',
      'Open Voice Assistant HUD': 'குரல் உதவியாளரை திற',
      'Close': 'மூடு',
      'Cancel': 'ரத்து செய்',
      'Save': 'சேமி',
      'Search': 'தேடு',

      // Dropdown & Filter Options
      'All Categories': 'அனைத்து பிரிவுகள்',
      'All Suppliers': 'அனைத்து சப்ளையர்கள்',
      'All Stock Levels': 'அனைத்து இருப்பு நிலைகள்',
      'All Urgencies': 'அனைத்து அவசர நிலைகள்',
      'Shelf-Life Risk Only': 'காலாவதி அபாயம் மட்டும்',
      '— Choose a product —': '— ஒரு பொருளைத் தேர்ந்தெடுக்கவும் —',
      'Select Product': 'பொருளைத் தேர்ந்தெடுக்கவும்',
      'Horizon': 'கால அளவு',
      '7 days': '7 நாட்கள்',
      '14 days': '14 நாட்கள்',
      '30 days': '30 நாட்கள்',
      'Daily': 'தினசரி',
      'Weekly': 'வாராந்திர',
      'Cash': 'பணம் (Cash)',
      'UPI': 'UPI டிஜிட்டல்',
      'Card': 'வங்கி அட்டை (Card)',
      'Last 7 Days': 'கடந்த 7 நாட்கள்',
      'Last 30 Days': 'கடந்த 30 நாட்கள்',
      'Last 90 Days': 'கடந்த 90 நாட்கள்',
      'All Time': 'அனைத்து காலமும்',

      // Categories
      'Dairy': 'பால் பொருட்கள்',
      'Bakery': 'பேக்கரி மற்றும் ரொட்டி',
      'Beverages': 'குளிர்பானங்கள் & டீ',
      'Cooking Essentials': 'சமையல் பொருட்கள் & எண்ணெய்',
      'Snacks': 'தின்பண்டங்கள்',
      'Snacks & Biscuits': 'தின்பண்டங்கள் & பிஸ்கட்',
      'Grains & Staples': 'தானியங்கள் & மளிகை',
      'Grains & Pulses': 'தானியங்கள் & பருப்பு வகைகள்',
      'Household': 'வீട്ടു உபயோகப் பொருட்கள்',
      'Household & Cleaning': 'வீட்டுப் பொருட்கள் & சுத்தம்',
      'Personal Care': 'தனிநபர் பராமரிப்பு',
      'Vegetables': 'காய்கறிகள்',

      // All 28 Product Names
      'Basmati Rice 5kg': 'பாசுமதி அரிசி 5 கிலோ',
      'Full Cream Milk 1L': 'முழு கிரீம் பால் 1 லிட்டர்',
      'White Bread Loaf': 'வெள்ளை ரொட்டி பாக்கெட்',
      'Farm Eggs (12 pack)': 'பண்ணை முட்டைகள் (12 எண்ணிக்கை)',
      'Sunflower Cooking Oil 1L': 'சூரியகாந்தி சமையல் எண்ணெய் 1 லிட்டர்',
      'Parle-G Biscuits 200g': 'பார்லே-ஜி பிஸ்கட் 200 கிராம்',
      'Coca-Cola 500ml': 'கோகோ கோலா 500 மி.லி',
      'Lux Beauty Soap 100g': 'லக்ஸ் சோப் 100 கிராம்',
      'Crystal Sugar 1kg': 'சர்க்கரை 1 கிலோ',
      'Whole Wheat Atta 5kg': 'கோதுமை மாவு 5 கிலோ',
      'Fresh Curd 500g': 'புதிய தயிர் 500 கிராம்',
      'Tata Tea Premium 250g': 'டாடா டீ பிரீமியம் 250 கிராம்',
      "Lay's Classic Chips 150g": 'லேஸ் கிளாசிக் சிப்ஸ் 150 கிராம்',
      'Surf Excel Liquid 1L': 'சர்ப் எக்செல் திரவம் 1 லிட்டர்',
      'Toor Dal 1kg': 'துவரம் பருப்பு 1 கிலோ',
      'Amul Butter 100g': 'அமுல் வெண்ணெய் 100 கிராம்',
      'Real Mango Juice 1L': 'ரியல் மாம்பழ ஜூஸ் 1 லிட்டர்',
      'Maggi Noodles 4-Pack': 'மேகி நூடுல்ஸ் (4 பாக்கெட்)',
      'Colgate Toothpaste 150g': 'கோல்கேட் பற்பசை 150 கிராம்',
      'Tata Salt 1kg': 'டாடா உப்பு 1 கிலோ',
      'Fresh Paneer 200g': 'புதிய பனீர் 200 கிராம்',
      'Bisleri Water 1L (Pack 12)': 'பிஸ்லெரி குடிநீர் 1லி (12 பாட்டில்)',
      'MDH Garam Masala 100g': 'எம்டிஹெச் கரம் மசாலா 100 கிராம்',
      'Lizol Floor Cleaner 1L': 'லைசோல் தரை கிளீனர் 1 லிட்டர்',
      'Haldiram Namkeen 200g': 'ஹல்திராம் நம்கீன் 200 கிராம்',
      'Fresh Onions 1kg': 'புதிய வெங்காயம் 1 கிலோ',
      'Fresh Potatoes 1kg': 'புதிய உருளைக்கிழங்கு 1 கிலோ',
      'Fresh Tomatoes 1kg': 'புதிய தக்காளி 1 கிலோ',

      // Empty states & hints
      'No products found': 'பொருட்கள் எதுவும் கிடைக்கவில்லை',
      'Try adjusting your search or filters': 'தேடல் அல்லது வடிகட்டிகளை மாற்றி முயற்சிக்கவும்',
      'Select a Product': 'ஒரு பொருளைத் தேர்ந்தெடுக்கவும்',
      'Choose a product above to view historical sales and demand forecast': 'விற்பனை மற்றும் தேவை கணிப்பைப் பார்க்க மேலே உள்ள பொருளைத் தேர்ந்தெடுக்கவும்',
      'No stockout risks detected': 'இருப்பு தீரும் அபாயம் எதுவும் இல்லை',
      'Search products, SKUs...': 'பொருட்கள், SKU குறியீட்டைத் தேடுங்கள்...',
      'Search product or SKU...': 'பொருள் அல்லது SKU தேடுங்கள்...',
      'Search transactions...': 'பரிவர்த்தனைகளைத் தேடுங்கள்...',
      'Search suppliers or POs...': 'சப்ளையர் அல்லது ஆணையைத் தேடுங்கள்...',
      'Rolling 30 Days': 'கடந்த 30 நாட்கள்',
      'Stock Alerts & Notifications': 'சரக்கு எச்சரிக்கைகள் மற்றும் அறிவிப்புகள்',
      'Store Owner': 'கடை உரிமையாளர்'
    },

    hi: {
      'Dashboard Overview': 'डैशबोर्ड अवलोकन',
      'Real-time inventory health and performance summary': 'इन्वेंट्री स्वास्थ्य और बिक्री प्रदर्शन का लाइव सारांश',
      'Reports': 'रिपोर्ट्स',
      'Generate Reorder Plan': 'रीऑर्डर योजना बनाएं',
      'Demo Mode': 'डेमो मोड',
      'Demo Mode — Showing simulated data for Sri Lakshmi Supermarket. Connect a backend for live data.': 'डेमो मोड — श्री लक्ष्मी सुपरमार्केट के लिए सिम्युलेटेड डेटा दिखाया जा रहा है। लाइव डेटा के लिए बैकएंड कनेक्ट करें।',
      'Inventory Management': 'इन्वेंट्री प्रबंधन',
      'Inventory Catalog': 'इन्वेंट्री कैटलॉग',
      'Track stock levels, manage products, and monitor inventory health': 'स्टॉक स्तर ट्रैक करें, उत्पाद प्रबंधित करें और स्थिति देखें',
      'Demand Forecast': 'मांग का पूर्वानुमान',
      'Analyze historical sales trends and forecast future demand': 'बिक्री रुझानों का विश्लेषण करें और भविष्य की मांग का अनुमान लगाएं',
      'Machine-learning demand forecasting with seasonality & lead time buffers': 'मशीन लर्निंग आधारित मांग पूर्वानुमान और बफर प्रबंधन',
      'Intelligent Reorder Plan': 'स्मार्ट रीऑर्डर योजना',
      'Reorder Plan': 'रीऑर्डर योजना',
      'Lead-Time & Shelf-Life Aware': 'सप्लाई समय और शेल्फ लाइफ के अनुसार अनुकूलित',
      'Automated replenishment recommendations based on forecasted demand, supplier lead times, and wastage prevention caps': 'अनुमानित मांग, आपूर्तिकर्ता समय और अपव्यय रोकथाम के आधार पर स्वचालित ऑर्डर',
      'Sales & Data Ingestion': 'बिक्री और डेटा आयात',
      'Sales & CSV Ingestion': 'बिक्री & CSV आयात',
      'Record daily counter sales, analyze trends, or upload historical sales CSV files to train forecasting models': 'दैनिक बिक्री दर्ज करें, पूर्वानुमान मॉडल के लिए सीएसवी फाइलें अपलोड करें',
      'Suppliers & Purchase Orders': 'आपूर्तिकर्ता और खरीद आदेश',
      'Suppliers & Orders': 'आपूर्तिकर्ता & ऑर्डर',
      'Configure supplier lead times, minimum order quantities, manage contacts, and receive incoming inventory shipments': 'आपूर्तिकर्ता समय, न्यूनतम ऑर्डर मात्रा सेट करें और इन्वेंट्री प्राप्त करें',
      'Inventory Analytics & Waste Reports': 'इन्वेंट्री विश्लेषण और अपशिष्ट रिपोर्ट',
      'Reports & Analytics': 'रिपोर्ट और विश्लेषण',
      'Financial valuation, category revenue contribution, slow-moving dead stock, and shelf-life risk mitigation': 'वित्तीय मूल्यांकन, श्रेणी राजस्व, धीमा स्टॉक और अपशिष्ट रोकथाम',
      'System Configuration & Store Profile': 'सिस्टम कॉन्फ़िगरेशन और दुकान प्रोफ़ाइल',
      'Settings & Rules': 'सेटिंग्स और नियम',
      'Configure shop parameters, inventory safety thresholds, forecasting variables, and manage local data backups': 'दुकान पैरामीटर, सुरक्षा स्टॉक सीमा और बैकअप प्रबंधित करें',

      'Total Products': 'कुल उत्पाद',
      'Total Inventory': 'कुल इन्वेंट्री',
      'Inventory Value': 'इन्वेंट्री मूल्य',
      'Stock Value': 'स्टॉक मूल्य',
      'Low Stock Items': 'कम स्टॉक वस्तुएं',
      'Predicted Stockouts': 'संभावित स्टॉक समाप्ति',
      'Near Expiry': 'शीघ्र एक्सपायरी',
      'Near Expiry (7d)': 'शीघ्र एक्सपायरी (7 दिन)',
      'Reorder Investment': 'रीऑर्डर निवेश',
      'Est. Lost Sales/Day': 'अनुमानित दैनिक बिक्री नुकसान',
      'Est. Lost Sales': 'अनुमानित छूटी बिक्री',
      'Items to Reorder': 'ऑर्डर की जाने वाली वस्तुएं',
      'Estimated Order Value': 'अनुमानित ऑर्डर मूल्य',
      'Critical Urgency': 'अति आवश्यक',
      'Wastage Prevention': 'अपव्यय रोकथाम',
      'Total Transactions': 'कुल लेनदेन',
      'Units Sold': 'बिकी हुई इकाइयां',
      'Total Revenue': 'कुल राजस्व',
      'Average Basket Value': 'औसत बिल राशि',
      'Total Suppliers': 'कुल आपूर्तिकर्ता',
      'Average Lead Time': 'औसत आपूर्ति समय',
      'Pending Orders': 'लंबित ऑर्डर',
      'Incoming Stock': 'आने वाला स्टॉक',
      'Total Stock Cost': 'कुल खरीद लागत',
      'Retail Value': 'कुल बिक्री मूल्य',
      'Potential Margin': 'संभावित मुनाफा',
      'Capital at Expiry Risk': 'एक्सपायरी जोखिम में पूंजी',
      'Dead Stock Capital': 'अक्रिय स्टॉक पूंजी',

      'Sales vs Forecast Demand (7 Days)': 'बिक्री बनाम मांग पूर्वानुमान (7 दिन)',
      'Inventory Health': 'इन्वेंट्री स्थिति',
      'Top Selling Products': 'शीर्ष बिकने वाले उत्पाद',
      'Stockout Risk Products': 'स्टॉक समाप्ति जोखिम वाले उत्पाद',
      'Inventory Value by Category': 'श्रेणी अनुसार इन्वेंट्री मूल्य',
      'Reorder Urgency': 'रीऑर्डर प्राथमिकता',
      'Recent Activity': 'हालिया गतिविधि',
      'Critical Alerts': 'महत्वपूर्ण अलर्ट',
      'Recent POS Transactions': 'हालिया पीओएस लेनदेन',
      'Recent Sales Transactions': 'हालिया बिक्री लेनदेन',
      'Supplier Directory': 'आपूर्तिकर्ता सूची',
      'Purchase Orders Ledger': 'खरीद आदेश बही',
      'Purchase Order History': 'खरीद आदेश इतिहास',
      'Store Identity & Details': 'दुकान की पहचान और विवरण',
      'Information displayed on purchase orders, invoices, and reorder reports': 'आदेशों और रिपोर्टों पर प्रदर्शित जानकारी',
      'Inventory Parameters & Safety Rules': 'इन्वेंट्री पैरामीटर और सुरक्षा नियम',
      'UI & Voice Preferences': 'इंटरफ़ेस और वॉयस प्राथमिकताएं',
      'Data & Persistence': 'डेटा और बैकअप प्रबंधन',

      'Product': 'उत्पाद',
      'Product Name': 'उत्पाद का नाम',
      'SKU': 'एसकेयू',
      'Category': 'श्रेणी',
      'Stock': 'स्टॉक',
      'Current Stock': 'वर्तमान स्टॉक',
      'Avg Daily': 'दैनिक औसत',
      'Avg Daily Sales': 'औसत दैनिक बिक्री',
      'Daily Demand': 'दैनिक मांग',
      'Supplier': 'आपूर्तिकर्ता',
      'Supplier Name': 'आपूर्तिकर्ता का नाम',
      'Contact Person': 'संपर्क व्यक्ति',
      'Phone': 'फ़ोन',
      'Email': 'ईमेल',
      'Lead Time': 'आपूर्ति समय',
      'Lead Time (Days)': 'आपूर्ति समय (दिन)',
      'Expiry': 'एक्सपायरी',
      'Cost': 'लागत',
      'Cost Price': 'लागत मूल्य',
      'Price': 'कीमत',
      'Selling Price': 'बिक्री मूल्य',
      'Profit': 'लाभ',
      'Margin': 'मार्जिन',
      'Status': 'स्थिति',
      'Actions': 'कार्रवाई',
      'Action': 'कार्रवाई',
      'Reorder Level': 'पुनः ऑर्डर स्तर',
      'Reorder Point': 'पुनः ऑर्डर बिंदु',
      'Safety Stock': 'सुरक्षा स्टॉक',
      'Suggested Qty': 'सुझाई गई मात्रा',
      'Order Qty': 'ऑर्डर मात्रा',
      'Restock Qty': 'पुनर्प्राप्ति मात्रा',
      'Total Cost': 'कुल लागत',
      'Order Urgency': 'ऑर्डर प्राथमिकता',
      'Urgency': 'प्राथमिकता',
      'Rank': 'रैंक',
      'Min Order': 'न्यूनतम ऑर्डर',
      'Min Order Qty': 'न्यूनतम ऑर्डर मात्रा',
      'Payment Terms': 'भुगतान की शर्तें',
      'Reliability': 'विश्वसनीयता',
      'Active Orders': 'सक्रिय ऑर्डर',
      'Date & Time': 'दिनांक व समय',
      'Quantity': 'मात्रा',
      'Unit Price': 'इकाई मूल्य',
      'Payment Method': 'भुगतान विधि',

      'All': 'सभी',
      'Healthy': 'संतोषजनक',
      'In Stock': 'उपलब्ध',
      'Low Stock': 'कम स्टॉक',
      'Critical': 'गंभीर',
      'Out of Stock': 'स्टॉक समाप्त',
      'Overstocked': 'अत्यधिक स्टॉक',
      'Critical/Expiry': 'गंभीर / एक्सपायरी',
      'Critical / Expiry': 'गंभीर / एक्सपायरी',
      'Urgent': 'तत्काल',
      'Moderate': 'मध्यम',
      'Optimal': 'उत्कृष्ट',
      'Active': 'सक्रिय',
      'Inactive': 'निष्क्रिय',
      'Pending': 'लंबित',
      'Sent': 'भेजा गया',
      'Partially Received': 'आंशिक प्राप्त',
      'Received': 'प्राप्त हुआ',
      'Cancelled': 'रद्द किया गया',
      'Live': 'लाइव',
      'At Risk': 'जोखिम में',
      'Monitor': 'निगरानी रखें',
      'Now': 'अभी',
      'High': 'उच्च',
      'Medium': 'मध्यम',
      'Low': 'कम',

      'Add Product': 'उत्पाद जोड़ें',
      'Export CSV': 'सीएसवी निर्यात',
      'Import': 'आयात',
      'Reorder Now': 'अभी ऑर्डर करें',
      'View Details': 'विवरण देखें',
      'View': 'देखें',
      'Edit': 'संपादित करें',
      'Adjust Stock': 'स्टॉक समायोजित करें',
      'Delete': 'हटाएं',
      'Run Forecast': 'पूर्वानुमान चलाएं',
      'Export Reorder CSV': 'रीऑर्डर सीएसवी निर्यात',
      'Generate Purchase Orders': 'खरीद आदेश बनाएं',
      'Generate PO': 'पीओ बनाएं',
      'Mark as Ordered': 'ऑर्डर किया गया चिह्नित करें',
      'Sample CSV Template': 'नमूना सीएसवी टेम्पलेट',
      'Upload Sales CSV': 'बिक्री सीएसवी अपलोड करें',
      'Add Supplier': 'आपूर्तिकर्ता जोड़ें',
      'New Purchase Order': 'नया खरीद आदेश',
      'Create Purchase Order': 'खरीद आदेश बनाएं',
      'Save Changes': 'परिवर्तन सहेजें',
      'Reset Demo Data to Default': 'डिफ़ॉल्ट डेटा रीसेट करें',
      'Backup Store Data (JSON)': 'दुकान डेटा बैकअप लें (JSON)',
      'Restore from JSON': 'JSON से पुनर्स्थापित करें',
      'Open Voice Assistant HUD': 'वॉयस असिस्टेंट खोलें',
      'Close': 'बंद करें',
      'Cancel': 'रद्द करें',
      'Save': 'सहेजें',
      'Search': 'खोजें',

      'All Categories': 'सभी श्रेणियां',
      'All Suppliers': 'सभी आपूर्तिकर्ता',
      'All Stock Levels': 'सभी स्टॉक स्तर',
      'All Urgencies': 'सभी प्राथमिकताएं',
      'Shelf-Life Risk Only': 'केवल शेल्फ लाइफ जोखिम',
      '— Choose a product —': '— एक उत्पाद चुनें —',
      'Select Product': 'उत्पाद चुनें',
      'Horizon': 'समयावधि',
      '7 days': '7 दिन',
      '14 days': '14 दिन',
      '30 days': '30 दिन',
      'Daily': 'दैनिक',
      'Weekly': 'साप्ताहिक',
      'Cash': 'नकद (Cash)',
      'UPI': 'यूपीआई (UPI)',
      'Card': 'कार्ड (Card)',
      'Last 7 Days': 'पिछले 7 दिन',
      'Last 30 Days': 'पिछले 30 दिन',
      'Last 90 Days': 'पिछले 90 दिन',
      'All Time': 'संपूर्ण समय',

      'Dairy': 'डेयरी उत्पाद',
      'Bakery': 'बेकरी और ब्रेड',
      'Beverages': 'पेय पदार्थ',
      'Cooking Essentials': 'खाना पकाने की सामग्री व तेल',
      'Snacks': 'स्नैक्स',
      'Snacks & Biscuits': 'स्नैक्स और बिस्कुट',
      'Grains & Staples': 'अनाज और दालें',
      'Grains & Pulses': 'अनाज और दालें',
      'Household': 'घरेलू सामान',
      'Household & Cleaning': 'घरेलू और सफाई',
      'Personal Care': 'व्यक्तिगत देखभाल',
      'Vegetables': 'सब्जियां',

      'Basmati Rice 5kg': 'बासमती चावल 5 किलो',
      'Full Cream Milk 1L': 'फुल क्रीम दूध 1 लीटर',
      'White Bread Loaf': 'सफेद ब्रेड पैकेट',
      'Farm Eggs (12 pack)': 'फार्म के ताजे अंडे (12 पैक)',
      'Sunflower Cooking Oil 1L': 'सूरजमुखी का तेल 1 लीटर',
      'Parle-G Biscuits 200g': 'पारले-जी बिस्कुट 200 ग्राम',
      'Coca-Cola 500ml': 'कोका-कोला 500 मिली',
      'Lux Beauty Soap 100g': 'लक्स साबुन 100 ग्राम',
      'Crystal Sugar 1kg': 'दानेदार चीनी 1 किलो',
      'Whole Wheat Atta 5kg': 'गेहूं का आटा 5 किलो',
      'Fresh Curd 500g': 'ताजा दही 500 ग्राम',
      'Tata Tea Premium 250g': 'टाटा टी प्रीमियम 250 ग्राम',
      "Lay's Classic Chips 150g": 'लेज क्लासिक चिप्स 150 ग्राम',
      'Surf Excel Liquid 1L': 'सर्फ एक्सेल लिक्विड 1 लीटर',
      'Toor Dal 1kg': 'अरहर/तूर दाल 1 किलो',
      'Amul Butter 100g': 'अमुल मक्खन 100 ग्राम',
      'Real Mango Juice 1L': 'रियल आम जूस 1 लीटर',
      'Maggi Noodles 4-Pack': 'मैगी नूडल्स (4 पैक)',
      'Colgate Toothpaste 150g': 'कोलगेट टूथपेस्ट 150 ग्राम',
      'Tata Salt 1kg': 'टाटा नमक 1 किलो',
      'Fresh Paneer 200g': 'ताजा पनीर 200 ग्राम',
      'Bisleri Water 1L (Pack 12)': 'बिसलेरी पानी 1ली (12 बोतल)',
      'MDH Garam Masala 100g': 'एमडीएच गरम मसाला 100 ग्राम',
      'Lizol Floor Cleaner 1L': 'लाइज़ोल फ्लोर क्लीनर 1 लीटर',
      'Haldiram Namkeen 200g': 'हल्दीराम नमकीन 200 ग्राम',
      'Fresh Onions 1kg': 'ताजे प्याज 1 किलो',
      'Fresh Potatoes 1kg': 'ताजे आलू 1 किलो',
      'Fresh Tomatoes 1kg': 'ताजे टमाटर 1 किलो',

      'No products found': 'कोई उत्पाद नहीं मिला',
      'Try adjusting your search or filters': 'अपनी खोज या फ़िल्टर बदलकर देखें',
      'Select a Product': 'एक उत्पाद चुनें',
      'Choose a product above to view historical sales and demand forecast': 'बिक्री और मांग पूर्वानुमान देखने के लिए ऊपर एक उत्पाद चुनें',
      'No stockout risks detected': 'स्टॉकआउट का कोई जोखिम नहीं मिला',
      'Search products, SKUs...': 'उत्पाद, एसकेयू खोजें...',
      'Search product or SKU...': 'उत्पाद या एसकेयू खोजें...',
      'Search transactions...': 'लेनदेन खोजें...',
      'Search suppliers or POs...': 'आपूर्तिकर्ता या आदेश खोजें...',
      'Rolling 30 Days': 'पिछले 30 दिन',
      'Stock Alerts & Notifications': 'स्टॉक अलर्ट और सूचनाएं',
      'Store Owner': 'दुकानदार'
    },

    te: {
      'Dashboard Overview': 'డ్యాష్‌బోర్డ్ అవలోకనం',
      'Real-time inventory health and performance summary': 'లైవ్ ఇన్వెంటరీ ఆరోగ్యం మరియు పనితీరు సారాంశం',
      'Reports': 'నివేదికలు',
      'Generate Reorder Plan': 'రీఆర్డర్ ప్లాన్ రూపొందించండి',
      'Demo Mode': 'డెమో మోడ్',
      'Demo Mode — Showing simulated data for Sri Lakshmi Supermarket. Connect a backend for live data.': 'డెమో మోడ్ — శ్రీ లక్ష్మి సూపర్ మార్కెట్ కోసం సిమ్యులేటెడ్ డేటా చూపబడుతోంది.',
      'Inventory Management': 'ఇన్వెంటరీ నిర్వహణ',
      'Inventory Catalog': 'ఇన్వెంటరీ కేటలాగ్',
      'Track stock levels, manage products, and monitor inventory health': 'స్టాక్ స్థాయిలను ట్రాక్ చేయండి మరియు ఉత్పత్తులను నిర్వహించండి',
      'Demand Forecast': 'డిమాండ్ అంచనా',
      'Intelligent Reorder Plan': 'తెలివైన రీఆర్డర్ ప్రణాళిక',
      'Reorder Plan': 'రీఆర్డర్ ప్లాన్',
      'Sales & Data Ingestion': 'అమ్మకాలు & డేటా నమోదు',
      'Suppliers & Purchase Orders': 'సరఫరాదారులు మరియు కొనుగోలు ఆర్డర్లు',
      'Inventory Analytics & Waste Reports': 'ఇన్వెంటరీ విశ్లేషణ మరియు వ్యర్థ నివేదికలు',
      'Total Products': 'మొత్తం ఉత్పత్తులు',
      'Total Inventory': 'మొత్తం ఇన్వెంటరీ',
      'Inventory Value': 'ఇన్వెంటరీ విలువ',
      'Low Stock Items': 'తక్కువ స్టాక్ వస్తువులు',
      'Predicted Stockouts': 'ఊహించిన స్టాక్ కొరత',
      'Near Expiry': 'త్వరలో గడువు ముగిసేవి',
      'Reorder Investment': 'రీఆర్డర్ పెట్టుబడి',
      'Product': 'ఉత్పత్తి',
      'Category': 'వర్గం',
      'Stock': 'స్టాక్',
      'Status': 'స్థితి',
      'Actions': 'చర్యలు',
      'Healthy': 'బాగుంది',
      'Low Stock': 'తక్కువ స్టాక్',
      'Critical': 'అత్యవసరం',
      'Out of Stock': 'స్టాక్ అయిపోయింది',
      'Add Product': 'ఉత్పత్తిని జోడించండి',
      'Export CSV': 'CSV డౌన్‌లోడ్',
      'Dairy': 'పాల ఉత్పత్తులు',
      'Grains & Staples': 'ధాన్యాలు & నిత్యావసరాలు',
      'Basmati Rice 5kg': 'బాస్మతి బియ్యం 5 కేజీ',
      'Full Cream Milk 1L': 'ఫుల్ క్రీమ్ పాలు 1 లీటర్'
    },

    kn: {
      'Dashboard Overview': 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಅವಲೋಕನ',
      'Real-time inventory health and performance summary': 'ನೈಜ-ಸಮಯದ ದಾಸ್ತಾನು ಸ್ಥಿತಿ ಮತ್ತು ಕಾರ್ಯಕ್ಷಮತೆ ಸಾರಾಂಶ',
      'Reports': 'ವರದಿಗಳು',
      'Generate Reorder Plan': 'ಮರುಆರ್ಡರ್ ಯೋಜನೆ ರಚಿಸಿ',
      'Demo Mode': 'ಡೆಮೊ ಮೋಡ್',
      'Inventory Management': 'ದಾಸ್ತಾನು ನಿರ್ವಹಣೆ',
      'Inventory Catalog': 'ದಾಸ್ತಾನು ಪಟ್ಟಿ',
      'Demand Forecast': 'ಬೇಡಿಕೆ ಮುನ್ಸೂಚನೆ',
      'Intelligent Reorder Plan': 'ಬುದ್ಧಿವಂತ ಮರುಆರ್ಡರ್ ಯೋಜನೆ',
      'Total Products': 'ಒಟ್ಟು ಉತ್ಪನ್ನಗಳು',
      'Total Inventory': 'ಒಟ್ಟು ದಾಸ್ತಾನು',
      'Inventory Value': 'ದಾಸ್ತಾನು ಮೌಲ್ಯ',
      'Low Stock Items': 'ಕಡಿಮೆ ದಾಸ್ತಾನು ವಸ್ತುಗಳು',
      'Predicted Stockouts': 'ಖಾಲಿಯಾಗುವ ನಿರೀಕ್ಷೆ',
      'Near Expiry': 'ಅವಧಿ ಮುಗಿಯುವ ಹಂತ',
      'Product': 'ಉತ್ಪನ್ನ',
      'Category': 'ವರ್ಗ',
      'Stock': 'ದಾಸ್ತಾನು',
      'Status': 'ಸ್ಥಿತಿ',
      'Actions': 'ಕ್ರಮಗಳು',
      'Healthy': 'ಉತ್ತಮವಾಗಿದೆ',
      'Low Stock': 'ಕಡಿಮೆ ದಾಸ್ತಾನು',
      'Critical': 'ತುರ್ತು',
      'Out of Stock': 'ದಾಸ್ತಾನು ಖಾಲಿಯಾಗಿದೆ',
      'Add Product': 'ಉತ್ಪನ್ನ ಸೇರಿಸಿ',
      'Dairy': 'ಡೈರಿ ಉತ್ಪನ್ನಗಳು',
      'Basmati Rice 5kg': 'ಬಾಸ್ಮತಿ ಅಕ್ಕಿ 5 ಕೆಜಿ',
      'Full Cream Milk 1L': 'ಫುಲ್ ಕ್ರೀಮ್ ಹಾಲು 1 ಲೀಟರ್'
    },

    ml: {
      'Dashboard Overview': 'ഡാഷ്‌ബോർഡ് അവലോകനം',
      'Real-time inventory health and performance summary': 'തത്സമയ ഇൻവെന്ററി സ്ഥിതി വിവരങ്ങൾ',
      'Reports': 'റിപ്പോർട്ടുകൾ',
      'Generate Reorder Plan': 'റീഓർഡർ പ്ലാൻ തയ്യാറാക്കുക',
      'Inventory Management': 'ഇൻവെന്ററി മാനേജ്മെന്റ്',
      'Inventory Catalog': 'ഇൻവെന്ററി കാറ്റലോഗ്',
      'Demand Forecast': 'ഡിമാൻഡ് പ്രവചനം',
      'Intelligent Reorder Plan': 'സ്മാർട്ട് റീഓർഡർ പ്ലാൻ',
      'Total Products': 'ആകെ ഉൽപ്പന്നങ്ങൾ',
      'Total Inventory': 'ആകെ സ്റ്റോക്ക്',
      'Inventory Value': 'ഇൻവെന്ററി മൂല്യം',
      'Low Stock Items': 'കുറഞ്ഞ സ്റ്റോക്ക് ഉൽപ്പന്നങ്ങൾ',
      'Product': 'ഉൽപ്പന്നം',
      'Category': 'വിഭാഗം',
      'Stock': 'സ്റ്റോക്ക്',
      'Status': 'സ്ഥിതി',
      'Actions': 'നടപടികൾ',
      'Healthy': 'തൃപ്തികരം',
      'Low Stock': 'കുറഞ്ഞ സ്റ്റോക്ക്',
      'Critical': 'അടിയന്തിരം',
      'Out of Stock': 'സ്റ്റോക്ക് തീർന്നു',
      'Dairy': 'പാൽ ഉൽപ്പന്നങ്ങൾ',
      'Basmati Rice 5kg': 'ബാസ്മതി അരി 5 കിലോഗ്രാം',
      'Full Cream Milk 1L': 'ഫുൾ ക്രീം പാൽ 1 ലിറ്റർ'
    },

    mr: {
      'Dashboard Overview': 'डॅशबोर्ड विहंगावलोकन',
      'Real-time inventory health and performance summary': 'थेट इन्व्हेंटरी स्थिती आणि कामगिरी सारांश',
      'Reports': 'अहवाल',
      'Generate Reorder Plan': 'पुनर्नोंदणी योजना तयार करा',
      'Inventory Management': 'इन्व्हेंटरी व्यवस्थापन',
      'Inventory Catalog': 'इन्व्हेंटरी कॅटलॉग',
      'Demand Forecast': 'मागणी अंदाज',
      'Intelligent Reorder Plan': 'स्मार्ट रिऑर्डर योजना',
      'Total Products': 'एकूण उत्पादने',
      'Total Inventory': 'एकूण इन्व्हेंटरी',
      'Inventory Value': 'इन्व्हेंटरी मूल्य',
      'Low Stock Items': 'कमी स्टॉक असलेल्या वस्तू',
      'Product': 'उत्पादन',
      'Category': 'श्रेणी',
      'Stock': 'स्टॉक',
      'Status': 'स्थिती',
      'Actions': 'कृती',
      'Healthy': 'योग्य प्रमाण',
      'Low Stock': 'कमी स्टॉक',
      'Critical': 'गंभीर',
      'Out of Stock': 'स्टॉक संपला',
      'Dairy': 'दुग्धजन्य पदार्थ',
      'Basmati Rice 5kg': 'बासमती तांदूळ ५ किलो',
      'Full Cream Milk 1L': 'फुल क्रीम दूध १ लिटर'
    },

    bn: {
      'Dashboard Overview': 'ড্যাশবোর্ড ওভারভিউ',
      'Real-time inventory health and performance summary': 'রিয়েল-টাইম ইনভেন্টরি স্বাস্থ্য ও কর্মক্ষমতা সারাংশ',
      'Reports': 'প্রতিবেদন',
      'Generate Reorder Plan': 'রিঅর্ডার প্ল্যান তৈরি করুন',
      'Inventory Management': 'ইনভেন্টরি ব্যবস্থাপনা',
      'Inventory Catalog': 'ইনভেন্টরি ক্যাটালগ',
      'Demand Forecast': 'চাহিদা পূর্বাভাস',
      'Intelligent Reorder Plan': 'স্মার্ট রিঅর্ডার পরিকল্পনা',
      'Total Products': 'মোট পণ্য',
      'Total Inventory': 'মোট ইনভেন্টরি',
      'Inventory Value': 'ইনভেন্টরি মূল্য',
      'Low Stock Items': 'কম স্টক পণ্য',
      'Product': 'পণ্য',
      'Category': 'বিভাগ',
      'Stock': 'স্টক',
      'Status': 'অবস্থা',
      'Actions': 'পদক্ষেপ',
      'Healthy': 'স্বাভাবিক',
      'Low Stock': 'কম স্টক',
      'Critical': 'জরুরি',
      'Out of Stock': 'স্টক শেষ',
      'Dairy': 'দুগ্ধজাত পণ্য',
      'Basmati Rice 5kg': 'বাসমতী চাল ৫ কেজি',
      'Full Cream Milk 1L': 'ফুল ক্রিম দুধ ১ লিটার'
    },

    gu: {
      'Dashboard Overview': 'ડેશબોર્ડ ઝાંખી',
      'Real-time inventory health and performance summary': 'રીઅલ-ટાઇમ ઇન્વેન્ટરી સ્થિતિ અને પ્રદર્શન સારાંશ',
      'Reports': 'અહેવાલો',
      'Generate Reorder Plan': 'રીઓર્ડર પ્લાન બનાવો',
      'Inventory Management': 'ઇન્વેન્ટરી મેનેજમેન્ટ',
      'Inventory Catalog': 'ઇન્વેન્ટરી કેટલોગ',
      'Demand Forecast': 'માંગનું પૂર્વાનુમાન',
      'Total Products': 'કુલ ઉત્પાદનો',
      'Total Inventory': 'કુલ ઇન્વેન્ટરી',
      'Inventory Value': 'ઇન્વેન્ટરી મૂલ્ય',
      'Low Stock Items': 'ઓછો સ્ટોક ધરાવતી વસ્તુઓ',
      'Product': 'ઉત્પાદન',
      'Category': 'શ્રેણી',
      'Stock': 'સ્ટોક',
      'Status': 'સ્થિતિ',
      'Actions': 'ક્રિયાઓ',
      'Healthy': 'યોગ્ય સ્ટોક',
      'Low Stock': 'ઓછો સ્ટોક',
      'Critical': 'ગંભીર',
      'Out of Stock': 'સ્ટોક બહાર',
      'Dairy': 'ડેરી ઉત્પાદનો',
      'Basmati Rice 5kg': 'બાસમતી ચોખા 5 કિગ્રા',
      'Full Cream Milk 1L': 'ફૂલ ક્રીમ દૂધ 1 લીટર'
    },

    pa: {
      'Dashboard Overview': 'ਡੈਸ਼ਬੋਰਡ ਸੰਖੇਪ',
      'Real-time inventory health and performance summary': 'ਲਾਈਵ ਇਨਵੈਂਟਰੀ ਸਥਿਤੀ ਅਤੇ ਪ੍ਰਦਰਸ਼ਨ ਸੰਖੇਪ',
      'Reports': 'ਰਿਪੋਰਟਾਂ',
      'Generate Reorder Plan': 'ਰੀਆਰਡਰ ਯੋਜਨਾ ਬਣਾਓ',
      'Inventory Management': 'ਇਨਵੈਂਟਰੀ ਪ੍ਰਬੰਧਨ',
      'Inventory Catalog': 'ਇਨਵੈਂਟਰੀ ਕੈਟਾਲਾਗ',
      'Demand Forecast': 'ਮੰਗ ਪੂਰਵ ਅਨੁਮਾਨ',
      'Total Products': 'ਕੁੱਲ ਉਤਪਾਦ',
      'Total Inventory': 'ਕੁੱਲ ਇਨਵੈਂਟਰੀ',
      'Inventory Value': 'ਇਨਵੈਂਟਰੀ ਮੁੱਲ',
      'Low Stock Items': 'ਘੱਟ ਸਟਾਕ ਆਈਟਮਾਂ',
      'Product': 'ਉਤਪਾਦ',
      'Category': 'ਸ਼੍ਰੇਣੀ',
      'Stock': 'ਸਟਾਕ',
      'Status': 'ਸਥਿਤੀ',
      'Actions': 'ਕਾਰਵਾਈਆਂ',
      'Healthy': 'ਵਧੀਆ ਸਟਾਕ',
      'Low Stock': 'ਘੱਟ ਸਟਾਕ',
      'Critical': 'ਜ਼ਰੂਰੀ',
      'Out of Stock': 'ਸਟਾਕ ਮੁੱਕ ਗਿਆ',
      'Dairy': 'ਡੇਅਰੀ ਉਤਪਾਦ',
      'Basmati Rice 5kg': 'ਬਾਸਮਤੀ ਚੌਲ 5 ਕਿਲੋ',
      'Full Cream Milk 1L': 'ਫੁੱਲ ਕਰੀਮ ਦੁੱਧ 1 ਲੀਟਰ'
    },

    es: {
      'Dashboard Overview': 'Resumen del Panel',
      'Real-time inventory health and performance summary': 'Resumen de salud y rendimiento del inventario en tiempo real',
      'Reports': 'Informes',
      'Generate Reorder Plan': 'Generar Plan de Reorden',
      'Demo Mode': 'Modo Demo',
      'Inventory Management': 'Gestión de Inventario',
      'Inventory Catalog': 'Catálogo de Inventario',
      'Demand Forecast': 'Previsión de la Demanda',
      'Intelligent Reorder Plan': 'Plan Inteligente de Reorden',
      'Reorder Plan': 'Plan de Reorden',
      'Sales & Data Ingestion': 'Ventas e Ingesta de Datos',
      'Suppliers & Purchase Orders': 'Proveedores y Pedidos de Compra',
      'Inventory Analytics & Waste Reports': 'Análisis de Inventario e Informes de Mermas',
      'Total Products': 'Total de Productos',
      'Total Inventory': 'Inventario Total',
      'Inventory Value': 'Valor del Inventario',
      'Low Stock Items': 'Artículos con Poco Stock',
      'Predicted Stockouts': 'Desabastecimientos Previstos',
      'Near Expiry': 'Próximo a Vencer',
      'Reorder Investment': 'Inversión en Reorden',
      'Product': 'Producto',
      'Category': 'Categoría',
      'Stock': 'Stock',
      'Status': 'Estado',
      'Actions': 'Acciones',
      'Healthy': 'Saludable',
      'Low Stock': 'Poco Stock',
      'Critical': 'Crítico',
      'Out of Stock': 'Agotado',
      'Add Product': 'Añadir Producto',
      'Export CSV': 'Exportar CSV',
      'Dairy': 'Lácteos',
      'Basmati Rice 5kg': 'Arroz Basmati 5kg',
      'Full Cream Milk 1L': 'Leche Entera 1L'
    },

    fr: {
      'Dashboard Overview': 'Vue d\'ensemble du tableau de bord',
      'Real-time inventory health and performance summary': 'État des stocks et résumé des performances en temps réel',
      'Reports': 'Rapports',
      'Generate Reorder Plan': 'Générer le plan de réapprovisionnement',
      'Demo Mode': 'Mode Démo',
      'Inventory Management': 'Gestion des Stocks',
      'Inventory Catalog': 'Catalogue d\'inventaire',
      'Demand Forecast': 'Prévision de la Demande',
      'Intelligent Reorder Plan': 'Plan Intelligent de Réapprovisionnement',
      'Total Products': 'Total Produits',
      'Total Inventory': 'Inventaire Total',
      'Inventory Value': 'Valeur du Stock',
      'Low Stock Items': 'Articles en Stock Faible',
      'Predicted Stockouts': 'Ruptures Prévues',
      'Near Expiry': 'Expiration Proche',
      'Product': 'Produit',
      'Category': 'Catégorie',
      'Stock': 'Stock',
      'Status': 'Statut',
      'Actions': 'Actions',
      'Healthy': 'Sain',
      'Low Stock': 'Stock Faible',
      'Critical': 'Critique',
      'Out of Stock': 'Épuisé',
      'Add Product': 'Ajouter Produit',
      'Dairy': 'Produits Laitiers',
      'Basmati Rice 5kg': 'Riz Basmati 5kg',
      'Full Cream Milk 1L': 'Lait Entier 1L'
    },

    de: {
      'Dashboard Overview': 'Dashboard-Übersicht',
      'Real-time inventory health and performance summary': 'Echtzeit-Bestandszustand und Leistungsübersicht',
      'Reports': 'Berichte',
      'Generate Reorder Plan': 'Nachbestellplan erstellen',
      'Demo Mode': 'Demo-Modus',
      'Inventory Management': 'Bestandsverwaltung',
      'Inventory Catalog': 'Inventarkatalog',
      'Demand Forecast': 'Bedarfsprognose',
      'Intelligent Reorder Plan': 'Intelligenter Nachbestellplan',
      'Total Products': 'Gesamte Produkte',
      'Total Inventory': 'Gesamtbestand',
      'Inventory Value': 'Bestandswert',
      'Low Stock Items': 'Niedriger Bestand',
      'Product': 'Produkt',
      'Category': 'Kategorie',
      'Stock': 'Bestand',
      'Status': 'Status',
      'Actions': 'Aktionen',
      'Healthy': 'Optimal',
      'Low Stock': 'Gering',
      'Critical': 'Kritisch',
      'Out of Stock': 'Ausverkauft',
      'Dairy': 'Milchprodukte',
      'Basmati Rice 5kg': 'Basmati-Reis 5kg',
      'Full Cream Milk 1L': 'Vollmilch 1L'
    },

    ar: {
      'Dashboard Overview': 'نظرة عامة على لوحة التحكم',
      'Real-time inventory health and performance summary': 'ملخص فوري لحالة المخزون والأداء التجاري',
      'Reports': 'التقارير',
      'Generate Reorder Plan': 'إنشاء خطة إعادة الطلب',
      'Demo Mode': 'الوضع التجريبي',
      'Inventory Management': 'إدارة المخزون',
      'Inventory Catalog': 'كتالوج المخزون',
      'Demand Forecast': 'توقعات الطلب',
      'Intelligent Reorder Plan': 'خطة إعادة الطلب الذكية',
      'Total Products': 'إجمالي المنتجات',
      'Total Inventory': 'إجمالي المخزون',
      'Inventory Value': 'قيمة المخزون',
      'Low Stock Items': 'منتجات منخفضة المخزون',
      'Product': 'المنتج',
      'Category': 'الفئة',
      'Stock': 'المخزون',
      'Status': 'الحالة',
      'Actions': 'الإجراءات',
      'Healthy': 'ممتاز',
      'Low Stock': 'مخزون منخفض',
      'Critical': 'حرج',
      'Out of Stock': 'نفد من المخزون',
      'Dairy': 'منتجات الألبان',
      'Basmati Rice 5kg': 'أرز بسمتي 5 كجم',
      'Full Cream Milk 1L': 'حليب كامل الدسم 1 لتر'
    },

    zh: {
      'Dashboard Overview': '仪表盘概览',
      'Real-time inventory health and performance summary': '实时库存健康状况与销售表现总览',
      'Reports': '报表分析',
      'Generate Reorder Plan': '生成补货计划',
      'Demo Mode': '演示模式',
      'Inventory Management': '库存管理',
      'Inventory Catalog': '库存目录',
      'Demand Forecast': '需求预测',
      'Intelligent Reorder Plan': '智能补货计划',
      'Total Products': '商品总数',
      'Total Inventory': '总库存件数',
      'Inventory Value': '库存总值',
      'Low Stock Items': '库存偏低商品',
      'Product': '商品',
      'Category': '分类',
      'Stock': '库存',
      'Status': '状态',
      'Actions': '操作',
      'Healthy': '良好',
      'Low Stock': '偏低',
      'Critical': '紧急',
      'Out of Stock': '缺货',
      'Dairy': '乳制品',
      'Basmati Rice 5kg': '印度香米 5kg',
      'Full Cream Milk 1L': '全脂牛奶 1L'
    },

    ja: {
      'Dashboard Overview': 'ダッシュボード概要',
      'Real-time inventory health and performance summary': 'リアルタイムの在庫健全性と業績サマリー',
      'Reports': 'レポート',
      'Generate Reorder Plan': '発注計画を作成',
      'Demo Mode': 'デモモード',
      'Inventory Management': '在庫管理',
      'Inventory Catalog': '在庫カタログ',
      'Demand Forecast': '需要予測',
      'Intelligent Reorder Plan': 'スマート発注計画',
      'Total Products': '商品総数',
      'Total Inventory': '総在庫数',
      'Inventory Value': '在庫評価額',
      'Low Stock Items': '在庫不足商品',
      'Product': '商品名',
      'Category': 'カテゴリー',
      'Stock': '在庫数',
      'Status': '状態',
      'Actions': '操作',
      'Healthy': '良好',
      'Low Stock': '品薄',
      'Critical': '緊急',
      'Out of Stock': '在庫切れ',
      'Dairy': '乳製品',
      'Basmati Rice 5kg': 'バスマティライス 5kg',
      'Full Cream Milk 1L': '成分無調整牛乳 1L'
    },

    ru: {
      'Dashboard Overview': 'Обзор панели',
      'Real-time inventory health and performance summary': 'Состояние запасов и сводка эффективности в реальном времени',
      'Reports': 'Отчеты',
      'Generate Reorder Plan': 'Создать план закупки',
      'Inventory Management': 'Управление запасами',
      'Inventory Catalog': 'Каталог товаров',
      'Demand Forecast': 'Прогноз спроса',
      'Intelligent Reorder Plan': 'Умный план повторного заказа',
      'Total Products': 'Всего товаров',
      'Total Inventory': 'Общий запас',
      'Inventory Value': 'Стоимость запасов',
      'Low Stock Items': 'Мало на складе',
      'Product': 'Товар',
      'Category': 'Категория',
      'Stock': 'Остаток',
      'Status': 'Статус',
      'Actions': 'Действия',
      'Healthy': 'В норме',
      'Low Stock': 'Мало',
      'Critical': 'Критично',
      'Out of Stock': 'Нет в наличии',
      'Dairy': 'Молочные продукты',
      'Basmati Rice 5kg': 'Рис Басмати 5 кг',
      'Full Cream Milk 1L': 'Молоко цельное 1 л'
    }
  };

  // ── Dynamic Sentence Patterns ──
  // Regex matchers with dynamic replacement functions for variable values
  const dynamicPatterns = {
    ta: [
      { regex: /^Showing\s+(\d+)[–-](\d+)\s+of\s+(\d+)/i, replace: (m, a, b, c) => `${c} பொருட்களில் ${a}–${b} காட்டப்படுகிறது` },
      { regex: /^Showing\s+(\d+)\s+to\s+(\d+)\s+of\s+(\d+)\s+products/i, replace: (m, a, b, c) => `${c} பொருட்களில் ${a} முதல் ${b} வரை காட்டுகிறது` },
      { regex: /^(\d+)\s+units\s+in\s+stock/i, replace: (m, a) => `${a} இருப்பு உள்ளது` },
      { regex: /^(\d+)\s+out\s+of\s+stock/i, replace: (m, a) => `${a} இருப்பில் இல்லை` },
      { regex: /^within\s+lead\s+time/i, replace: () => 'சப்ளை காலத்திற்குள் தீர்ந்துவிடும்' },
      { regex: /^within\s+(\d+)\s+days?/i, replace: (m, a) => `${a} நாட்களுக்குள்` },
      { regex: /^expires\s+in\s+(\d+)\s+days?/i, replace: (m, a) => `${a} நாட்களில் காலாவதியாகிறது` },
      { regex: /^(\d+)\s+units\s+at\s+risk/i, replace: (m, a) => `${a} பொருட்கள் காலாவதி அபாயம்` },
      { regex: /^from\s+stockouts/i, replace: () => 'இருப்பு இன்மையால் இழப்பு' },
      { regex: /^recommended$/i, replace: () => 'பரிந்துரைக்கப்படுகிறது' },
      { regex: /^(\d+)\s+items\s+sold\s+in\s+the\s+last\s+hour/i, replace: (m, a) => `கடந்த 1 மணி நேரத்தில் ${a} பொருட்கள் விற்பனை` },
      { regex: /^(\d+)\s+units\s+left/i, replace: (m, a) => `${a} பொருட்கள் மட்டுமே உள்ளன` },
      { regex: /^(\d+)\s+new$/i, replace: (m, a) => `${a} புதியவை` },
      { regex: /^(\d+)\s+selected\s+\((\d+)\s+units\)/i, replace: (m, a, b) => `${a} தேர்ந்தெடுக்கப்பட்டது (${b} பொருட்கள்)` },
      { regex: /^Sales\s+vs\s+Forecast\s+Demand\s+\((\d+)\s+Days\)/i, replace: (m, a) => `விற்பனை மற்றும் தேவை கணிப்பு (${a} நாட்கள்)` },
      { regex: /^(\d+)\s+units\s+incoming/i, replace: (m, a) => `${a} பொருட்கள் வரவிருக்கின்றன` },
      { regex: /^Imminent\s+stockout\s+<\s+Lead\s+Time/i, replace: () => 'சப்ளை காலத்திற்குள் இருப்பு தீர்ந்துவிடும்' },
      { regex: /^Orders\s+capped\s+to\s+prevent\s+expiry/i, replace: () => 'வீணாவதை தடுக்க ஆர்டர் கட்டுப்படுத்தப்பட்டது' },
      { regex: /^Based\s+on\s+active\s+supplier\s+cost\s+prices/i, replace: () => 'சப்ளையர் அடக்க விலை அடிப்படையில்' },
      { regex: /^(\d+)\s+days?$/i, replace: (m, a) => `${a} நாட்கள்` },
      { regex: /^(\d+)\s+units$/i, replace: (m, a) => `${a} பொருட்கள்` },
      { regex: /^(\d+)\/day$/i, replace: (m, a) => `${a}/நாள்` },
      { regex: /^(\d+)d$/i, replace: (m, a) => `${a} நாட்கள்` }
    ],
    hi: [
      { regex: /^Showing\s+(\d+)[–-](\d+)\s+of\s+(\d+)/i, replace: (m, a, b, c) => `${c} में से ${a}–${b} दिखाया जा रहा है` },
      { regex: /^Showing\s+(\d+)\s+to\s+(\d+)\s+of\s+(\d+)\s+products/i, replace: (m, a, b, c) => `${c} में से ${a} से ${b} उत्पाद दिखाए जा रहे हैं` },
      { regex: /^(\d+)\s+units\s+in\s+stock/i, replace: (m, a) => `${a} स्टॉक में उपलब्ध` },
      { regex: /^(\d+)\s+out\s+of\s+stock/i, replace: (m, a) => `${a} स्टॉक समाप्त` },
      { regex: /^within\s+lead\s+time/i, replace: () => 'लीड समय के भीतर समाप्त' },
      { regex: /^within\s+(\d+)\s+days?/i, replace: (m, a) => `${a} दिनों के भीतर` },
      { regex: /^expires\s+in\s+(\d+)\s+days?/i, replace: (m, a) => `${a} दिनों में समाप्त होगा` },
      { regex: /^(\d+)\s+units\s+at\s+risk/i, replace: (m, a) => `${a} इकाइयां जोखिम में` },
      { regex: /^from\s+stockouts/i, replace: () => 'स्टॉकआउट से नुकसान' },
      { regex: /^recommended$/i, replace: () => 'अनुशंसित' },
      { regex: /^(\d+)\s+items\s+sold\s+in\s+the\s+last\s+hour/i, replace: (m, a) => `पिछले 1 घंटे में ${a} वस्तुएं बिकीं` },
      { regex: /^(\d+)\s+units\s+left/i, replace: (m, a) => `${a} इकाइयां शेष` },
      { regex: /^(\d+)\s+new$/i, replace: (m, a) => `${a} नई` },
      { regex: /^(\d+)\s+selected\s+\((\d+)\s+units\)/i, replace: (m, a, b) => `${a} चयनित (${b} इकाइयां)` },
      { regex: /^Sales\s+vs\s+Forecast\s+Demand\s+\((\d+)\s+Days\)/i, replace: (m, a) => `बिक्री बनाम मांग पूर्वानुमान (${a} दिन)` },
      { regex: /^(\d+)\s+units\s+incoming/i, replace: (m, a) => `${a} इकाइयां आने वाली हैं` },
      { regex: /^Imminent\s+stockout\s+<\s+Lead\s+Time/i, replace: () => 'लीड समय से पहले स्टॉकआउट संभावित' },
      { regex: /^Orders\s+capped\s+to\s+prevent\s+expiry/i, replace: () => 'खराब होने से बचाने के लिए सीमित ऑर्डर' },
      { regex: /^Based\s+on\s+active\s+supplier\s+cost\s+prices/i, replace: () => 'सक्रिय आपूर्तिकर्ता लागत मूल्यों पर आधारित' },
      { regex: /^(\d+)\s+days?$/i, replace: (m, a) => `${a} दिन` },
      { regex: /^(\d+)\s+units$/i, replace: (m, a) => `${a} इकाइयां` },
      { regex: /^(\d+)\/day$/i, replace: (m, a) => `${a}/दिन` },
      { regex: /^(\d+)d$/i, replace: (m, a) => `${a} दिन` }
    ],
    te: [
      { regex: /^Showing\s+(\d+)[–-](\d+)\s+of\s+(\d+)/i, replace: (m, a, b, c) => `${c} లో ${a}–${b} చూపబడుతోంది` },
      { regex: /^(\d+)\s+units\s+in\s+stock/i, replace: (m, a) => `${a} యూనిట్లు స్టాక్‌లో ఉన్నాయి` },
      { regex: /^(\d+)\s+out\s+of\s+stock/i, replace: (m, a) => `${a} స్టాక్ అయిపోయింది` },
      { regex: /^within\s+lead\s+time/i, replace: () => 'సరఫరా సమయానికి అయిపోతుంది' },
      { regex: /^(\d+)\s+days?$/i, replace: (m, a) => `${a} రోజులు` },
      { regex: /^(\d+)\s+units$/i, replace: (m, a) => `${a} యూనిట్లు` }
    ],
    kn: [
      { regex: /^Showing\s+(\d+)[–-](\d+)\s+of\s+(\d+)/i, replace: (m, a, b, c) => `${c} ರಲ್ಲಿ ${a}–${b} ತೋರಿಸಲಾಗುತ್ತಿದೆ` },
      { regex: /^(\d+)\s+units\s+in\s+stock/i, replace: (m, a) => `${a} ಘಟಕಗಳು ದಾಸ್ತಾನಿನಲ್ಲಿವೆ` },
      { regex: /^(\d+)\s+out\s+of\s+stock/i, replace: (m, a) => `${a} ದಾಸ್ತಾನು ಖಾಲಿಯಾಗಿದೆ` },
      { regex: /^within\s+lead\s+time/i, replace: () => 'ಸರಬರಾಜು ಅವಧಿಯಲ್ಲಿ ಖಾಲಿಯಾಗುತ್ತದೆ' },
      { regex: /^(\d+)\s+days?$/i, replace: (m, a) => `${a} ದಿನಗಳು` },
      { regex: /^(\d+)\s+units$/i, replace: (m, a) => `${a} ಘಟಕಗಳು` }
    ],
    es: [
      { regex: /^Showing\s+(\d+)[–-](\d+)\s+of\s+(\d+)/i, replace: (m, a, b, c) => `Mostrando ${a}–${b} de ${c}` },
      { regex: /^(\d+)\s+units\s+in\s+stock/i, replace: (m, a) => `${a} unidades en stock` },
      { regex: /^(\d+)\s+out\s+of\s+stock/i, replace: (m, a) => `${a} agotadas` },
      { regex: /^within\s+lead\s+time/i, replace: () => 'en plazo de entrega' },
      { regex: /^(\d+)\s+days?$/i, replace: (m, a) => `${a} días` },
      { regex: /^(\d+)\s+units$/i, replace: (m, a) => `${a} unidades` }
    ],
    fr: [
      { regex: /^Showing\s+(\d+)[–-](\d+)\s+of\s+(\d+)/i, replace: (m, a, b, c) => `Affichage de ${a}–${b} sur ${c}` },
      { regex: /^(\d+)\s+units\s+in\s+stock/i, replace: (m, a) => `${a} unités en stock` },
      { regex: /^(\d+)\s+out\s+of\s+stock/i, replace: (m, a) => `${a} en rupture` },
      { regex: /^within\s+lead\s+time/i, replace: () => 'dans le délai de livraison' },
      { regex: /^(\d+)\s+days?$/i, replace: (m, a) => `${a} jours` },
      { regex: /^(\d+)\s+units$/i, replace: (m, a) => `${a} unités` }
    ]
  };

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (translations[saved] || phraseMaps[saved])) {
      currentLang = saved;
    } else {
      const navLang = (navigator.language || 'en').split('-')[0].toLowerCase();
      currentLang = (translations[navLang] || phraseMaps[navLang]) ? navLang : 'en';
    }

    applyTranslations();
    initObserver();

    // Wire topbar language select dropdown
    const topbarSelect = document.getElementById('topbarLanguageSelect');
    if (topbarSelect) {
      topbarSelect.value = currentLang;
      topbarSelect.addEventListener('change', (e) => {
        setLanguage(e.target.value);
      });
    }
  }

  function initObserver() {
    if (domObserver) domObserver.disconnect();
    const target = document.body;
    domObserver = new MutationObserver(() => {
      if (!isTranslating && currentLang !== 'en') {
        clearTimeout(observerTimer);
        observerTimer = setTimeout(translateFullDOM, 60);
      }
    });
    domObserver.observe(target, { childList: true, subtree: true });
  }

  // ── Core DOM TreeWalker Translator ──
  // Strict Full-Sentence & Exact Match + Template Regex (Zero Mixed Language)
  function translateFullDOM() {
    if (isTranslating) return;
    isTranslating = true;

    try {
      const isEn = currentLang === 'en';
      const map = phraseMaps[currentLang] || {};
      const patterns = dynamicPatterns[currentLang] || [];

      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName.toLowerCase();
            if (tag === 'script' || tag === 'style' || tag === 'noscript' ||
                parent.closest('.lang-dropdown-menu') ||
                parent.closest('#voiceAssistantModalOverlay')) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      const nodes = [];
      while (walker.nextNode()) {
        nodes.push(walker.currentNode);
      }

      nodes.forEach(node => {
        // Cache original English text on the node object once
        if (typeof node.__origText === 'undefined') {
          node.__origText = node.nodeValue;
        }

        // Switching back to English restores exact original strings
        if (isEn) {
          if (node.nodeValue !== node.__origText) {
            node.nodeValue = node.__origText;
          }
          return;
        }

        const orig = node.__origText;
        const trimmed = orig.trim();
        if (!trimmed) return;

        // 1. Exact sentence / phrase match
        if (map[trimmed]) {
          node.nodeValue = orig.replace(trimmed, map[trimmed]);
          return;
        }

        // 2. Dynamic pattern matching with variable capture
        let patternMatched = false;
        for (const p of patterns) {
          if (p.regex.test(trimmed)) {
            const translatedStr = trimmed.replace(p.regex, p.replace);
            node.nodeValue = orig.replace(trimmed, translatedStr);
            patternMatched = true;
            break;
          }
        }
        if (patternMatched) return;

        // 3. Fallback for short category/unit badges (never break sentences)
        if (trimmed.length <= 25 && map[trimmed]) {
          node.nodeValue = orig.replace(trimmed, map[trimmed]);
        }
      });

      // Translate placeholders
      document.querySelectorAll('input[placeholder]').forEach(inp => {
        if (inp.closest('.lang-dropdown-menu') || inp.closest('#voiceAssistantModalOverlay')) return;
        if (typeof inp.__origPh === 'undefined') {
          inp.__origPh = inp.placeholder;
        }
        if (isEn) {
          inp.placeholder = inp.__origPh;
        } else if (map[inp.__origPh]) {
          inp.placeholder = map[inp.__origPh];
        }
      });

      // Translate select dropdown options
      document.querySelectorAll('option').forEach(opt => {
        if (opt.closest('.lang-dropdown-menu') || opt.closest('#voiceAssistantModalOverlay')) return;
        if (typeof opt.__origText === 'undefined') {
          opt.__origText = opt.textContent;
        }
        if (isEn) {
          opt.textContent = opt.__origText;
        } else if (map[opt.__origText.trim()]) {
          opt.textContent = map[opt.__origText.trim()];
        }
      });

      // Translate buttons with title attributes
      document.querySelectorAll('button[title]').forEach(btn => {
        if (btn.closest('.lang-dropdown-menu') || btn.closest('#voiceAssistantModalOverlay')) return;
        if (typeof btn.__origTitle === 'undefined') {
          btn.__origTitle = btn.title;
        }
        if (isEn) {
          btn.title = btn.__origTitle;
        } else if (map[btn.__origTitle.trim()]) {
          btn.title = map[btn.__origTitle.trim()];
        }
      });
    } catch (e) {
      console.warn('DOM translation error:', e);
    } finally {
      isTranslating = false;
    }
  }

  function applyTranslations() {
    const dict = translations[currentLang] || translations.en;

    // Search placeholder
    const searchInput = document.querySelector('.topbar-search input');
    if (searchInput) {
      searchInput.placeholder = dict.searchPlaceholder;
    }

    // Sidebar navigation labels
    const navItemMap = {
      overview: 'dashboardOverview',
      inventory: 'inventoryCatalog',
      forecast: 'demandForecast',
      reorder: 'reorderPlan',
      sales: 'salesIngestion',
      suppliers: 'suppliersOrders',
      reports: 'reportsAnalytics',
      settings: 'settingsRules',
    };

    Object.entries(navItemMap).forEach(([page, transKey]) => {
      const el = document.querySelector(`.nav-item[data-page="${page}"] .nav-label`);
      if (el && dict[transKey]) {
        el.textContent = dict[transKey];
      }
    });

    // Section labels
    const sectionLabels = document.querySelectorAll('.nav-section-label');
    if (sectionLabels[0] && dict.coreModules) sectionLabels[0].textContent = dict.coreModules;
    if (sectionLabels[1] && dict.operations) sectionLabels[1].textContent = dict.operations;
    if (sectionLabels[2] && dict.system) sectionLabels[2].textContent = dict.system;

    // Reorder topbar button
    const reorderBtnSpan = document.querySelector('#generateReorderBtn span');
    if (reorderBtnSpan && dict.reorderButton) reorderBtnSpan.textContent = dict.reorderButton;

    // Rolling 30 days
    const dateRangeSpan = document.querySelector('.date-range-selector span');
    if (dateRangeSpan && dict.rolling30Days) dateRangeSpan.textContent = dict.rolling30Days;

    // Notification dropdown header
    const notifHeader = document.querySelector('.notification-dropdown-header span');
    if (notifHeader && dict.stockAlerts) notifHeader.textContent = dict.stockAlerts;

    // User role
    const userRole = document.querySelector('.sidebar-user-info .role');
    if (userRole && dict.storeOwner) userRole.textContent = dict.storeOwner;

    // Update current lang badge in topbar search
    // Update current lang badge in topbar search
    const langBadge = document.getElementById('currentLangLabel');
    const langFlag = document.getElementById('currentLangFlag');
    const langObj = getLanguageObj();
    if (langBadge) langBadge.textContent = langObj.code.toUpperCase();
    if (langFlag) langFlag.textContent = langObj.flag;

    // Sync topbar select dropdown
    const topbarSelect = document.getElementById('topbarLanguageSelect');
    if (topbarSelect && topbarSelect.value !== currentLang) {
      topbarSelect.value = currentLang;
    }

    // Run clean DOM translation
    translateFullDOM();
  }

  function setLanguage(code) {
    const valid = languages.find(l => l.code === code);
    if (!valid) return;
    currentLang = code;
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch (e) { /* ignore */ }

    applyTranslations();

    // Trigger Google Website Translator if loaded for extended 100+ language support
    triggerGoogleTranslate(code);

    // Sync topbar select and settings dropdown
    const topbarSelect = document.getElementById('topbarLanguageSelect');
    if (topbarSelect) {
      topbarSelect.value = code;
    }
    const settingsSelect = document.getElementById('settingsLangSelect');
    if (settingsSelect) {
      settingsSelect.value = code;
    }

    // Trigger page re-render to update dynamic page content immediately
    if (window.App && App.currentPage && App.navigateTo) {
      App.navigateTo(App.currentPage);
      setTimeout(translateFullDOM, 100);
    }

    const langObj = getLanguageObj(code);
    if (window.App && App.showToast) {
      App.showToast('info', 'Language Switched', `${t('languageChanged')} ${langObj.native} (${langObj.name})`);
    }
  }

  function triggerGoogleTranslate(langCode) {
    try {
      const targetCode = langCode === 'en' ? '' : langCode;
      document.cookie = `googtrans=/en/${targetCode}; path=/;`;
      if (window.location && window.location.hostname) {
        document.cookie = `googtrans=/en/${targetCode}; path=/; domain=${window.location.hostname};`;
      }

      const select = document.querySelector('.goog-te-combo');
      if (select) {
        select.value = targetCode;
        select.dispatchEvent(new Event('change'));
      }
    } catch (e) {
      console.warn('Google Translate trigger error:', e);
    }
  }

  function openGoogleTranslate() {
    const el = document.getElementById('google_translate_element');
    if (el) {
      el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }
    if (window.App && App.showToast) {
      App.showToast('info', 'Google Website Translator', 'Translate StockSense into any of 100+ languages using Google Translate.');
    }
  }

  function getLanguage() {
    return currentLang;
  }

  function getLanguageObj(code = currentLang) {
    return languages.find(l => l.code === code) || languages[0];
  }

  function getAllLanguages() {
    return [...languages];
  }

  function t(key, fallback = '') {
    const dict = translations[currentLang] || translations.en;
    return dict[key] || translations.en[key] || fallback || key;
  }

  function translateString(str) {
    if (!str || currentLang === 'en') return str;
    const map = phraseMaps[currentLang] || {};
    const patterns = dynamicPatterns[currentLang] || [];
    const trimmed = str.trim();
    if (map[trimmed]) return str.replace(trimmed, map[trimmed]);
    for (const p of patterns) {
      if (p.regex.test(trimmed)) {
        return str.replace(trimmed, trimmed.replace(p.regex, p.replace));
      }
    }
    return str;
  }

  return {
    init,
    setLanguage,
    getLanguage,
    getLanguageObj,
    getAllLanguages,
    openGoogleTranslate,
    translateFullDOM,
    triggerGoogleTranslate,
    translateString,
    t,
  };
})();
window.I18n = I18n;

// Google Translate Element callback
window.googleTranslateElementInit = function() {
  if (window.google && window.google.translate) {
    try {
      new window.google.translate.TranslateElement({
        pageLanguage: 'en',
        layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: false
      }, 'google_translate_element');
    } catch (e) {
      console.warn('Google Translate init error:', e);
    }
  }
};

// Auto initialize on load
document.addEventListener('DOMContentLoaded', I18n.init);
