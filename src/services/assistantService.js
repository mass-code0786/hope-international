const adminRepository = require('../repositories/adminRepository');
const walletRepository = require('../repositories/walletRepository');
const walletService = require('./walletService');

const SUPPORTED_LANGUAGES = new Set(['en', 'hi', 'ur', 'ar', 'bn', 'ps']);
const RTL_LANGUAGES = new Set(['ur', 'ar', 'ps']);

const STRATEGY_AMOUNTS = {
  plan_100: 100,
  plan_500: 500,
  plan_1000: 1000
};

const INTENT_KEYWORDS = {
  wallet_query: ['wallet', 'balance', 'fund', 'btct', 'वॉलेट', 'बैलेंस', 'वालेट', 'والٹ', 'بیلنس', 'محفظ', 'رصيد', 'ওয়ালেট', 'ব্যালেন্স', 'والټ', 'بیلانس'],
  income_query: ['income', 'earning', 'earnings', 'profit', 'commission', 'कमाई', 'इनकम', 'आय', 'آمدنی', 'کمائی', 'الدخل', 'الأرباح', 'আয়', 'ইনকাম', 'عاید'],
  level_income: ['level income', 'level earning', 'level bonus', 'लेवल', 'लेवल इनकम', 'لیول', 'لیول انکم', 'دخل المستوى', 'المستوى', 'লেভেল', 'লেভেল ইনকাম', 'لېول', 'لیول'],
  team_growth: ['team', 'binary', 'network', 'referral', 'left', 'right', 'टीम', 'बाइनरी', 'नेटवर्क', 'ٹیم', 'بائنری', 'نیٹ ورک', 'فريق', 'ثنائي', 'شبكة', 'টিম', 'বাইনারি', 'নেটওয়ার্ক', 'ټیم', 'باینري', 'شبکه'],
  withdrawal: ['withdraw', 'withdrawal', 'payout', 'cash out', 'निकाल', 'विड्रॉअल', 'निकासी', 'withdrawal', 'ودڈرال', 'نکالنا', 'سحب', 'سحب الأموال', 'উইথড্রয়াল', 'তোলা', 'وېستل', 'ویستل'],
  earning_strategy: ['plan', 'strategy', 'target', 'month', '/month', 'per month', '100', '500', '1000', 'प्लान', 'रणनीति', 'महीना', 'پلان', 'حکمت عملی', 'ماہانہ', 'خطة', 'استراتيجية', 'شهري', 'পরিকল্পনা', 'মাসিক', 'پلان', 'ستراتیژي', 'میاشت']
};

