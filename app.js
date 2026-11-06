(() => {
  "use strict";

  const data = window.EXAM_DATA;
  Object.assign(data.glossary, window.HISTORICAL_GLOSSARY || {});
  Object.assign(data.glossary, window.DOCX_GLOSSARY || {});
  Object.assign(data.glossary, window.EXAM_GLOSSARY || {});
  Object.assign(data.glossary, window.EXACT_GLOSSARY || {});
  const supplements = window.EXAM_SUPPLEMENTS || {};
  const offlineDictionary = window.OFFLINE_DICTIONARY || {};
  const clozeFallbackTranslations = window.CLOZE_FALLBACK_TRANSLATIONS || {};
  const clozePhraseOverrides = window.CLOZE_PHRASE_OVERRIDES || {};
  const questionTranslations = window.QUESTION_TRANSLATIONS || {};
  const offlinePhraseIndex = {};
  Object.entries(offlineDictionary).forEach(([phrase, entry]) => {
    if (!entry.phrase || !entry.senses?.length) return;
    phrase.split(/\s+/).map(normalizeWord).filter(Boolean).forEach(word => {
      (offlinePhraseIndex[word] ||= []).push(phrase);
    });
  });
  const sourceExams = {...(window.HISTORICAL_EXAMS || {}), ...(window.DOCX_EXAMS || {})};
  const hiddenAnswerSections = {};
  const exams = Object.fromEntries(Object.entries(sourceExams).map(([year, exam]) => {
    hiddenAnswerSections[year] = (exam.sections || []).filter(section => /答案.*解析|解析.*答案/.test(`${section.title} ${section.nav}`));
    return [year, {...exam, sections: (exam.sections || []).filter(section => !/答案.*解析|解析.*答案/.test(`${section.title} ${section.nav}`))}];
  }));
  Object.entries(window.PARAGRAPH_TRANSLATIONS || {}).forEach(([year, sections]) => {
    const exam = exams[year];
    if (!exam) return;
    Object.entries(sections).forEach(([sectionIndex, paragraphs]) => {
      const section = exam.sections?.[Number(sectionIndex)];
      if (!section) return;
      Object.entries(paragraphs).forEach(([paragraphIndex, translation]) => {
        const paragraph = section.paragraphs?.[Number(paragraphIndex)];
        if (paragraph?.en && !paragraph.zh && translation) paragraph.zh = translation;
      });
    });
  });
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const paper = $("#paper");
  const nav = $("#sectionNav");
  const popover = $("#wordPopover");
  const storageKey = "yanci-english-ii-vocabulary";
  const phoneticStorageKey = "yanci-phonetic-cache";
  const dictionaryStorageKey = "yanci-dictionary-cache-v4";
  const sentenceTranslationStorageKey = "yanci-sentence-translation-cache";
  const studyIntervals = [0, 1, 2, 4, 7, 15, 30].map(days => days * 86400000);
  const autoKeyWords = new Set(`abstractly inevitable accumulation associated decline possibility lifestyle immunity excess attributable aerobic mediterranean processed justify fares grimly ritual imposing burden inflation successive subsidise commute stockbroker travails infrastructure trumpeting substantial compensation disruption pledged indefinitely cramped incompetently nationalisation vengeance deforestation turnaround antipoverty conditional inequality alleviation degradation causality instituted tropical satellite makeshift inclement harvests transferability commonalities historian reevaluate preoccupied ancestors prudery portraiture sitters stiffly absently exposure notoriously daguerreotype limbs contemplate instantaneous spontaneous dignity cheesy maxim dentistry hygiene toothy gnashers tramps damning broadband advocates incentive affiliated lifeblood pushback regulatory resolution neutrality eliminated authority conglomerate expense imposed caps unanimously upheld deregulating concurring unhinged intervene anachronism preempt undermine abdication meddling sinister upend automation impending unconscious bias analytics optimize outperform premiums assess watershed enrollment fascism expansion manifests proportion peculiar governance socialization faculty predominantly postgraduate norms apprenticeship empowerment caravanserais roadside inns enclosed pilgrims merchant restoration thieves subjected strategically informal commodities wares ruins sympathises sector resisting standards panic dispute dismiss misguided strategist policymakers curricula prominent consensus slanted sponsored regulate rentals inventory urgency developers swaths vacancy unchecked legislature coalition affordable cyclical crux bypass mandates levy registration retailer thriller standoff credit retiring spokesperson availability stock surpassed midlist merger unaligned bidding advances conformity concentration cartels agencies clout negotiate consolidating plurality casualty recordkeepers perceived citations accumulates prestige conspire inflate algorithm suspicious disproportionately predatory consultancies contributors outlets accrue insidious rampant criterion malpractice oblige renowned landscape iconic expedition basin meteorologist zoologist mineralogist preserving exploiting settlers conservation magnificence vivid capitalize reproductions visualization collodion portable darkroom crude majestic portraits traversed flora fauna entourage astounding legislation designation preferences celebrities emotionally subsequent interpersonal creativity narrative simulate accessible regulated automated restricted nonintrusive banners frequency sensitive critical`.split(/\s+/));
  const examPhrases = ["have to do with", "levels out", "be associated with", "be attributable to", "as the years went by", "on the grounds that", "bear the cost", "with a vengeance", "in short order", "break the cycle of", "be correlated with", "cause and effect", "regardless of", "make up", "allude to", "at the expense of", "in the wake of", "once and for all", "in relation to", "cut down on", "give rise to", "place strains on", "as well as", "apart from", "instead of", "such as", "along with", "so that", "even if", "in case", "as a result", "with regard to", "in spite of", "in line with", "stock up on", "take off", "buy up", "make money off", "rein in", "do one's utmost", "rely on", "in terms of", "take on", "steer clear of", "rather than", "capitalize on", "in quick succession", "play a key role", "put out", "lead to"];
  const commonUsage = {
    communities: ["local communities：当地社区", "rural communities：农村社区", "many communities：许多社区", "small communities：小型社区", "religious communities：宗教团体", "community initiatives：社区倡议", "sustainable communities：可持续社区", "community-based prevention：社区预防"],
    community: ["local community：当地社区", "rural community：农村社区", "community services：社区服务", "community initiatives：社区倡议", "community development：社区发展", "community-based prevention：社区预防"],
    survey: ["conduct / carry out a survey：开展调查", "a scientific survey：科学勘察", "survey data：调查数据", "survey results：调查结果", "survey respondents：调查对象", "survey the site / area：勘测现场 / 地区"],
    erode: ["erode trust / confidence：削弱信任 / 信心", "erode the foundation：侵蚀基础", "be eroded by：被……侵蚀", "gradually erode：逐渐削弱"],
    eroded: ["have eroded：已经侵蚀 / 削弱", "be eroded by：被……侵蚀", "eroded a natural barrier：侵蚀了一道天然屏障", "eroded trust / confidence：削弱了信任 / 信心"],
    relatively: ["relatively speaking：相对而言", "relatively easy / inexpensive：相对容易 / 便宜", "relative to：相对于；与……有关"],
    relevant: ["be relevant to：与……有关", "highly / directly relevant：高度 / 直接相关", "relevant information：相关信息"],
    prone: ["be prone to sth / doing：容易……；有……倾向", "error-prone：容易出错的", "accident-prone：易出事故的"],
    ensure: ["ensure that ...：确保……", "ensure the safety / quality of：确保……的安全 / 质量", "ensure access to：确保有机会获得 / 使用……", "ensure compliance with：确保遵守……"],
    available: ["be available to sb：可供某人使用", "be available for：可用于……", "readily / widely available：容易获得 / 广泛可得"],
    alien: ["be alien to：与……格格不入；为……所不熟悉", "alien species：外来物种"],
    suspended: ["suspend sth：暂停 / 中止某事", "be suspended from：被暂停参加；被停职 / 停学", "suspend judgment：暂不作判断", "suspended sentence：缓刑"],
    transferred: ["transfer A to B：把 A 转移到 B", "be transferred to：被调往；被转移到"],
    resumed: ["resume work / talks：恢复工作 / 会谈", "resume doing：重新开始做"],
    canceled: ["cancel an order / appointment：取消订单 / 预约", "be canceled due to：因……被取消"],
    preserved: ["preserve sth from：保护……免受", "well-preserved：保存完好的"],
    preserve: ["preserve cultural heritage：保护文化遗产", "preserve sth from：保护……免受"],
    comprised: ["be comprised of：由……组成", "comprise sth：包含；构成（通常不用 of）"],
    dependent: ["be dependent on：依赖；取决于", "financially dependent：经济上依赖的"],
    robust: ["robust evidence / system：有力证据 / 稳健系统", "robust growth：强劲增长"],
    diverse: ["a diverse range of：多种多样的", "culturally diverse：文化多元的"],
    marginal: ["marginal effect / improvement：轻微影响 / 改善", "marginal cost：边际成本"],
    associated: ["be associated with：与……相关", "associate A with B：把 A 与 B 联系起来"],
    attributable: ["be attributable to：可归因于……", "attribute A to B：把 A 归因于 B"],
    decline: ["a decline in：……的下降", "decline to do：拒绝做", "decline by / to：下降了 / 降至"],
    effect: ["have an effect on：对……有影响", "take effect：生效", "in effect：实际上；生效中"],
    altered: ["alter the way / structure：改变方式 / 结构", "remain largely unaltered：基本保持不变"],
    suggesting: ["suggest that ...：表明 / 建议……", "suggest doing：建议做（不用 suggest to do）"],
    predicting: ["predict that ...：预测……", "be predicted to：据预测将……"],
    isolated: ["be isolated from：与……隔绝", "an isolated incident：孤立事件"],
    under: ["under construction / pressure：在建设中 / 在压力下", "under the surface：在表面之下"],
    via: ["via email / the Internet：通过邮件 / 网络", "travel via：经由……旅行"]
  };
  const localPhonetics = {...(window.OFFLINE_PHONETICS || {}),
    relatively:"/ˈrelətɪvli/", relevant:"/ˈreləvənt/", prone:"/proʊn/", available:"/əˈveɪləbəl/", alien:"/ˈeɪliən/",
    accidentally:"/ˌæksɪˈdentəli/", frequently:"/ˈfriːkwəntli/", gradually:"/ˈɡrædʒuəli/", temporarily:"/ˌtempəˈrerəli/",
    disguised:"/dɪsˈɡaɪzd/", submerged:"/səbˈmɜːrdʒd/", relocated:"/ˌriːloʊˈkeɪtɪd/", isolated:"/ˈaɪsəleɪtɪd/",
    legends:"/ˈledʒəndz/", programs:"/ˈproʊɡræmz/", remains:"/rɪˈmeɪnz/", surroundings:"/səˈraʊndɪŋz/",
    across:"/əˈkrɔːs/", off:"/ɔːf/", under:"/ˈʌndər/", via:"/ˈvaɪə/", currents:"/ˈkɜːrənts/", rivers:"/ˈrɪvərz/", seasons:"/ˈsiːzənz/", winds:"/wɪndz/",
    elevated:"/ˈeləveɪtɪd/", separated:"/ˈsepəreɪtɪd/", comprised:"/kəmˈpraɪzd/", protected:"/prəˈtektɪd/",
    gathering:"/ˈɡæðərɪŋ/", restoring:"/rɪˈstɔːrɪŋ/", updating:"/ˌʌpˈdeɪtɪŋ/", supplying:"/səˈplaɪɪŋ/",
    when:"/wen/", until:"/ənˈtɪl/", after:"/ˈæftər/", once:"/wʌns/", belongings:"/bɪˈlɔːŋɪŋz/", resources:"/ˈriːsɔːrsɪz/", products:"/ˈprɑːdʌkts/", structures:"/ˈstrʌktʃərz/",
    preserve:"/prɪˈzɜːrv/", select:"/sɪˈlekt/", display:"/dɪˈspleɪ/", examining:"/ɪɡˈzæmɪnɪŋ/", despite:"/dɪˈspaɪt/", unlike:"/ˌʌnˈlaɪk/", besides:"/bɪˈsaɪdz/", among:"/əˈmʌŋ/",
    unchallenged:"/ʌnˈtʃælɪndʒd/", unknown:"/ˌʌnˈnoʊn/", unorganized:"/ʌnˈɔːrɡənaɪzd/", undisturbed:"/ˌʌndɪˈstɜːrbd/",
    suspended:"/səˈspendɪd/", transferred:"/trænsˈfɜːrd/", resumed:"/rɪˈzuːmd/", canceled:"/ˈkænsəld/",
    policies:"/ˈpɑːləsiz/", theories:"/ˈθɪəriz/", documents:"/ˈdɑːkjəmənts/", techniques:"/tekˈniːks/",
    ordered:"/ˈɔːrdərd/", provided:"/prəˈvaɪdɪd/", employed:"/ɪmˈplɔɪd/", adjusted:"/əˈdʒʌstɪd/",
    effect:"/ɪˈfekt/", light:"/laɪt/", reality:"/riˈæləti/", mind:"/maɪnd/", crossed:"/krɔːst/", connected:"/kəˈnektɪd/", blocked:"/blɑːkt/", altered:"/ˈɔːltərd/",
    expecting:"/ɪkˈspektɪŋ/", suggesting:"/səˈdʒestɪŋ/", predicting:"/prɪˈdɪktɪŋ/", recalling:"/rɪˈkɔːlɪŋ/",
    robust:"/roʊˈbʌst/", diverse:"/daɪˈvɜːrs/", marginal:"/ˈmɑːrdʒɪnəl/", dependent:"/dɪˈpendənt/"
  };
  const localDefinitions = {
    relatively: [{part:"adverb", text:"To a certain degree when compared with something else; comparatively."}],
    relevant: [{part:"adjective", text:"Closely connected with the subject or situation being discussed."}],
    suspended: [{part:"verb / adjective", text:"Temporarily stopped, delayed, or prevented from continuing or being in force."}],
    survey: [{part:"noun / verb", text:"A detailed examination or investigation; to examine and record the features or opinions of a group, place, or subject."}],
    community: [{part:"noun", text:"A group of people living in the same place or sharing a particular characteristic."}],
    communities: [{part:"plural noun", text:"Groups of people who live in the same area or share common interests, identities, or characteristics."}],
    erode: [{part:"verb", text:"To wear away gradually, or to weaken something such as trust, power, or confidence over time."}],
    eroded: [{part:"verb", text:"Gradually wore away or weakened something over time."}]
  };

  const hashMatch = location.hash.match(/#(20\d{2})-section-(\d+)/);
  let currentYear = hashMatch && exams[hashMatch[1]] ? hashMatch[1] : "2025";
  let currentExam = exams[currentYear];
  let sectionIndex = Math.max(0, Math.min(currentExam.sections.length - 1, hashMatch ? Number(hashMatch[2]) : 0));
  let selectedWord = null;
  let savedWords = loadWords();
  let phoneticCache = loadJson(phoneticStorageKey);
  let dictionaryCache = loadJson(dictionaryStorageKey);
  let sentenceTranslationCache = loadJson(sentenceTranslationStorageKey);
  const dictionaryRequests = new Map();
  let glossVisible = true;
  let translationVisible = true;
  let paragraphUsageVisibleAll = false;
  let optionTranslationVisible = false;
  let studyQueue = [];
  let studyPosition = 0;
  let dictationQueue = [];
  let dictationPosition = 0;
  let dictationMode = "keyboard";
  let dictationDirection = "zh-en";
  let readingQueue = [];
  let readingPosition = 0;
  let readingActive = false;

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
  }

  function normalizeWord(word = "") {
    return word.toLowerCase().replace(/[’]/g, "'").replace(/^[^a-z]+|[^a-z-]+$/g, "");
  }

  function usablePhonetic(value = "") {
    return Boolean(value && !/不可用|暂无|加载/.test(value));
  }

  function loadJson(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch { return {}; }
  }

  function getOfflineEntry(word = "") {
    const key = String(word).toLowerCase().replace(/[’]/g, "'").trim().replace(/\s+/g, " ");
    return offlineDictionary[key] || null;
  }

  function offlineEntryWithLemma(word = "") {
    const raw = normalizeWord(word);
    const exact = getOfflineEntry(raw);
    if (exact) return exact;
    const candidates = [];
    if (raw.endsWith("'s")) candidates.push(raw.slice(0, -2));
    if (raw.endsWith("ies")) candidates.push(raw.slice(0, -3) + "y");
    if (raw.endsWith("ied")) candidates.push(raw.slice(0, -3) + "y");
    if (raw.endsWith("ing")) {
      const stem = raw.slice(0, -3);
      candidates.push(stem, `${stem}e`, stem.replace(/([b-df-hj-np-tv-z])\1$/, "$1"));
    }
    if (raw.endsWith("ed")) {
      const stem = raw.slice(0, -2);
      candidates.push(stem, raw.slice(0, -1), stem.replace(/([b-df-hj-np-tv-z])\1$/, "$1"));
    }
    if (raw.endsWith("es")) candidates.push(raw.slice(0, -2), raw.slice(0, -1));
    if (raw.endsWith("s")) candidates.push(raw.slice(0, -1));
    if (raw.endsWith("er")) candidates.push(raw.slice(0, -2), raw.slice(0, -1));
    if (raw.endsWith("est")) candidates.push(raw.slice(0, -3), raw.slice(0, -2));
    if (raw.endsWith("ly")) candidates.push(raw.slice(0, -2));
    if (raw.includes("-")) candidates.push(...raw.split("-").reverse());
    for (const candidate of [...new Set(candidates)].filter(Boolean)) {
      const entry = getOfflineEntry(candidate);
      if (entry) return entry;
    }
    return null;
  }

  function compoundPhonetic(word = "") {
    const pieces = normalizeWord(word).split("-").filter(Boolean);
    if (pieces.length < 2) return "";
    const phonetics = pieces.map(piece => localPhonetics[piece] || (getOfflineEntry(piece)?.phonetic ? `/${getOfflineEntry(piece).phonetic.replace(/^\/+|\/+$/g, "")}/` : ""));
    if (phonetics.some(value => !value)) return "";
    return `/${phonetics.map(value => value.replace(/^\/+|\/+$/g, "")).join(" ")}/`;
  }

  function entryChinese(entry) {
    return entry?.senses?.map(item => item.meaning).filter(Boolean).join("；") || "";
  }

  function compactContextMeaning(value = "", limit = 3) {
    const parts = String(value)
      .replace(/[\r\n]+/g, " ")
      .split(/[；;，,]/)
      .map(item => item.trim())
      .filter(Boolean);
    return [...new Set(parts)].slice(0, limit).join("；");
  }

  function lookup(word, local = {}) {
    const raw = normalizeWord(word);
    if (!raw) return "";
    if (local[raw]) return compactContextMeaning(local[raw]);
    if (data.glossary[raw]) return compactContextMeaning(data.glossary[raw]);
    const directEntry = getOfflineEntry(raw) || offlineEntryWithLemma(raw);
    if (entryChinese(directEntry)) return compactContextMeaning(entryChinese(directEntry), 1);
    const candidates = [];
    if (raw.endsWith("'s")) candidates.push(raw.slice(0, -2));
    if (raw.endsWith("ies")) candidates.push(raw.slice(0, -3) + "y");
    if (raw.endsWith("es")) candidates.push(raw.slice(0, -2));
    if (raw.endsWith("s")) candidates.push(raw.slice(0, -1));
    if (raw.endsWith("ing")) candidates.push(raw.slice(0, -3), raw.slice(0, -3) + "e");
    if (raw.endsWith("ed")) candidates.push(raw.slice(0, -2), raw.slice(0, -1));
    for (const key of candidates) {
      if (local[key]) return compactContextMeaning(local[key]);
      if (data.glossary[key]) return compactContextMeaning(data.glossary[key]);
      const entry = getOfflineEntry(key);
      if (entryChinese(entry)) return compactContextMeaning(entryChinese(entry), 1);
    }
    if (/^[a-d]$/i.test(String(word).trim())) return "选项字母";
    if (/^[A-Z]{2,}$/.test(String(word).trim())) return "缩写";
    if (/^[A-Z][a-z]+(?:[-'][A-Za-z]+)*$/.test(String(word).trim())) return "专有名词";
    if (raw.includes("-")) {
      const compound = raw.split("-").map(part => {
        const entry = getOfflineEntry(part) || offlineEntryWithLemma(part);
        return conciseMeaning(entryChinese(entry) || data.glossary[part] || "");
      }).filter(Boolean);
      if (compound.length === raw.split("-").length) return compound.join("·");
    }
    if (raw.length === 1) return "字母标记";
    if (raw.includes("-")) return `复合词：${raw}`;
    return /^[A-Z]/.test(String(word)) ? `专有名词：${word}` : `原文词：${word}`;
  }

  function wordHTML(word, paragraph = {}, context = "", example = "", exampleTranslation = "") {
    const key = normalizeWord(word);
    const meaning = lookup(word, paragraph.gloss || {});
    const marked = (paragraph.marked || []).some(item => normalizeWord(item) === key) || autoKeyWords.has(key);
    const phraseWords = (paragraph.phrases || []).flatMap(item => item.toLowerCase().split(/\s+/)).map(normalizeWord);
    const phrase = phraseWords.includes(key);
    const saved = Boolean(savedWords[key]);
    const classes = ["word-wrap", marked ? "marked" : "", phrase ? "phrase" : "", saved ? "saved" : ""].filter(Boolean).join(" ");
    return `<span class="${classes}" tabindex="0" role="button" data-word="${escapeHtml(word)}" data-key="${escapeHtml(key)}" data-meaning="${escapeHtml(meaning)}" data-context="${escapeHtml(context)}" data-example="${escapeHtml(example)}" data-example-translation="${escapeHtml(exampleTranslation)}"><span class="word">${escapeHtml(word)}</span><span class="gloss">${escapeHtml(meaning)}</span></span>`;
  }

  function renderWords(text, paragraph = {}, context = "", forcedExample = "", forcedExampleTranslation = "") {
    const source = String(text);
    const autoPhrases = examPhrases.filter(phrase => source.toLowerCase().includes(phrase));
    const enrichedParagraph = {...paragraph, phrases: [...(paragraph.phrases || []), ...autoPhrases]};
    const sentences = splitSentences(source);
    const chineseSentences = splitChineseSentences(paragraph.zh || "");
    const tokens = String(text).match(/[A-Za-z]+(?:[’'\-][A-Za-z]+)*|\d+(?:[,.]\d+)*(?:st|nd|rd|th)?|[^A-Za-z\d\s]+/g) || [];
    return tokens.map(token => {
      if (/^[A-Za-z]/.test(token)) {
        const key = normalizeWord(token);
        const sentenceIndex = forcedExample ? -1 : sentences.findIndex(sentence => new RegExp(`\\b${key.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i").test(sentence));
        const example = forcedExample || sentences[sentenceIndex] || source.slice(0, 420);
        const exampleTranslation = forcedExampleTranslation || (sentenceIndex >= 0 ? chineseSentences[sentenceIndex] || "" : "");
        return wordHTML(token, enrichedParagraph, context, example, exampleTranslation);
      }
      if (/^\d/.test(token)) return `<span class="word-wrap"><span class="word">${escapeHtml(token)}</span><span class="gloss"></span></span>`;
      return `<span class="punct">${escapeHtml(token)}</span>`;
    }).join(" ");
  }

  const syntaxSignals = {
    that: "名词性从句或定语从句标记",
    which: "非限定/限定性定语从句标记",
    who: "指人的定语从句标记",
    whose: "所属关系定语从句标记",
    where: "地点状语或定语从句标记",
    when: "时间状语或定语从句标记",
    while: "时间、让步或对比关系",
    although: "让步关系：虽然",
    though: "让步关系：尽管",
    because: "原因关系：因为",
    since: "原因或时间起点",
    if: "条件关系：如果",
    unless: "条件关系：除非",
    whether: "是否；让步选择结构",
    as: "时间、原因、方式或比较关系",
    but: "转折关系",
    and: "并列或递进关系",
    yet: "转折关系",
    however: "转折衔接",
    therefore: "因果结论",
    despite: "让步关系",
    by: "方式；by doing 常表示手段"
  };

  function splitSentences(text) {
    const sourceText = String(text);
    const protectedText = sourceText
      .replace(/\b(?:[A-Za-z]\.){2,}/g, (match, offset) => {
        const followedByNewSentence = /^\s+[A-Z]/.test(sourceText.slice(offset + match.length));
        const body = followedByNewSentence ? match.slice(0, -1) : match;
        return body.replace(/\./g, "§") + (followedByNewSentence ? "." : "");
      })
      .replace(/\b(Mr|Mrs|Ms|Dr|Prof|St|vs|etc)\./gi, match => match.replace(".", "§"));
    return protectedText.match(/[^.!?]+(?:[.!?]+[”"']?|$)/g)?.map(sentence => sentence.replace(/§/g, ".").trim()).filter(Boolean) || [];
  }

  function splitChineseSentences(text) {
    return String(text).match(/[^。！？；]+[。！？；]?/g)?.map(sentence => sentence.trim()).filter(Boolean) || [];
  }

  function sentenceSignals(sentence) {
    const lower = sentence.toLowerCase();
    return Object.keys(syntaxSignals).filter(signal => new RegExp(`\\b${signal}\\b`, "i").test(lower));
  }

  function isLongSentence(sentence) {
    const words = sentence.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) || [];
    return words.length >= 25 || (words.length >= 18 && sentenceSignals(sentence).length >= 2);
  }

  function syntaxChunks(sentence) {
    const signals = Object.keys(syntaxSignals).join("|");
    const parts = sentence.split(new RegExp(`(\\b(?:${signals})\\b|[,;:])`, "gi"));
    return parts.map(part => {
      const key = part.toLowerCase();
      return syntaxSignals[key] ? `<em>${escapeHtml(part)}</em>` : escapeHtml(part);
    }).join(" <span aria-hidden=\"true\">｜</span> ");
  }

  function paragraphUsageItems(paragraph) {
    const source = String(paragraph.en || "").toLowerCase().replace(/[’]/g, "'");
    const items = [];
    const add = (english, chinese, score = 0) => {
      if (!english || !chinese) return;
      const normalized = english.toLowerCase().trim();
      if (!source.includes(normalized)) return;
      items.push({english: normalized, chinese: conciseMeaning(chinese), score});
    };
    Object.values(commonUsage).flat().forEach(item => {
      const separator = item.indexOf("：");
      if (separator > 0 && !item.slice(0, separator).includes("/")) add(item.slice(0, separator), item.slice(separator + 1), 100);
    });
    [...(paragraph.phrases || []), ...examPhrases.filter(phrase => source.includes(phrase))].forEach(phrase => {
      const entry = getOfflineEntry(phrase);
      const chinese = entryChinese(entry) || translateCollocation(phrase, {key:"", meaning:""});
      if (chinese) add(phrase, chinese, 90 + (entry?.rank || 0));
    });
    const tokens = (source.match(/[a-z]+(?:['-][a-z]+)*/g) || []).map(normalizeWord);
    for (let size = 4; size >= 2; size -= 1) {
      for (let index = 0; index + size <= tokens.length; index += 1) {
        const phrase = tokens.slice(index, index + size).join(" ");
        const entry = getOfflineEntry(phrase);
        if (entry?.phrase && entry.senses?.length) add(phrase, entryChinese(entry), 50 + size * 3 + (entry.rank || 0));
      }
    }
    if (items.length < 4) {
      for (let index = 0; index + 1 < tokens.length; index += 1) {
        const first = getOfflineEntry(tokens[index]);
        const second = getOfflineEntry(tokens[index + 1]);
        const pattern = (first?.part?.includes("形容词") && second?.part?.includes("名词")) ||
          (first?.part?.includes("副词") && second?.part?.includes("形容词")) ||
          ((first?.part?.includes("动词") || first?.part?.includes("及物动词")) && second?.part?.includes("名词"));
        if (!pattern) continue;
        const phrase = `${tokens[index]} ${tokens[index + 1]}`;
        const chinese = translateCollocation(phrase, {key:"", meaning:""});
        if (chinese) add(phrase, chinese, 20);
      }
    }
    const unique = [];
    const seen = new Set();
    items.sort((a, b) => b.score - a.score || b.english.split(" ").length - a.english.split(" ").length).forEach(item => {
      if (seen.has(item.english) || unique.some(existing => existing.english.includes(item.english) && existing.english !== item.english)) return;
      seen.add(item.english);
      unique.push(item);
    });
    return unique.slice(0, 6);
  }

  function renderParagraphUsage(paragraph) {
    const items = paragraphUsageItems(paragraph);
    if (!items.length) return "";
    const openClass = paragraphUsageVisibleAll ? " open" : "";
    const expanded = String(paragraphUsageVisibleAll);
    const label = paragraphUsageVisibleAll ? "收起本段固定搭配与词汇用法" : "显示本段固定搭配与词汇用法";
    const indicator = paragraphUsageVisibleAll ? "▴" : "▾";
    return `<div class="paragraph-usage-tools${openClass}"><button class="paragraph-usage-toggle" aria-expanded="${expanded}"><span class="usage-toggle-label">${label}</span><span class="usage-indicator" aria-hidden="true">${indicator}</span></button><div class="paragraph-usage-panel"><div class="paragraph-usage"><h4>本段固定搭配与词汇用法</h4>${items.map(item => `<p>• <b>${escapeHtml(item.english)}</b>：${escapeHtml(item.chinese)}</p>`).join("")}</div></div></div>`;
  }

  function setParagraphUsageOpen(tools, open) {
    if (!tools) return;
    tools.classList.toggle("open", open);
    const button = $(".paragraph-usage-toggle", tools);
    if (!button) return;
    button.setAttribute("aria-expanded", String(open));
    $(".usage-toggle-label", button).textContent = open ? "收起本段固定搭配与词汇用法" : "显示本段固定搭配与词汇用法";
    $(".usage-indicator", button).textContent = open ? "▴" : "▾";
  }

  function syncParagraphUsageMaster() {
    const master = $("#toggleParagraphUsage");
    const tools = $$(".paragraph-usage-tools", paper);
    master.disabled = !tools.length;
    if (!tools.length) {
      $("span", master).textContent = "无";
      paragraphUsageVisibleAll = false;
      return;
    }
    const openCount = tools.filter(item => item.classList.contains("open")).length;
    paragraphUsageVisibleAll = openCount === tools.length;
    $("span", master).textContent = paragraphUsageVisibleAll ? "开" : openCount ? "部分" : "关";
  }

  function renderSyntaxTools(paragraph) {
    const longSentences = splitSentences(paragraph.en).filter(isLongSentence);
    if (!longSentences.length) return "";
    const items = longSentences.map(sentence => {
      const signals = sentenceSignals(sentence);
      const signalText = signals.length ? signals.map(signal => `${signal}：${syntaxSignals[signal]}`).join("；") : "以标点和谓语动词划分层次";
      const readingOrder = signals.length
        ? `先读第一个从句标记前的主干，再依次处理 ${signals.join(" → ")} 引出的附加信息，最后把修饰成分放回被修饰对象。`
        : "先找主句的主语和谓语，再处理逗号后的补充、并列或修饰成分。";
      return `<div class="syntax-item"><p class="syntax-sentence">${escapeHtml(sentence)}</p><div class="syntax-grid"><b>结构切分</b><span class="syntax-chunks">${syntaxChunks(sentence)}</span><b>连接信号</b><span>${escapeHtml(signalText)}</span><b>理解顺序</b><span>${escapeHtml(readingOrder)}</span>${paragraph.zh ? `<b>参考理解</b><span>${escapeHtml(paragraph.zh)}</span>` : ""}</div></div>`;
    }).join("");
    return `<div class="sentence-tools"><button class="syntax-toggle" aria-expanded="false">长难句解析 · ${longSentences.length} 句 ▾</button><div class="syntax-panel">${items}</div></div>`;
  }

  function renderQuestion(question, sectionTitle) {
    const options = question.options.map(([letter, en, zh]) => `
      <div class="option">
        <div class="option-en"><strong>[${letter}]</strong> ${renderWords(en, {}, sectionTitle, en, zh || "")}</div>
        ${zh ? `<div class="option-cn">${escapeHtml(zh)}</div>` : ""}
      </div>`).join("");
    return `<article class="question-card">
      <div class="question-stem">${question.n}. ${renderWords(question.stem, {}, sectionTitle, question.stem, question.zh || "")}${question.zh ? `<span class="stem-translation">${escapeHtml(question.zh)}</span>` : ""}</div>
      <div class="options">${options}</div>
    </article>`;
  }

  function readingQuestionStart(text = "") {
    const value = String(text).trim();
    if (/^(?:2[1-9]|3\d|40)\s*[.．、)]?\s+/.test(value)) return true;
    const words = value.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) || [];
    if (words.length > 60) return false;
    if (/\?\s*$/.test(value) || /\s(?:\.{1,}|_{2,})\s*$/.test(value)) return true;
    return /^(?:According to|Based on|Which|What|Why|How|The author|The phrase|The word|It can be inferred|It is indicated|By saying|From paragraph|In paragraph|The most appropriate|The main purpose|The text suggests|We can infer|One reason|The last paragraph|It can be learned|The passage)/i.test(value);
  }

  function translatedQuestionParagraph(sectionIndexValue, paragraphIndex, paragraph) {
    return paragraph.zh || questionTranslations[currentYear]?.[sectionIndexValue]?.[paragraphIndex] || "";
  }

  function deriveReadingData(section, sectionIndexValue) {
    const paragraphs = section.paragraphs || [];
    const firstQuestion = paragraphs.findIndex((paragraph, index) => index > 0 && readingQuestionStart(paragraph.en));
    if (firstQuestion < 0) return {passageParagraphs: paragraphs, questions: []};
    const passageParagraphs = paragraphs.slice(0, firstQuestion).filter(paragraph => {
      const text = String(paragraph.en || "").trim();
      return text && text.toLowerCase() !== section.title.toLowerCase() && !/^Directions?:?$/i.test(text);
    });
    const questions = [];
    let cursor = firstQuestion;
    const baseNumber = 21 + Math.max(0, Number(section.title.match(/[1-4]/)?.[0] || 1) - 1) * 5;
    while (cursor < paragraphs.length) {
      const stemRecord = paragraphs[cursor];
      if (!readingQuestionStart(stemRecord.en)) { cursor += 1; continue; }
      const numberMatch = String(stemRecord.en).match(/^\s*((?:2[1-9]|3\d|40))\s*[.．、)]?\s*/);
      const number = Number(numberMatch?.[1] || baseNumber + questions.length);
      const stem = String(stemRecord.en).replace(/^\s*(?:2[1-9]|3\d|40)\s*[.．、)]?\s*/, "").trim();
      const stemZh = translatedQuestionParagraph(sectionIndexValue, cursor, stemRecord);
      cursor += 1;
      const options = [];
      while (cursor < paragraphs.length && options.length < 4 && !readingQuestionStart(paragraphs[cursor].en)) {
        const optionRecord = paragraphs[cursor];
        const expectedLetter = String.fromCharCode(65 + options.length);
        const letterMatch = String(optionRecord.en).match(/^\s*\[?([A-D])\]?\s*[.．、:：)]?\s*/i);
        const letter = (letterMatch?.[1] || expectedLetter).toUpperCase();
        const optionText = String(optionRecord.en).replace(/^\s*\[?[A-D]\]?\s*[.．、:：)]?\s*/i, "").trim();
        const optionZh = translatedQuestionParagraph(sectionIndexValue, cursor, optionRecord);
        options.push([letter, optionText, optionZh]);
        cursor += 1;
      }
      if (options.length === 4) questions.push({n: number, stem, zh: stemZh, options});
    }
    return {passageParagraphs, questions};
  }

  function renderReadingSection(section, sectionIndexValue) {
    const reading = deriveReadingData(section, sectionIndexValue);
    const passage = reading.passageParagraphs.map((paragraph, index) => `<article class="para-block"><div class="english-line">${renderWords(paragraph.en, paragraph, `${currentYear} · ${section.title}`)}</div>${paragraph.zh ? `<p class="translation"><strong>第${index + 1}段译文：</strong>${escapeHtml(paragraph.zh)}</p>` : ""}${renderParagraphUsage(paragraph)}${renderSyntaxTools(paragraph)}</article>`).join("");
    const questions = reading.questions.length ? `<section class="reading-questions"><h3>阅读理解题</h3>${reading.questions.map(question => renderQuestion(question, section.title)).join("")}</section>` : "";
    return `<div class="passage">${passage}</div>${questions}`;
  }

  function stripEmbeddedClozeOptions(text = "") {
    return String(text).replace(/\s+1\s*[.．、]\s*\[\s*A\s*\][\s\S]*$/i, "").trim();
  }

  function clozeOptionParts(text = "") {
    const pattern = /\[\s*([A-D])\s*\]|(?<![A-Za-z])([A-D])\s*[.．、](?=\s|[A-Za-z])/g;
    const matches = [...String(text).matchAll(pattern)];
    return matches.map((match, index) => ({
      letter: match[1] || match[2],
      value: String(text).slice(match.index + match[0].length, matches[index + 1]?.index ?? String(text).length).trim()
    }));
  }

  function deriveClozeData(section) {
    const passageParagraphs = [];
    const rows = [];
    let current = null;
    let optionArea = false;
    let nextNumber = 1;

    for (const paragraph of section.paragraphs || []) {
      const text = paragraph.en || "";
      const parts = clozeOptionParts(text);
      if (!optionArea && parts.length < 2) {
        passageParagraphs.push(paragraph);
        continue;
      }
      if (!parts.length) continue;
      optionArea = true;
      const explicitNumber = Number(text.match(/^\s*(\d{1,2})\s*[.．、]?/)?.[1] || 0);

      if (parts.length > 4 && parts.length % 4 === 0 && parts.slice(0, parts.length / 4).every(item => item.letter === "A")) {
        const count = parts.length / 4;
        for (let index = 0; index < count; index += 1) {
          rows.push({
            n: nextNumber++,
            choices: {
              A: parts[index]?.value || "",
              B: parts[count + index]?.value || "",
              C: parts[count * 2 + index]?.value || "",
              D: parts[count * 3 + index]?.value || ""
            }
          });
        }
        current = null;
        continue;
      }

      if (parts.length === 4 && new Set(parts.map(item => item.letter)).size === 4) {
        const choices = Object.fromEntries(parts.map(item => [item.letter, item.value]));
        const n = explicitNumber || nextNumber;
        rows.push({n, choices});
        nextNumber = Math.max(nextNumber, n + 1);
        current = null;
        continue;
      }

      if (parts[0]?.letter === "A" || explicitNumber) {
        if (current && Object.keys(current.choices).length === 4) rows.push(current);
        current = {n: explicitNumber || nextNumber, choices: {}};
      }
      current ||= {n: nextNumber, choices: {}};
      parts.forEach(item => { current.choices[item.letter] = item.value; });
      if (Object.keys(current.choices).length === 4) {
        rows.push(current);
        nextNumber = Math.max(nextNumber, current.n + 1);
        current = null;
      }
    }

    if (current && Object.keys(current.choices).length === 4) rows.push(current);
    const answers = Array(20).fill("");
    const answerParagraphs = (hiddenAnswerSections[currentYear] || []).flatMap(section => section.paragraphs || []);
    for (const paragraph of answerParagraphs) {
      for (const match of paragraph.en.matchAll(/(?:^|\s)(\d{1,2})\s*[.．、]?\s*([A-D])(?=\s|$)/g)) {
        const number = Number(match[1]);
        if (number >= 1 && number <= 20) answers[number - 1] ||= match[2];
      }
    }
    return {passageParagraphs, options: rows.slice(0, 20), answers: answers.some(Boolean) ? answers : []};
  }

  function renderCloze(section, cloze) {
    let html = "";
    if (cloze.sourcePages?.length) {
      html += `<p class="scan-notice">本年份完形采用真题原页，选项顺序与 PDF 完全一致。</p><div class="scan-stack">${cloze.sourcePages.map((page, i) => `<img class="scan-page" src="${escapeHtml(page)}" alt="${currentYear} 年完形填空第 ${i + 1} 页" loading="lazy">`).join("")}</div>`;
    } else {
      const paragraphs = (cloze.passageParagraphs || section.paragraphs || []).map(paragraph => ({
        ...paragraph,
        en: stripEmbeddedClozeOptions(paragraph.en),
        zh: stripEmbeddedClozeOptions(paragraph.zh)
      })).filter(paragraph => paragraph.en);
      const optionGlossary = (window.CLOZE_TRANSLATIONS || {})[currentYear] || {};
      const passage = cloze.passage || paragraphs.map(item => item.en).join(" ");
      if (paragraphs.length) {
        html += `<div class="cloze-passage passage">${paragraphs.map((paragraph, i) => {
          const enriched = {...paragraph, gloss: {...(paragraph.gloss || {})}};
          return `<article class="para-block"><div class="english-line">${renderWords(paragraph.en, enriched, `${currentYear} · 完形填空`)}</div>${paragraph.zh ? `<p class="translation"><strong>第${i + 1}段译文：</strong>${escapeHtml(paragraph.zh)}</p>` : ""}${renderParagraphUsage(enriched)}${renderSyntaxTools(paragraph)}</article>`;
        }).join("")}</div>`;
      } else if (passage) {
        const passageParagraphs = String(passage).split(/\n\s*\n/).map(en => en.trim()).filter(Boolean);
        html += `<div class="cloze-passage passage">${passageParagraphs.map(en => {
          const paragraph = {en, gloss: optionGlossary};
          return `<article class="para-block"><div class="english-line">${renderWords(en, paragraph, `${currentYear} · 完形填空`)}</div>${renderParagraphUsage(paragraph)}${renderSyntaxTools(paragraph)}</article>`;
        }).join("")}</div>`;
      }
      if (cloze.options?.length) {
        const clozeSentenceRecords = paragraphs.flatMap(paragraph => {
          const english = splitSentences(paragraph.en);
          const chinese = splitChineseSentences(paragraph.zh || "");
          return english.map((sentence, index) => ({sentence, translation: chinese[index] || ""}));
        });
        html += `<div class="cloze-toolbar"><button class="cloze-translation-toggle">${optionTranslationVisible ? "隐藏全部选项中文" : "一键显示全部选项中文"}</button><span>每个选项仍可单独点击查看完整词典卡</span></div><div class="cloze-options" aria-label="完形填空选项">${cloze.options.map(row => `<div class="cloze-row"><b class="cloze-number">${row.n}.</b>${["A", "B", "C", "D"].map(letter => {
          const choice = row.choices[letter] || "";
          const choiceKey = choice.toLowerCase().replace(/\s+/g, " ").trim();
          const translated = choiceKey.includes(" ")
            ? clozePhraseOverrides[choiceKey] || optionGlossary[choiceKey] || clozeFallbackTranslations[choiceKey] || lookup(choice)
            : lookup(choice) || optionGlossary[choiceKey] || clozeFallbackTranslations[choiceKey];
          const answerLetter = cloze.answers?.[row.n - 1];
          const correctChoice = row.choices[answerLetter] || "";
          const escapedCorrect = correctChoice.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
          const sourceRecord = clozeSentenceRecords.find(item => correctChoice && new RegExp(`\\b${escapedCorrect}\\b`, "i").test(item.sentence));
          const sourceSentence = sourceRecord?.sentence || "";
          const optionExample = sourceSentence ? sourceSentence.replace(new RegExp(`\\b${escapedCorrect}\\b`, "i"), choice) : choice;
          return `<div class="cloze-choice"><div><strong>[${letter}]</strong> ${renderWords(choice, {}, `${currentYear} · 完形第 ${row.n} 题`, optionExample, sourceRecord?.translation || "")}${translated ? `<span class="cloze-choice-zh">${escapeHtml(translated)}</span>` : ""}</div></div>`;
        }).join("")}</div>`).join("")}</div>`;
      }
    }
    return html;
  }

  function renderSection(index, shouldScroll = true) {
    sectionIndex = index;
    const section = currentExam.sections[index];
    location.hash = `${currentYear}-section-${index}`;
    $("#sectionEyebrow").textContent = section.eyebrow;
    $("#sectionTitle").textContent = section.title;
    $("#sectionIntro").textContent = section.intro;

    const paperHeading = section.kind === "scan" ? section.title : `英语二 ${currentYear} 年 ${section.title}`;
    const paperSubtitle = section.kind === "scan" ? "高清原卷 · 原页浏览" : "逐词精读 · 点击任意单词朗读 · 长难句按需展开";
    let html = `<h2 class="paper-title">${escapeHtml(paperHeading)}</h2><p class="paper-subtitle">${paperSubtitle}</p>`;
    const supplement = supplements[currentYear] || {};
    const isCloze = section.title === "Use of English";
    const isReadingText = /^Text\s*[1-4]$/i.test(section.title);
    const isTranslation = /Translation/i.test(section.title);
    const isWriting = section.title === "Writing";
    const cloze = isCloze ? {...deriveClozeData(section), ...(supplement.cloze || {})} : null;
    if (isCloze && (cloze.options?.length || cloze.sourcePages?.length)) {
      html += renderCloze(section, cloze);
    } else if (isReadingText) {
      html += renderReadingSection(section, index);
    } else if (section.kind === "scan") {
      const scanNotice = currentYear === "2023" ? "这份解析版采用双栏英汉对照排版。为避免 PDF 文字层错序，按题型保留高清原页。" : "这份原卷为纯扫描 PDF。为避免 OCR 错字，页面按原貌高清呈现；其余文字版年份可逐词点击与展开长难句。";
      html += `<p class="scan-notice">${scanNotice}</p><div class="scan-stack">${section.pages.map((page, i) => `<img class="scan-page" src="${escapeHtml(page)}" alt="${currentYear} 年真题第 ${i + 1} 页" loading="lazy">`).join("")}</div>`;
    } else {
      html += `<div class="passage">`;
      (section.paragraphs || []).forEach((paragraph, i) => {
        html += `<article class="para-block"><div class="english-line">${renderWords(paragraph.en, paragraph, `${currentYear} · ${section.title}`)}</div>${paragraph.zh ? `<p class="translation"><strong>第${i + 1}段译文：</strong>${escapeHtml(paragraph.zh)}</p>` : ""}${renderParagraphUsage(paragraph)}${renderSyntaxTools(paragraph)}</article>`;
      });
      html += `</div>`;
    }
    if (section.images?.length) {
      html += `<div class="exam-images">${section.images.map((image, i) => `<figure><img src="${escapeHtml(image)}" alt="${currentYear} 年 ${escapeHtml(section.title)} 配图 ${i + 1}" loading="lazy"><figcaption>${currentYear} 年真题原图</figcaption></figure>`).join("")}</div>`;
    }
    if (section.questions) html += section.questions.map(q => renderQuestion(q, section.title)).join("");
    paper.innerHTML = html;
    paper.classList.toggle("hide-gloss", !glossVisible);
    paper.classList.toggle("hide-translation", !translationVisible);
    paper.classList.toggle("show-option-translation", optionTranslationVisible);
    syncParagraphUsageMaster();
    $$(".nav-item").forEach((item, i) => item.classList.toggle("active", i === index));
    $("#prevButton").disabled = index === 0;
    $("#nextButton").disabled = index === currentExam.sections.length - 1;
    $("#progressValue").textContent = "0%";
    closePopover();
    if (shouldScroll) window.scrollTo({top: 0, behavior: "smooth"});
  }

  function buildNav() {
    nav.innerHTML = "";
    let currentGroup = "";
    currentExam.sections.forEach((section, index) => {
      if (section.group !== currentGroup) {
        const label = document.createElement("div");
        label.className = "nav-group";
        label.textContent = section.group;
        nav.appendChild(label);
        currentGroup = section.group;
      }
      const button = document.createElement("button");
      button.className = "nav-item";
      button.innerHTML = `${escapeHtml(section.nav)} <span>${String(index + 1).padStart(2, "0")}</span>`;
      button.addEventListener("click", () => {
        renderSection(index);
        closeCompactPanels();
      });
      nav.appendChild(button);
    });
  }

  function buildYearPicker() {
    const select = $("#yearSelect");
    select.innerHTML = Object.keys(exams).sort((a, b) => Number(b) - Number(a)).map(year => `<option value="${year}" ${year === currentYear ? "selected" : ""}>${year}</option>`).join("");
    $("#yearValue").textContent = currentYear;
  }

  function switchYear(year) {
    if (!exams[year]) return;
    currentYear = year;
    currentExam = exams[year];
    sectionIndex = 0;
    $("#yearValue").textContent = year;
    buildNav();
    renderSection(0);
  }

  function speak(word, onEnd) {
    if (!("speechSynthesis" in window)) {
      showToast("当前浏览器不支持语音朗读");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.82;
    utterance.pitch = 1;
    const voices = speechSynthesis.getVoices();
    utterance.voice = voices.find(v => /^en-(GB|US)/.test(v.lang)) || voices.find(v => v.lang.startsWith("en")) || null;
    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }
    speechSynthesis.speak(utterance);
    return utterance;
  }

  function offlineDetailsFor(key, word) {
    const exactEntry = getOfflineEntry(word) || getOfflineEntry(key);
    const entry = exactEntry || offlineEntryWithLemma(word) || offlineEntryWithLemma(key);
    const fallbackMeaning = lookup(word || key);
    if (!entry && !localDefinitions[key]?.length && !localPhonetics[key] && !fallbackMeaning) return null;
    const definitions = entry?.definitions?.length ? entry.definitions : [...(localDefinitions[key] || [])];
    return {
      phonetic: localPhonetics[key] || (entry?.phonetic ? `/${entry.phonetic.replace(/^\/+|\/+$/g, "")}/` : compoundPhonetic(word || key)),
      part: entry?.part || "",
      senses: entry?.senses?.length ? entry.senses : (fallbackMeaning ? [{pos: "常用义", meaning: fallbackMeaning}] : []),
      definitions,
      examples: [],
      synonyms: []
    };
  }

  function detailsPart(details = {}) {
    return details.part || [...new Set((details.senses || []).map(item => item.pos).filter(Boolean))].join(" / ") || [...new Set((details.definitions || []).map(item => item.part).filter(part => part && part !== "word"))].join(" / ");
  }

  function renderCommonMeanings(details, fallback = "") {
    const senses = details?.senses?.length ? details.senses : (fallback ? [{pos: detailsPart(details) || "常用义", meaning: fallback}] : []);
    return senses.slice(0, 6).map(item => `<div class="meaning-row"><b>${escapeHtml(item.pos || "常用义")}</b><span>${escapeHtml(item.meaning)}</span></div>`).join("");
  }

  function renderPopoverDetails(wordInfo, details) {
    const part = detailsPart(details);
    $("#popoverPartOfSpeech").textContent = part;
    $("#popoverPhonetic").textContent = details.phonetic || "";
    $("#popoverCommonMeanings").innerHTML = renderCommonMeanings(details, wordInfo.meaning);
    const definitions = details.definitions || [];
    $("#popoverUsageSection").hidden = !definitions.length;
    $("#popoverDefinitions").innerHTML = definitions.map(item => `<div class="definition-card"><b>${escapeHtml(String(item.part || "word").toUpperCase())}</b><p>${escapeHtml(item.text)}</p></div>`).join("");
    const usage = renderUsageDetails(wordInfo, details);
    $("#popoverDefinitionSection").hidden = !usage.length;
    $("#popoverUsage").innerHTML = usage.map(item => `<p>• ${escapeHtml(item)}</p>`).join("");
    return {part, usage};
  }

  function openPopover(target) {
    const rect = target.getBoundingClientRect();
    const cached = dictionaryCache[target.dataset.key] || {};
    selectedWord = {
      word: target.dataset.word,
      key: target.dataset.key,
      meaning: target.dataset.meaning || lookup(target.dataset.word) || cached.chinese || `原文词：${target.dataset.word}`,
      context: target.dataset.context || currentExam.sections[sectionIndex].title,
      example: target.dataset.example || "",
      exampleTranslation: target.dataset.exampleTranslation || ""
    };
    const immediateDetails = offlineDetailsFor(selectedWord.key, selectedWord.word) || {phonetic: usablePhonetic(phoneticCache[selectedWord.key]) ? phoneticCache[selectedWord.key] : "", senses: [], definitions: []};
    $("#popoverWord").textContent = selectedWord.word;
    $("#popoverMeaning").textContent = selectedWord.meaning;
    renderPopoverDetails(selectedWord, immediateDetails);
    const hasExample = Boolean(selectedWord.example && selectedWord.example.toLowerCase() !== selectedWord.word.toLowerCase());
    $("#popoverExamContextSection").hidden = !hasExample;
    $("#popoverExample").textContent = hasExample ? selectedWord.example : "";
    $("#popoverExampleTranslation").textContent = hasExample ? selectedWord.exampleTranslation : "";
    $("#popoverStar").classList.toggle("saved", Boolean(savedWords[selectedWord.key]));
    $("#popoverStar").textContent = savedWords[selectedWord.key] ? "★" : "☆";
    popover.classList.add("open");
    popover.setAttribute("aria-hidden", "false");
    const width = Math.min(430, window.innerWidth - 24);
    const left = Math.min(window.innerWidth - width - 12, Math.max(12, rect.left + rect.width / 2 - width / 2));
    const top = Math.max(78, Math.min(rect.bottom + 10, window.innerHeight - Math.min(640, window.innerHeight - 90)));
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
    popover.style.maxHeight = `${Math.max(240, window.innerHeight - top - 12)}px`;
    speak(selectedWord.word);
    loadRichWordDetails({...selectedWord});
  }

  async function fetchDictionaryDetails(key, word) {
    const offline = offlineDetailsFor(key, word);
    return offline || dictionaryCache[key] || {phonetic: localPhonetics[key] || "", part: "", senses: [], definitions: [], examples: [], synonyms: []};
  }

  async function ensureChineseMeaning(key, word, meaning) {
    if (meaning && meaning !== "释义加载中…") return meaning;
    return lookup(word) || lookup(key) || `原文词：${word}`;
  }

  async function ensureExampleTranslation(existing, example) {
    return existing || sentenceTranslationCache[example] || "";
  }

  function conciseMeaning(value = "") {
    return String(value).split(/[；;]/)[0].replace(/（.*?）|\(.*?\)/g, "").trim();
  }

  function translateCollocation(phrase, wordInfo) {
    const functionWords = {a:"", an:"", the:"", of:"的", to:"向", for:"用于", with:"与", from:"从", by:"被", in:"在", on:"关于", have:"已经", has:"已经", had:"已经"};
    let known = 0;
    const translated = phrase.split(/\s+/).map(token => {
      const key = normalizeWord(token);
      if (Object.prototype.hasOwnProperty.call(functionWords, key)) return functionWords[key];
      const meaning = key === wordInfo.key ? wordInfo.meaning : lookup(key);
      const short = conciseMeaning(meaning);
      if (short) known += 1;
      return short;
    }).filter(Boolean);
    const contentCount = phrase.split(/\s+/).filter(token => !Object.prototype.hasOwnProperty.call(functionWords, normalizeWord(token))).length;
    return known >= Math.max(1, Math.ceil(contentCount * .6)) ? translated.join("") : "";
  }

  function renderUsageDetails(wordInfo, details) {
    const curated = commonUsage[wordInfo.key] || [];
    if (curated.length) return curated.slice(0, 8);
    return [...new Set((offlinePhraseIndex[wordInfo.key] || []).sort((a, b) => (getOfflineEntry(b)?.rank || 0) - (getOfflineEntry(a)?.rank || 0)).map(phrase => {
      const entry = getOfflineEntry(phrase);
      const chinese = conciseMeaning(entryChinese(entry));
      return chinese ? `${phrase}：${chinese}` : "";
    }).filter(Boolean))].slice(0, 8);
  }

  async function loadRichWordDetails(wordInfo) {
    const [details, meaning, exampleTranslation] = await Promise.all([
      fetchDictionaryDetails(wordInfo.key, wordInfo.word),
      ensureChineseMeaning(wordInfo.key, wordInfo.word, wordInfo.meaning),
      ensureExampleTranslation(wordInfo.exampleTranslation, wordInfo.example)
    ]);
    if (selectedWord?.key !== wordInfo.key) return;
    selectedWord.meaning = meaning;
    selectedWord.phonetic = details.phonetic;
    selectedWord.part = detailsPart(details);
    selectedWord.senses = details.senses || [];
    selectedWord.definitions = details.definitions;
    selectedWord.usage = renderUsageDetails(wordInfo, details);
    selectedWord.exampleTranslation = exampleTranslation;
    $("#popoverMeaning").textContent = meaning;
    renderPopoverDetails(wordInfo, details);
    $("#popoverExampleTranslation").textContent = exampleTranslation;
    phoneticCache[wordInfo.key] = details.phonetic;
    localStorage.setItem(phoneticStorageKey, JSON.stringify(phoneticCache));
    if (savedWords[wordInfo.key]) {
      savedWords[wordInfo.key] = {...savedWords[wordInfo.key], meaning, phonetic: details.phonetic, part: selectedWord.part, senses: selectedWord.senses, definitions: details.definitions, usage: selectedWord.usage, exampleTranslation};
      localStorage.setItem(storageKey, JSON.stringify(savedWords));
      renderVocabulary();
    }
  }

  async function ensurePhonetic(key, word) {
    if (usablePhonetic(phoneticCache[key])) return phoneticCache[key];
    if (localPhonetics[key]) {
      phoneticCache[key] = localPhonetics[key];
      localStorage.setItem(phoneticStorageKey, JSON.stringify(phoneticCache));
      return localPhonetics[key];
    }
    const details = await fetchDictionaryDetails(key, word);
    phoneticCache[key] = details.phonetic;
    localStorage.setItem(phoneticStorageKey, JSON.stringify(phoneticCache));
    return details.phonetic;
  }

  function closePopover() {
    popover.classList.remove("open");
    popover.setAttribute("aria-hidden", "true");
  }

  function loadWords() {
    try { return JSON.parse(localStorage.getItem(storageKey)) || {}; }
    catch { return {}; }
  }

  function saveWords() {
    localStorage.setItem(storageKey, JSON.stringify(savedWords));
    renderVocabulary();
    $$(".word-wrap[data-key]").forEach(el => el.classList.toggle("saved", Boolean(savedWords[el.dataset.key])));
  }

  function toggleSelectedWord() {
    if (!selectedWord) return;
    if (savedWords[selectedWord.key]) {
      delete savedWords[selectedWord.key];
      showToast(`已移除 ${selectedWord.word}`);
    } else {
      savedWords[selectedWord.key] = {...selectedWord, phonetic: phoneticCache[selectedWord.key] || "", selected: true, studyStage: 0, nextReview: Date.now(), addedAt: Date.now()};
      showToast(`已收藏 ${selectedWord.word}`);
    }
    saveWords();
    $("#popoverStar").classList.toggle("saved", Boolean(savedWords[selectedWord.key]));
    $("#popoverStar").textContent = savedWords[selectedWord.key] ? "★" : "☆";
  }

  function renderVocabulary() {
    const list = Object.values(savedWords).sort((a, b) => b.addedAt - a.addedAt);
    $("#wordCount").textContent = list.length;
    $("#emptyHint").style.display = list.length ? "none" : "block";
    $("#clearWords").style.display = list.length ? "block" : "none";
    $("#vocabList").innerHTML = list.map(item => {
      const details = offlineDetailsFor(item.key, item.word) || {};
      const phonetic = usablePhonetic(item.phonetic) ? item.phonetic : (details.phonetic || localPhonetics[item.key] || "");
      const part = item.part || detailsPart(details);
      const commonMeaning = (item.senses?.length ? item.senses : details.senses || []).map(sense => sense.meaning).filter(Boolean).join("；") || item.meaning || "";
      return `<div class="vocab-item"><label class="vocab-select"><input type="checkbox" data-select-word="${escapeHtml(item.key)}" ${item.selected !== false ? "checked" : ""}><span></span></label><div class="vocab-copy"><strong>${escapeHtml(item.word)}</strong>${phonetic || part ? `<em>${escapeHtml([phonetic, part].filter(Boolean).join(" · "))}</em>` : ""}<span>${escapeHtml(commonMeaning)}</span></div><button data-remove="${escapeHtml(item.key)}" title="移除">×</button></div>`;
    }).join("");
    const selectedCount = list.filter(item => item.selected !== false).length;
    $("#selectionHint").textContent = list.length ? `已选 ${selectedCount} / ${list.length} 个，可用于导出和背诵。` : "";
  }

  function buildPrintSheet(list, direction, includeAnswers) {
    if (!list.length) {
      showToast("请至少选择一个要导出的生词");
      return false;
    }
    const date = new Intl.DateTimeFormat("zh-CN", {year:"numeric", month:"long", day:"numeric"}).format(new Date());
    const dictation = list.map((item, i) => `<div class="dictation-item"><span class="dictation-index">${i + 1}</span><span class="dictation-word ${direction === "zh-en" ? "dictation-chinese" : ""}">${escapeHtml(direction === "zh-en" ? item.meaning : item.word)}</span><span class="dictation-blank"></span></div>`).join("");
    const answers = list.map((item, i) => `<div class="answer-row"><span>${i + 1}. ${escapeHtml(item.word)}</span><strong>${escapeHtml(item.meaning)}</strong></div>`).join("");
    $("#printSheet").innerHTML = `<h1 class="print-title">2010-2025 考研英语二 · 生词默写</h1><div class="print-meta">姓名：__________　日期：${date}　共 ${list.length} 词　${direction === "zh-en" ? "中文 → 英文" : "英文 → 中文"}</div>${dictation}${includeAnswers ? `<section class="answer-page"><h2>中英参考释义</h2><div class="answer-grid">${answers}</div></section>` : ""}`;
    return true;
  }

  function sortedWords() {
    return Object.values(savedWords).sort((a, b) => a.word.localeCompare(b.word, "en"));
  }

  function renderWordSelector(container, selectedKeys) {
    const list = sortedWords();
    container.innerHTML = list.map(item => `<label class="word-select-row"><input type="checkbox" value="${escapeHtml(item.key)}" ${selectedKeys.has(item.key) ? "checked" : ""}><span><strong>${escapeHtml(item.word)}</strong><small>${escapeHtml(item.meaning)}</small></span></label>`).join("");
  }

  function selectedKeysFrom(container) {
    return new Set($$("input[type=checkbox]:checked", container).map(input => input.value));
  }

  function openModal(id) {
    const modal = $(`#${id}`);
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal(id) {
    if (id === "readAloudDialog") stopSequentialReading();
    const modal = $(`#${id}`);
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }

  function openExportDialog() {
    const list = sortedWords();
    if (!list.length) { showToast("生词本还是空的，先收藏几个单词吧"); return; }
    const selected = new Set(list.filter(item => item.selected !== false).map(item => item.key));
    renderWordSelector($("#exportWordList"), selected);
    updateExportCount();
    openModal("exportDialog");
  }

  function updateExportCount() {
    const count = $$("input:checked", $("#exportWordList")).length;
    $("#exportSelectionCount").textContent = `已选 ${count} 个`;
  }

  function openStudyDialog() {
    const list = sortedWords();
    if (!list.length) { showToast("生词本还是空的，先收藏几个单词吧"); return; }
    $("#studySetup").hidden = false;
    $("#studySession").hidden = true;
    renderWordSelector($("#studyWordList"), new Set(list.filter(item => item.selected !== false).map(item => item.key)));
    openModal("studyDialog");
  }

  function startStudySession() {
    const keys = selectedKeysFrom($("#studyWordList"));
    if (!keys.size) { showToast("请至少选择一个要背诵的生词"); return; }
    const now = Date.now();
    studyQueue = sortedWords().filter(item => keys.has(item.key)).sort((a, b) => {
      const aDue = (a.nextReview || 0) <= now ? 0 : 1;
      const bDue = (b.nextReview || 0) <= now ? 0 : 1;
      return aDue - bDue || (a.nextReview || 0) - (b.nextReview || 0);
    });
    studyPosition = 0;
    $("#studySetup").hidden = true;
    $("#studySession").hidden = false;
    renderStudyCard();
  }

  async function renderStudyCard() {
    if (studyPosition >= studyQueue.length) {
      showToast("本轮完成，复习时间已保存");
      closeModal("studyDialog");
      return;
    }
    const item = studyQueue[studyPosition];
    const details = await fetchDictionaryDetails(item.key, item.word);
    if (studyQueue[studyPosition]?.key !== item.key) return;
    const phonetic = details.phonetic || item.phonetic || phoneticCache[item.key] || "";
    const part = detailsPart(details);
    const hasExample = Boolean(item.example && item.example.toLowerCase() !== item.word.toLowerCase());
    const exampleTranslation = hasExample ? await ensureExampleTranslation(item.exampleTranslation, item.example) : "";
    $("#studyWord").textContent = item.word;
    $("#studyPhonetic").textContent = phonetic;
    $("#studyWordMeta").textContent = part;
    $("#studyExample").hidden = !hasExample;
    $("#studyExample").textContent = hasExample ? item.example : "";
    $("#studyExampleTranslation").hidden = !exampleTranslation;
    $("#studyExampleTranslation").textContent = exampleTranslation;
    $("#studyMeanings").innerHTML = `${renderCommonMeanings(details, item.meaning)}${item.meaning ? `<div class="meaning-row context-row"><b>语境义</b><span>${escapeHtml(item.meaning)}</span></div>` : ""}`;
    $("#studyAnswer").hidden = true;
    $("#studyRating").hidden = true;
    $("#revealStudyAnswer").hidden = false;
    $("#studyProgressText").textContent = `${studyPosition + 1} / ${studyQueue.length}`;
    $("#studyProgressBar").style.width = `${(studyPosition + 1) / studyQueue.length * 100}%`;
    speak(item.word);
    savedWords[item.key] = {...savedWords[item.key], phonetic, part, senses: details.senses || [], definitions: details.definitions || [], exampleTranslation};
    localStorage.setItem(storageKey, JSON.stringify(savedWords));
  }

  function rateStudy(rating) {
    const item = studyQueue[studyPosition];
    const saved = savedWords[item.key];
    if (!saved) return;
    if (rating === "again") saved.studyStage = 0;
    else saved.studyStage = Math.min((saved.studyStage || 0) + 1, studyIntervals.length - 1);
    saved.lastReviewed = Date.now();
    saved.nextReview = Date.now() + studyIntervals[rating === "again" ? 0 : saved.studyStage];
    localStorage.setItem(storageKey, JSON.stringify(savedWords));
    studyPosition += 1;
    renderStudyCard();
  }

  function defaultSelectedKeys() {
    return new Set(sortedWords().filter(item => item.selected !== false).map(item => item.key));
  }

  function openDictationDialog() {
    if (!sortedWords().length) { showToast("生词本还是空的，先收藏几个单词吧"); return; }
    $("#dictationSetup").hidden = false;
    $("#dictationSession").hidden = true;
    renderWordSelector($("#dictationWordList"), defaultSelectedKeys());
    updateDictationCount();
    openModal("dictationDialog");
  }

  function updateDictationCount() {
    const count = $$("input:checked", $("#dictationWordList")).length;
    $("#dictationSelectionCount").textContent = `已选 ${count} 个`;
  }

  function startDictationSession() {
    const keys = selectedKeysFrom($("#dictationWordList"));
    if (!keys.size) { showToast("请至少选择一个要默写的生词"); return; }
    dictationQueue = sortedWords().filter(item => keys.has(item.key));
    dictationPosition = 0;
    dictationMode = "keyboard";
    dictationDirection = $("input[name=practiceDirection]:checked").value;
    $("#dictationSetup").hidden = true;
    $("#dictationSession").hidden = false;
    renderDictationCard();
  }

  function renderDictationCard() {
    if (dictationPosition >= dictationQueue.length) {
      showToast("本轮默写完成");
      closeModal("dictationDialog");
      return;
    }
    const item = dictationQueue[dictationPosition];
    const englishPrompt = dictationDirection === "en-zh";
    $("#dictationPromptLabel").textContent = englishPrompt ? "请默写中文释义" : "请默写英文单词";
    $("#dictationPrompt").textContent = englishPrompt ? item.word : item.meaning;
    $("#dictationProgressText").textContent = `${dictationPosition + 1} / ${dictationQueue.length}`;
    $("#dictationProgressBar").style.width = `${(dictationPosition + 1) / dictationQueue.length * 100}%`;
    $("#dictationInput").value = "";
    $("#dictationReference").hidden = true;
    $("#dictationReference").textContent = "";
    $("#dictationRating").hidden = true;
    $("#checkDictation").hidden = false;
    $("#checkDictation").textContent = "检查 / 显示答案";
    setTimeout(() => {
      $("#dictationInput").focus();
      speak(item.word);
    }, 80);
  }

  async function checkDictationAnswer() {
    const item = dictationQueue[dictationPosition];
    if (!item) return;
    const answer = dictationDirection === "zh-en" ? item.word : item.meaning;
    let feedback = `参考答案：${answer}`;
    if (dictationMode === "keyboard" && dictationDirection === "zh-en") {
      const typed = normalizeWord($("#dictationInput").value.trim());
      feedback = typed === normalizeWord(item.word) ? `✓ 拼写正确：${item.word}` : `参考答案：${item.word}`;
    } else if (dictationMode === "keyboard" && !$("#dictationInput").value.trim()) {
      feedback = `尚未输入。参考答案：${answer}`;
    }
    $("#dictationReference").textContent = feedback;
    $("#dictationReference").hidden = false;
    $("#dictationRating").hidden = false;
    $("#checkDictation").hidden = true;
  }

  function nextDictationCard() {
    dictationPosition += 1;
    renderDictationCard();
  }

  function openReadAloudDialog() {
    if (!sortedWords().length) { showToast("生词本还是空的，先收藏几个单词吧"); return; }
    stopSequentialReading();
    renderWordSelector($("#readAloudWordList"), defaultSelectedKeys());
    $("#readNow").hidden = true;
    openModal("readAloudDialog");
  }

  function startSequentialReading() {
    const keys = selectedKeysFrom($("#readAloudWordList"));
    if (!keys.size) { showToast("请至少选择一个需要朗读的生词"); return; }
    readingQueue = sortedWords().filter(item => keys.has(item.key));
    readingPosition = 0;
    readingActive = true;
    $("#readNow").hidden = false;
    readNextWord();
  }

  function readNextWord() {
    if (!readingActive) return;
    if (readingPosition >= readingQueue.length) {
      readingActive = false;
      $("#readProgress").textContent = "朗读完成";
      showToast("所选生词已按顺序朗读完毕");
      return;
    }
    const item = readingQueue[readingPosition];
    $("#readProgress").textContent = `${readingPosition + 1} / ${readingQueue.length}`;
    $("#readCurrentWord").textContent = item.word;
    $("#readCurrentMeaning").textContent = item.meaning;
    $("#readCurrentPhonetic").textContent = item.phonetic || phoneticCache[item.key] || "";
    ensurePhonetic(item.key, item.word).then(phonetic => {
      if (readingActive && readingQueue[readingPosition]?.key === item.key) $("#readCurrentPhonetic").textContent = phonetic;
    });
    speak(item.word, () => {
      if (!readingActive) return;
      readingPosition += 1;
      setTimeout(readNextWord, 450);
    });
  }

  function stopSequentialReading() {
    readingActive = false;
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    if ($("#readProgress")) $("#readProgress").textContent = readingQueue.length ? "已停止" : "";
  }

  let toastTimer;
  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function updateProgress() {
    const rect = paper.getBoundingClientRect();
    const total = Math.max(1, rect.height - window.innerHeight * 0.45);
    const passed = Math.max(0, Math.min(total, -rect.top + 120));
    $("#progressValue").textContent = `${Math.round(passed / total * 100)}%`;
  }

  function syncCompactPanels() {
    const menuOpen = $("#sidebar").classList.contains("open");
    const toolsOpen = $("#topActions").classList.contains("open");
    const vocabOpen = $("#vocabPanel").classList.contains("open");
    $("#menuButton").setAttribute("aria-expanded", String(menuOpen));
    $("#toolsButton").setAttribute("aria-expanded", String(toolsOpen));
    $("#vocabButton").setAttribute("aria-expanded", String(vocabOpen));
    $("#drawerBackdrop").classList.toggle("open", menuOpen || toolsOpen || vocabOpen);
  }

  function closeCompactPanels(except = "") {
    if (except !== "menu") $("#sidebar").classList.remove("open");
    if (except !== "tools") $("#topActions").classList.remove("open");
    if (except !== "vocab") $("#vocabPanel").classList.remove("open");
    syncCompactPanels();
  }

  function toggleCompactPanel(name) {
    const selectors = {menu: "#sidebar", tools: "#topActions", vocab: "#vocabPanel"};
    const panel = $(selectors[name]);
    const shouldOpen = !panel.classList.contains("open");
    closeCompactPanels(name);
    panel.classList.toggle("open", shouldOpen);
    syncCompactPanels();
  }

  buildYearPicker();
  buildNav();
  renderVocabulary();
  renderSection(sectionIndex, false);

  paper.addEventListener("click", event => {
    const word = event.target.closest(".word-wrap[data-word]");
    if (word) { openPopover(word); return; }
    const answer = event.target.closest(".answer-toggle");
    if (answer) {
      const card = answer.closest(".question-card");
      card.classList.toggle("show-answer");
      answer.textContent = card.classList.contains("show-answer") ? "收起答案" : "查看答案与定位";
      return;
    }
    const syntax = event.target.closest(".syntax-toggle");
    if (syntax) {
      const tools = syntax.closest(".sentence-tools");
      tools.classList.toggle("open");
      const open = tools.classList.contains("open");
      syntax.setAttribute("aria-expanded", String(open));
      syntax.textContent = syntax.textContent.replace(/[▾▴]/, open ? "▴" : "▾");
      return;
    }
    const usageToggle = event.target.closest(".paragraph-usage-toggle");
    if (usageToggle) {
      const tools = usageToggle.closest(".paragraph-usage-tools");
      setParagraphUsageOpen(tools, !tools.classList.contains("open"));
      syncParagraphUsageMaster();
      return;
    }
    const supplementToggle = event.target.closest(".supplement-toggle");
    if (supplementToggle) {
      const block = supplementToggle.closest(".supplement-block");
      block.classList.toggle("open");
      const open = block.classList.contains("open");
      supplementToggle.setAttribute("aria-expanded", String(open));
      const indicator = $("span", supplementToggle);
      if (indicator) indicator.textContent = open ? "▴" : "▾";
      return;
    }
    const clozeTranslationToggle = event.target.closest(".cloze-translation-toggle");
    if (clozeTranslationToggle) {
      optionTranslationVisible = !optionTranslationVisible;
      paper.classList.toggle("show-option-translation", optionTranslationVisible);
      clozeTranslationToggle.textContent = optionTranslationVisible ? "隐藏全部选项中文" : "一键显示全部选项中文";
      $("#toggleOptionTranslation span").textContent = optionTranslationVisible ? "开" : "关";
    }
  });
  paper.addEventListener("keydown", event => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches(".word-wrap[data-word]")) openPopover(event.target);
  });
  document.addEventListener("click", event => {
    if (!event.target.closest("#wordPopover") && !event.target.closest(".word-wrap")) closePopover();
  });
  $("#popoverSpeak").addEventListener("click", () => selectedWord && speak(selectedWord.word));
  $("#popoverStar").addEventListener("click", toggleSelectedWord);
  $("#vocabList").addEventListener("click", event => {
    const key = event.target.dataset.remove;
    if (key) {
      delete savedWords[key];
      saveWords();
      return;
    }
    const selectedKey = event.target.dataset.selectWord;
    if (selectedKey && savedWords[selectedKey]) {
      savedWords[selectedKey].selected = event.target.checked;
      saveWords();
    }
  });
  $("#clearWords").addEventListener("click", () => {
    if (!confirm("确定清空全部生词吗？")) return;
    savedWords = {};
    saveWords();
    showToast("生词本已清空");
  });
  $("#toggleGloss").addEventListener("click", event => {
    glossVisible = !glossVisible;
    paper.classList.toggle("hide-gloss", !glossVisible);
    $("span", event.currentTarget).textContent = glossVisible ? "开" : "关";
  });
  $("#toggleTranslation").addEventListener("click", event => {
    translationVisible = !translationVisible;
    paper.classList.toggle("hide-translation", !translationVisible);
    $("span", event.currentTarget).textContent = translationVisible ? "开" : "关";
  });
  $("#toggleParagraphUsage").addEventListener("click", () => {
    const tools = $$(".paragraph-usage-tools", paper);
    if (!tools.length) return;
    const shouldOpen = !tools.every(item => item.classList.contains("open"));
    tools.forEach(item => setParagraphUsageOpen(item, shouldOpen));
    paragraphUsageVisibleAll = shouldOpen;
    syncParagraphUsageMaster();
  });
  $("#toggleOptionTranslation").addEventListener("click", event => {
    optionTranslationVisible = !optionTranslationVisible;
    paper.classList.toggle("show-option-translation", optionTranslationVisible);
    $("span", event.currentTarget).textContent = optionTranslationVisible ? "开" : "关";
    const inlineToggle = $(".cloze-translation-toggle", paper);
    if (inlineToggle) inlineToggle.textContent = optionTranslationVisible ? "隐藏全部选项中文" : "一键显示全部选项中文";
  });
  $("#selectAllWords").addEventListener("click", () => {
    Object.values(savedWords).forEach(item => { item.selected = true; });
    saveWords();
  });
  $("#unselectAllWords").addEventListener("click", () => {
    Object.values(savedWords).forEach(item => { item.selected = false; });
    saveWords();
  });
  $("#exportButton").addEventListener("click", openExportDialog);
  $("#exportWordList").addEventListener("change", updateExportCount);
  $("#exportSelectAll").addEventListener("click", () => {
    $$("input[type=checkbox]", $("#exportWordList")).forEach(input => { input.checked = true; });
    updateExportCount();
  });
  $("#exportSelectNone").addEventListener("click", () => {
    $$("input[type=checkbox]", $("#exportWordList")).forEach(input => { input.checked = false; });
    updateExportCount();
  });
  $("#confirmExport").addEventListener("click", () => {
    const keys = selectedKeysFrom($("#exportWordList"));
    const list = sortedWords().filter(item => keys.has(item.key));
    const direction = $("input[name=dictationDirection]:checked").value;
    if (!buildPrintSheet(list, direction, $("#includeAnswerSheet").checked)) return;
    closeModal("exportDialog");
    showToast("打印窗口中选择“另存为 PDF”即可导出");
    setTimeout(() => window.print(), 250);
  });
  $("#studyButton").addEventListener("click", openStudyDialog);
  $("#studySelectAll").addEventListener("click", () => {
    $$("input[type=checkbox]", $("#studyWordList")).forEach(input => { input.checked = true; });
  });
  $("#studySelectDue").addEventListener("click", () => {
    const now = Date.now();
    $$("input[type=checkbox]", $("#studyWordList")).forEach(input => {
      input.checked = (savedWords[input.value]?.nextReview || 0) <= now;
    });
  });
  $("#startStudy").addEventListener("click", startStudySession);
  $("#studySpeak").addEventListener("click", () => studyQueue[studyPosition] && speak(studyQueue[studyPosition].word));
  $("#revealStudyAnswer").addEventListener("click", () => {
    $("#studyAnswer").hidden = false;
    $("#studyRating").hidden = false;
    $("#revealStudyAnswer").hidden = true;
  });
  $("#studyRating").addEventListener("click", event => {
    if (event.target.dataset.rating) rateStudy(event.target.dataset.rating);
  });
  $("#dictationButton").addEventListener("click", openDictationDialog);
  $("#dictationWordList").addEventListener("change", updateDictationCount);
  $("#dictationSelectAll").addEventListener("click", () => {
    $$("input[type=checkbox]", $("#dictationWordList")).forEach(input => { input.checked = true; });
    updateDictationCount();
  });
  $("#startDictation").addEventListener("click", startDictationSession);
  $("#dictationSpeak").addEventListener("click", () => dictationQueue[dictationPosition] && speak(dictationQueue[dictationPosition].word));
  $("#checkDictation").addEventListener("click", checkDictationAnswer);
  $("#dictationInput").addEventListener("keydown", event => {
    if (event.key === "Enter") checkDictationAnswer();
  });
  $("#dictationRating").addEventListener("click", event => {
    if (event.target.dataset.dictationRating) nextDictationCard();
  });
  $("#readAloudButton").addEventListener("click", openReadAloudDialog);
  $("#readSelectAll").addEventListener("click", () => {
    $$("input[type=checkbox]", $("#readAloudWordList")).forEach(input => { input.checked = true; });
  });
  $("#startReading").addEventListener("click", startSequentialReading);
  $("#stopReading").addEventListener("click", stopSequentialReading);
  $$('[data-close-modal]').forEach(button => button.addEventListener("click", () => closeModal(button.dataset.closeModal)));
  $$(".modal").forEach(modal => modal.addEventListener("click", event => {
    if (event.target === modal) closeModal(modal.id);
  }));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      $$(".modal.open").forEach(modal => closeModal(modal.id));
      closeCompactPanels();
    }
  });
  $("#prevButton").addEventListener("click", () => sectionIndex > 0 && renderSection(sectionIndex - 1));
  $("#nextButton").addEventListener("click", () => sectionIndex < currentExam.sections.length - 1 && renderSection(sectionIndex + 1));
  $("#yearSelect").addEventListener("change", event => switchYear(event.target.value));
  $("#menuButton").setAttribute("aria-expanded", "false");
  $("#menuButton").addEventListener("click", () => toggleCompactPanel("menu"));
  $("#toolsButton").addEventListener("click", () => toggleCompactPanel("tools"));
  $("#vocabButton").addEventListener("click", () => toggleCompactPanel("vocab"));
  $("#drawerBackdrop").addEventListener("click", () => closeCompactPanels());
  $("#topActions").addEventListener("click", event => {
    if (event.target.closest("#studyButton, #exportButton")) closeCompactPanels();
  });
  $("#vocabPanel").addEventListener("click", event => {
    if (event.target.closest("#dictationButton, #readAloudButton")) closeCompactPanels();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 1180) closeCompactPanels();
  });
  window.addEventListener("scroll", updateProgress, {passive:true});
  window.addEventListener("hashchange", () => {
    const match = location.hash.match(/#(20\d{2})-section-(\d+)/);
    if (!match || !exams[match[1]]) return;
    const [, year, indexText] = match;
    const index = Number(indexText);
    if (year !== currentYear) {
      currentYear = year;
      currentExam = exams[year];
      $("#yearSelect").value = year;
      $("#yearValue").textContent = year;
      buildNav();
    }
    if (Number.isInteger(index) && index >= 0 && index < currentExam.sections.length && index !== sectionIndex) renderSection(index, false);
  });
})();
