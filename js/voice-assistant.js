/* ========================================
   StockSense — Intelligent Voice Assistant Module
   Voice search, multilingual speech-to-text, command parser, TTS feedback
   ======================================== */

const VoiceAssistant = (() => {
  let recognition = null;
  let isListening = false;
  let isSpeakingEnabled = true;
  let currentTranscript = '';
  let hasWebSpeech = false;

  // ── Initialize Speech Recognition ──
  function init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      hasWebSpeech = true;
      try {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          isListening = true;
          updateMicButtonState(true);
          updateAssistantHudState('listening', I18n.t('voiceListening'));
        };

        recognition.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          const activeText = finalTranscript || interimTranscript;
          currentTranscript = activeText;

          // Update search input and HUD transcript display
          const searchInput = document.querySelector('.topbar-search input');
          if (searchInput && activeText) {
            searchInput.value = activeText;
          }

          updateAssistantTranscript(activeText, !!finalTranscript);

          if (finalTranscript) {
            processVoiceCommand(finalTranscript.trim());
          }
        };

        recognition.onerror = (event) => {
          console.warn('Speech recognition event:', event.error);
          isListening = false;
          updateMicButtonState(false);

          if (event.error === 'not-allowed') {
            updateAssistantHudState('error', 'Microphone blocked. You can type commands or click chips below.');
          } else if (event.error === 'no-speech') {
            updateAssistantHudState('idle', 'Listening paused — tap the orb or speak to try again.');
          } else {
            updateAssistantHudState('error', `Speech: ${event.error}. You can use typed commands below.`);
          }
        };

        recognition.onend = () => {
          isListening = false;
          updateMicButtonState(false);
          const orb = document.querySelector('.voice-orb');
          if (orb) orb.classList.remove('pulse-active');
        };
      } catch (err) {
        console.warn('Failed to initialize SpeechRecognition:', err);
        hasWebSpeech = false;
      }
    } else {
      hasWebSpeech = false;
    }

    initSearchMicButton();
    initLanguageDropdown();
  }

  // ── Language Dropdown in Search Bar ──
  function initLanguageDropdown() {
    const langBtn = document.getElementById('langSelectBtn');
    const langMenu = document.getElementById('langDropdownMenu');
    if (!langBtn || !langMenu) return;

    renderLanguageList();

    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      langMenu.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.lang-dropdown-wrapper')) {
        langMenu.classList.remove('active');
      }
    });
  }

  function renderLanguageList() {
    const langMenu = document.getElementById('langDropdownMenu');
    if (!langMenu) return;

    const allLangs = I18n.getAllLanguages();
    const current = I18n.getLanguage();

    langMenu.innerHTML = `
      <div class="lang-dropdown-header">
        <span>Select Voice & UI Language</span>
      </div>
      <div class="lang-search-box">
        <i data-lucide="search" style="width:14px;height:14px"></i>
        <input type="text" id="langFilterInput" placeholder="Filter language..." autocomplete="off">
      </div>
      <div class="lang-list-scroll">
        ${allLangs.map(l => `
          <div class="lang-item ${l.code === current ? 'active' : ''}" data-code="${l.code}">
            <span class="lang-flag">${l.flag}</span>
            <div class="lang-names">
              <span class="lang-native">${l.native}</span>
              <span class="lang-english">${l.name} (${l.code.toUpperCase()})</span>
            </div>
            ${l.code === current ? '<i data-lucide="check" class="lang-check"></i>' : ''}
          </div>
        `).join('')}
      </div>
      <div class="lang-google-translate-banner" id="triggerGoogleTranslateBtn">
        <i data-lucide="globe" style="width:14px;height:14px"></i>
        <span>Translate App (100+ Languages with Google)</span>
      </div>
    `;

    lucide.createIcons();

    // Bind language item click
    langMenu.querySelectorAll('.lang-item').forEach(item => {
      item.addEventListener('click', () => {
        const code = item.dataset.code;
        I18n.setLanguage(code);
        langMenu.classList.remove('active');
        renderLanguageList();

        // Speak confirmation in the selected language
        const langObj = I18n.getLanguageObj(code);
        const confirmMsg = getLocalizedVoiceMessage('langChanged', { name: langObj.native || langObj.name });
        speak(confirmMsg);
      });
    });

    // Google Translate trigger
    const googleBtn = langMenu.querySelector('#triggerGoogleTranslateBtn');
    if (googleBtn) {
      googleBtn.addEventListener('click', () => {
        langMenu.classList.remove('active');
        if (I18n.openGoogleTranslate) {
          I18n.openGoogleTranslate();
        }
      });
    }

    // Filter input
    const filterInput = langMenu.querySelector('#langFilterInput');
    if (filterInput) {
      filterInput.addEventListener('input', () => {
        const q = filterInput.value.toLowerCase().trim();
        langMenu.querySelectorAll('.lang-item').forEach(item => {
          const text = item.textContent.toLowerCase();
          item.style.display = text.includes(q) ? 'flex' : 'none';
        });
      });
    }
  }

  // ── Search Bar Microphone Button ──
  function initSearchMicButton() {
    const micBtn = document.getElementById('voiceAssistantBtn');
    if (!micBtn) return;

    micBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (isListening) {
        stopListening();
      } else {
        openAssistantHud();
        startListening();
      }
    });
  }

  function startListening() {
    if (!hasWebSpeech || !recognition) {
      updateAssistantHudState('unsupported', I18n.t('micNotSupported'));
      return;
    }

    if (isListening) {
      try { recognition.stop(); } catch (e) {}
    }

    try {
      const langObj = I18n.getLanguageObj();
      recognition.lang = langObj.speechCode || 'en-IN';
      recognition.start();
      isListening = true;
      updateMicButtonState(true);
      updateAssistantHudState('listening', I18n.t('voiceListening'));
    } catch (e) {
      console.warn('SpeechRecognition start error:', e);
      isListening = false;
      updateMicButtonState(false);
    }
  }

  function stopListening() {
    if (recognition && isListening) {
      try {
        recognition.stop();
      } catch (e) { /* ignore */ }
    }
    isListening = false;
    updateMicButtonState(false);
    const orb = document.querySelector('.voice-orb');
    if (orb) orb.classList.remove('pulse-active');
  }

  function updateMicButtonState(listening) {
    const micBtn = document.getElementById('voiceAssistantBtn');
    if (!micBtn) return;

    micBtn.classList.toggle('listening', listening);
    const pulse = micBtn.querySelector('.mic-pulse');
    if (pulse) pulse.style.display = listening ? 'block' : 'none';
  }

  // ── Localized Voice Feedback Generator ──
  function getLocalizedVoiceMessage(type, params = {}) {
    const lang = I18n.getLanguage();
    const msgs = {
      langChanged: {
        en: `Language set to ${params.name}`,
        hi: `${params.name} भाषा सेट की गई`,
        ta: `${params.name} மொழி அமைக்கப்பட்டது`,
        te: `${params.name} భాష ఎంపిక చేయబడింది`,
        kn: `${params.name} ಭಾಷೆ ಹೊಂದಿಸಲಾಗಿದೆ`,
        ml: `${params.name} ഭാഷ തിരഞ്ഞെടുത്തു`,
        mr: `${params.name} भाषा निवडली`,
        bn: `${params.name} ভাষা সেট করা হয়েছে`,
        gu: `${params.name} ભાષા સેટ કરવામાં આવી`,
        pa: `${params.name} ਭਾਸ਼ਾ ਸੈੱਟ ਕੀਤੀ ਗਈ`,
        es: `Idioma configurado a ${params.name}`,
        fr: `Langue configurée sur ${params.name}`,
        de: `Sprache auf ${params.name} eingestellt`,
        ar: `تم ضبط اللغة على ${params.name}`,
        zh: `语言已设置为 ${params.name}`,
        ja: `言語を ${params.name} に設定しました`,
      },
      lowStock: {
        en: `You have ${params.lowCount} products running low, and ${params.outCount} out of stock. Opening reorder plan.`,
        hi: `आपके ${params.lowCount} उत्पाद कम हैं और ${params.outCount} समाप्त हैं। रीऑर्डर योजना खोल रहे हैं।`,
        ta: `${params.lowCount} பொருட்கள் இருப்பு குறைவு, ${params.outCount} இருப்பு இல்லை. மறுஆர்டர் திட்டம் திறக்கப்படுகிறது.`,
        te: `${params.lowCount} ఉత్పత్తులు తక్కువగా ఉన్నాయి, ${params.outCount} ఖాళీ అయ్యాయి. రీఆర్డర్ ప్లాన్ తెరవబడుతోంది.`,
        kn: `${params.lowCount} ಉತ್ಪನ್ನಗಳು ಕಡಿಮೆ ಇವೆ, ಮತ್ತು ${params.outCount} ಖಾಲಿಯಾಗಿವೆ. ಮರುಆರ್ಡರ್ ಯೋಜನೆ ತೆರೆಯಲಾಗುತ್ತಿದೆ.`,
        ml: `${params.lowCount} ഉൽപ്പന്നങ്ങൾ കുറവാണ്, ${params.outCount} തീർന്നു. റീഓർഡർ പ്ലാൻ തുറക്കുന്നു.`,
        mr: `तुमची ${params.lowCount} उत्पादने कमी आहेत आणि ${params.outCount} संपली आहेत. रिऑर्डर योजना उघडत आहे.`,
        bn: `আপনার ${params.lowCount}টি পণ্য কম আছে এবং ${params.outCount}টি স্টক শেষ। রিঅর্ডার প্ল্যান খোলা হচ্ছে।`,
        es: `Tiene ${params.lowCount} productos con poco stock y ${params.outCount} agotados. Abriendo plan de reorden.`,
        fr: `Vous avez ${params.lowCount} produits en stock faible et ${params.outCount} en rupture. Ouverture du plan.`,
      },
      expiring: {
        en: `Found ${params.expiring} perishable items at risk of expiry within 14 days. Opening waste mitigation reports.`,
        hi: `14 दिनों के भीतर खराब होने वाले ${params.expiring} उत्पाद पाए गए। रिपोर्ट खोली जा रही है।`,
        ta: `14 நாட்களில் காலாவதியாகும் அபாயத்தில் ${params.expiring} பொருட்கள் உள்ளன. அறிக்கைகள் திறக்கப்படுகின்றன.`,
        te: `14 రోజుల్లో గడువు ముగిసే ${params.expiring} వస్తువులు కనుగొనబడ్డాయి. నివేదికలు తెరవబడుతున్నాయి.`,
        kn: `14 ದಿನಗಳಲ್ಲಿ ಅವಧಿ ಮುಗಿಯುವ ${params.expiring} ಉತ್ಪನ್ನಗಳು ಕಂಡುಬಂದಿವೆ. ವರದಿಗಳನ್ನು ತೆರೆಯಲಾಗುತ್ತಿದೆ.`,
        ml: `14 ദിവസത്തിനുള്ളിൽ കാലാവധി തീരുന്ന ${params.expiring} ഉൽപ്പന്നങ്ങൾ കണ്ടെത്തി. റിപ്പോർട്ടുകൾ തുറക്കുന്നു.`,
        es: `Se encontraron ${params.expiring} artículos con riesgo de vencimiento en 14 días. Abriendo informes.`,
        fr: `${params.expiring} articles périssables à risque d'expiration dans 14 jours. Ouverture des rapports.`,
      },
      darkTheme: {
        en: 'Switched to dark theme',
        hi: 'डार्क मोड लागू किया गया',
        ta: 'இருண்ட பயன்முறை மாற்றப்பட்டது',
        te: 'డార్క్ థీమ్ మార్చబడింది',
        kn: 'ಡಾರ್ಕ್ ಥೀಮ್ ಅನ್ವಯಿಸಲಾಗಿದೆ',
        es: 'Cambiado a modo oscuro',
        fr: 'Passé en mode sombre',
      },
      lightTheme: {
        en: 'Switched to light theme',
        hi: 'लाइट मोड लागू किया गया',
        ta: 'வெளிச்ச பயன்முறை மாற்றப்பட்டது',
        te: 'లైట్ థీమ్ మార్చబడింది',
        kn: 'ಲೈಟ್ ಥೀಮ್ ಅನ್ವಯಿಸಲಾಗಿದೆ',
        es: 'Cambiado a modo claro',
        fr: 'Passé en mode clair',
      },
      navigating: {
        en: `Navigating to ${params.pageName}`,
        hi: `${params.pageName} पर जा रहे हैं`,
        ta: `${params.pageName} திறக்கப்படுகிறது`,
        te: `${params.pageName} తెరవబడుతోంది`,
        kn: `${params.pageName} ತೆರೆಯಲಾಗುತ್ತಿದೆ`,
        ml: `${params.pageName} തുറക്കുന്നു`,
        mr: `${params.pageName} उघडत आहे`,
        bn: `${params.pageName} খোলা হচ্ছে`,
        es: `Navegando a ${params.pageName}`,
        fr: `Navigation vers ${params.pageName}`,
      },
      searchFound: {
        en: `Found ${params.count} items matching "${params.query}". Opening catalog.`,
        hi: `"${params.query}" के लिए ${params.count} उत्पाद मिले। कैटलॉग खोल रहे हैं।`,
        ta: `"${params.query}" க்கான ${params.count} பொருட்கள் கிடைத்தன. பட்டியல் திறக்கப்படுகிறது.`,
        te: `"${params.query}" కోసం ${params.count} ఉత్పత్తులు దొరికాయి. కేటలాగ్ తెరవబడుతోంది.`,
        kn: `"${params.query}" ಗಾಗಿ ${params.count} ವಸ್ತುಗಳು ಸಿಕ್ಕಿವೆ. ಕ್ಯಾಟಲಾಗ್ ತೆರೆಯಲಾಗುತ್ತಿದೆ.`,
        ml: `"${params.query}" നായി ${params.count} ഉൽപ്പന്നങ്ങൾ കണ്ടെത്തി. കാറ്റലോഗ് തുറക്കുന്നു.`,
        mr: `"${params.query}" साठी ${params.count} उत्पादने सापडली.`,
        bn: `"${params.query}" এর জন্য ${params.count}টি পণ্য পাওয়া গেছে। ক্যাটালগ খোলা হচ্ছে।`,
        es: `Se encontraron ${params.count} artículos para "${params.query}". Abriendo catálogo.`,
        fr: `${params.count} articles trouvés pour "${params.query}". Ouverture du catalogue.`,
      },
      searchFallback: {
        en: `Searching inventory for "${params.query}"...`,
        hi: `"${params.query}" के लिए इन्वेंट्री खोजी जा रही है...`,
        ta: `"${params.query}" சரக்கு இருப்பில் தேடப்படுகிறது...`,
        te: `"${params.query}" కోసం ఇన్వెంటరీ శోధించబడుతోంది...`,
        kn: `"${params.query}" ಗಾಗಿ ದಾಸ್ತಾನು ಹುಡುಕಲಾಗುತ್ತಿದೆ...`,
        ml: `"${params.query}" നായി ഇൻവെന്ററി തിരയുന്നു...`,
        es: `Buscando en inventario "${params.query}"...`,
        fr: `Recherche dans l'inventaire pour "${params.query}"...`,
      }
    };

    const set = msgs[type] || {};
    return set[lang] || set.en || '';
  }

  // Quick Command Chips mapped by language
  const quickChipsByLang = {
    en: [
      { cmd: 'Search Milk', icon: 'search', label: 'Search Milk' },
      { cmd: 'Find Toor Dal', icon: 'package', label: 'Find Toor Dal' },
      { cmd: 'What is low in stock?', icon: 'alert-triangle', label: 'Low in Stock' },
      { cmd: 'Show reorder plan', icon: 'shopping-cart', label: 'Reorder Plan' },
      { cmd: 'Show expiring products', icon: 'clock', label: 'Expiry Risk Items' },
      { cmd: 'Open Demand Forecast', icon: 'trending-up', label: 'Demand Forecast' },
      { cmd: 'Dark mode', icon: 'moon', label: 'Toggle Dark Mode' }
    ],
    hi: [
      { cmd: 'दूध खोजें', icon: 'search', label: 'दूध खोजें' },
      { cmd: 'दाल खोजें', icon: 'package', label: 'दाल खोजें' },
      { cmd: 'कम स्टॉक क्या है?', icon: 'alert-triangle', label: 'कम स्टॉक' },
      { cmd: 'रीऑर्डर योजना', icon: 'shopping-cart', label: 'रीऑर्डर योजना' },
      { cmd: 'खराब होने वाले उत्पाद', icon: 'clock', label: 'एक्सपायरी अलर्ट' },
      { cmd: 'मांग का पूर्वानुमान', icon: 'trending-up', label: 'मांग का पूर्वानुमान' },
      { cmd: 'डार्क मोड', icon: 'moon', label: 'डार्क मोड' }
    ],
    ta: [
      { cmd: 'பால் தேடு', icon: 'search', label: 'பால் தேடு' },
      { cmd: 'பருப்பு தேடு', icon: 'package', label: 'பருப்பு தேடு' },
      { cmd: 'குறைந்த இருப்பு என்ன?', icon: 'alert-triangle', label: 'குறைந்த இருப்பு' },
      { cmd: 'மறுஆர்டர் திட்டம்', icon: 'shopping-cart', label: 'மறுஆர்டர் திட்டம்' },
      { cmd: 'காலாவதி பொருட்கள்', icon: 'clock', label: 'காலாவதி எச்சரிக்கை' },
      { cmd: 'தேவை முன்கணிப்பு', icon: 'trending-up', label: 'தேவை முன்கணிப்பு' },
      { cmd: 'இருண்ட பயன்முறை', icon: 'moon', label: 'இருண்ட பயன்முறை' }
    ],
    te: [
      { cmd: 'పాలు శోధించండి', icon: 'search', label: 'పాలు శోధించండి' },
      { cmd: 'పప్పు శోధించండి', icon: 'package', label: 'పప్పు శోధించండి' },
      { cmd: 'తక్కువ స్టాక్ ఏముంది?', icon: 'alert-triangle', label: 'తక్కువ స్టాక్' },
      { cmd: 'రీఆర్డర్ ప్లాన్', icon: 'shopping-cart', label: 'రీఆర్డర్ ప్లాన్' },
      { cmd: 'గడువు ముగిసే వస్తువులు', icon: 'clock', label: 'గడువు హెచ్చరిక' },
      { cmd: 'డిమాండ్ అంచనా', icon: 'trending-up', label: 'డిమాండ్ అంచనా' },
      { cmd: 'డార్క్ మోడ్', icon: 'moon', label: 'డార్క్ మోడ్' }
    ],
    kn: [
      { cmd: 'ಹಾಲು ಹುಡುಕಿ', icon: 'search', label: 'ಹಾಲು ಹುಡುಕಿ' },
      { cmd: 'ಬೇಳೆ ಹುಡುಕಿ', icon: 'package', label: 'ಬೇಳೆ ಹುಡುಕಿ' },
      { cmd: 'ಕಡಿಮೆ ದಾಸ್ತಾನು ಯಾವುದು?', icon: 'alert-triangle', label: 'ಕಡಿಮೆ ದಾಸ್ತಾನು' },
      { cmd: 'ಮರುಆರ್ಡರ್ ಯೋಜನೆ', icon: 'shopping-cart', label: 'ಮರುಆರ್ಡರ್ ಯೋಜನೆ' },
      { cmd: 'ಅವಧಿ ಮುಗಿಯುವ ವಸ್ತುಗಳು', icon: 'clock', label: 'ಅವಧಿ ಎಚ್ಚರಿಕೆ' },
      { cmd: 'ಬೇಡಿಕೆ ಮುನ್ಸೂಚನೆ', icon: 'trending-up', label: 'ಬೇಡಿಕೆ ಮುನ್ಸೂಚನೆ' },
      { cmd: 'ಡಾರ್ಕ್ ಮೋಡ್', icon: 'moon', label: 'ಡಾರ್ಕ್ ಮೋಡ್' }
    ],
    ml: [
      { cmd: 'പാൽ തിരയുക', icon: 'search', label: 'പാൽ തിരയുക' },
      { cmd: 'പരിപ്പ് തിരയുക', icon: 'package', label: 'പരിപ്പ് തിരയുക' },
      { cmd: 'കുറഞ്ഞ സ്റ്റോക്ക് എന്താണ്?', icon: 'alert-triangle', label: 'കുറഞ്ഞ സ്റ്റോക്ക്' },
      { cmd: 'റീഓർഡർ പ്ലാൻ', icon: 'shopping-cart', label: 'റീഓർഡർ പ്ലാൻ' },
      { cmd: 'കാലഹരണപ്പെടുന്ന ഉൽപ്പന്നങ്ങൾ', icon: 'clock', label: 'കാലഹരണ അലേർട്ട്' },
      { cmd: 'ഡിമാൻഡ് പ്രവചനം', icon: 'trending-up', label: 'ഡിമാൻഡ് പ്രവചനം' },
      { cmd: 'ഡാർക്ക് മോഡ്', icon: 'moon', label: 'ഡാർക്ക് മോഡ്' }
    ],
    mr: [
      { cmd: 'दूध शोधा', icon: 'search', label: 'दूध शोधा' },
      { cmd: 'डाळ शोधा', icon: 'package', label: 'डाळ शोधा' },
      { cmd: 'कमी स्टॉक काय आहे?', icon: 'alert-triangle', label: 'कमी स्टॉक' },
      { cmd: 'रिऑर्डर योजना', icon: 'shopping-cart', label: 'रिऑर्डर योजना' },
      { cmd: 'मुदत संपणारी उत्पादने', icon: 'clock', label: 'एक्सपायरी अलर्ट' },
      { cmd: 'मागणी अंदाज', icon: 'trending-up', label: 'मागणी अंदाज' },
      { cmd: 'डार्क मोड', icon: 'moon', label: 'डार्क मोड' }
    ],
    bn: [
      { cmd: 'দুধ খুঁজুন', icon: 'search', label: 'দুধ খুঁজুন' },
      { cmd: 'ডাল খুঁজুন', icon: 'package', label: 'ডাল খুঁজুন' },
      { cmd: 'স্টক কম কী আছে?', icon: 'alert-triangle', label: 'কম স্টক' },
      { cmd: 'রিঅর্ডার পরিকল্পনা', icon: 'shopping-cart', label: 'রিঅর্ডার প্ল্যান' },
      { cmd: 'মেয়াদ উত্তীর্ণ পণ্য', icon: 'clock', label: 'মেয়াদ সতর্কতা' },
      { cmd: 'চাহিদা পূর্বাভাস', icon: 'trending-up', label: 'চাহিদা পূর্বাভাস' },
      { cmd: 'ডার্ক মোড', icon: 'moon', label: 'ডার্ক মোড' }
    ],
    es: [
      { cmd: 'Buscar leche', icon: 'search', label: 'Buscar leche' },
      { cmd: 'Buscar lentejas', icon: 'package', label: 'Buscar lentejas' },
      { cmd: 'Poco stock', icon: 'alert-triangle', label: 'Poco stock' },
      { cmd: 'Plan de reorden', icon: 'shopping-cart', label: 'Plan de reorden' },
      { cmd: 'Artículos por vencer', icon: 'clock', label: 'Por vencer' },
      { cmd: 'Previsión de demanda', icon: 'trending-up', label: 'Previsión demanda' },
      { cmd: 'Modo oscuro', icon: 'moon', label: 'Modo oscuro' }
    ],
    fr: [
      { cmd: 'Rechercher lait', icon: 'search', label: 'Rechercher lait' },
      { cmd: 'Rechercher lentilles', icon: 'package', label: 'Rechercher lentilles' },
      { cmd: 'Stock faible', icon: 'alert-triangle', label: 'Stock faible' },
      { cmd: 'Plan de réapprovisionnement', icon: 'shopping-cart', label: 'Réapprovisionnement' },
      { cmd: 'Produits périssables', icon: 'clock', label: 'Périssables' },
      { cmd: 'Prévision demande', icon: 'trending-up', label: 'Prévision demande' },
      { cmd: 'Mode sombre', icon: 'moon', label: 'Mode sombre' }
    ],
    de: [
      { cmd: 'Milch suchen', icon: 'search', label: 'Milch suchen' },
      { cmd: 'Niedriger Bestand', icon: 'alert-triangle', label: 'Niedriger Bestand' },
      { cmd: 'Nachbestellplan', icon: 'shopping-cart', label: 'Nachbestellplan' },
      { cmd: 'Bedarfsprognose', icon: 'trending-up', label: 'Bedarfsprognose' },
      { cmd: 'Dunkler Modus', icon: 'moon', label: 'Dunkler Modus' }
    ],
    ar: [
      { cmd: 'بحث عن حليب', icon: 'search', label: 'بحث عن حليب' },
      { cmd: 'نقص في المخزون', icon: 'alert-triangle', label: 'نقص المخزون' },
      { cmd: 'خطة إعادة الطلب', icon: 'shopping-cart', label: 'إعادة الطلب' },
      { cmd: 'توقعات الطلب', icon: 'trending-up', label: 'توقعات الطلب' },
      { cmd: 'الوضع الداكن', icon: 'moon', label: 'الوضع الداكن' }
    ],
    zh: [
      { cmd: '搜索牛奶', icon: 'search', label: '搜索牛奶' },
      { cmd: '库存不足', icon: 'alert-triangle', label: '库存不足' },
      { cmd: '补货计划', icon: 'shopping-cart', label: '补货计划' },
      { cmd: '需求预测', icon: 'trending-up', label: '需求预测' },
      { cmd: '深色模式', icon: 'moon', label: '深色模式' }
    ],
    ja: [
      { cmd: '牛乳を検索', icon: 'search', label: '牛乳を検索' },
      { cmd: '在庫不足', icon: 'alert-triangle', label: '在庫不足' },
      { cmd: '発注計画', icon: 'shopping-cart', label: '発注計画' },
      { cmd: '需要予測', icon: 'trending-up', label: '需要予測' },
      { cmd: 'ダークモード', icon: 'moon', label: 'ダークモード' }
    ],
    ru: [
      { cmd: 'Найти молоко', icon: 'search', label: 'Найти молоко' },
      { cmd: 'Мало на складе', icon: 'alert-triangle', label: 'Мало на складе' },
      { cmd: 'План закупки', icon: 'shopping-cart', label: 'План закупки' },
      { cmd: 'Прогноз спроса', icon: 'trending-up', label: 'Прогноз спроса' },
      { cmd: 'Темная тема', icon: 'moon', label: 'Темная тема' }
    ],
    pt: [
      { cmd: 'Buscar leite', icon: 'search', label: 'Buscar leite' },
      { cmd: 'Estoque baixo', icon: 'alert-triangle', label: 'Estoque baixo' },
      { cmd: 'Plano de reabastecimento', icon: 'shopping-cart', label: 'Reabastecer' },
      { cmd: 'Previsão de demanda', icon: 'trending-up', label: 'Previsão' },
      { cmd: 'Modo escuro', icon: 'moon', label: 'Modo escuro' }
    ],
    it: [
      { cmd: 'Cerca latte', icon: 'search', label: 'Cerca latte' },
      { cmd: 'Scorte basse', icon: 'alert-triangle', label: 'Scorte basse' },
      { cmd: 'Piano di riordino', icon: 'shopping-cart', label: 'Riordino' },
      { cmd: 'Previsione domanda', icon: 'trending-up', label: 'Previsione' },
      { cmd: 'Tema scuro', icon: 'moon', label: 'Tema scuro' }
    ],
    ko: [
      { cmd: '우유 검색', icon: 'search', label: '우유 검색' },
      { cmd: '재고 부족', icon: 'alert-triangle', label: '재고 부족' },
      { cmd: '재발주 계획', icon: 'shopping-cart', label: '재발주 계획' },
      { cmd: '수요 예측', icon: 'trending-up', label: '수요 예측' },
      { cmd: '다크 모드', icon: 'moon', label: '다크 모드' }
    ],
    tr: [
      { cmd: 'Süt ara', icon: 'search', label: 'Süt ara' },
      { cmd: 'Azalan stok', icon: 'alert-triangle', label: 'Azalan stok' },
      { cmd: 'Sipariş planı', icon: 'shopping-cart', label: 'Sipariş planı' },
      { cmd: 'Talep tahmini', icon: 'trending-up', label: 'Talep tahmini' },
      { cmd: 'Karanlık mod', icon: 'moon', label: 'Karanlık mod' }
    ]
  };

  // ── Voice Command Parser & Intelligent Routing ──
  function processVoiceCommand(rawTranscript) {
    const text = rawTranscript.toLowerCase().trim();
    const langObj = I18n.getLanguageObj();

    console.log(`[VoiceAssistant] Processing: "${text}" in ${langObj.name} (${langObj.code})`);
    updateAssistantHudState('processing', `Processing: "${rawTranscript}"`);

    // 0a. Voice Sales Recording (e.g. "பால் 2 விற்றது" / "sold 2 milk")
    const saleKeywords = ['விற்றது', 'விற்பனை', 'sold', 'sale', 'becha', 'बेचा'];
    if (saleKeywords.some(kw => text.includes(kw))) {
      let matched = null;
      for (const p of DataStore.products) {
        if (text.includes(p.name.toLowerCase()) || (p.keywords && p.keywords.some(k => text.includes(k.toLowerCase())))) {
          matched = p;
          break;
        }
      }
      const nums = text.match(/\d+/);
      const qty = nums ? parseInt(nums[0], 10) : 1;

      if (matched) {
        const res = DataStore.recordSale(matched.id, qty, { source: 'voice' });
        const confirmMsg = `${matched.name} ${qty} விற்றதாக பதிவானது. மீதம் ${res.product.stock} உள்ளது. (${qty} ${matched.name} sold. Stock: ${res.product.stock})`;
        updateAssistantHudState('success', confirmMsg);
        speak(confirmMsg);
        setTimeout(() => closeAssistantHud(), 1600);
        return;
      }
    }

    // 0c. WhatsApp Order Dispatch via Voice
    if (text.includes('ஆர்டர் அனுப்பு') || text.includes('send order') || text.includes('send po') || text.includes('whatsapp order')) {
      const pendingPo = DataStore.purchaseOrders.find(po => po.status === 'draft' || po.status === 'ordered');
      if (pendingPo) {
        const waLink = DataStore.generateWhatsAppOrderLink(pendingPo.id);
        const msg = `ஆர்டர் ${pendingPo.id} வாட்ஸ்அப்பில் அனுப்ப தயாராக உள்ளது. (PO ready for WhatsApp dispatch)`;
        updateAssistantHudState('success', msg);
        speak(msg);
        if (waLink) window.open(waLink, '_blank');
        setTimeout(() => closeAssistantHud(), 1600);
        return;
      } else {
        const msg = 'மறுஆர்டர் திட்டம் திறக்கப்படுகிறது. (Opening Reorder Plan)';
        updateAssistantHudState('info', msg);
        speak(msg);
        setTimeout(() => {
          App.navigateTo('reorder');
          closeAssistantHud();
        }, 1200);
        return;
      }
    }

    // 0d. Daily Report via Voice
    if (text.includes('தினசரி அறிக்கை') || text.includes('daily report')) {
      const msg = 'தினசரி அறிக்கை திறக்கப்படுகிறது (Opening Daily Reports).';
      updateAssistantHudState('success', msg);
      speak(msg);
      setTimeout(() => {
        App.navigateTo('reports');
        closeAssistantHud();
      }, 1000);
      return;
    }

    // 1. Low stock / Stockout alert
    const lowStockKeywords = [
      'low in stock', 'low stock', 'out of stock', 'shortage',
      'कम स्टॉक', 'स्टॉक में क्या कम', 'स्टॉक कम', 'स्टॉक खत्म',
      'குறைந்த இருப்பு', 'இருப்பு குறைவு', 'இருப்பு இல்லை', 'சரக்கு குறைவு',
      'తక్కువ స్టాక్', 'స్టాక్ తక్కువ', 'స్టాక్ అయిపోయింది',
      'ಕಡಿಮೆ ದಾಸ್ತಾನು', 'ದಾಸ್ತಾನು ಕಡಿಮೆ', 'ಸ್ಟಾಕ್ ಮುಗಿದಿದೆ',
      'കുറഞ്ഞ സ്റ്റോക്ക്', 'സ്റ്റോക്ക് തീർന്നു',
      'कमी स्टॉक', 'स्टॉक संपला',
      'স্টক কম', 'স্টক শেষ',
      'poco stock', 'stock bajo', 'agotado',
      'stock faible', 'rupture de stock', 'épuisé'
    ];

    if (lowStockKeywords.some(kw => text.includes(kw))) {
      const lowCount = DemoData.products.filter(p => p.stock > 0 && p.stock <= p.reorderLevel).length;
      const outCount = DemoData.products.filter(p => p.stock === 0).length;
      const msg = getLocalizedVoiceMessage('lowStock', { lowCount, outCount });

      updateAssistantHudState('success', msg);
      speak(msg);
      setTimeout(() => {
        App.navigateTo('reorder');
        closeAssistantHud();
      }, 1200);
      return;
    }

    // 2. Expiry risk / Perishable / Wastage
    const expiryKeywords = [
      'expir', 'waste', 'perish', 'spoil',
      'खराब', 'समाप्त', 'एक्सपायरी', 'सड़न',
      'காலாவதி', 'வீணாக', 'கெட்டுப்போக', 'அழுகிய',
      'గడువు', 'పాడైపో', 'వ్యర్థం',
      'ಅವಧಿ ಮುಗಿಯುವ', 'ಹಾಳಾಗುವ', 'ವ್ಯರ್ಥ',
      'കാലഹരണ', 'കേടായ',
      'मुदत संपली', 'खराब',
      'মেয়াদ উত্তীর্ণ', 'নষ্ট',
      'vencimiento', 'caducidad', 'desperdicio',
      'péremption', 'périssable', 'gaspillage'
    ];

    if (expiryKeywords.some(kw => text.includes(kw))) {
      const expiring = DemoData.products.filter(p => p.expiryDate && DemoData.daysUntil(p.expiryDate) <= 14 && p.stock > 0).length;
      const msg = getLocalizedVoiceMessage('expiring', { expiring });

      updateAssistantHudState('success', msg);
      speak(msg);
      setTimeout(() => {
        App.navigateTo('reports');
        closeAssistantHud();
      }, 1200);
      return;
    }

    // 3. Theme toggles
    const darkKeywords = ['dark mode', 'dark theme', 'डार्क मोड', 'இருண்ட பயன்முறை', 'இருண்ட தீம்', 'డార్క్ మోడ్', 'ಡಾರ್ಕ್ ಮೋಡ್', 'modo oscuro', 'mode sombre'];
    const lightKeywords = ['light mode', 'light theme', 'लाइट मोड', 'வெளிச்ச பயன்முறை', 'வெளிச்ச தீம்', 'లైట్ మోడ్', 'ಲೈಟ್ ಮೋಡ್', 'modo claro', 'mode clair'];

    if (darkKeywords.some(kw => text.includes(kw))) {
      API.Settings.setTheme('dark');
      updateThemeDisplay('dark');
      const msg = getLocalizedVoiceMessage('darkTheme');
      updateAssistantHudState('success', msg);
      speak(msg);
      return;
    }
    if (lightKeywords.some(kw => text.includes(kw))) {
      API.Settings.setTheme('light');
      updateThemeDisplay('light');
      const msg = getLocalizedVoiceMessage('lightTheme');
      updateAssistantHudState('success', msg);
      speak(msg);
      return;
    }

    // 4. Direct Navigation Commands (handles natural speech & full button labels)
    const navCommands = [
      {
        page: 'overview',
        name: 'Dashboard Overview',
        keywords: [
          'overview', 'dashboard', 'home', 'main',
          'डैशबोर्ड', 'होम', 'डैशबोर्ड अवलोकन',
          'டாஷ்போர்டு', 'முகப்பு', 'டாஷ்போர்டு பார்வை',
          'డ్యాష్‌బోర్డ్', 'డ్యాష్‌బోర్డ్ అవలోకనం',
          'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಅವಲೋಕನ',
          'tableau de bord', 'panel general', 'panel'
        ]
      },
      {
        page: 'inventory',
        name: 'Hybrid Product Upload',
        isUploadModal: true,
        keywords: [
          'add product', 'upload product', 'upload products', 'bulk upload', 'barcode', 'scan barcode',
          'பொருள் சேர்', 'பொருளை சேர்', 'புதிய பொருள்', 'பார்கோடு', 'சரக்கு பதிவு',
          'नया उत्पाद', 'उत्पाद जोड़ें', 'बारकोड'
        ]
      },
      {
        page: 'inventory',
        name: 'Inventory Catalog',
        keywords: [
          'inventory', 'catalog', 'stock list', 'products list', 'items list',
          'इन्वेंट्री', 'इन्वेंट्री कैटलॉग', 'सामान',
          'சரக்கு இருப்பு', 'சரக்கு பட்டியல்', 'சரக்கு', 'பொருட்கள் பட்டியல்',
          'ఇన్వెంటరీ', 'ఇన్వెంటరీ కేటలాగ్',
          'ದಾಸ್ತಾನು', 'ದಾಸ್ತಾನು ಪಟ್ಟಿ',
          'inventaire', 'inventario', 'catálogo'
        ]
      },
      {
        page: 'forecast',
        name: 'Demand Forecast',
        keywords: [
          'forecast', 'demand forecast', 'demand prediction', 'future demand',
          'पूर्वानुमान', 'मांग का पूर्वानुमान', 'मांग अनुमान',
          'முன்கணிப்பு', 'தேவை முன்கணிப்பு', 'தேவை கணிப்பு',
          'డిమాండ్ అంచనా', 'అంచనా',
          'ಬೇಡಿಕೆ ಮುನ್ಸೂಚನೆ', 'ಮುನ್ಸೂಚನೆ',
          'prévision', 'prévision de demande', 'pronóstico'
        ]
      },
      {
        page: 'reorder',
        name: 'Reorder Plan',
        keywords: [
          'reorder', 'reorder plan', 'purchase list', 'buy list', 'replenish', 'order list',
          'रीऑर्डर', 'रीऑर्डर योजना', 'खरीद सूची', 'आपूर्ति सूची',
          'மறுஆர்டர்', 'மறுஆர்டர் திட்டம்', 'கொள்முதல் பட்டியல்',
          'రీఆర్డర్', 'రీఆర్డర్ ప్లాన్', 'కొనుగోలు ప్లాన్',
          'ಮರುಆರ್ಡರ್', 'ಮರುಆರ್ಡರ್ ಯೋಜನೆ', 'ಖರೀದಿ ಪಟ್ಟಿ',
          'റീഓർഡർ', 'റീഓർഡർ പ്ലാൻ',
          'रिऑर्डर', 'रिऑर्डर योजना',
          'রিঅর্ডার', 'রিঅর্ডার পরিকল্পনা',
          'plan de reorden', 'réapprovisionnement'
        ]
      },
      {
        page: 'sales',
        name: 'Sales Ledger',
        keywords: [
          'sales', 'sales ledger', 'transaction', 'csv upload', 'pos sales',
          'बिक्री', 'बिक्री खाता', 'लेनदेन',
          'விற்பனை', 'விற்பனை கணக்கு', 'பரிவர்த்தனை',
          'అమ్మకాలు', 'అమ్మకాల చిట్టా',
          'ಮಾರಾಟ', 'ಮಾರಾಟ ಖಾತೆ',
          'ventes', 'ventas'
        ]
      },
      {
        page: 'suppliers',
        name: 'Suppliers & Orders',
        keywords: [
          'supplier', 'suppliers', 'vendor', 'vendors', 'purchase orders',
          'आपूर्तिकर्ता', 'सप्लायर', 'खरीद आदेश',
          'சப்ளையர்', 'சப்ளையர்கள்', 'கொள்முதல் ஆர்டர்',
          'సరఫరాదారులు', 'సరఫరాదారు',
          'ಪೂರೈಕೆದಾರರು', 'ಪೂರೈಕೆದಾರ',
          'fournisseurs', 'proveedores'
        ]
      },
      {
        page: 'reports',
        name: 'Reports & Analytics',
        keywords: [
          'report', 'reports', 'analytics', 'valuation', 'loss', 'waste mitigation',
          'रिपोर्ट', 'रिपोर्ट्स', 'विश्लेषण',
          'அறிக்கை', 'அறிக்கைகள்', 'பகுப்பாய்வு',
          'నివేదికలు', 'విశ్లేషణ',
          'ವರದಿಗಳು', 'ವಿಶ್ಲೇಷಣೆ',
          'rapports', 'informes'
        ]
      },
      {
        page: 'settings',
        name: 'Settings & Rules',
        keywords: [
          'setting', 'settings', 'config', 'configure', 'rules', 'parameters',
          'सेटिंग्स', 'नियम', 'कॉन्फ़िगरेशन',
          'அமைப்புகள்', 'கட்டமைப்பு',
          'సెట్టింగ్‌లు', 'నియమాలు',
          'ಸಂಯೋಜನೆಗಳು', 'ಸೆಟ್ಟಿಂಗ್ಸ್',
          'paramètres', 'configuración'
        ]
      }
    ];

    for (const item of navCommands) {
      if (item.keywords.some(kw => text === kw || text.includes(kw))) {
        const msg = getLocalizedVoiceMessage('navigating', { pageName: item.name });
        updateAssistantHudState('success', msg);
        speak(msg);
        setTimeout(() => {
          App.navigateTo(item.page);
          closeAssistantHud();
          if (item.isUploadModal) {
            setTimeout(() => {
              if (window.InventoryModule && InventoryModule.showHybridUploadModal) {
                const isBarcode = text.includes('barcode') || text.includes('பார்கோடு') || text.includes('scan');
                const isVoice = text.includes('பொருள்') || text.includes('புதிய') || text.includes('சேர்');
                const tab = isBarcode ? 'barcode' : isVoice ? 'voice_visual' : 'csv';
                InventoryModule.showHybridUploadModal(tab);
              }
            }, 300);
          }
        }, 800);
        return;
      }
    }

    // 5. Intelligent Product Search (Strips both prefixes AND suffix verbs in Indian SOV languages)
    let searchQuery = text;

    // Strip prefix verbs
    searchQuery = searchQuery.replace(/^(search for|search|find|look for|show me|where is|open|show|dhoondo|khojo|khoj|thedu|thodangu|buscar|chercher|rechercher|zeig|cherche|खोजें|ढूंढें|காட்டு|தேடு|శోధించండి|చూపించు|ಹುಡುಕಿ|ತೋರಿಸಿ|തിരയുക|കാണിക്കുക|शोधा|খুঁজুন)\s+/gi, '');

    // Strip suffix verbs (SOV word order in Tamil, Hindi, Telugu, Kannada, etc.)
    searchQuery = searchQuery.replace(/\s+(search|find|dhoondo|khojo|khoj|thedu|thedugal|khujen|shodhinchi|chupinchu|huduki|thorisi|thirayuka|shodha|khunjun|खोजें|ढूंढें|दिखाएं|लाओ|खोलो|बताएं|தேடு|தேடுங்கள்|காட்டு|திற|எடு|शోధించండి|చూపించు|తెరువు|ಹುಡುಕಿ|ತೋರಿಸಿ|ತೆಗೆ|തിരയുക|കാണിക്കുക|തുറക്കുക|शोधा|दाखवा|उघडा|খুঁজুন|দেখান|খুলুন|please|kripya|தயவுசெய்து|దయచేసి|దయవిಟ್ಟು|por favor|s'il vous plaît)$/gi, '');

    searchQuery = searchQuery.trim();
    if (!searchQuery) searchQuery = text;

    const cleanQuery = searchQuery.toLowerCase();
    const queryWords = cleanQuery.split(/\s+/).filter(Boolean);

    const matchedProducts = DemoData.products.filter(p => {
      const pName = p.name.toLowerCase();
      const pSku = p.sku.toLowerCase();
      const pCat = p.category.toLowerCase();

      // Exact substring match
      if (pName.includes(cleanQuery) || pSku.includes(cleanQuery) || pCat.includes(cleanQuery)) {
        return true;
      }

      // Keyword match
      if (p.keywords && p.keywords.some(k => {
        const kl = k.toLowerCase();
        return kl === cleanQuery || kl.includes(cleanQuery) || cleanQuery.includes(kl);
      })) {
        return true;
      }

      // Word by word match
      return queryWords.some(w =>
        pName.includes(w) || (p.keywords && p.keywords.some(k => k.toLowerCase().includes(w) || w.includes(k.toLowerCase())))
      );
    });

    const msg = matchedProducts.length > 0
      ? getLocalizedVoiceMessage('searchFound', { count: matchedProducts.length, query: searchQuery })
      : getLocalizedVoiceMessage('searchFallback', { query: searchQuery });

    updateAssistantHudState('success', msg);
    speak(msg);

    setTimeout(() => {
      App.navigateTo('inventory');
      setTimeout(() => {
        const searchBox = document.querySelector('.topbar-search input');
        if (searchBox) searchBox.value = searchQuery;

        if (window.InventoryModule && InventoryModule.setSearch) {
          InventoryModule.setSearch(searchQuery);
        }
      }, 150);
      closeAssistantHud();
    }, 900);
  }

  function updateThemeDisplay(theme) {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.innerHTML = theme === 'dark' ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
    lucide.createIcons();
  }

  // ── Text-to-Speech (Audio Voice Output) with Chrome Utterance Fix ──
  function speak(text) {
    if (!isSpeakingEnabled || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel(); // Stop pending speech
      const utterance = new SpeechSynthesisUtterance(text);
      const langObj = I18n.getLanguageObj();
      utterance.lang = langObj.speechCode || 'en-IN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Select matched voice if available
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const matched = voices.find(v => v.lang === utterance.lang || v.lang.startsWith(langObj.code));
        if (matched) utterance.voice = matched;
      }

      // Delay to avoid Chrome bug where speak() drops audio right after cancel()
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 60);
    } catch (e) {
      console.warn('TTS error:', e);
    }
  }

  // ── Voice Assistant Visual HUD / Modal ──
  function openAssistantHud() {
    let overlay = document.getElementById('voiceAssistantModalOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'voiceAssistantModalOverlay';
      overlay.className = 'voice-modal-overlay';
      document.body.appendChild(overlay);
    }

    const langObj = I18n.getLanguageObj();
    const chips = quickChipsByLang[langObj.code] || quickChipsByLang.en;

    overlay.innerHTML = `
      <div class="voice-modal-card">
        <!-- Close button & Mute toggle -->
        <div class="voice-modal-top">
          <div class="voice-lang-badge">
            <span class="flag">${langObj.flag}</span>
            <span>${langObj.native} (${langObj.speechCode})</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <button class="voice-icon-btn ${isSpeakingEnabled ? 'active' : ''}" id="voiceAudioToggleBtn" title="Toggle Voice Response (Audio)">
              <i data-lucide="${isSpeakingEnabled ? 'volume-2' : 'volume-x'}"></i>
            </button>
            <button class="voice-icon-btn" id="voiceCloseBtn" title="Close Assistant">
              <i data-lucide="x"></i>
            </button>
          </div>
        </div>

        <!-- Glowing Central Animated Clickable Orb -->
        <div class="voice-orb-container">
          <div class="voice-orb pulse-active" id="voiceOrb" title="Tap to start / stop speaking">
            <i data-lucide="mic" class="orb-icon"></i>
            <div class="sound-wave wave-1"></div>
            <div class="sound-wave wave-2"></div>
            <div class="sound-wave wave-3"></div>
          </div>
        </div>

        <!-- Status & Transcript -->
        <div class="voice-status-area">
          <div class="voice-state-title" id="voiceStateTitle">${I18n.t('voiceListening')}</div>
          <div class="voice-transcript-text" id="voiceTranscriptText">
            ${I18n.t('voiceSpeakNow')}
          </div>
          <div class="voice-action-pill" id="voiceActionPill" style="display:none"></div>
        </div>

        <!-- Fallback Typed Command Input (Works even without microphone hardware) -->
        <div class="voice-text-fallback-box">
          <div class="voice-input-row" style="display:flex;gap:8px;align-items:center">
            <input type="text" id="voiceCommandInput" placeholder="Type a voice command (e.g. பால் தேடு, दूध खोजें, Low Stock)..." style="flex:1;padding:8px 12px;border:1px solid var(--border-color);border-radius:var(--border-radius);background:var(--bg-input);color:var(--text-primary);font-size:0.8125rem">
            <button id="voiceCommandSubmitBtn" class="btn btn-sm btn-primary" style="white-space:nowrap">Run</button>
          </div>
        </div>

        <!-- Quick Voice Command Chips -->
        <div class="voice-chips-section">
          <div class="voice-chips-label">Quick Voice Commands (Click to simulate or speak):</div>
          <div class="voice-chips-container">
            ${chips.map(chip => `
              <button class="voice-chip" data-cmd="${chip.cmd}">
                <i data-lucide="${chip.icon}"></i> ${chip.label}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    overlay.classList.add('active');
    lucide.createIcons();

    // Bind event listeners
    document.getElementById('voiceCloseBtn')?.addEventListener('click', closeAssistantHud);

    // Click Orb to toggle listening on/off
    document.getElementById('voiceOrb')?.addEventListener('click', () => {
      if (isListening) {
        stopListening();
        updateAssistantHudState('idle', 'Listening paused. Tap the orb or speak to resume.');
      } else {
        startListening();
      }
    });

    // Toggle Audio
    document.getElementById('voiceAudioToggleBtn')?.addEventListener('click', () => {
      isSpeakingEnabled = !isSpeakingEnabled;
      const btn = document.getElementById('voiceAudioToggleBtn');
      if (btn) {
        btn.classList.toggle('active', isSpeakingEnabled);
        btn.innerHTML = `<i data-lucide="${isSpeakingEnabled ? 'volume-2' : 'volume-x'}"></i>`;
        lucide.createIcons();
      }
    });

    // Fallback typed command submit
    const submitTyped = () => {
      const input = document.getElementById('voiceCommandInput');
      if (input && input.value.trim()) {
        const cmd = input.value.trim();
        updateAssistantTranscript(cmd, true);
        processVoiceCommand(cmd);
        input.value = '';
      }
    };

    document.getElementById('voiceCommandSubmitBtn')?.addEventListener('click', submitTyped);
    document.getElementById('voiceCommandInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitTyped();
      }
    });

    // Quick Command Chips
    overlay.querySelectorAll('.voice-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const cmd = chip.dataset.cmd;
        updateAssistantTranscript(cmd, true);
        processVoiceCommand(cmd);
      });
    });

    // Close on overlay click outside card
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeAssistantHud();
      }
    });
  }

  function closeAssistantHud() {
    stopListening();
    const overlay = document.getElementById('voiceAssistantModalOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  function updateAssistantHudState(type, message) {
    const title = document.getElementById('voiceStateTitle');
    const pill = document.getElementById('voiceActionPill');
    const orb = document.getElementById('voiceOrb');

    if (title) {
      if (type === 'listening') {
        title.textContent = I18n.t('voiceListening');
        title.style.color = 'var(--color-primary)';
        if (orb) orb.className = 'voice-orb pulse-active';
      } else if (type === 'processing') {
        title.textContent = 'Analyzing Voice Input...';
        title.style.color = 'var(--color-info)';
        if (orb) orb.className = 'voice-orb processing';
      } else if (type === 'success') {
        title.textContent = 'Command Matched';
        title.style.color = 'var(--color-success)';
        if (orb) orb.className = 'voice-orb success';
      } else if (type === 'idle') {
        title.textContent = 'Tap Orb to Speak';
        title.style.color = 'var(--text-secondary)';
        if (orb) orb.className = 'voice-orb';
      } else if (type === 'error' || type === 'unsupported') {
        title.textContent = 'Voice Assistant Note';
        title.style.color = 'var(--color-warning)';
        if (orb) orb.className = 'voice-orb';
      }
    }

    if (pill) {
      pill.style.display = 'inline-flex';
      pill.textContent = message;
    }
  }

  function updateAssistantTranscript(text, isFinal) {
    const transcriptEl = document.getElementById('voiceTranscriptText');
    if (transcriptEl && text) {
      transcriptEl.innerHTML = `<span style="color:var(--text-primary);font-weight:600">"${text}"</span>`;
    }
  }

  return {
    init,
    startListening,
    stopListening,
    openAssistantHud,
    closeAssistantHud,
    processVoiceCommand,
    speak,
  };
})();

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', VoiceAssistant.init);