const COPY = {
  en: {
    suggestions: {
      wallet: 'Show my wallet',
      income: 'How much income did I earn?',
      withdraw: 'Can I withdraw now?',
      binary: 'Show my binary status',
      team: 'How is my team growing?',
      level: 'Show my level income',
      plan100: 'Give me a $100/month plan',
      plan500: 'Give me a $500/month plan',
      plan1000: 'Give me a $1000/month plan'
    },
    wallet: ({ name, total, income, deposit, withdrawal, btct }) => `${name}, your wallet balance is ${total}. It includes ${income} in income funds, ${deposit} in deposit funds, ${withdrawal} reserved for withdrawals, and ${btct} BTCT available.`,
    income: ({ name, total, direct, matching, level, latest }) => `${name}, your credited income is ${total}. Direct income is ${direct}, matching income is ${matching}, level income is ${level}, and your latest income credit was ${latest}.`,
    team: ({ name, total, left, right, active, inactive }) => `${name}, your team has ${total} members. Left side is ${left}, right side is ${right}, with ${active} active and ${inactive} inactive accounts.`,
    binary: ({ name, leftPv, rightPv, weakerLeg, matchedPv, binaryIncome }) => `${name}, your binary status shows ${leftPv} PV on the left and ${rightPv} PV on the right. Your weaker leg is ${weakerLeg}, matched PV is ${matchedPv}, and the latest binary income is ${binaryIncome}.`,
    level: ({ name, level, count }) => `${name}, your level income total is ${level} from ${count} credited level income records.`,
    withdrawal: ({ name, available, pending, lastStatus }) => `${name}, you can withdraw from ${available} right now. You have ${pending} in pending withdrawal requests, and the latest withdrawal status is ${lastStatus}.`,
    strategy: ({ name, target, teamTarget, activeNeed, note }) => `${name}, for a ${target}/month target, focus on ${teamTarget} in monthly team income and keep around ${activeNeed} active income-generating team members. ${note}`,
    overview: ({ name, total, income, team }) => `${name}, your wallet balance is ${total}, credited income is ${income}, and your team size is ${team}. Ask about wallet, income, binary status, team growth, withdrawals, or a monthly plan.`
  },
  hi: {
    suggestions: {
      wallet: 'मेरा वॉलेट दिखाओ',
      income: 'मेरी इनकम कितनी है?',
      withdraw: 'क्या मैं अभी withdrawal कर सकता हूँ?',
      binary: 'मेरा बाइनरी स्टेटस दिखाओ',
      team: 'मेरी टीम कैसे बढ़ रही है?',
      level: 'मेरा लेवल इनकम दिखाओ',
      plan100: 'मुझे $100/माह प्लान दो',
      plan500: 'मुझे $500/माह प्लान दो',
      plan1000: 'मुझे $1000/माह प्लान दो'
    },
    wallet: ({ name, total, income, deposit, withdrawal, btct }) => `${name}, आपके वॉलेट में कुल ${total} उपलब्ध हैं। इसमें ${income} इनकम फंड, ${deposit} डिपॉजिट फंड, ${withdrawal} withdrawal रिजर्व और ${btct} BTCT उपलब्ध है।`,
    income: ({ name, total, direct, matching, level, latest }) => `${name}, आपकी क्रेडिट हुई कुल इनकम ${total} है। डायरेक्ट इनकम ${direct}, मैचिंग इनकम ${matching}, लेवल इनकम ${level} है, और आपका नवीनतम इनकम क्रेडिट ${latest} था।`,
    team: ({ name, total, left, right, active, inactive }) => `${name}, आपकी टीम में ${total} सदस्य हैं। लेफ्ट साइड ${left}, राइट साइड ${right}, जिनमें ${active} एक्टिव और ${inactive} इनएक्टिव अकाउंट हैं।`,
    binary: ({ name, leftPv, rightPv, weakerLeg, matchedPv, binaryIncome }) => `${name}, आपके बाइनरी स्टेटस में लेफ्ट पर ${leftPv} PV और राइट पर ${rightPv} PV है। आपकी कमजोर लेग ${weakerLeg} है, मैच्ड PV ${matchedPv} है, और नवीनतम बाइनरी इनकम ${binaryIncome} है।`,
    level: ({ name, level, count }) => `${name}, आपकी कुल लेवल इनकम ${level} है और यह ${count} क्रेडिटेड लेवल इनकम रिकॉर्ड से आई है।`,
    withdrawal: ({ name, available, pending, lastStatus }) => `${name}, आप अभी ${available} तक withdrawal कर सकते हैं। आपकी pending withdrawal requests ${pending} हैं, और नवीनतम withdrawal status ${lastStatus} है।`,
    strategy: ({ name, target, teamTarget, activeNeed, note }) => `${name}, ${target}/माह के लक्ष्य के लिए लगभग ${teamTarget} मासिक टीम इनकम पर ध्यान दें और करीब ${activeNeed} एक्टिव इनकम देने वाले टीम सदस्यों को बनाए रखें। ${note}`,
    overview: ({ name, total, income, team }) => `${name}, आपके वॉलेट में ${total} है, क्रेडिटेड इनकम ${income} है, और आपकी टीम साइज ${team} है। आप वॉलेट, इनकम, बाइनरी स्टेटस, टीम ग्रोथ, withdrawal या मासिक प्लान के बारे में पूछ सकते हैं।`
  },
  ur: {
    suggestions: {
      wallet: 'میرا والٹ دکھائیں',
      income: 'میری آمدنی کتنی ہے؟',
      withdraw: 'کیا میں ابھی withdrawal کر سکتا ہوں؟',
      binary: 'میرا بائنری اسٹیٹس دکھائیں',
      team: 'میری ٹیم کی گروتھ دکھائیں',
      level: 'میری لیول انکم دکھائیں',
      plan100: 'مجھے $100 ماہانہ پلان دیں',
      plan500: 'مجھے $500 ماہانہ پلان دیں',
      plan1000: 'مجھے $1000 ماہانہ پلان دیں'
    },
    wallet: ({ name, total, income, deposit, withdrawal, btct }) => `${name}، آپ کے والٹ میں کل ${total} موجود ہیں۔ اس میں ${income} انکم فنڈ، ${deposit} ڈپازٹ فنڈ، ${withdrawal} withdrawal ریزرو، اور ${btct} BTCT دستیاب ہے۔`,
    income: ({ name, total, direct, matching, level, latest }) => `${name}، آپ کی کل کریڈٹ شدہ آمدنی ${total} ہے۔ ڈائریکٹ انکم ${direct}، میچنگ انکم ${matching}، لیول انکم ${level} ہے، اور آپ کا تازہ ترین انکم کریڈٹ ${latest} تھا۔`,
    team: ({ name, total, left, right, active, inactive }) => `${name}، آپ کی ٹیم میں ${total} ممبرز ہیں۔ بائیں طرف ${left}، دائیں طرف ${right}، جن میں ${active} فعال اور ${inactive} غیر فعال اکاؤنٹس ہیں۔`,
    binary: ({ name, leftPv, rightPv, weakerLeg, matchedPv, binaryIncome }) => `${name}، آپ کے بائنری اسٹیٹس میں بائیں طرف ${leftPv} PV اور دائیں طرف ${rightPv} PV ہے۔ آپ کی کمزور لیگ ${weakerLeg} ہے، میچڈ PV ${matchedPv} ہے، اور تازہ ترین بائنری انکم ${binaryIncome} ہے۔`,
    level: ({ name, level, count }) => `${name}، آپ کی مجموعی لیول انکم ${level} ہے اور یہ ${count} کریڈٹ شدہ لیول انکم ریکارڈز سے آئی ہے۔`,
    withdrawal: ({ name, available, pending, lastStatus }) => `${name}، آپ اس وقت ${available} تک withdrawal کر سکتے ہیں۔ آپ کی pending withdrawal requests ${pending} ہیں، اور تازہ ترین withdrawal status ${lastStatus} ہے۔`,
    strategy: ({ name, target, teamTarget, activeNeed, note }) => `${name}، ${target}/مہینہ ہدف کے لیے تقریباً ${teamTarget} ماہانہ ٹیم انکم پر توجہ دیں اور قریب ${activeNeed} فعال انکم دینے والے ٹیم ممبرز برقرار رکھیں۔ ${note}`,
    overview: ({ name, total, income, team }) => `${name}، آپ کے والٹ میں ${total} ہے، کریڈٹ شدہ آمدنی ${income} ہے، اور آپ کی ٹیم کا سائز ${team} ہے۔ آپ والٹ، آمدنی، بائنری اسٹیٹس، ٹیم گروتھ، withdrawal یا ماہانہ پلان کے بارے میں پوچھ سکتے ہیں۔`
  },
  ar: {
    suggestions: {
      wallet: 'اعرض محفظتي',
      income: 'كم يبلغ دخلي؟',
      withdraw: 'هل أستطيع السحب الآن؟',
      binary: 'اعرض حالتي الثنائية',
      team: 'كيف ينمو فريقي؟',
      level: 'اعرض دخل المستويات',
      plan100: 'أعطني خطة $100 شهريًا',
      plan500: 'أعطني خطة $500 شهريًا',
      plan1000: 'أعطني خطة $1000 شهريًا'
    },
    wallet: ({ name, total, income, deposit, withdrawal, btct }) => `${name}، رصيد محفظتك هو ${total}. ويشمل ${income} كدخل، و${deposit} كرصيد إيداع، و${withdrawal} مخصصًا للسحب، و${btct} من BTCT متاحًا.`,
    income: ({ name, total, direct, matching, level, latest }) => `${name}، إجمالي الدخل المضاف إلى حسابك هو ${total}. الدخل المباشر ${direct}، والدخل الثنائي ${matching}، ودخل المستويات ${level}، وآخر قيد دخل كان ${latest}.`,
    team: ({ name, total, left, right, active, inactive }) => `${name}، يضم فريقك ${total} عضوًا. الجهة اليسرى ${left} واليمنى ${right}، مع ${active} حسابات نشطة و${inactive} غير نشطة.`,
    binary: ({ name, leftPv, rightPv, weakerLeg, matchedPv, binaryIncome }) => `${name}، حالتك الثنائية تُظهر ${leftPv} PV في اليسار و${rightPv} PV في اليمين. الجهة الأضعف هي ${weakerLeg}، و${matchedPv} هو PV المتطابق، وآخر دخل ثنائي هو ${binaryIncome}.`,
    level: ({ name, level, count }) => `${name}، إجمالي دخل المستويات لديك هو ${level} من ${count} سجلات دخل مستويات معتمدة.`,
    withdrawal: ({ name, available, pending, lastStatus }) => `${name}، يمكنك السحب الآن من مبلغ ${available}. لديك ${pending} طلبات سحب قيد الانتظار، وآخر حالة سحب هي ${lastStatus}.`,
    strategy: ({ name, target, teamTarget, activeNeed, note }) => `${name}، لهدف ${target} شهريًا، ركّز على دخل فريق شهري يقارب ${teamTarget} وحافظ على نحو ${activeNeed} أعضاء نشطين يحققون دخلاً. ${note}`,
    overview: ({ name, total, income, team }) => `${name}، رصيد محفظتك ${total}، والدخل المضاف ${income}، وحجم فريقك ${team}. يمكنك السؤال عن المحفظة أو الدخل أو الحالة الثنائية أو نمو الفريق أو السحب أو الخطة الشهرية.`
  },
  bn: {
    suggestions: {
      wallet: 'আমার ওয়ালেট দেখাও',
      income: 'আমার আয় কত?',
      withdraw: 'আমি কি এখন withdrawal করতে পারি?',
      binary: 'আমার বাইনারি স্ট্যাটাস দেখাও',
      team: 'আমার টিম কীভাবে বাড়ছে?',
      level: 'আমার লেভেল ইনকাম দেখাও',
      plan100: 'আমাকে $100/মাস পরিকল্পনা দাও',
      plan500: 'আমাকে $500/মাস পরিকল্পনা দাও',
      plan1000: 'আমাকে $1000/মাস পরিকল্পনা দাও'
    },
    wallet: ({ name, total, income, deposit, withdrawal, btct }) => `${name}, আপনার ওয়ালেটে মোট ${total} রয়েছে। এর মধ্যে ${income} ইনকাম ফান্ড, ${deposit} ডিপোজিট ফান্ড, ${withdrawal} withdrawal রিজার্ভ এবং ${btct} BTCT উপলব্ধ আছে।`,
    income: ({ name, total, direct, matching, level, latest }) => `${name}, আপনার মোট ক্রেডিটেড আয় ${total}। ডাইরেক্ট ইনকাম ${direct}, ম্যাচিং ইনকাম ${matching}, লেভেল ইনকাম ${level}, এবং সর্বশেষ ইনকাম ক্রেডিট ছিল ${latest}।`,
    team: ({ name, total, left, right, active, inactive }) => `${name}, আপনার টিমে ${total} জন সদস্য আছে। বাম পাশে ${left}, ডান পাশে ${right}, যার মধ্যে ${active} সক্রিয় এবং ${inactive} নিষ্ক্রিয় অ্যাকাউন্ট আছে।`,
    binary: ({ name, leftPv, rightPv, weakerLeg, matchedPv, binaryIncome }) => `${name}, আপনার বাইনারি স্ট্যাটাসে বাম পাশে ${leftPv} PV এবং ডান পাশে ${rightPv} PV আছে। দুর্বল লেগ হলো ${weakerLeg}, matched PV হলো ${matchedPv}, এবং সর্বশেষ বাইনারি ইনকাম ${binaryIncome}।`,
    level: ({ name, level, count }) => `${name}, আপনার মোট লেভেল ইনকাম ${level} এবং এটি ${count} টি ক্রেডিটেড লেভেল ইনকাম রেকর্ড থেকে এসেছে।`,
    withdrawal: ({ name, available, pending, lastStatus }) => `${name}, আপনি এখন ${available} পর্যন্ত withdrawal করতে পারেন। আপনার pending withdrawal request ${pending} টি, এবং সর্বশেষ withdrawal status হলো ${lastStatus}।`,
    strategy: ({ name, target, teamTarget, activeNeed, note }) => `${name}, ${target}/মাস লক্ষ্য পেতে প্রায় ${teamTarget} মাসিক টিম ইনকামের দিকে কাজ করুন এবং প্রায় ${activeNeed} জন সক্রিয় আয়-উৎপাদনকারী সদস্য ধরে রাখুন। ${note}`,
    overview: ({ name, total, income, team }) => `${name}, আপনার ওয়ালেটে ${total} আছে, ক্রেডিটেড আয় ${income}, এবং আপনার টিম সাইজ ${team}। আপনি ওয়ালেট, আয়, বাইনারি স্ট্যাটাস, টিম গ্রোথ, withdrawal বা মাসিক পরিকল্পনা সম্পর্কে জিজ্ঞাসা করতে পারেন।`
  },
  ps: {
    suggestions: {
      wallet: 'زما والټ وښایه',
      income: 'زما عاید څومره دی؟',
      withdraw: 'ایا زه اوس withdrawal کولی شم؟',
      binary: 'زما باینري حالت وښایه',
      team: 'زما ټیم څنګه وده کوي؟',
      level: 'زما لیول عاید وښایه',
      plan100: 'ما ته د $100/میاشت پلان راکړه',
      plan500: 'ما ته د $500/میاشت پلان راکړه',
      plan1000: 'ما ته د $1000/میاشت پلان راکړه'
    },
    wallet: ({ name, total, income, deposit, withdrawal, btct }) => `${name}، ستاسو په والټ کې ټول ${total} موجود دي. پکې ${income} د عاید فنډ، ${deposit} د ډیپازټ فنډ، ${withdrawal} د withdrawal لپاره ساتل شوي، او ${btct} BTCT شته.`,
    income: ({ name, total, direct, matching, level, latest }) => `${name}، ستاسو ټول کریډیټ شوی عاید ${total} دی. مستقیم عاید ${direct}، میچنګ عاید ${matching}، لیول عاید ${level} دی، او وروستی عاید کریډیټ ${latest} و.`,
    team: ({ name, total, left, right, active, inactive }) => `${name}، ستاسو په ټیم کې ${total} غړي دي. کیڼ اړخ ${left}، ښي اړخ ${right}، چې ${active} فعال او ${inactive} غیرفعال حسابونه پکې دي.`,
    binary: ({ name, leftPv, rightPv, weakerLeg, matchedPv, binaryIncome }) => `${name}، ستاسو باینري حالت په کیڼ اړخ ${leftPv} PV او په ښي اړخ ${rightPv} PV ښيي. کمزورې پښه ${weakerLeg} ده، matched PV ${matchedPv} دی، او وروستی باینري عاید ${binaryIncome} دی.`,
    level: ({ name, level, count }) => `${name}، ستاسو ټول لیول عاید ${level} دی او دا د ${count} کریډیټ شوو لیول عاید ریکارډونو څخه راغلی دی.`,
    withdrawal: ({ name, available, pending, lastStatus }) => `${name}، تاسو همدا اوس تر ${available} پورې withdrawal کولی شئ. ستاسو pending withdrawal requests ${pending} دي، او وروستی withdrawal status ${lastStatus} دی.`,
    strategy: ({ name, target, teamTarget, activeNeed, note }) => `${name}، د ${target}/میاشت هدف لپاره شاوخوا ${teamTarget} میاشتنی ټیم عاید په نښه کړئ او نږدې ${activeNeed} فعال عاید راوړونکي غړي وساتئ. ${note}`,
    overview: ({ name, total, income, team }) => `${name}، ستاسو د والټ بیلانس ${total} دی، کریډیټ شوی عاید ${income} دی، او ستاسو د ټیم اندازه ${team} ده. تاسو د والټ، عاید، باینري حالت، ټیم ودې، withdrawal یا میاشتني پلان په اړه پوښتنه کولی شئ.`
  }
};

function safeLanguage(language) {
  return SUPPORTED_LANGUAGES.has(language) ? language : 'en';
}

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function money(value) {
  return `$${toMoney(value).toFixed(2)}`;
}

function number(value) {
  return Number(value || 0).toLocaleString('en-US');
}

function displayName(user) {
  return user?.username || user?.email || 'Member';
}

function getCopy(language) {
  return COPY[safeLanguage(language)] || COPY.en;
}

function normalizeMessage(message) {
  return String(message || '').trim().toLowerCase();
}

function detectIntent(message) {
  const normalized = normalizeMessage(message);

  if (!normalized) {
    return 'overview';
  }

  if (normalized.includes('1000')) return 'plan_1000';
  if (normalized.includes('500')) return 'plan_500';
  if (normalized.includes('100')) return 'plan_100';

  for (const keyword of INTENT_KEYWORDS.level_income) {
    if (normalized.includes(keyword)) return 'level_income';
  }
  for (const keyword of INTENT_KEYWORDS.withdrawal) {
    if (normalized.includes(keyword)) return 'withdrawal';
  }
  for (const keyword of INTENT_KEYWORDS.team_growth) {
    if (normalized.includes(keyword)) return normalized.includes('binary') || normalized.includes('बाइनरी') || normalized.includes('بائنری') || normalized.includes('ثنائي') || normalized.includes('বাইনারি') || normalized.includes('باینري') ? 'binary_status' : 'team_growth';
  }
  for (const keyword of INTENT_KEYWORDS.income_query) {
    if (normalized.includes(keyword)) return 'income_query';
  }
  for (const keyword of INTENT_KEYWORDS.wallet_query) {
    if (normalized.includes(keyword)) return 'wallet_query';
  }
  for (const keyword of INTENT_KEYWORDS.earning_strategy) {
    if (normalized.includes(keyword)) return 'plan_500';
  }

  return 'overview';
}

function buildIncomeStats(incomeTransactions = []) {
  return incomeTransactions.reduce(
    (acc, transaction) => {
      const amount = toMoney(transaction.amount);
      const source = String(transaction.source || '');
      acc.total += amount;
      if (source === 'direct_income' || source === 'direct_deposit_income') acc.direct += amount;
      if (source === 'matching_income') acc.matching += amount;
      if (source === 'level_deposit_income') {
        acc.level += amount;
        acc.levelCount += 1;
      }
      if (!acc.latestAt || new Date(transaction.created_at).getTime() > new Date(acc.latestAt).getTime()) {
        acc.latestAt = transaction.created_at;
        acc.latestAmount = amount;
      }
      return acc;
    },
    { total: 0, direct: 0, matching: 0, level: 0, levelCount: 0, latestAt: null, latestAmount: 0 }
  );
}

function weakerLeg(weeklySummary = {}) {
  const left = toMoney(weeklySummary.left_carry_pv ?? weeklySummary.left_pv ?? 0);
  const right = toMoney(weeklySummary.right_carry_pv ?? weeklySummary.right_pv ?? 0);
  if (left === right) return 'balanced';
  return left < right ? 'left' : 'right';
}

function buildStrategyNote(language, amount) {
  const notes = {
    en: {
      100: 'Start with consistent personal ordering and two active frontline members.',
      500: 'Build balanced left and right activity so matching income grows regularly.',
      1000: 'Track weekly binary volume, duplication depth, and retention every month.'
    },
    hi: {
      100: 'शुरुआत नियमित personal ordering और दो active frontline सदस्यों से करें।',
      500: 'लेफ्ट और राइट दोनों तरफ संतुलित activity बनाएं ताकि matching income नियमित बढ़े।',
      1000: 'हर महीने weekly binary volume, duplication depth और retention को ट्रैक करें।'
    },
    ur: {
      100: 'آغاز مستقل personal ordering اور دو active frontline ممبرز سے کریں۔',
      500: 'بائیں اور دائیں دونوں طرف متوازن activity بنائیں تاکہ matching income باقاعدہ بڑھے۔',
      1000: 'ہر ماہ weekly binary volume، duplication depth اور retention کو track کریں۔'
    },
    ar: {
      100: 'ابدأ بطلبات شخصية منتظمة وعضوين نشطين في الصف الأول.',
      500: 'ابنِ نشاطًا متوازنًا في اليمين واليسار حتى ينمو الدخل الثنائي باستمرار.',
      1000: 'تابع حجم الثنائية الأسبوعي وعمق التكرار والاحتفاظ شهريًا.'
    },
    bn: {
      100: 'নিয়মিত personal ordering এবং দুইজন active frontline সদস্য দিয়ে শুরু করুন।',
      500: 'বাম ও ডান দুই পাশেই balanced activity তৈরি করুন যাতে matching income নিয়মিত বাড়ে।',
      1000: 'প্রতি মাসে weekly binary volume, duplication depth এবং retention ট্র্যাক করুন।'
    },
    ps: {
      100: 'پیل د منظم personal ordering او دوو فعال frontline غړو څخه وکړئ.',
      500: 'په کیڼ او ښي دواړو خواوو کې متوازن activity جوړه کړئ څو matching income په منظم ډول لوړه شي.',
      1000: 'هره میاشت weekly binary volume، duplication depth او retention وڅارئ.'
    }
  };

  return notes[safeLanguage(language)]?.[amount] || notes.en[amount];
}

function buildSuggestions(language, intent) {
  const labels = getCopy(language).suggestions;
  const map = {
    wallet_query: [labels.income, labels.withdraw, labels.binary],
    income_query: [labels.level, labels.team, labels.plan500],
    team_growth: [labels.binary, labels.plan500, labels.wallet],
    binary_status: [labels.team, labels.level, labels.plan500],
    level_income: [labels.income, labels.team, labels.plan100],
    withdrawal: [labels.wallet, labels.income, labels.plan100],
    plan_100: [labels.wallet, labels.team, labels.plan500],
    plan_500: [labels.binary, labels.team, labels.plan1000],
    plan_1000: [labels.binary, labels.level, labels.wallet],
    overview: [labels.wallet, labels.income, labels.plan500]
  };

  return map[intent] || map.overview;
}

async function loadContext(userId) {
  const [profile, walletSummary, teamSummary, weeklySummary, incomeTransactions, withdrawals] = await Promise.all([
    adminRepository.getUserProfile(null, userId),
    walletService.getWalletSummary(null, userId),
    adminRepository.getTeamSummary(null, userId),
    adminRepository.getUserLatestWeeklySummary(null, userId),
    walletRepository.listIncomeTransactions(null, userId, 250),
    walletRepository.listWithdrawalRequests(null, userId, 50)
  ]);

  const wallet = walletSummary?.wallet || {};
  const incomeStats = buildIncomeStats(incomeTransactions);
  const pendingWithdrawals = withdrawals.filter((item) => item.status === 'pending');
  const latestWithdrawal = withdrawals[0] || null;

  return {
    profile,
    wallet,
    teamSummary: teamSummary || {},
    weeklySummary: weeklySummary || {},
    incomeStats,
    pendingWithdrawals,
    latestWithdrawal
  };
}

function formatReply(intent, language, context) {
  const copy = getCopy(language);
  const name = displayName(context.profile);
  const wallet = context.wallet || {};
  const team = context.teamSummary || {};
  const weekly = context.weeklySummary || {};
  const income = context.incomeStats || {};
  const pendingWithdrawalAmount = context.pendingWithdrawals.reduce((sum, item) => sum + toMoney(item.amount), 0);
  const common = {
    name,
    total: money(wallet.balance),
    income: money(wallet.income_balance),
    deposit: money(wallet.deposit_balance),
    withdrawal: money(wallet.withdrawal_balance),
    btct: Number(wallet.btct_available_balance || 0).toFixed(4),
    direct: money(income.direct),
    matching: money(income.matching),
    level: money(income.level),
    latest: money(income.latestAmount),
    team: number(team.total_descendants),
    left: number(team.left_count),
    right: number(team.right_count),
    active: number(team.active_count),
    inactive: number(team.inactive_count),
    leftPv: number(weekly.left_carry_pv ?? weekly.left_pv ?? 0),
    rightPv: number(weekly.right_carry_pv ?? weekly.right_pv ?? 0),
    weakerLeg: weakerLeg(weekly),
    matchedPv: number(weekly.matched_pv ?? 0),
    binaryIncome: money(weekly.matching_income_net ?? weekly.matching_income_gross ?? 0),
    count: number(context.incomeStats?.levelCount || 0),
    available: money(wallet.withdrawal_balance || wallet.balance || 0),
    pending: money(pendingWithdrawalAmount),
    lastStatus: String(context.latestWithdrawal?.status || 'no recent request')
  };

  if (intent === 'wallet_query') return copy.wallet(common);
  if (intent === 'income_query') return copy.income({ ...common, total: money(income.total) });
  if (intent === 'team_growth') return copy.team(common);
  if (intent === 'binary_status') return copy.binary(common);
  if (intent === 'level_income') return copy.level(common);
  if (intent === 'withdrawal') return copy.withdrawal(common);
  if (intent === 'plan_100' || intent === 'plan_500' || intent === 'plan_1000') {
    const target = STRATEGY_AMOUNTS[intent];
    return copy.strategy({
      name,
      target: `$${target}`,
      teamTarget: money(target * 1.8),
      activeNeed: number(Math.max(2, Math.ceil(target / 75))),
      note: buildStrategyNote(language, target)
    });
  }

  return copy.overview({
    name,
    total: money(wallet.balance),
    income: money(income.total),
    team: number(team.total_descendants)
  });
}

async function chat(userId, message, language = 'en') {
  const lang = safeLanguage(language);
  const intent = detectIntent(message);
  const context = await loadContext(userId);
  const reply = formatReply(intent, lang, context);

  return {
    intent,
    language: lang,
    direction: RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr',
    reply,
    suggestions: buildSuggestions(lang, intent),
    summary: {
      wallet_balance: toMoney(context.wallet?.balance),
      income_balance: toMoney(context.wallet?.income_balance),
      withdrawal_balance: toMoney(context.wallet?.withdrawal_balance),
      total_income: toMoney(context.incomeStats?.total),
      team_size: Number(context.teamSummary?.total_descendants || 0)
    }
  };
}

module.exports = {
  chat,
  detectIntent
};
