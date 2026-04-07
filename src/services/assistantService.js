const adminRepository = require('../repositories/adminRepository');
const walletRepository = require('../repositories/walletRepository');
const userRepository = require('../repositories/userRepository');
const auctionRepository = require('../repositories/auctionRepository');
const walletService = require('./walletService');
const sellerService = require('./sellerService');
const { FAQS, findFaqMatch } = require('./assistantFaqService');

const SUPPORTED_LANGUAGES = new Set(['en', 'hi', 'ur', 'ar', 'bn', 'ps']);
const RTL_LANGUAGES = new Set(['ur', 'ar', 'ps']);
const STRATEGY_AMOUNTS = { plan_100: 100, plan_500: 500, plan_1000: 1000 };

const STATUS_TEXT = {
  en: { none: 'no recent request', pending: 'pending', approved: 'approved', rejected: 'rejected', cancelled: 'cancelled' },
  hi: { none: 'हाल की कोई रिक्वेस्ट नहीं', pending: 'पेंडिंग', approved: 'स्वीकृत', rejected: 'अस्वीकृत', cancelled: 'रद्द' },
  ur: { none: 'حالیہ کوئی درخواست نہیں', pending: 'زیر التوا', approved: 'منظور شدہ', rejected: 'مسترد', cancelled: 'منسوخ' },
  ar: { none: 'لا يوجد طلب حديث', pending: 'قيد الانتظار', approved: 'مقبول', rejected: 'مرفوض', cancelled: 'ملغي' },
  bn: { none: 'সাম্প্রতিক কোনো রিকোয়েস্ট নেই', pending: 'পেন্ডিং', approved: 'অনুমোদিত', rejected: 'প্রত্যাখ্যাত', cancelled: 'বাতিল' },
  ps: { none: 'وروستۍ غوښتنه نشته', pending: 'انتظار', approved: 'منل شوې', rejected: 'رد شوې', cancelled: 'لغوه' }
};

const INTENT_KEYWORDS = {
  platform_intro: ['what is hope international', 'hope international kya hai', 'platform kya hai', 'platform kya karta hai', 'what does hope international do', 'what is this platform', 'about hope international', 'hope international kya karta hai'],
  user_identity: ['my username', 'username', 'my id', 'user id', 'account id', 'मेरी आईडी', 'यूजरनेम', 'میرا آئی ڈی', 'میرا یوزرنیم', 'اسم المستخدم', 'معرفي', 'আমার আইডি', 'আমার ইউজারনেম', 'زما آی ډي', 'زما کارن نوم'],
  sponsor_info: ['sponsor', 'upline', 'referrer', 'स्पॉन्सर', 'प्रायोजक', 'اسپانسر', 'sponsor', 'الراعي', 'স্পন্সর', 'স্পনসর', 'سپانسر'],
  rank_info: ['rank', 'current rank', 'my rank', 'रैंक', 'मेरा रैंक', 'رینک', 'میرا رینک', 'الرتبة', 'رتبتي', 'র‍্যাঙ্ক', 'আমার র‍্যাঙ্ক', 'رنک'],
  direct_referral_summary: ['direct referrals', 'direct referral', 'my directs', 'referrals count', 'डायरेक्ट रेफरल', 'डायरेक्ट्स', 'direct referrals', 'ডাইরেক্ট রেফারেল', 'مباشر', 'ডিরেক্ট', 'مستقیم ریفرل', 'مستقیم'],
  team_activity_summary: ['active team', 'active members', 'team activity', 'active people', 'एक्टिव टीम', 'एक्टिव मेंबर', 'active team', 'فريق نشط', 'active team', 'সক্রিয় টিম', 'فعال ټیم'],
  pv_summary: ['left pv', 'right pv', 'pv', 'carry pv', 'लेफ्ट pv', 'राइट pv', 'پی وی', 'left pv', 'right pv', 'نقاط', 'বাম pv', 'ডান pv', 'کيڼ pv', 'ښي pv'],
  placement_summary: ['placement side', 'my side', 'placement', 'leg', 'प्लेसमेंट', 'साइड', 'placement', 'leg', 'موضع', 'جانبي', 'প্লেসমেন্ট', 'সাইড', 'ځای', 'اړخ'],
  income_wallet_summary: ['income wallet', 'income balance', 'wallet income', 'इनकम वॉलेट', 'इनकम बैलेंस', 'income wallet', 'محفظة الدخل', 'ইনকাম ওয়ালেট', 'income wallet', 'عاید والټ'],
  deposit_wallet_summary: ['deposit wallet', 'deposit balance', 'wallet deposit', 'डिपॉजिट वॉलेट', 'डिपॉजिट बैलेंस', 'deposit wallet', 'محفظة الإيداع', 'ডিপোজিট ওয়ালেট', 'deposit wallet', 'ډیپازټ والټ'],
  withdrawal_wallet_summary: ['withdrawal wallet', 'withdrawal balance', 'wallet withdrawal', 'withdraw wallet', 'withdrawal wallet', 'विथड्रॉअल वॉलेट', 'withdrawal wallet', 'محفظة السحب', 'withdrawal wallet', 'উইথড্রয়াল ওয়ালেট', 'withdrawal wallet', 'وېستلو والټ'],
  btct_wallet_summary: ['btct balance', 'btct wallet', 'my btct', 'btct', 'बीटीसीटी', 'بی ٹی سی ٹی', 'BTCT', 'বিটিসিটি', 'بی ټي سي ټي'],
  total_income_summary: ['total income', 'all income', 'income total', 'कुल इनकम', 'टोटल इनकम', 'کل آمدنی', 'ٹوٹل انکم', 'إجمالي الدخل', 'মোট আয়', 'ټول عاید'],
  wallet_info: ['wallet', 'balance', 'fund', 'btct', 'वॉलेट', 'बैलेंस', 'والٹ', 'رصيد', 'ওয়ালেট', 'والټ'],
  income_summary: ['income', 'earning', 'profit', 'commission', 'कमाई', 'इनकम', 'آمدنی', 'الدخل', 'আয়', 'عاید'],
  level_income: ['level income', 'level bonus', 'लेवल', 'لیول', 'المستوى', 'লেভেল', 'لېول'],
  team_summary: ['team', 'network', 'referral', 'टीम', 'ٹیم', 'فريق', 'টিম', 'ټیم'],
  binary_status: ['binary', 'left', 'right', 'बाइनरी', 'بائنری', 'ثنائي', 'বাইনারি', 'باینري'],
  deposit_status: ['deposit', 'deposits', 'recharge', 'डिपॉजिट', 'ڈپازٹ', 'إيداع', 'ডিপোজিট', 'ډیپازټ'],
  withdrawal_info: ['withdraw', 'withdrawal', 'payout', 'निकासी', 'ودڈرال', 'سحب', 'উইথড্রয়াল', 'وېستل'],
  auction_summary: ['auction', 'auctions', 'my auction', 'auction status', 'नीलामी', 'auction', 'مزاد', 'নিলাম', 'لیلام'],
  seller_status: ['seller', 'seller status', 'seller account', 'सेलर', 'विक्रेता', 'seller', 'بائع', 'সেলার', 'خرڅوونکی'],
  charity_info: ['charity', 'donation', 'donate', 'help poor', 'poor people', 'needy people', 'needy family', 'community support', 'social support', 'welfare', 'gareeb', 'madad', 'zakat', 'sadaqah', 'sadqah', 'donation kaise', 'can i donate', 'charity system', 'support needy', 'help needy', 'community welfare', 'गरीब', 'दान', 'मदद', 'खैरात', 'gareeb logon ki madad', 'چیریٹی', 'ڈونیشن', 'مدد', 'زکات', 'صدقہ', 'خیرات', 'جمعية', 'تبرع', 'مساعدة الفقراء', 'الزكاة', 'الصدقة', 'দান', 'চ্যারিটি', 'গরিব মানুষ', 'সাহায্য', 'خیرات', 'بسپنه', 'مرسته'],
  earning_strategy: ['plan', 'strategy', 'target', 'month', '/month', 'grow my income', 'increase my income', 'team is weak', 'weak team', 'how can i earn', 'what should i do', 'प्लान', 'आय बढ़ाऊँ', 'इनकम बढ़े', 'कमज़ोर टीम', 'پلان', 'آمدنی بڑھاؤں', 'کمزور ٹیم', 'خطة', 'زيادة الدخل', 'فريقي ضعيف', 'পরিকল্পনা', 'আয় বাড়াব', 'দুর্বল টিম', 'ستراتیژي', 'عاید زیات', 'کمزوری ټیم']
};

const COPY = {
  en: {
    suggestions: { wallet: 'Show my wallet', income: 'How much income did I earn?', deposits: 'Show my deposits', withdraw: 'Can I withdraw now?', binary: 'Show my binary status', team: 'How is my team growing?', level: 'Show my level income', plan100: 'Give me a $100/month plan', plan500: 'Give me a $500/month plan', plan1000: 'Give me a $1000/month plan' },
    strategyNotes: { 100: 'Start with consistent personal ordering and two active frontline members.', 500: 'Build balanced left and right activity so matching income grows regularly.', 1000: 'Track weekly binary volume, duplication depth, and retention every month.' },
    fallback: 'Sorry, I couldn’t understand that clearly. You can ask me about your wallet, income, team, binary status, deposits, withdrawals, or earning strategy.',
    wallet_info: ({ name, availableBalance, incomeBalance, depositBalance, withdrawalBalance, btctBalance }) => `${name}, your available balance is ${availableBalance}. It includes ${incomeBalance} in income funds, ${depositBalance} in deposit funds, ${withdrawalBalance} in withdrawal funds, and ${btctBalance} BTCT available.`,
    income_summary: ({ name, totalIncome, directIncome, matchingIncome, levelIncome, latestIncome }) => `${name}, your credited income is ${totalIncome}. Direct income is ${directIncome}, matching income is ${matchingIncome}, level income is ${levelIncome}, and your latest income credit was ${latestIncome}.`,
    team_summary: ({ name, totalTeam, leftTeam, rightTeam, activeTeam, inactiveTeam }) => `${name}, your team has ${totalTeam} members. Left side is ${leftTeam}, right side is ${rightTeam}, with ${activeTeam} active and ${inactiveTeam} inactive accounts.`,
    level_income: ({ name, levelIncome, levelIncomeCount }) => `${name}, your level income total is ${levelIncome} from ${levelIncomeCount} credited level income records.`,
    binary_status: ({ name, leftPv, rightPv, weakerLeg, matchedPv, binaryIncome }) => `${name}, your binary status shows ${leftPv} PV on the left and ${rightPv} PV on the right. Your weaker leg is ${weakerLeg}, matched PV is ${matchedPv}, and the latest binary income is ${binaryIncome}.`,
    deposit_status: ({ name, totalDeposits, approvedDeposits, pendingDeposits, latestDepositAmount, latestDepositStatus }) => `${name}, your deposit history shows ${totalDeposits} requests. Approved deposits total ${approvedDeposits}, pending deposits total ${pendingDeposits}, and your latest deposit was ${latestDepositAmount} with status ${latestDepositStatus}.`,
    withdrawal_info: ({ name, availableWithdrawal, pendingWithdrawals, latestWithdrawalStatus }) => `${name}, you can withdraw from ${availableWithdrawal} right now. You have ${pendingWithdrawals} pending withdrawal requests, and the latest withdrawal status is ${latestWithdrawalStatus}.`,
    growth_strategy: ({ name, targetAmount, targetTeamIncome, activeMembersNeeded, note }) => `${name}, for a ${targetAmount}/month target, focus on ${targetTeamIncome} in monthly team income and keep around ${activeMembersNeeded} active income-generating team members. ${note}`,
    overview: ({ name, availableBalance, totalIncome, totalTeam }) => `${name}, your wallet balance is ${availableBalance}, credited income is ${totalIncome}, and your team size is ${totalTeam}. Ask about wallet, income, binary status, deposits, withdrawals, or a monthly plan.`
  },
  hi: {
    suggestions: { wallet: 'मेरा वॉलेट दिखाओ', income: 'मेरी इनकम कितनी है?', deposits: 'मेरे डिपॉजिट दिखाओ', withdraw: 'क्या मैं अभी withdrawal कर सकता हूँ?', binary: 'मेरा बाइनरी स्टेटस दिखाओ', team: 'मेरी टीम कैसी बढ़ रही है?', level: 'मेरा लेवल इनकम दिखाओ', plan100: 'मुझे $100/माह प्लान दो', plan500: 'मुझे $500/माह प्लान दो', plan1000: 'मुझे $1000/माह प्लान दो' },
    strategyNotes: { 100: 'शुरुआत नियमित personal ordering और दो active frontline सदस्यों से करें।', 500: 'लेफ्ट और राइट दोनों तरफ balanced activity बनाएं ताकि matching income नियमित बढ़े।', 1000: 'हर महीने weekly binary volume, duplication depth और retention को ट्रैक करें।' },
    fallback: 'माफ़ कीजिए, मैं इसे साफ़ तौर पर समझ नहीं पाया। आप मुझसे वॉलेट, इनकम, टीम, बाइनरी स्टेटस, डिपॉजिट, withdrawal या earning strategy के बारे में पूछ सकते हैं।',
    wallet_info: ({ name, availableBalance, incomeBalance, depositBalance, withdrawalBalance, btctBalance }) => `${name}, आपका उपलब्ध बैलेंस ${availableBalance} है और इसमें ${incomeBalance} इनकम फंड, ${depositBalance} डिपॉजिट फंड, ${withdrawalBalance} withdrawal फंड और ${btctBalance} BTCT उपलब्ध है।`,
    income_summary: ({ name, totalIncome, directIncome, matchingIncome, levelIncome, latestIncome }) => `${name}, आपकी कुल credited income ${totalIncome} है। Direct income ${directIncome}, matching income ${matchingIncome}, level income ${levelIncome} है, और आपका latest income credit ${latestIncome} था।`,
    team_summary: ({ name, totalTeam, leftTeam, rightTeam, activeTeam, inactiveTeam }) => `${name}, आपकी टीम में ${totalTeam} सदस्य हैं। Left side ${leftTeam}, right side ${rightTeam}, जिनमें ${activeTeam} active और ${inactiveTeam} inactive accounts हैं।`,
    level_income: ({ name, levelIncome, levelIncomeCount }) => `${name}, आपकी कुल level income ${levelIncome} है और यह ${levelIncomeCount} credited level income records से आई है।`,
    binary_status: ({ name, leftPv, rightPv, weakerLeg, matchedPv, binaryIncome }) => `${name}, आपके binary status में left पर ${leftPv} PV और right पर ${rightPv} PV है। आपकी weaker leg ${weakerLeg} है, matched PV ${matchedPv} है, और latest binary income ${binaryIncome} है।`,
    deposit_status: ({ name, totalDeposits, approvedDeposits, pendingDeposits, latestDepositAmount, latestDepositStatus }) => `${name}, आपकी deposit history में ${totalDeposits} requests हैं। Approved deposits ${approvedDeposits}, pending deposits ${pendingDeposits}, और आपका latest deposit ${latestDepositAmount} था जिसका status ${latestDepositStatus} है।`,
    withdrawal_info: ({ name, availableWithdrawal, pendingWithdrawals, latestWithdrawalStatus }) => `${name}, आप अभी ${availableWithdrawal} तक withdrawal कर सकते हैं। आपकी pending withdrawal requests ${pendingWithdrawals} हैं, और latest withdrawal status ${latestWithdrawalStatus} है।`,
    growth_strategy: ({ name, targetAmount, targetTeamIncome, activeMembersNeeded, note }) => `${name}, ${targetAmount}/माह के लक्ष्य के लिए लगभग ${targetTeamIncome} monthly team income पर ध्यान दें और करीब ${activeMembersNeeded} active income-generating members बनाए रखें। ${note}`,
    overview: ({ name, availableBalance, totalIncome, totalTeam }) => `${name}, आपके वॉलेट में ${availableBalance} है, credited income ${totalIncome} है, और आपकी team size ${totalTeam} है। आप wallet, income, binary status, deposits, withdrawals या monthly plan के बारे में पूछ सकते हैं।`
  },
  ur: {
    suggestions: { wallet: 'میرا والٹ دکھائیں', income: 'میری آمدنی کتنی ہے؟', deposits: 'میرے ڈپازٹس دکھائیں', withdraw: 'کیا میں ابھی withdrawal کر سکتا ہوں؟', binary: 'میرا بائنری اسٹیٹس دکھائیں', team: 'میری ٹیم کی گروتھ دکھائیں', level: 'میری لیول انکم دکھائیں', plan100: 'مجھے $100 ماہانہ پلان دیں', plan500: 'مجھے $500 ماہانہ پلان دیں', plan1000: 'مجھے $1000 ماہانہ پلان دیں' },
    strategyNotes: { 100: 'آغاز مستقل personal ordering اور دو active frontline ممبرز سے کریں۔', 500: 'بائیں اور دائیں دونوں طرف balanced activity بنائیں تاکہ matching income باقاعدہ بڑھے۔', 1000: 'ہر ماہ weekly binary volume، duplication depth اور retention کو track کریں۔' },
    fallback: 'معذرت، میں اسے واضح طور پر سمجھ نہیں سکا۔ آپ مجھ سے والٹ، آمدنی، ٹیم، بائنری اسٹیٹس، ڈپازٹس، withdrawals یا earning strategy کے بارے میں پوچھ سکتے ہیں۔',
    wallet_info: ({ name, availableBalance, incomeBalance, depositBalance, withdrawalBalance, btctBalance }) => `${name}، آپ کا دستیاب بیلنس ${availableBalance} ہے اور اس میں ${incomeBalance} انکم فنڈ، ${depositBalance} ڈپازٹ فنڈ، ${withdrawalBalance} withdrawal فنڈ، اور ${btctBalance} BTCT دستیاب ہے۔`,
    income_summary: ({ name, totalIncome, directIncome, matchingIncome, levelIncome, latestIncome }) => `${name}، آپ کی کل credited income ${totalIncome} ہے۔ Direct income ${directIncome}، matching income ${matchingIncome}، level income ${levelIncome} ہے، اور آپ کا latest income credit ${latestIncome} تھا۔`,
    team_summary: ({ name, totalTeam, leftTeam, rightTeam, activeTeam, inactiveTeam }) => `${name}، آپ کی ٹیم میں ${totalTeam} ممبرز ہیں۔ بائیں طرف ${leftTeam}، دائیں طرف ${rightTeam}، جن میں ${activeTeam} فعال اور ${inactiveTeam} غیر فعال اکاؤنٹس ہیں۔`,
    level_income: ({ name, levelIncome, levelIncomeCount }) => `${name}، آپ کی مجموعی level income ${levelIncome} ہے اور یہ ${levelIncomeCount} credited level income records سے آئی ہے۔`,
    binary_status: ({ name, leftPv, rightPv, weakerLeg, matchedPv, binaryIncome }) => `${name}، آپ کے binary status میں بائیں طرف ${leftPv} PV اور دائیں طرف ${rightPv} PV ہے۔ آپ کی weaker leg ${weakerLeg} ہے، matched PV ${matchedPv} ہے، اور latest binary income ${binaryIncome} ہے۔`,
    deposit_status: ({ name, totalDeposits, approvedDeposits, pendingDeposits, latestDepositAmount, latestDepositStatus }) => `${name}، آپ کی deposit history میں ${totalDeposits} requests ہیں۔ Approved deposits ${approvedDeposits}، pending deposits ${pendingDeposits}، اور آپ کا latest deposit ${latestDepositAmount} تھا جس کا status ${latestDepositStatus} ہے۔`,
    withdrawal_info: ({ name, availableWithdrawal, pendingWithdrawals, latestWithdrawalStatus }) => `${name}، آپ اس وقت ${availableWithdrawal} تک withdrawal کر سکتے ہیں۔ آپ کی pending withdrawal requests ${pendingWithdrawals} ہیں، اور latest withdrawal status ${latestWithdrawalStatus} ہے۔`,
    growth_strategy: ({ name, targetAmount, targetTeamIncome, activeMembersNeeded, note }) => `${name}، ${targetAmount}/مہینہ ہدف کے لیے تقریباً ${targetTeamIncome} monthly team income پر توجہ دیں اور قریب ${activeMembersNeeded} active income-generating ممبرز برقرار رکھیں۔ ${note}`,
    overview: ({ name, availableBalance, totalIncome, totalTeam }) => `${name}، آپ کے والٹ میں ${availableBalance} ہے، credited income ${totalIncome} ہے، اور آپ کی team size ${totalTeam} ہے۔ آپ والٹ، آمدنی، بائنری اسٹیٹس، deposits، withdrawals یا monthly plan کے بارے میں پوچھ سکتے ہیں۔`
  },
  ar: {
    suggestions: { wallet: 'اعرض محفظتي', income: 'كم يبلغ دخلي؟', deposits: 'اعرض إيداعاتي', withdraw: 'هل أستطيع السحب الآن؟', binary: 'اعرض حالتي الثنائية', team: 'كيف ينمو فريقي؟', level: 'اعرض دخل المستويات', plan100: 'أعطني خطة $100 شهريًا', plan500: 'أعطني خطة $500 شهريًا', plan1000: 'أعطني خطة $1000 شهريًا' },
    strategyNotes: { 100: 'ابدأ بطلبات شخصية منتظمة وعضوين نشطين في الصف الأول.', 500: 'ابنِ نشاطًا متوازنًا في اليمين واليسار حتى ينمو الدخل الثنائي باستمرار.', 1000: 'تابع حجم الثنائية الأسبوعي وعمق التكرار والاحتفاظ شهريًا.' },
    fallback: 'عذرًا، لم أفهم ذلك بوضوح. يمكنك سؤالي عن المحفظة أو الدخل أو الفريق أو الحالة الثنائية أو الإيداعات أو السحب أو استراتيجية الربح.',
    wallet_info: ({ name, availableBalance, incomeBalance, depositBalance, withdrawalBalance, btctBalance }) => `${name}، رصيدك المتاح هو ${availableBalance} ويشمل ${incomeBalance} كدخل، و${depositBalance} كرصيد إيداع، و${withdrawalBalance} كرصيد سحب، و${btctBalance} من BTCT متاحًا.`,
    income_summary: ({ name, totalIncome, directIncome, matchingIncome, levelIncome, latestIncome }) => `${name}، إجمالي الدخل المضاف إلى حسابك هو ${totalIncome}. الدخل المباشر ${directIncome}، والدخل الثنائي ${matchingIncome}، ودخل المستويات ${levelIncome}، وآخر قيد دخل كان ${latestIncome}.`,
    team_summary: ({ name, totalTeam, leftTeam, rightTeam, activeTeam, inactiveTeam }) => `${name}، يضم فريقك ${totalTeam} عضوًا. الجهة اليسرى ${leftTeam} واليمنى ${rightTeam}، مع ${activeTeam} حسابات نشطة و${inactiveTeam} غير نشطة.`,
    level_income: ({ name, levelIncome, levelIncomeCount }) => `${name}، إجمالي دخل المستويات لديك هو ${levelIncome} من ${levelIncomeCount} سجلات دخل مستويات معتمدة.`,
    binary_status: ({ name, leftPv, rightPv, weakerLeg, matchedPv, binaryIncome }) => `${name}، حالتك الثنائية تُظهر ${leftPv} PV في اليسار و${rightPv} PV في اليمين. الجهة الأضعف هي ${weakerLeg}، و${matchedPv} هو PV المتطابق، وآخر دخل ثنائي هو ${binaryIncome}.`,
    deposit_status: ({ name, totalDeposits, approvedDeposits, pendingDeposits, latestDepositAmount, latestDepositStatus }) => `${name}، سجل الإيداع لديك يحتوي على ${totalDeposits} طلبات. الإيداعات المقبولة ${approvedDeposits}، والإيداعات المعلقة ${pendingDeposits}، وآخر إيداع كان ${latestDepositAmount} وحالته ${latestDepositStatus}.`,
    withdrawal_info: ({ name, availableWithdrawal, pendingWithdrawals, latestWithdrawalStatus }) => `${name}، يمكنك السحب الآن من مبلغ ${availableWithdrawal}. لديك ${pendingWithdrawals} طلبات سحب قيد الانتظار، وآخر حالة سحب هي ${latestWithdrawalStatus}.`,
    growth_strategy: ({ name, targetAmount, targetTeamIncome, activeMembersNeeded, note }) => `${name}، لهدف ${targetAmount} شهريًا، ركّز على دخل فريق شهري يقارب ${targetTeamIncome} وحافظ على نحو ${activeMembersNeeded} أعضاء نشطين يحققون دخلاً. ${note}`,
    overview: ({ name, availableBalance, totalIncome, totalTeam }) => `${name}، رصيد محفظتك ${availableBalance}، والدخل المضاف ${totalIncome}، وحجم فريقك ${totalTeam}. يمكنك السؤال عن المحفظة أو الدخل أو الحالة الثنائية أو الإيداعات أو السحب أو الخطة الشهرية.`
  },
  bn: {
    suggestions: { wallet: 'আমার ওয়ালেট দেখাও', income: 'আমার আয় কত?', deposits: 'আমার ডিপোজিট দেখাও', withdraw: 'আমি কি এখন withdrawal করতে পারি?', binary: 'আমার বাইনারি স্ট্যাটাস দেখাও', team: 'আমার টিম কীভাবে বাড়ছে?', level: 'আমার লেভেল ইনকাম দেখাও', plan100: 'আমাকে $100/মাস পরিকল্পনা দাও', plan500: 'আমাকে $500/মাস পরিকল্পনা দাও', plan1000: 'আমাকে $1000/মাস পরিকল্পনা দাও' },
    strategyNotes: { 100: 'নিয়মিত personal ordering এবং দুইজন active frontline সদস্য দিয়ে শুরু করুন।', 500: 'বাম ও ডান দুই পাশেই balanced activity তৈরি করুন যাতে matching income নিয়মিত বাড়ে।', 1000: 'প্রতি মাসে weekly binary volume, duplication depth এবং retention ট্র্যাক করুন।' },
    fallback: 'দুঃখিত, আমি এটি পরিষ্কারভাবে বুঝতে পারিনি। আপনি ওয়ালেট, আয়, টিম, বাইনারি স্ট্যাটাস, ডিপোজিট, withdrawal বা earning strategy সম্পর্কে জিজ্ঞাসা করতে পারেন।',
    wallet_info: ({ name, availableBalance, incomeBalance, depositBalance, withdrawalBalance, btctBalance }) => `${name}, আপনার উপলব্ধ ব্যালেন্স ${availableBalance}। এর মধ্যে ${incomeBalance} ইনকাম ফান্ড, ${depositBalance} ডিপোজিট ফান্ড, ${withdrawalBalance} withdrawal ফান্ড এবং ${btctBalance} BTCT উপলব্ধ আছে।`,
    income_summary: ({ name, totalIncome, directIncome, matchingIncome, levelIncome, latestIncome }) => `${name}, আপনার মোট credited income ${totalIncome}। Direct income ${directIncome}, matching income ${matchingIncome}, level income ${levelIncome}, এবং latest income credit ছিল ${latestIncome}।`,
    team_summary: ({ name, totalTeam, leftTeam, rightTeam, activeTeam, inactiveTeam }) => `${name}, আপনার টিমে ${totalTeam} জন সদস্য আছে। বাম পাশে ${leftTeam}, ডান পাশে ${rightTeam}, যার মধ্যে ${activeTeam} সক্রিয় এবং ${inactiveTeam} নিষ্ক্রিয় অ্যাকাউন্ট আছে।`,
    level_income: ({ name, levelIncome, levelIncomeCount }) => `${name}, আপনার মোট level income ${levelIncome} এবং এটি ${levelIncomeCount} credited level income records থেকে এসেছে।`,
    binary_status: ({ name, leftPv, rightPv, weakerLeg, matchedPv, binaryIncome }) => `${name}, আপনার binary status-এ বাম পাশে ${leftPv} PV এবং ডান পাশে ${rightPv} PV আছে। দুর্বল leg হলো ${weakerLeg}, matched PV হলো ${matchedPv}, এবং latest binary income ${binaryIncome}।`,
    deposit_status: ({ name, totalDeposits, approvedDeposits, pendingDeposits, latestDepositAmount, latestDepositStatus }) => `${name}, আপনার deposit history-তে ${totalDeposits} টি request আছে। Approved deposits ${approvedDeposits}, pending deposits ${pendingDeposits}, এবং আপনার latest deposit ছিল ${latestDepositAmount} যার status ${latestDepositStatus}।`,
    withdrawal_info: ({ name, availableWithdrawal, pendingWithdrawals, latestWithdrawalStatus }) => `${name}, আপনি এখন ${availableWithdrawal} পর্যন্ত withdrawal করতে পারেন। আপনার pending withdrawal requests ${pendingWithdrawals} টি, এবং latest withdrawal status হলো ${latestWithdrawalStatus}।`,
    growth_strategy: ({ name, targetAmount, targetTeamIncome, activeMembersNeeded, note }) => `${name}, ${targetAmount}/মাস লক্ষ্য পেতে প্রায় ${targetTeamIncome} monthly team income-এর দিকে কাজ করুন এবং প্রায় ${activeMembersNeeded} জন active income-generating সদস্য ধরে রাখুন। ${note}`,
    overview: ({ name, availableBalance, totalIncome, totalTeam }) => `${name}, আপনার ওয়ালেটে ${availableBalance} আছে, credited income ${totalIncome}, এবং আপনার team size ${totalTeam}। আপনি wallet, income, binary status, deposits, withdrawals বা monthly plan সম্পর্কে জিজ্ঞাসা করতে পারেন।`
  },
  ps: {
    suggestions: { wallet: 'زما والټ وښایه', income: 'زما عاید څومره دی؟', deposits: 'زما ډیپازټونه وښایه', withdraw: 'ایا زه اوس withdrawal کولی شم؟', binary: 'زما باینري حالت وښایه', team: 'زما ټیم څنګه وده کوي؟', level: 'زما لیول عاید وښایه', plan100: 'ما ته د $100/میاشت پلان راکړه', plan500: 'ما ته د $500/میاشت پلان راکړه', plan1000: 'ما ته د $1000/میاشت پلان راکړه' },
    strategyNotes: { 100: 'پیل د منظم personal ordering او دوو active frontline غړو څخه وکړئ.', 500: 'په کیڼ او ښي دواړو خواوو کې balanced activity جوړه کړئ څو matching income په منظم ډول لوړه شي.', 1000: 'هره میاشت weekly binary volume، duplication depth او retention وڅارئ.' },
    fallback: 'بښنه، زه دا په روښانه ډول ونه پوهېدم. تاسو د والټ، عاید، ټیم، باینري حالت، ډیپازټونو، withdrawal یا earning strategy په اړه پوښتنه کولی شئ.',
    wallet_info: ({ name, availableBalance, incomeBalance, depositBalance, withdrawalBalance, btctBalance }) => `${name}، ستاسو شته بیلنس ${availableBalance} دی او پکې ${incomeBalance} د عاید فنډ، ${depositBalance} د ډیپازټ فنډ، ${withdrawalBalance} withdrawal فنډ، او ${btctBalance} BTCT شته.`,
    income_summary: ({ name, totalIncome, directIncome, matchingIncome, levelIncome, latestIncome }) => `${name}، ستاسو ټول credited income ${totalIncome} دی. Direct income ${directIncome}، matching income ${matchingIncome}، level income ${levelIncome} دی، او latest income credit ${latestIncome} و.`,
    team_summary: ({ name, totalTeam, leftTeam, rightTeam, activeTeam, inactiveTeam }) => `${name}، ستاسو په ټیم کې ${totalTeam} غړي دي. کیڼ اړخ ${leftTeam}، ښي اړخ ${rightTeam}، چې ${activeTeam} فعال او ${inactiveTeam} غیرفعال حسابونه پکې دي.`,
    level_income: ({ name, levelIncome, levelIncomeCount }) => `${name}، ستاسو ټول level income ${levelIncome} دی او دا د ${levelIncomeCount} credited level income records څخه راغلی دی.`,
    binary_status: ({ name, leftPv, rightPv, weakerLeg, matchedPv, binaryIncome }) => `${name}، ستاسو binary status په کیڼ اړخ ${leftPv} PV او په ښي اړخ ${rightPv} PV ښيي. کمزورې leg ${weakerLeg} ده، matched PV ${matchedPv} دی، او latest binary income ${binaryIncome} دی.`,
    deposit_status: ({ name, totalDeposits, approvedDeposits, pendingDeposits, latestDepositAmount, latestDepositStatus }) => `${name}، ستاسو د deposit history کې ${totalDeposits} requests شته. Approved deposits ${approvedDeposits}، pending deposits ${pendingDeposits}، او ستاسو latest deposit ${latestDepositAmount} و چې status یې ${latestDepositStatus} دی.`,
    withdrawal_info: ({ name, availableWithdrawal, pendingWithdrawals, latestWithdrawalStatus }) => `${name}، تاسو همدا اوس تر ${availableWithdrawal} پورې withdrawal کولی شئ. ستاسو pending withdrawal requests ${pendingWithdrawals} دي، او latest withdrawal status ${latestWithdrawalStatus} دی.`,
    growth_strategy: ({ name, targetAmount, targetTeamIncome, activeMembersNeeded, note }) => `${name}، د ${targetAmount}/میاشت هدف لپاره شاوخوا ${targetTeamIncome} monthly team income په نښه کړئ او نږدې ${activeMembersNeeded} active income-generating غړي وساتئ. ${note}`,
    overview: ({ name, availableBalance, totalIncome, totalTeam }) => `${name}، ستاسو د والټ بیلانس ${availableBalance} دی، credited income ${totalIncome} دی، او ستاسو د ټیم اندازه ${totalTeam} ده. تاسو د wallet، income، binary status، deposits، withdrawals یا monthly plan په اړه پوښتنه کولی شئ.`
  }
};

const ACCOUNT_COPY = {
  en: {
    user_identity: ({ username, userId }) => `Your username is ${username} and your ID is ${userId}.`,
    sponsor_info: ({ sponsorName }) => sponsorName ? `Your sponsor is ${sponsorName}.` : 'You do not have a sponsor assigned yet.',
    rank_info: ({ rankName }) => rankName ? `Your current rank is ${rankName}.` : 'Your rank is not assigned yet.',
    direct_referral_summary: ({ directReferrals }) => `You currently have ${directReferrals} direct referrals.`,
    team_activity_summary: ({ activeTeam, totalTeam }) => `Your team has ${activeTeam} active members out of ${totalTeam} total members.`,
    pv_summary: ({ leftPv, rightPv }) => `Your left PV is ${leftPv} and your right PV is ${rightPv}.`,
    placement_summary: ({ placementSide }) => placementSide ? `Your placement side is ${placementSide}.` : 'Your placement side is not assigned yet.',
    income_wallet_summary: ({ incomeBalance }) => `Your income wallet balance is ${incomeBalance}.`,
    deposit_wallet_summary: ({ depositBalance }) => `Your deposit wallet balance is ${depositBalance}.`,
    withdrawal_wallet_summary: ({ withdrawalBalance }) => `Your income wallet balance is ${withdrawalBalance}.`,
    btct_wallet_summary: ({ btctBalance }) => `Your BTCT balance is ${btctBalance}.`,
    total_income_summary: ({ totalIncome }) => `Your total credited income is ${totalIncome}.`,
    binary_summary: ({ leftPv, rightPv, matchedPv, binaryIncome }) => `Your binary summary shows left PV ${leftPv}, right PV ${rightPv}, matched PV ${matchedPv}, and latest binary income ${binaryIncome}.`,
    auction_summary: ({ auctionsJoined, wonAuctions }) => auctionsJoined ? `You joined ${auctionsJoined} auctions and won ${wonAuctions}.` : 'No auction record found yet.',
    seller_status: ({ sellerStatus, canAccessDashboard }) => sellerStatus ? `Your seller status is ${sellerStatus}${canAccessDashboard ? ' and your seller dashboard is active.' : '.'}` : 'You do not have a seller profile yet.'
  },
  hi: {
    user_identity: ({ username, userId }) => `आपका username ${username} है और आपकी ID ${userId} है।`,
    sponsor_info: ({ sponsorName }) => sponsorName ? `आपके sponsor ${sponsorName} हैं।` : 'आपका sponsor अभी assigned नहीं है।',
    rank_info: ({ rankName }) => rankName ? `आपकी current rank ${rankName} है।` : 'आपकी rank अभी assigned नहीं है।',
    direct_referral_summary: ({ directReferrals }) => `आपके पास अभी ${directReferrals} direct referrals हैं।`,
    team_activity_summary: ({ activeTeam, totalTeam }) => `आपकी टीम में ${totalTeam} में से ${activeTeam} active members हैं।`,
    pv_summary: ({ leftPv, rightPv }) => `आपका left PV ${leftPv} है और right PV ${rightPv} है।`,
    placement_summary: ({ placementSide }) => placementSide ? `आपकी placement side ${placementSide} है।` : 'आपकी placement side अभी assigned नहीं है।',
    income_wallet_summary: ({ incomeBalance }) => `आपका income wallet balance ${incomeBalance} है।`,
    deposit_wallet_summary: ({ depositBalance }) => `आपका deposit wallet balance ${depositBalance} है।`,
    withdrawal_wallet_summary: ({ withdrawalBalance }) => `आपका income wallet balance ${withdrawalBalance} है।`,
    btct_wallet_summary: ({ btctBalance }) => `आपका BTCT balance ${btctBalance} है।`,
    total_income_summary: ({ totalIncome }) => `आपकी total credited income ${totalIncome} है।`,
    binary_summary: ({ leftPv, rightPv, matchedPv, binaryIncome }) => `आपके binary summary में left PV ${leftPv}, right PV ${rightPv}, matched PV ${matchedPv} और latest binary income ${binaryIncome} है।`,
    auction_summary: ({ auctionsJoined, wonAuctions }) => auctionsJoined ? `आपने ${auctionsJoined} auctions join किए और ${wonAuctions} जीते।` : 'अभी कोई auction record नहीं मिला।',
    seller_status: ({ sellerStatus, canAccessDashboard }) => sellerStatus ? `आपका seller status ${sellerStatus} है${canAccessDashboard ? ' और seller dashboard active है।' : '।'}` : 'आपकी seller profile अभी नहीं है।'
  },
  ur: {
    user_identity: ({ username, userId }) => `آپ کا username ${username} ہے اور آپ کی ID ${userId} ہے۔`,
    sponsor_info: ({ sponsorName }) => sponsorName ? `آپ کے sponsor ${sponsorName} ہیں۔` : 'آپ کا sponsor ابھی assigned نہیں ہے۔',
    rank_info: ({ rankName }) => rankName ? `آپ کی current rank ${rankName} ہے۔` : 'آپ کی rank ابھی assigned نہیں ہے۔',
    direct_referral_summary: ({ directReferrals }) => `آپ کے پاس اس وقت ${directReferrals} direct referrals ہیں۔`,
    team_activity_summary: ({ activeTeam, totalTeam }) => `آپ کی ٹیم میں ${totalTeam} میں سے ${activeTeam} active members ہیں۔`,
    pv_summary: ({ leftPv, rightPv }) => `آپ کا left PV ${leftPv} ہے اور right PV ${rightPv} ہے۔`,
    placement_summary: ({ placementSide }) => placementSide ? `آپ کی placement side ${placementSide} ہے۔` : 'آپ کی placement side ابھی assigned نہیں ہے۔',
    income_wallet_summary: ({ incomeBalance }) => `آپ کا income wallet balance ${incomeBalance} ہے۔`,
    deposit_wallet_summary: ({ depositBalance }) => `آپ کا deposit wallet balance ${depositBalance} ہے۔`,
    withdrawal_wallet_summary: ({ withdrawalBalance }) => `آپ کا income wallet balance ${withdrawalBalance} ہے۔`,
    btct_wallet_summary: ({ btctBalance }) => `آپ کا BTCT balance ${btctBalance} ہے۔`,
    total_income_summary: ({ totalIncome }) => `آپ کی total credited income ${totalIncome} ہے۔`,
    binary_summary: ({ leftPv, rightPv, matchedPv, binaryIncome }) => `آپ کے binary summary میں left PV ${leftPv}, right PV ${rightPv}, matched PV ${matchedPv} اور latest binary income ${binaryIncome} ہے۔`,
    auction_summary: ({ auctionsJoined, wonAuctions }) => auctionsJoined ? `آپ نے ${auctionsJoined} auctions join کیے اور ${wonAuctions} جیتے۔` : 'ابھی کوئی auction record نہیں ملا۔',
    seller_status: ({ sellerStatus, canAccessDashboard }) => sellerStatus ? `آپ کا seller status ${sellerStatus} ہے${canAccessDashboard ? ' اور seller dashboard active ہے۔' : '۔'}` : 'آپ کی seller profile ابھی نہیں ہے۔'
  },
  ar: {
    user_identity: ({ username, userId }) => `اسم المستخدم الخاص بك هو ${username} ومعرفك هو ${userId}.`,
    sponsor_info: ({ sponsorName }) => sponsorName ? `الراعي الخاص بك هو ${sponsorName}.` : 'ليس لديك راعٍ مخصص بعد.',
    rank_info: ({ rankName }) => rankName ? `رتبتك الحالية هي ${rankName}.` : 'رتبتك غير مخصصة بعد.',
    direct_referral_summary: ({ directReferrals }) => `لديك حاليًا ${directReferrals} إحالات مباشرة.`,
    team_activity_summary: ({ activeTeam, totalTeam }) => `لدى فريقك ${activeTeam} أعضاء نشطون من أصل ${totalTeam}.`,
    pv_summary: ({ leftPv, rightPv }) => `قيمة PV اليسرى لديك ${leftPv} واليمنى ${rightPv}.`,
    placement_summary: ({ placementSide }) => placementSide ? `جهة التمركز الخاصة بك هي ${placementSide}.` : 'جهة التمركز غير محددة بعد.',
    income_wallet_summary: ({ incomeBalance }) => `رصيد محفظة الدخل لديك هو ${incomeBalance}.`,
    deposit_wallet_summary: ({ depositBalance }) => `رصيد محفظة الإيداع لديك هو ${depositBalance}.`,
    withdrawal_wallet_summary: ({ withdrawalBalance }) => `رصيد محفظة الدخل لديك هو ${withdrawalBalance}.`,
    btct_wallet_summary: ({ btctBalance }) => `رصيد BTCT لديك هو ${btctBalance}.`,
    total_income_summary: ({ totalIncome }) => `إجمالي الدخل المعتمد لديك هو ${totalIncome}.`,
    binary_summary: ({ leftPv, rightPv, matchedPv, binaryIncome }) => `ملخصك الثنائي يوضح PV الأيسر ${leftPv} وPV الأيمن ${rightPv} وPV المتطابق ${matchedPv} وآخر دخل ثنائي ${binaryIncome}.`,
    auction_summary: ({ auctionsJoined, wonAuctions }) => auctionsJoined ? `لقد انضممت إلى ${auctionsJoined} مزادات وفزت في ${wonAuctions}.` : 'لا يوجد سجل مزادات حتى الآن.',
    seller_status: ({ sellerStatus, canAccessDashboard }) => sellerStatus ? `حالة البائع لديك هي ${sellerStatus}${canAccessDashboard ? ' ولوحة البائع مفعلة.' : '.'}` : 'ليس لديك ملف بائع حتى الآن.'
  },
  bn: {
    user_identity: ({ username, userId }) => `আপনার username হলো ${username} এবং আপনার ID হলো ${userId}।`,
    sponsor_info: ({ sponsorName }) => sponsorName ? `আপনার sponsor হলেন ${sponsorName}।` : 'আপনার sponsor এখনো assigned হয়নি।',
    rank_info: ({ rankName }) => rankName ? `আপনার current rank হলো ${rankName}।` : 'আপনার rank এখনো assigned হয়নি।',
    direct_referral_summary: ({ directReferrals }) => `আপনার এখন ${directReferrals} টি direct referral আছে।`,
    team_activity_summary: ({ activeTeam, totalTeam }) => `আপনার টিমে ${totalTeam} জনের মধ্যে ${activeTeam} জন active member আছে।`,
    pv_summary: ({ leftPv, rightPv }) => `আপনার left PV ${leftPv} এবং right PV ${rightPv}।`,
    placement_summary: ({ placementSide }) => placementSide ? `আপনার placement side হলো ${placementSide}।` : 'আপনার placement side এখনো assigned হয়নি।',
    income_wallet_summary: ({ incomeBalance }) => `আপনার income wallet balance ${incomeBalance}।`,
    deposit_wallet_summary: ({ depositBalance }) => `আপনার deposit wallet balance ${depositBalance}।`,
    withdrawal_wallet_summary: ({ withdrawalBalance }) => `আপনার income wallet balance ${withdrawalBalance}।`,
    btct_wallet_summary: ({ btctBalance }) => `আপনার BTCT balance ${btctBalance}।`,
    total_income_summary: ({ totalIncome }) => `আপনার total credited income ${totalIncome}।`,
    binary_summary: ({ leftPv, rightPv, matchedPv, binaryIncome }) => `আপনার binary summary-তে left PV ${leftPv}, right PV ${rightPv}, matched PV ${matchedPv} এবং latest binary income ${binaryIncome} আছে।`,
    auction_summary: ({ auctionsJoined, wonAuctions }) => auctionsJoined ? `আপনি ${auctionsJoined} টি auction-এ যোগ দিয়েছেন এবং ${wonAuctions} টি জিতেছেন।` : 'এখনো কোনো auction record পাওয়া যায়নি।',
    seller_status: ({ sellerStatus, canAccessDashboard }) => sellerStatus ? `আপনার seller status ${sellerStatus}${canAccessDashboard ? ' এবং seller dashboard active আছে।' : '।'}` : 'আপনার seller profile এখনো নেই।'
  },
  ps: {
    user_identity: ({ username, userId }) => `ستاسو username ${username} دی او ستاسو ID ${userId} ده.`,
    sponsor_info: ({ sponsorName }) => sponsorName ? `ستاسو sponsor ${sponsorName} دی.` : 'ستاسو sponsor لا نه دی ټاکل شوی.',
    rank_info: ({ rankName }) => rankName ? `ستاسو current rank ${rankName} دی.` : 'ستاسو rank لا نه دی ټاکل شوی.',
    direct_referral_summary: ({ directReferrals }) => `تاسو اوس ${directReferrals} direct referrals لرئ.`,
    team_activity_summary: ({ activeTeam, totalTeam }) => `ستاسو په ټیم کې له ${totalTeam} څخه ${activeTeam} active members دي.`,
    pv_summary: ({ leftPv, rightPv }) => `ستاسو left PV ${leftPv} او right PV ${rightPv} دی.`,
    placement_summary: ({ placementSide }) => placementSide ? `ستاسو placement side ${placementSide} ده.` : 'ستاسو placement side لا نه ده ټاکل شوې.',
    income_wallet_summary: ({ incomeBalance }) => `ستاسو income wallet balance ${incomeBalance} دی.`,
    deposit_wallet_summary: ({ depositBalance }) => `ستاسو deposit wallet balance ${depositBalance} دی.`,
    withdrawal_wallet_summary: ({ withdrawalBalance }) => `ستاسو income wallet balance ${withdrawalBalance} دی.`,
    btct_wallet_summary: ({ btctBalance }) => `ستاسو BTCT balance ${btctBalance} دی.`,
    total_income_summary: ({ totalIncome }) => `ستاسو total credited income ${totalIncome} دی.`,
    binary_summary: ({ leftPv, rightPv, matchedPv, binaryIncome }) => `ستاسو binary summary left PV ${leftPv}, right PV ${rightPv}, matched PV ${matchedPv} او latest binary income ${binaryIncome} ښيي.`,
    auction_summary: ({ auctionsJoined, wonAuctions }) => auctionsJoined ? `تاسو ${auctionsJoined} auctions کې ګډون کړی او ${wonAuctions} مو ګټلي دي.` : 'تر اوسه د auction کوم record نشته.',
    seller_status: ({ sellerStatus, canAccessDashboard }) => sellerStatus ? `ستاسو seller status ${sellerStatus} دی${canAccessDashboard ? ' او seller dashboard فعال دی.' : '.'}` : 'تاسو لا seller profile نه لرئ.'
  }
};

const STRATEGY_COPY = {
  en: {
    current: ({ targetAmount, currentDirects, activeDirects, totalTeam, activeTeam, leftPv, rightPv, currentIncome }) => `For a practical ${targetAmount}/month path, your current base is ${currentDirects} direct referrals, ${activeDirects} active directs, ${activeTeam} active team members out of ${totalTeam}, left PV ${leftPv}, right PV ${rightPv}, and total credited income ${currentIncome}.`,
    gap: {
      beginner: 'You are still at an early stage for this goal, so the first priority is building active direct strength and basic team activity.',
      progressing: 'You already have some base, but you still need better depth and leg balance to move toward this target consistently.',
      advanced: 'You are relatively close in structure, so the focus should be consistency, balance, and stronger active volume.'
    },
    recommendationLabels: {
      increase_directs: ({ count, target }) => `1. Add ${count} more direct referrals and aim for at least ${target} total directs.`,
      activate_directs: ({ count }) => `2. Activate ${count} more direct referrals so they contribute consistently.`,
      grow_active_team: ({ count, target }) => `3. Grow your active team by about ${count} members and work toward ${target} active members.`,
      balance_leg: ({ leg, gapPv }) => `4. Strengthen your ${leg} leg because you currently have an imbalance of about ${gapPv} PV.`,
      activate_deposit: () => '5. Keep deposit or product activity active in your network so income does not depend only on recruitment.',
      maintain_consistency: () => '5. Stay consistent with follow-up, duplication, and weekly team activity instead of chasing one-time spikes.'
    },
    close: 'This is a practical target path, not a guaranteed income promise.'
  },
  hi: {
    current: ({ targetAmount, currentDirects, activeDirects, totalTeam, activeTeam, leftPv, rightPv, currentIncome }) => `${targetAmount}/माह के practical path के लिए आपके पास अभी ${currentDirects} direct referrals, ${activeDirects} active directs, ${totalTeam} में से ${activeTeam} active team members, left PV ${leftPv}, right PV ${rightPv}, और total credited income ${currentIncome} है।`,
    gap: {
      beginner: 'आप अभी इस लक्ष्य के लिए शुरुआती stage पर हैं, इसलिए पहली priority active directs और basic team activity बनाना है।',
      progressing: 'आपके पास कुछ base है, लेकिन इस target की ओर लगातार बढ़ने के लिए और depth और leg balance चाहिए।',
      advanced: 'आप structure के हिसाब से काफ़ी करीब हैं, इसलिए focus consistency, balance और stronger active volume पर होना चाहिए।'
    },
    recommendationLabels: {
      increase_directs: ({ count, target }) => `1. ${count} और direct referrals जोड़ें और कम से कम ${target} total directs का लक्ष्य रखें।`,
      activate_directs: ({ count }) => `2. ${count} और direct referrals को active करें ताकि वे लगातार contribute करें।`,
      grow_active_team: ({ count, target }) => `3. अपनी active team को लगभग ${count} members और बढ़ाएँ और ${target} active members तक पहुँचें।`,
      balance_leg: ({ leg, gapPv }) => `4. अपनी ${leg} leg को मजबूत करें क्योंकि अभी लगभग ${gapPv} PV का imbalance है।`,
      activate_deposit: () => '5. अपनी network में deposit या product activity active रखें ताकि income केवल recruitment पर depend न करे।',
      maintain_consistency: () => '5. केवल one-time spikes के पीछे जाने के बजाय follow-up, duplication और weekly team activity में consistency रखें।'
    },
    close: 'यह practical target path है, guaranteed income promise नहीं।'
  },
  ur: {
    current: ({ targetAmount, currentDirects, activeDirects, totalTeam, activeTeam, leftPv, rightPv, currentIncome }) => `${targetAmount}/مہینہ کے practical path کے لیے آپ کے پاس اس وقت ${currentDirects} direct referrals، ${activeDirects} active directs، ${totalTeam} میں سے ${activeTeam} active team members، left PV ${leftPv}, right PV ${rightPv}، اور total credited income ${currentIncome} ہے۔`,
    gap: {
      beginner: 'آپ ابھی اس ہدف کے لیے ابتدائی stage پر ہیں، اس لیے پہلی priority active directs اور basic team activity بنانا ہے۔',
      progressing: 'آپ کے پاس کچھ base موجود ہے، لیکن اس target کی طرف مستقل بڑھنے کے لیے مزید depth اور leg balance چاہیے۔',
      advanced: 'آپ structure کے لحاظ سے کافی قریب ہیں، اس لیے focus consistency، balance اور stronger active volume پر ہونا چاہیے۔'
    },
    recommendationLabels: {
      increase_directs: ({ count, target }) => `1. ${count} مزید direct referrals شامل کریں اور کم از کم ${target} total directs تک جائیں۔`,
      activate_directs: ({ count }) => `2. ${count} مزید direct referrals کو active کریں تاکہ وہ مسلسل contribute کریں۔`,
      grow_active_team: ({ count, target }) => `3. اپنی active team میں تقریباً ${count} members کا اضافہ کریں اور ${target} active members تک پہنچیں۔`,
      balance_leg: ({ leg, gapPv }) => `4. اپنی ${leg} leg کو مضبوط کریں کیونکہ اس وقت تقریباً ${gapPv} PV کا imbalance ہے۔`,
      activate_deposit: () => '5. اپنی network میں deposit یا product activity active رکھیں تاکہ income صرف recruitment پر depend نہ کرے۔',
      maintain_consistency: () => '5. one-time spikes کے بجائے follow-up، duplication اور weekly team activity میں consistency رکھیں۔'
    },
    close: 'یہ practical target path ہے، guaranteed income promise نہیں۔'
  },
  ar: {
    current: ({ targetAmount, currentDirects, activeDirects, totalTeam, activeTeam, leftPv, rightPv, currentIncome }) => `للوصول بشكل عملي إلى ${targetAmount} شهريًا، لديك حاليًا ${currentDirects} إحالات مباشرة، و${activeDirects} مباشرين نشطين، و${activeTeam} أعضاء نشطين من أصل ${totalTeam}، وPV أيسر ${leftPv} وPV أيمن ${rightPv}، وإجمالي دخل معتمد ${currentIncome}.`,
    gap: {
      beginner: 'أنت ما زلت في مرحلة مبكرة لهذا الهدف، لذا الأولوية الأولى هي بناء إحالات مباشرة نشطة ونشاط أساسي في الفريق.',
      progressing: 'لديك قاعدة أولية، لكنك ما زلت تحتاج إلى عمق أفضل وتوازن أقوى بين الجهتين للوصول إلى هذا الهدف باستمرار.',
      advanced: 'أنت قريب نسبيًا من حيث البنية، لذا يجب أن يكون التركيز على الاستمرارية والتوازن وحجم النشاط الفعلي.'
    },
    recommendationLabels: {
      increase_directs: ({ count, target }) => `1. أضف ${count} إحالات مباشرة جديدة واستهدف الوصول إلى ${target} مباشرين على الأقل.`,
      activate_directs: ({ count }) => `2. فعّل ${count} من الإحالات المباشرة حتى يساهموا بشكل مستمر.`,
      grow_active_team: ({ count, target }) => `3. زد الفريق النشط بنحو ${count} أعضاء واعمل للوصول إلى ${target} أعضاء نشطين.`,
      balance_leg: ({ leg, gapPv }) => `4. قوِّ جهة ${leg} لأن لديك فجوة تقارب ${gapPv} PV حاليًا.`,
      activate_deposit: () => '5. حافظ على نشاط الإيداع أو المنتج داخل شبكتك حتى لا يعتمد الدخل على التجنيد فقط.',
      maintain_consistency: () => '5. ركّز على المتابعة والتكرار والنشاط الأسبوعي المنتظم بدلًا من القفزات المؤقتة.'
    },
    close: 'هذا مسار عملي نحو الهدف وليس وعدًا بدخل مضمون.'
  },
  bn: {
    current: ({ targetAmount, currentDirects, activeDirects, totalTeam, activeTeam, leftPv, rightPv, currentIncome }) => `${targetAmount}/মাসের practical path-এর জন্য আপনার এখন ${currentDirects} direct referrals, ${activeDirects} active directs, ${totalTeam} জনের মধ্যে ${activeTeam} active team members, left PV ${leftPv}, right PV ${rightPv}, এবং total credited income ${currentIncome} আছে।`,
    gap: {
      beginner: 'আপনি এখনো এই লক্ষ্যটির জন্য শুরুর পর্যায়ে আছেন, তাই প্রথম কাজ হলো active directs এবং basic team activity তৈরি করা।',
      progressing: 'আপনার কিছু base আছে, কিন্তু এই target-এর দিকে নিয়মিত যেতে হলে আরও depth এবং leg balance দরকার।',
      advanced: 'স্ট্রাকচারের দিক থেকে আপনি বেশ কাছাকাছি, তাই focus হওয়া উচিত consistency, balance এবং stronger active volume-এ।'
    },
    recommendationLabels: {
      increase_directs: ({ count, target }) => `1. আরও ${count} direct referral যোগ করুন এবং অন্তত ${target} total directs লক্ষ্য করুন।`,
      activate_directs: ({ count }) => `2. আরও ${count} direct referral active করুন যাতে তারা ধারাবাহিকভাবে contribute করে।`,
      grow_active_team: ({ count, target }) => `3. আপনার active team প্রায় ${count} members বাড়ান এবং ${target} active members পর্যন্ত যান।`,
      balance_leg: ({ leg, gapPv }) => `4. আপনার ${leg} leg শক্তিশালী করুন, কারণ এখন প্রায় ${gapPv} PV imbalance আছে।`,
      activate_deposit: () => '5. আপনার network-এ deposit বা product activity active রাখুন যাতে income শুধু recruitment-এর উপর নির্ভর না করে।',
      maintain_consistency: () => '5. one-time spikes-এর বদলে follow-up, duplication এবং weekly team activity-তে consistency রাখুন।'
    },
    close: 'এটি একটি practical target path, guaranteed income promise নয়।'
  },
  ps: {
    current: ({ targetAmount, currentDirects, activeDirects, totalTeam, activeTeam, leftPv, rightPv, currentIncome }) => `د ${targetAmount}/میاشت practical path لپاره تاسو اوس ${currentDirects} direct referrals، ${activeDirects} active directs، له ${totalTeam} څخه ${activeTeam} active team members، left PV ${leftPv}, right PV ${rightPv}، او total credited income ${currentIncome} لرئ.`,
    gap: {
      beginner: 'تاسو لا د دې هدف لپاره په لومړني پړاو کې یاست، نو لومړیتوب active directs او basic team activity جوړول دي.',
      progressing: 'تاسو یو څه base لرئ، خو دې target ته د منظم نږدې کېدو لپاره لا ډېره depth او leg balance ته اړتیا لرئ.',
      advanced: 'تاسو د structure له پلوه نسبتاً نږدې یاست، نو focus باید پر consistency، balance او stronger active volume وي.'
    },
    recommendationLabels: {
      increase_directs: ({ count, target }) => `1. نور ${count} direct referrals زیات کړئ او لږ تر لږه ${target} total directs ته ورسېږئ.`,
      activate_directs: ({ count }) => `2. نور ${count} direct referrals active کړئ څو په دوامداره ډول contribute وکړي.`,
      grow_active_team: ({ count, target }) => `3. خپله active team شاوخوا ${count} members زیاته کړئ او ${target} active members ته ورسېږئ.`,
      balance_leg: ({ leg, gapPv }) => `4. خپله ${leg} leg پیاوړې کړئ، ځکه اوس نږدې ${gapPv} PV imbalance لرئ.`,
      activate_deposit: () => '5. په خپله network کې deposit یا product activity active وساتئ څو income یوازې پر recruitment ولاړ نه وي.',
      maintain_consistency: () => '5. د one-time spikes پر ځای follow-up، duplication او weekly team activity کې consistency وساتئ.'
    },
    close: 'دا یو practical target path دی، guaranteed income promise نه دی.'
  }
};

const SMART_SUGGESTION_COPY = {
  en: {
    intro: 'Here are your current smart suggestions based on your account state.',
    add_directs: ({ count }) => `You need about ${count} more direct referrals to strengthen your income base.`,
    activate_directs: ({ count }) => `You should activate ${count} more direct referrals so your frontline contributes consistently.`,
    balance_leg: ({ leg, gapPv }) => `Your ${leg} side is weaker by about ${gapPv} PV. Balance that leg to improve matching income.`,
    grow_team_activity: ({ activeTeam, totalTeam }) => `Your team activity is still light. Only ${activeTeam} out of ${totalTeam} team members are active right now.`,
    improve_income: () => 'Your current income base is still low. Focus on active directs, weekly follow-up, and stronger team activity.',
    activate_network: () => 'Your account needs stronger deposit or product activity to support steady income growth.',
    maintain_consistency: () => 'You are getting closer to stronger results. Stay consistent with follow-up, duplication, and team balance.'
  },
  hi: {
    intro: 'यह आपकी current account state के आधार पर smart suggestions हैं।',
    add_directs: ({ count }) => `आपको अपनी income base मजबूत करने के लिए लगभग ${count} और direct referrals की जरूरत है।`,
    activate_directs: ({ count }) => `आपको ${count} और direct referrals active करने चाहिए ताकि आपकी frontline लगातार contribute करे।`,
    balance_leg: ({ leg, gapPv }) => `आपकी ${leg} side लगभग ${gapPv} PV से कमजोर है। Matching income सुधारने के लिए इस leg को balance करें।`,
    grow_team_activity: ({ activeTeam, totalTeam }) => `आपकी team activity अभी कम है। ${totalTeam} में से केवल ${activeTeam} team members active हैं।`,
    improve_income: () => 'आपकी current income base अभी कम है। Active directs, weekly follow-up और बेहतर team activity पर ध्यान दें।',
    activate_network: () => 'स्थिर income growth के लिए आपके account में बेहतर deposit या product activity की जरूरत है।',
    maintain_consistency: () => 'आप बेहतर results के करीब हैं। Follow-up, duplication और team balance में consistency रखें।'
  },
  ur: {
    intro: 'یہ آپ کی current account state کے مطابق smart suggestions ہیں۔',
    add_directs: ({ count }) => `آپ کو اپنی income base مضبوط کرنے کے لیے تقریباً ${count} مزید direct referrals کی ضرورت ہے۔`,
    activate_directs: ({ count }) => `آپ کو ${count} مزید direct referrals active کرنے چاہییں تاکہ آپ کی frontline مسلسل contribute کرے۔`,
    balance_leg: ({ leg, gapPv }) => `آپ کی ${leg} side تقریباً ${gapPv} PV سے کمزور ہے۔ Matching income بہتر کرنے کے لیے اس leg کو balance کریں۔`,
    grow_team_activity: ({ activeTeam, totalTeam }) => `آپ کی team activity ابھی کم ہے۔ ${totalTeam} میں سے صرف ${activeTeam} team members active ہیں۔`,
    improve_income: () => 'آپ کی current income base ابھی کم ہے۔ Active directs، weekly follow-up اور بہتر team activity پر توجہ دیں۔',
    activate_network: () => 'مستحکم income growth کے لیے آپ کے account میں بہتر deposit یا product activity کی ضرورت ہے۔',
    maintain_consistency: () => 'آپ بہتر results کے قریب ہیں۔ Follow-up، duplication اور team balance میں consistency برقرار رکھیں۔'
  },
  ar: {
    intro: 'إليك اقتراحاتك الذكية الحالية بناءً على حالة حسابك.',
    add_directs: ({ count }) => `تحتاج إلى حوالي ${count} إحالات مباشرة إضافية لتقوية قاعدة دخلك.`,
    activate_directs: ({ count }) => `يجب تفعيل ${count} من الإحالات المباشرة بشكل أكبر حتى تساهم باستمرار.`,
    balance_leg: ({ leg, gapPv }) => `جانبك ${leg} أضعف بحوالي ${gapPv} PV. وازن هذا الجانب لتحسين دخل المطابقة.`,
    grow_team_activity: ({ activeTeam, totalTeam }) => `نشاط فريقك ما زال منخفضًا. فقط ${activeTeam} من أصل ${totalTeam} أعضاء نشطون الآن.`,
    improve_income: () => 'قاعدة دخلك الحالية ما زالت منخفضة. ركز على الإحالات النشطة والمتابعة الأسبوعية ونشاط الفريق.',
    activate_network: () => 'يحتاج حسابك إلى نشاط إيداع أو نشاط منتج أقوى لدعم نمو دخل ثابت.',
    maintain_consistency: () => 'أنت تقترب من نتائج أقوى. حافظ على الاستمرارية في المتابعة والتكرار وتوازن الفريق.'
  },
  bn: {
    intro: 'এগুলো আপনার current account state-এর ভিত্তিতে smart suggestion।',
    add_directs: ({ count }) => `আপনার income base শক্ত করতে আরও প্রায় ${count} direct referral দরকার।`,
    activate_directs: ({ count }) => `আপনার আরও ${count} direct referral active করা উচিত, যাতে আপনার frontline নিয়মিত contribute করে।`,
    balance_leg: ({ leg, gapPv }) => `আপনার ${leg} side প্রায় ${gapPv} PV কম। Matching income বাড়াতে এই leg balance করুন।`,
    grow_team_activity: ({ activeTeam, totalTeam }) => `আপনার team activity এখনো কম। ${totalTeam} জনের মধ্যে মাত্র ${activeTeam} জন active আছে।`,
    improve_income: () => 'আপনার current income base এখনো কম। Active direct, weekly follow-up এবং শক্ত team activity-তে ফোকাস করুন।',
    activate_network: () => 'স্থিতিশীল income growth-এর জন্য আপনার account-এ আরও শক্ত deposit বা product activity দরকার।',
    maintain_consistency: () => 'আপনি আরও ভালো result-এর কাছে আছেন। Follow-up, duplication এবং team balance-এ consistency বজায় রাখুন।'
  },
  ps: {
    intro: 'دا ستاسو د current account state پر بنسټ smart suggestions دي.',
    add_directs: ({ count }) => `تاسو ته د خپل income base د قوي کولو لپاره شاوخوا ${count} نور direct referrals پکار دي.`,
    activate_directs: ({ count }) => `تاسو باید ${count} نور direct referrals active کړئ څو ستاسو frontline په پرله‌پسې ډول contribute وکړي.`,
    balance_leg: ({ leg, gapPv }) => `ستاسو ${leg} side شاوخوا ${gapPv} PV کمزورې ده. د matching income د ښه کولو لپاره دا leg balance کړئ.`,
    grow_team_activity: ({ activeTeam, totalTeam }) => `ستاسو team activity لا هم کمه ده. له ${totalTeam} څخه یوازې ${activeTeam} team members active دي.`,
    improve_income: () => 'ستاسو current income base لا هم کمه ده. په active directs، weekly follow-up او قوي team activity تمرکز وکړئ.',
    activate_network: () => 'د ثابت income growth لپاره ستاسو account ته لا قوي deposit یا product activity پکار ده.',
    maintain_consistency: () => 'تاسو لا قوي results ته نږدې یاست. په follow-up، duplication او team balance کې consistency وساتئ.'
  }
};

const RELIABILITY_COPY = {
  en: {
    unknown: 'Sorry, I couldn’t understand that clearly. You can ask me about your wallet, income, team, binary status, deposits, withdrawals, or earning strategy.',
    unavailable: 'Some of your account data is temporarily unavailable right now. Please try again in a moment.',
    noDeposit: 'No deposit record found yet.',
    noWithdrawal: 'You have not made a withdrawal yet.',
    noIncome: 'No credited income record found yet.',
    noLevelIncome: 'No level income record found yet.',
    btctUnavailable: 'BTCT data is currently unavailable.'
  },
  hi: {
    unknown: 'माफ़ कीजिए, मैं इसे साफ़ तौर पर समझ नहीं पाया। आप मुझसे वॉलेट, इनकम, टीम, बाइनरी स्टेटस, डिपॉजिट, withdrawal या earning strategy के बारे में पूछ सकते हैं।',
    unavailable: 'आपके account का कुछ data अभी अस्थायी रूप से उपलब्ध नहीं है। कृपया थोड़ी देर बाद फिर कोशिश करें।',
    noDeposit: 'अभी तक कोई deposit record नहीं मिला।',
    noWithdrawal: 'आपने अभी तक कोई withdrawal नहीं किया है।',
    noIncome: 'अभी तक कोई credited income record नहीं मिला।',
    noLevelIncome: 'अभी तक कोई level income record नहीं मिला।',
    btctUnavailable: 'BTCT data अभी उपलब्ध नहीं है।'
  },
  ur: {
    unknown: 'معذرت، میں اسے واضح طور پر سمجھ نہیں سکا۔ آپ مجھ سے wallet، income، team، binary status، deposits، withdrawals یا earning strategy کے بارے میں پوچھ سکتے ہیں۔',
    unavailable: 'آپ کے account کا کچھ data اس وقت عارضی طور پر دستیاب نہیں ہے۔ براہِ کرم تھوڑی دیر بعد دوبارہ کوشش کریں۔',
    noDeposit: 'ابھی تک کوئی deposit record نہیں ملا۔',
    noWithdrawal: 'آپ نے ابھی تک کوئی withdrawal نہیں کیا۔',
    noIncome: 'ابھی تک کوئی credited income record نہیں ملا۔',
    noLevelIncome: 'ابھی تک کوئی level income record نہیں ملا۔',
    btctUnavailable: 'BTCT data اس وقت دستیاب نہیں ہے۔'
  },
  ar: {
    unknown: 'عذرًا، لم أفهم ذلك بوضوح. يمكنك أن تسألني عن المحفظة أو الدخل أو الفريق أو الحالة الثنائية أو الإيداعات أو السحوبات أو خطة الأرباح.',
    unavailable: 'بعض بيانات حسابك غير متاحة مؤقتًا الآن. يرجى المحاولة مرة أخرى بعد قليل.',
    noDeposit: 'لا يوجد سجل إيداع حتى الآن.',
    noWithdrawal: 'لم تقم بأي عملية سحب حتى الآن.',
    noIncome: 'لا يوجد سجل دخل معتمد حتى الآن.',
    noLevelIncome: 'لا يوجد سجل دخل مستويات حتى الآن.',
    btctUnavailable: 'بيانات BTCT غير متاحة حاليًا.'
  },
  bn: {
    unknown: 'দুঃখিত, আমি এটি পরিষ্কারভাবে বুঝতে পারিনি। আপনি আমাকে wallet, income, team, binary status, deposits, withdrawals বা earning strategy সম্পর্কে জিজ্ঞাসা করতে পারেন।',
    unavailable: 'আপনার account-এর কিছু data এখন অস্থায়ীভাবে পাওয়া যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।',
    noDeposit: 'এখনও কোনো deposit record পাওয়া যায়নি।',
    noWithdrawal: 'আপনি এখনও কোনো withdrawal করেননি।',
    noIncome: 'এখনও কোনো credited income record পাওয়া যায়নি।',
    noLevelIncome: 'এখনও কোনো level income record পাওয়া যায়নি।',
    btctUnavailable: 'BTCT data বর্তমানে পাওয়া যাচ্ছে না।'
  },
  ps: {
    unknown: 'بخښنه، زه یې په روښانه ډول ونه پوهېدم. تاسو کولی شئ له ما څخه د wallet، income، team، binary status، deposits، withdrawals یا earning strategy په اړه وپوښتئ.',
    unavailable: 'ستاسو د account ځینې data اوس مهال په لنډ وخت کې شتون نه لري. مهرباني وکړئ لږ وروسته بیا هڅه وکړئ.',
    noDeposit: 'تر اوسه د deposit هېڅ record نشته.',
    noWithdrawal: 'تاسو تر اوسه هېڅ withdrawal نه دی کړی.',
    noIncome: 'تر اوسه هېڅ credited income record نشته.',
    noLevelIncome: 'تر اوسه هېڅ level income record نشته.',
    btctUnavailable: 'د BTCT data اوس مهال شتون نه لري.'
  }
};

const ROADMAP_COPY = {
  en: {
    earningIntro: ({ targetAmount, scale, currentIncome }) => `To move toward ${targetAmount} per month, I’m treating this as a ${scale} target based on your current credited income of ${currentIncome}.`,
    earningNoTarget: ({ targetAmount, currentIncome }) => `To grow your income from the current level of ${currentIncome}, a practical next milestone is ${targetAmount} per month.`,
    teamIntro: ({ currentDirects, activeDirects, totalTeam, activeTeam, leftPv, rightPv }) => `Your current base is ${currentDirects} directs, ${activeDirects} active directs, ${activeTeam} active team members out of ${totalTeam}, with left PV ${leftPv} and right PV ${rightPv}.`,
    auctionIntro: ({ auctionsJoined, wonAuctions }) => auctionsJoined > 0 ? `You have joined ${auctionsJoined} auctions and won ${wonAuctions} so far.` : 'You do not have auction results yet, so the best approach is disciplined low-risk bidding and rule clarity first.',
    nextStep: 'Practical next step:',
    motivation: {
      beginner: 'Stay consistent and build real active directs.',
      growth: 'Daily disciplined action matters more than random effort.',
      serious: 'Focus on stable duplication and balanced volume.',
      large: 'Large targets need patience, structure, and strong active depth.'
    },
    teamMotivation: 'Focus on balancing your weaker leg and activating real members.',
    auctionMotivation: 'Smart bidding discipline usually beats emotional bidding.',
    recommendationLabels: {
      increase_directs: ({ count, target }) => `Add ${count} more direct referrals and work toward at least ${target} total directs.`,
      activate_directs: ({ count }) => `Help ${count} more direct referrals become active so your frontline starts producing consistently.`,
      grow_active_team: ({ count, target }) => `Increase active team depth by about ${count} members and move toward ${target} active members.`,
      balance_leg: ({ leg, gapPv }) => `Strengthen your ${leg} leg because you currently have an imbalance of about ${gapPv} PV.`,
      activate_deposit: () => 'Keep deposit or product activity active in your network so growth does not depend only on recruitment.',
      maintain_consistency: () => 'Maintain weekly follow-up, duplication, and balance instead of chasing one-time spikes.',
      unlock_levels: ({ directsNeeded }) => `Add about ${directsNeeded} more strong directs to improve your level-income potential and unlock more depth.`,
      auction_rules: () => 'Understand the live auction rules first and avoid guessing with random high bids.',
      auction_middle: () => 'Do not depend only on highest or last bids. Controlled middle-range bidding often protects your budget better.',
      auction_timing: () => 'Watch bid timing, past price movement, and entry discipline instead of reacting emotionally.',
      auction_budget: () => 'Set a fixed auction budget before bidding so one session does not damage your working capital.'
    },
    close: 'This is a practical roadmap based on your current account state, not a guaranteed income promise.'
  },
  hi: {
    earningIntro: ({ targetAmount, scale, currentIncome }) => `${targetAmount} प्रति माह की ओर बढ़ने के लिए मैं इसे आपके current credited income ${currentIncome} के आधार पर ${scale} target मान रहा हूँ।`,
    earningNoTarget: ({ targetAmount, currentIncome }) => `आपके current income level ${currentIncome} से आगे बढ़ने के लिए ${targetAmount} प्रति माह एक practical next milestone है।`,
    teamIntro: ({ currentDirects, activeDirects, totalTeam, activeTeam, leftPv, rightPv }) => `अभी आपके पास ${currentDirects} directs, ${activeDirects} active directs, ${totalTeam} में से ${activeTeam} active team members, left PV ${leftPv} और right PV ${rightPv} हैं।`,
    auctionIntro: ({ auctionsJoined, wonAuctions }) => auctionsJoined > 0 ? `आपने अब तक ${auctionsJoined} auctions join किए हैं और ${wonAuctions} जीते हैं।` : 'अभी आपके पास auction result history नहीं है, इसलिए low-risk disciplined bidding और rules clarity से शुरुआत करें।',
    nextStep: 'Practical next step:',
    motivation: {
      beginner: 'Consistency रखें और real active directs बनाइए।',
      growth: 'रोज़ का disciplined action random effort से ज्यादा असर करता है।',
      serious: 'Stable duplication और balanced volume पर ध्यान दें।',
      large: 'बड़े targets के लिए patience, structure और strong active depth चाहिए।'
    },
    teamMotivation: 'अपनी weaker leg को balance करने और real members को active करने पर ध्यान दें।',
    auctionMotivation: 'Smart bidding discipline अक्सर emotional bidding से बेहतर काम करती है।',
    recommendationLabels: {
      increase_directs: ({ count, target }) => `${count} और direct referrals जोड़ें और कम से कम ${target} total directs की ओर बढ़ें।`,
      activate_directs: ({ count }) => `${count} और direct referrals को active करें ताकि आपकी frontline लगातार production दे।`,
      grow_active_team: ({ count, target }) => `अपनी active team को लगभग ${count} members बढ़ाएँ और ${target} active members की ओर बढ़ें।`,
      balance_leg: ({ leg, gapPv }) => `अपनी ${leg} leg को मजबूत करें क्योंकि अभी लगभग ${gapPv} PV imbalance है।`,
      activate_deposit: () => 'अपनी network में deposit या product activity active रखें ताकि growth सिर्फ recruitment पर depend न करे।',
      maintain_consistency: () => 'One-time spikes के बजाय weekly follow-up, duplication और balance बनाए रखें।',
      unlock_levels: ({ directsNeeded }) => `${directsNeeded} और strong directs जोड़ें ताकि level-income potential और depth improve हो सके।`,
      auction_rules: () => 'पहले live auction rules साफ़ समझें, फिर random high bids से बचें।',
      auction_middle: () => 'सिर्फ highest या last bid पर निर्भर न रहें। Controlled middle-range bidding अक्सर budget को बेहतर protect करती है।',
      auction_timing: () => 'Emotionally react करने के बजाय bid timing, past price movement और entry discipline देखें।',
      auction_budget: () => 'Bidding से पहले fixed auction budget तय करें ताकि एक session working capital को damage न करे।'
    },
    close: 'यह आपके current account state पर आधारित practical roadmap है, guaranteed income promise नहीं।'
  },
  ur: {
    earningIntro: ({ targetAmount, scale, currentIncome }) => `${targetAmount} ماہانہ کی طرف بڑھنے کے لیے میں اسے آپ کی current credited income ${currentIncome} کے مطابق ${scale} target سمجھ رہا ہوں۔`,
    earningNoTarget: ({ targetAmount, currentIncome }) => `آپ کی current income level ${currentIncome} سے آگے بڑھنے کے لیے ${targetAmount} ماہانہ ایک practical next milestone ہے۔`,
    teamIntro: ({ currentDirects, activeDirects, totalTeam, activeTeam, leftPv, rightPv }) => `اس وقت آپ کے پاس ${currentDirects} directs، ${activeDirects} active directs، ${totalTeam} میں سے ${activeTeam} active team members، left PV ${leftPv} اور right PV ${rightPv} ہیں۔`,
    auctionIntro: ({ auctionsJoined, wonAuctions }) => auctionsJoined > 0 ? `آپ اب تک ${auctionsJoined} auctions میں شامل ہوئے ہیں اور ${wonAuctions} جیتے ہیں۔` : 'ابھی آپ کے پاس auction result history نہیں ہے، اس لیے low-risk disciplined bidding اور rules clarity سے آغاز کریں۔',
    nextStep: 'Practical next step:',
    motivation: {
      beginner: 'Consistency رکھیں اور real active directs بنائیں۔',
      growth: 'روزانہ disciplined action random effort سے زیادہ اثر کرتا ہے۔',
      serious: 'Stable duplication اور balanced volume پر توجہ دیں۔',
      large: 'بڑے targets کے لیے patience، structure اور strong active depth چاہیے۔'
    },
    teamMotivation: 'اپنی weaker leg کو balance کرنے اور real members کو active کرنے پر توجہ دیں۔',
    auctionMotivation: 'Smart bidding discipline اکثر emotional bidding سے بہتر ہوتی ہے۔',
    recommendationLabels: {
      increase_directs: ({ count, target }) => `${count} مزید direct referrals بڑھائیں اور کم از کم ${target} total directs کی طرف جائیں۔`,
      activate_directs: ({ count }) => `${count} مزید direct referrals کو active کریں تاکہ آپ کی frontline مسلسل production دے۔`,
      grow_active_team: ({ count, target }) => `اپنی active team کو تقریباً ${count} members بڑھائیں اور ${target} active members کی طرف جائیں۔`,
      balance_leg: ({ leg, gapPv }) => `اپنی ${leg} leg کو مضبوط کریں کیونکہ ابھی تقریباً ${gapPv} PV imbalance ہے۔`,
      activate_deposit: () => 'اپنی network میں deposit یا product activity active رکھیں تاکہ growth صرف recruitment پر depend نہ کرے۔',
      maintain_consistency: () => 'One-time spikes کے بجائے weekly follow-up، duplication اور balance برقرار رکھیں۔',
      unlock_levels: ({ directsNeeded }) => `${directsNeeded} مزید strong directs بڑھائیں تاکہ level-income potential اور depth بہتر ہو سکے۔`,
      auction_rules: () => 'پہلے live auction rules واضح طور پر سمجھیں اور random high bids سے بچیں۔',
      auction_middle: () => 'صرف highest یا last bid پر depend نہ کریں۔ Controlled middle-range bidding اکثر budget کو بہتر protect کرتی ہے۔',
      auction_timing: () => 'جذباتی reaction کے بجائے bid timing، past price movement اور entry discipline دیکھیں۔',
      auction_budget: () => 'Bidding سے پہلے fixed auction budget طے کریں تاکہ ایک session working capital کو نقصان نہ دے۔'
    },
    close: 'یہ آپ کے current account state پر مبنی practical roadmap ہے، guaranteed income promise نہیں۔'
  },
  ar: {
    earningIntro: ({ targetAmount, scale, currentIncome }) => `للتحرك نحو ${targetAmount} شهريًا، أتعامل مع هذا كهدف ${scale} بناءً على دخلك المعتمد الحالي ${currentIncome}.`,
    earningNoTarget: ({ targetAmount, currentIncome }) => `للنمو من مستوى دخلك الحالي ${currentIncome} فإن ${targetAmount} شهريًا يعد خطوة عملية تالية.`,
    teamIntro: ({ currentDirects, activeDirects, totalTeam, activeTeam, leftPv, rightPv }) => `لديك الآن ${currentDirects} إحالات مباشرة و${activeDirects} مباشرة نشطة و${activeTeam} أعضاء نشطين من أصل ${totalTeam} مع left PV ${leftPv} وright PV ${rightPv}.`,
    auctionIntro: ({ auctionsJoined, wonAuctions }) => auctionsJoined > 0 ? `لقد دخلت ${auctionsJoined} مزادات وفزت في ${wonAuctions} منها حتى الآن.` : 'لا يوجد لديك سجل مزادات بعد، لذلك ابدأ أولًا بانضباط منخفض المخاطر وفهم واضح للقواعد.',
    nextStep: 'الخطوة العملية التالية:',
    motivation: {
      beginner: 'حافظ على الاستمرارية وابنِ إحالات مباشرة نشطة حقيقية.',
      growth: 'العمل المنضبط يوميًا أقوى من الجهد العشوائي.',
      serious: 'ركز على التكرار المستقر والحجم المتوازن.',
      large: 'الأهداف الكبيرة تحتاج إلى صبر وهيكل وعمق نشط قوي.'
    },
    teamMotivation: 'ركز على تقوية الجانب الأضعف وتنشيط الأعضاء الحقيقيين.',
    auctionMotivation: 'انضباط المزايدة الذكي يتفوق غالبًا على المزايدة العاطفية.',
    recommendationLabels: {
      increase_directs: ({ count, target }) => `أضف ${count} إحالات مباشرة أخرى وتحرك نحو ${target} إحالات مباشرة على الأقل.`,
      activate_directs: ({ count }) => `نشّط ${count} إحالات مباشرة إضافية حتى يبدأ خطك الأمامي في الإنتاج باستمرار.`,
      grow_active_team: ({ count, target }) => `زد عمق الفريق النشط بحوالي ${count} أعضاء وتحرك نحو ${target} أعضاء نشطين.`,
      balance_leg: ({ leg, gapPv }) => `قوِّ جهة ${leg} لأن لديك الآن فجوة تقارب ${gapPv} PV.`,
      activate_deposit: () => 'حافظ على نشاط الإيداع أو المنتج داخل شبكتك حتى لا يعتمد النمو على التجنيد فقط.',
      maintain_consistency: () => 'حافظ على المتابعة الأسبوعية والتكرار والتوازن بدلًا من مطاردة القفزات المؤقتة.',
      unlock_levels: ({ directsNeeded }) => `أضف حوالي ${directsNeeded} إحالات مباشرة قوية لتحسين فرصة دخل المستويات وفتح عمق أكبر.`,
      auction_rules: () => 'افهم قواعد المزاد المباشر أولًا ولا تعتمد على التخمين مع العروض العالية العشوائية.',
      auction_middle: () => 'لا تعتمد فقط على أعلى عرض أو آخر عرض. المزايدة المتوسطة المنضبطة غالبًا تحمي ميزانيتك بشكل أفضل.',
      auction_timing: () => 'راقب توقيت العروض وحركة السعر السابقة وانضباط الدخول بدلًا من رد الفعل العاطفي.',
      auction_budget: () => 'حدد ميزانية ثابتة للمزاد قبل الدخول حتى لا تؤثر جلسة واحدة على رأس مالك.'
    },
    close: 'هذه خريطة عملية مبنية على حالة حسابك الحالية وليست وعدًا بدخل مضمون.'
  },
  bn: {
    earningIntro: ({ targetAmount, scale, currentIncome }) => `${targetAmount} মাসিকের দিকে যেতে আমি এটিকে আপনার current credited income ${currentIncome} অনুযায়ী ${scale} target হিসেবে ধরছি।`,
    earningNoTarget: ({ targetAmount, currentIncome }) => `আপনার current income level ${currentIncome} থেকে বাড়তে ${targetAmount} মাসিক একটি practical next milestone।`,
    teamIntro: ({ currentDirects, activeDirects, totalTeam, activeTeam, leftPv, rightPv }) => `এখন আপনার ${currentDirects} directs, ${activeDirects} active directs, ${totalTeam} জনের মধ্যে ${activeTeam} active team members, left PV ${leftPv} এবং right PV ${rightPv} আছে।`,
    auctionIntro: ({ auctionsJoined, wonAuctions }) => auctionsJoined > 0 ? `আপনি এখন পর্যন্ত ${auctionsJoined} auctions-এ অংশ নিয়েছেন এবং ${wonAuctions} জিতেছেন।` : 'এখনও আপনার auction result history নেই, তাই low-risk disciplined bidding এবং rules clarity দিয়ে শুরু করুন।',
    nextStep: 'Practical next step:',
    motivation: {
      beginner: 'Consistency রাখুন এবং real active directs তৈরি করুন।',
      growth: 'প্রতিদিন disciplined action random effort-এর চেয়ে বেশি কাজে দেয়।',
      serious: 'Stable duplication এবং balanced volume-এ ফোকাস করুন।',
      large: 'বড় target-এর জন্য patience, structure এবং strong active depth দরকার।'
    },
    teamMotivation: 'আপনার weaker leg balance করা এবং real members active করার দিকে ফোকাস করুন।',
    auctionMotivation: 'Smart bidding discipline সাধারণত emotional bidding-এর চেয়ে ভালো কাজ করে।',
    recommendationLabels: {
      increase_directs: ({ count, target }) => `${count} আরও direct referrals যোগ করুন এবং অন্তত ${target} total directs-এর দিকে এগোন।`,
      activate_directs: ({ count }) => `${count} আরও direct referrals active করুন যাতে আপনার frontline নিয়মিত production দেয়।`,
      grow_active_team: ({ count, target }) => `আপনার active team প্রায় ${count} members বাড়ান এবং ${target} active members-এর দিকে এগোন।`,
      balance_leg: ({ leg, gapPv }) => `আপনার ${leg} leg শক্ত করুন কারণ এখন প্রায় ${gapPv} PV imbalance আছে।`,
      activate_deposit: () => 'আপনার network-এ deposit বা product activity active রাখুন যাতে growth শুধু recruitment-এর উপর depend না করে।',
      maintain_consistency: () => 'One-time spikes-এর পেছনে না ছুটে weekly follow-up, duplication এবং balance বজায় রাখুন।',
      unlock_levels: ({ directsNeeded }) => `প্রায় ${directsNeeded} আরও strong directs যোগ করুন যাতে level-income potential এবং depth বাড়ে।`,
      auction_rules: () => 'প্রথমে live auction rules পরিষ্কারভাবে বুঝুন এবং random high bid থেকে দূরে থাকুন।',
      auction_middle: () => 'শুধু highest বা last bid-এর উপর নির্ভর করবেন না। Controlled middle-range bidding অনেক সময় budget ভালোভাবে protect করে।',
      auction_timing: () => 'Emotional reaction না দিয়ে bid timing, past price movement এবং entry discipline দেখুন।',
      auction_budget: () => 'Bidding-এর আগে fixed auction budget ঠিক করুন যাতে এক session working capital ক্ষতি না করে।'
    },
    close: 'এটি আপনার current account state-এর উপর ভিত্তি করে practical roadmap, guaranteed income promise নয়।'
  },
  ps: {
    earningIntro: ({ targetAmount, scale, currentIncome }) => `د ${targetAmount} میاشتني هدف پر لور د تګ لپاره زه دا ستاسو د current credited income ${currentIncome} له مخې د ${scale} target په توګه ګورم.`,
    earningNoTarget: ({ targetAmount, currentIncome }) => `ستاسو د current income level ${currentIncome} څخه د لوړېدو لپاره ${targetAmount} میاشتنی یو practical next milestone دی.`,
    teamIntro: ({ currentDirects, activeDirects, totalTeam, activeTeam, leftPv, rightPv }) => `اوس ستاسو ${currentDirects} directs، ${activeDirects} active directs، له ${totalTeam} څخه ${activeTeam} active team members، left PV ${leftPv} او right PV ${rightPv} دي.`,
    auctionIntro: ({ auctionsJoined, wonAuctions }) => auctionsJoined > 0 ? `تاسو تر اوسه ${auctionsJoined} auctions کې برخه اخیستې او ${wonAuctions} مو ګټلي دي.` : 'تر اوسه ستاسو auction result history نشته، نو د low-risk disciplined bidding او rules clarity څخه پیل وکړئ.',
    nextStep: 'Practical next step:',
    motivation: {
      beginner: 'Consistency وساتئ او real active directs جوړ کړئ.',
      growth: 'ورځنی disciplined action د random effort په پرتله ډېر اغېز لري.',
      serious: 'په stable duplication او balanced volume تمرکز وکړئ.',
      large: 'لوی target patience، structure او strong active depth ته اړتیا لري.'
    },
    teamMotivation: 'په weaker leg balance کولو او real members active کولو تمرکز وکړئ.',
    auctionMotivation: 'Smart bidding discipline اکثره له emotional bidding څخه ښه وي.',
    recommendationLabels: {
      increase_directs: ({ count, target }) => `${count} نور direct referrals زیات کړئ او لږ تر لږه ${target} total directs ته ورسېږئ.`,
      activate_directs: ({ count }) => `${count} نور direct referrals active کړئ څو ستاسو frontline پرله‌پسې production ورکړي.`,
      grow_active_team: ({ count, target }) => `خپله active team شاوخوا ${count} members زیاته کړئ او ${target} active members ته ورسېږئ.`,
      balance_leg: ({ leg, gapPv }) => `خپله ${leg} leg قوي کړئ ځکه اوس نږدې ${gapPv} PV imbalance لرئ.`,
      activate_deposit: () => 'په خپله network کې deposit یا product activity active وساتئ څو growth یوازې پر recruitment تکیه ونه کړي.',
      maintain_consistency: () => 'د one-time spikes پر ځای weekly follow-up، duplication او balance وساتئ.',
      unlock_levels: ({ directsNeeded }) => `شاوخوا ${directsNeeded} نور strong directs زیات کړئ څو level-income potential او depth ښه شي.`,
      auction_rules: () => 'لومړی live auction rules ښه درک کړئ او له random high bids څخه ځان وساتئ.',
      auction_middle: () => 'یوازې په highest یا last bid تکیه مه کوئ. Controlled middle-range bidding اکثره budget ښه ساتي.',
      auction_timing: () => 'د emotional reaction پر ځای bid timing، past price movement او entry discipline وګورئ.',
      auction_budget: () => 'له bidding مخکې fixed auction budget وټاکئ څو یوه session working capital ته زیان ونه رسوي.'
    },
    close: 'دا ستاسو د current account state پر بنسټ practical roadmap دی، guaranteed income promise نه دی.'
  }
};

const CHARITY_COPY = {
  en: {
    charity: 'Hope International believes in helping poor and needy people and values real community welfare and social support.',
    donation: 'Supporters can contribute toward good causes and welfare-focused help through Hope International’s charitable vision.',
    donateHowTo: 'If a live donation option is not visible in your account yet, you can contact support or admin for contribution guidance.',
    warmth: 'Helping others creates meaningful social impact and strengthens the community.'
  },
  hi: {
    charity: 'Hope International गरीब और जरूरतमंद लोगों की मदद को महत्व देता है और community welfare तथा social support में विश्वास रखता है।',
    donation: 'Supporters अच्छे causes और welfare-focused help के लिए Hope International की charitable vision के तहत योगदान कर सकते हैं।',
    donateHowTo: 'यदि आपके account में अभी live donation option दिखाई नहीं दे रहा है, तो contribution guidance के लिए support या admin से संपर्क करें।',
    warmth: 'दूसरों की मदद करना meaningful social impact बनाता है और community को मजबूत करता है।'
  },
  ur: {
    charity: 'Hope International غریب اور ضرورت مند لوگوں کی مدد کو اہم سمجھتا ہے اور community welfare اور social support پر یقین رکھتا ہے۔',
    donation: 'Supporters اچھے causes اور welfare-focused help کے لیے Hope International کی charitable vision کے تحت تعاون کر سکتے ہیں۔',
    donateHowTo: 'اگر آپ کے account میں ابھی live donation option نظر نہیں آ رہا تو contribution guidance کے لیے support یا admin سے رابطہ کریں۔',
    warmth: 'دوسروں کی مدد meaningful social impact پیدا کرتی ہے اور community کو مضبوط بناتی ہے۔'
  },
  ar: {
    charity: 'تؤمن Hope International بمساعدة الفقراء والمحتاجين وتُقدّر رفاه المجتمع والدعم الاجتماعي الحقيقي.',
    donation: 'يمكن للداعمين المساهمة في الأعمال الخيرية وأوجه الدعم المجتمعي من خلال الرؤية الخيرية لـ Hope International.',
    donateHowTo: 'إذا لم يظهر خيار تبرع مباشر في حسابك بعد، فيمكنك التواصل مع الدعم أو الإدارة لمعرفة طريقة المساهمة.',
    warmth: 'مساعدة الآخرين تصنع أثرًا اجتماعيًا حقيقيًا وتقوي المجتمع.'
  },
  bn: {
    charity: 'Hope International গরিব ও প্রয়োজনমন্দ মানুষের সহায়তাকে গুরুত্ব দেয় এবং community welfare ও social support-এ বিশ্বাস করে।',
    donation: 'Supporters ভালো cause এবং welfare-focused help-এর জন্য Hope International-এর charitable vision অনুযায়ী অবদান রাখতে পারেন।',
    donateHowTo: 'আপনার account-এ যদি এখনো live donation option না দেখা যায়, তাহলে contribution guidance-এর জন্য support বা admin-এর সাথে যোগাযোগ করুন।',
    warmth: 'অন্যদের সহায়তা করা meaningful social impact তৈরি করে এবং community-কে শক্তিশালী করে।'
  },
  ps: {
    charity: 'Hope International د بېوزلو او اړمنو خلکو مرستې ته ارزښت ورکوي او په community welfare او social support باور لري.',
    donation: 'Supporters کولای شي د Hope International د charitable vision له لارې د ښو cause او welfare-focused help لپاره مرسته وکړي.',
    donateHowTo: 'که ستاسو account کې لا live donation option نه ښکاري، نو د contribution guidance لپاره support یا admin سره اړیکه ونیسئ.',
    warmth: 'د نورو مرسته meaningful social impact جوړوي او community پیاوړې کوي.'
  }
};

const PLATFORM_COPY = {
  en: 'Hope International is a growth-focused platform that combines earning opportunities with team building. It includes binary and level income models, auctions, digital products, and a wallet system to manage activity and rewards. It also values helping people, donation, and positive social impact, so growth is connected with community contribution.',
  hi: 'Hope International एक growth-focused platform है जो earning opportunities को team building के साथ जोड़ता है। इसमें binary और level income models, auction, digital products, और wallet system शामिल हैं ताकि activity और rewards को manage किया जा सके। यह helping people, donation, और positive social impact को भी महत्व देता है, इसलिए growth community contribution से जुड़ी रहती है।',
  ur: 'Hope International ایک growth-focused platform ہے جو earning opportunities کو team building کے ساتھ جوڑتا ہے۔ اس میں binary اور level income models، auction، digital products، اور wallet system شامل ہیں تاکہ activity اور rewards کو manage کیا جا سکے۔ یہ helping people، donation، اور positive social impact کو بھی اہمیت دیتا ہے، اس لیے growth community contribution سے جڑی رہتی ہے۔',
  ar: 'Hope International هي منصة تركز على النمو وتجمع بين فرص الربح وبناء الفريق. وهي تشمل نماذج دخل ثنائي ودخل مستويات، والمزادات، والمنتجات الرقمية، ونظام محفظة لإدارة النشاط والمكافآت. كما أنها تقدّر مساعدة الناس والتبرع والأثر الاجتماعي الإيجابي، لذلك يرتبط النمو فيها بالمساهمة المجتمعية.',
  bn: 'Hope International একটি growth-focused platform যা earning opportunities-কে team building-এর সাথে যুক্ত করে। এতে binary ও level income models, auction, digital products, এবং wallet system রয়েছে যাতে activity ও rewards manage করা যায়। এটি helping people, donation, এবং positive social impact-কেও গুরুত্ব দেয়, তাই growth community contribution-এর সাথে যুক্ত থাকে।',
  ps: 'Hope International یوه growth-focused platform ده چې earning opportunities د team building سره نښلوي. پکې binary او level income models، auction، digital products، او wallet system شامل دي څو activity او rewards manage شي. دا helping people، donation، او positive social impact ته هم ارزښت ورکوي، نو growth د community contribution سره تړلې وي.'
};

function safeLanguage(language) { return SUPPORTED_LANGUAGES.has(language) ? language : 'en'; }
function getCopy(language) { return COPY[safeLanguage(language)] || COPY.en; }
function getReliabilityCopy(language) { return RELIABILITY_COPY[safeLanguage(language)] || RELIABILITY_COPY.en; }
function displayName(user) { return user?.username || user?.email || 'Member'; }
function toMoney(value) { return Number(Number(value || 0).toFixed(2)); }
function money(value) { return `$${toMoney(value).toFixed(2)}`; }
function number(value) { return Number(value || 0).toLocaleString('en-US'); }
function normalizeMessage(message) { return String(message || '').trim().toLowerCase(); }
function localizedStatus(language, status) { const dict = STATUS_TEXT[safeLanguage(language)] || STATUS_TEXT.en; return dict[status] || String(status || dict.none); }

function includesAny(text, patterns = []) {
  return patterns.some((pattern) => text.includes(pattern));
}

function extractTargetAmount(message) {
  const text = normalizeMessage(message)
    .replace(/,/g, '')
    .replace(/\$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const amountPatterns = [
    /(\d+(?:\.\d+)?)\s*(k|thousand|lakh|lac)\s*(?:per month|monthly|month|mahina)?\b/,
    /(\d+(?:\.\d+)?)\s*(?:per month|monthly|month|mahina)\b/,
    /(?:earn|income|kamana|kamana hai|chahiye|monthly income|per month|month|mahina)\s*(?:of|for|around|about)?\s*(\d+(?:\.\d+)?)\s*(k|thousand|lakh|lac)?\b/,
    /(\d+(?:\.\d+)?)(?:\s|-)?k\b/,
    /(\d+(?:\.\d+)?)/
  ];

  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const value = Number(match[1]);
    const unit = String(match[2] || '').toLowerCase();
    if (!Number.isFinite(value) || value <= 0) continue;
    if (unit === 'k' || unit === 'thousand') return Math.round(value * 1000);
    if (unit === 'lakh' || unit === 'lac') return Math.round(value * 100000);
    return Math.round(value);
  }

  return null;
}

function classifyTargetScale(targetAmount) {
  if (targetAmount <= 500) return 'beginner';
  if (targetAmount <= 2500) return 'growth';
  if (targetAmount <= 10000) return 'serious';
  return 'large';
}

function chooseStrategyTarget(requestedTarget, currentIncomeTotal) {
  if (requestedTarget) return requestedTarget;
  if (currentIncomeTotal >= 10000) return 25000;
  if (currentIncomeTotal >= 5000) return 10000;
  if (currentIncomeTotal >= 2500) return 5000;
  if (currentIncomeTotal >= 1000) return 2500;
  if (currentIncomeTotal >= 500) return 1000;
  if (currentIncomeTotal >= 100) return 500;
  return 100;
}

function growthKeywords(text) {
  return includesAny(text, ['earn more', 'earn ', 'income kaise', 'income badh', 'zyaada income', 'zyada income', 'grow my income', 'increase my income', 'more income', 'kamana', 'monthly income', 'per month', 'mahina', 'month', 'chahiye', 'income chahiye', 'how can i grow faster', 'hope international se income', 'zyada kamana']);
}

function teamGrowthKeywords(text) {
  return includesAny(text, ['team kaise', 'team grow', 'team build', 'direct kaise', 'direct badh', 'left right', 'left and right', 'balance my team', 'balance leg', 'unlock more levels', 'level open', 'level unlock', 'binary build', 'binary grow']);
}

function auctionStrategyKeywords(text) {
  return includesAny(text, ['auction kaise', 'auction win', 'win auction', 'bidding strategy', 'middle bid', 'highest bid', 'last bid', 'bid strategy', 'auction strategy', 'bidding kya', 'auction jeete']);
}

function charityKeywords(text) {
  return includesAny(text, ['charity', 'donation', 'donate', 'help poor', 'poor people', 'needy people', 'community support', 'social support', 'welfare', 'gareeb', 'madad', 'zakat', 'sadaqah', 'sadqah', 'charity system', 'help needy', 'support needy', 'gareeb logon ki madad', 'can i donate']);
}

function detectAssistantIntent(message) {
  const normalized = normalizeMessage(message);
  if (!normalized) {
    return { intent: 'unknown_fallback', normalizedMessage: normalized, targetAmount: null };
  }
  if (normalized.includes('show my suggestions') || normalized.includes('my suggestions') || normalized.includes('next best action') || normalized.includes('what should i improve') || normalized.includes('improve my account') || normalized === 'suggestions') {
    return { intent: 'smart_suggestions', normalizedMessage: normalized, targetAmount: null };
  }
  if (includesAny(normalized, INTENT_KEYWORDS.platform_intro || [])) {
    return { intent: 'platform_intro', normalizedMessage: normalized, targetAmount: null, recommendationType: 'intro' };
  }
  if (charityKeywords(normalized)) {
    return { intent: 'charity_info', normalizedMessage: normalized, targetAmount: null, recommendationType: 'social_help' };
  }
  const targetAmount = extractTargetAmount(normalized);
  if (auctionStrategyKeywords(normalized)) {
    return { intent: 'auction_strategy', normalizedMessage: normalized, targetAmount: null, recommendationType: 'auction' };
  }
  if (teamGrowthKeywords(normalized)) {
    return { intent: 'team_growth_strategy', normalizedMessage: normalized, targetAmount, recommendationType: 'team_growth' };
  }
  if (growthKeywords(normalized) || targetAmount) {
    return { intent: 'earning_strategy', normalizedMessage: normalized, targetAmount, recommendationType: targetAmount ? 'custom_monthly_goal' : 'growth_guidance' };
  }

  const ordered = ['user_identity', 'sponsor_info', 'rank_info', 'direct_referral_summary', 'team_activity_summary', 'pv_summary', 'placement_summary', 'income_wallet_summary', 'deposit_wallet_summary', 'withdrawal_wallet_summary', 'btct_wallet_summary', 'total_income_summary', 'level_income', 'deposit_status', 'withdrawal_info', 'binary_status', 'team_summary', 'income_summary', 'wallet_info', 'auction_summary', 'seller_status', 'earning_strategy'];
  for (const matchedIntent of ordered) {
    if ((INTENT_KEYWORDS[matchedIntent] || []).some((keyword) => normalized.includes(keyword))) {
      const intentMap = {
        user_identity: 'user_identity',
        sponsor_info: 'sponsor_info',
        rank_info: 'rank_info',
        direct_referral_summary: 'direct_referral_summary',
        team_activity_summary: 'team_activity_summary',
        pv_summary: 'pv_summary',
        placement_summary: 'placement_summary',
        income_wallet_summary: 'income_wallet_summary',
        deposit_wallet_summary: 'deposit_wallet_summary',
        withdrawal_wallet_summary: 'withdrawal_wallet_summary',
        btct_wallet_summary: 'btct_wallet_summary',
        total_income_summary: 'total_income_summary',
        wallet_info: 'wallet_info',
        income_summary: 'income_summary',
        team_summary: 'team_summary',
        level_income: 'level_income_summary',
        binary_status: 'binary_status',
        deposit_status: 'deposit_status',
        withdrawal_info: 'withdrawal_status',
        auction_summary: 'auction_summary',
        seller_status: 'seller_status',
        earning_strategy: 'earning_strategy'
      };

      return {
        intent: intentMap[matchedIntent] || 'unknown_fallback',
        normalizedMessage: normalized,
        targetAmount: matchedIntent === 'earning_strategy' ? targetAmount : null,
        recommendationType: matchedIntent === 'earning_strategy'
          ? (targetAmount ? 'custom_monthly_goal' : 'monthly_goal')
          : null
      };
    }
  }

  return { intent: 'unknown_fallback', normalizedMessage: normalized, targetAmount: null };
}

function buildIncomeStats(incomeTransactions = []) {
  return incomeTransactions.reduce((acc, transaction) => {
    const amount = toMoney(transaction.amount);
    const source = String(transaction.source || '');
    acc.total += amount;
    if (source === 'direct_income' || source === 'direct_deposit_income') acc.direct += amount;
    if (source === 'matching_income') acc.matching += amount;
    if (source === 'level_deposit_income') { acc.level += amount; acc.levelCount += 1; }
    if (!acc.latestAt || new Date(transaction.created_at).getTime() > new Date(acc.latestAt).getTime()) {
      acc.latestAt = transaction.created_at;
      acc.latestAmount = amount;
    }
    return acc;
  }, { total: 0, direct: 0, matching: 0, level: 0, levelCount: 0, latestAt: null, latestAmount: 0 });
}

function weakerLeg(weeklySummary = {}) {
  const left = toMoney(weeklySummary.left_carry_pv ?? weeklySummary.left_pv ?? 0);
  const right = toMoney(weeklySummary.right_carry_pv ?? weeklySummary.right_pv ?? 0);
  if (left === right) return 'balanced';
  return left < right ? 'left' : 'right';
}

function buildStrategyStage({ currentDirects, activeTeam, target, pvGap }) {
  const directTarget = Math.max(2, Math.ceil(target / 200));
  const activeTarget = Math.max(2, Math.ceil(target / 75));
  if (currentDirects >= directTarget && activeTeam >= activeTarget && pvGap <= 200) return 'advanced';
  if (currentDirects >= Math.max(1, directTarget - 1) || activeTeam >= Math.max(1, activeTarget - 2)) return 'progressing';
  return 'beginner';
}

function buildDynamicTargets(target) {
  const scale = classifyTargetScale(target);
  if (scale === 'beginner') {
    return { scale, recommendedDirects: Math.max(2, Math.ceil(target / 200)), activeMembersNeeded: Math.max(2, Math.ceil(target / 75)), teamIncomeTarget: target * 1.8 };
  }
  if (scale === 'growth') {
    return { scale, recommendedDirects: Math.max(3, Math.ceil(target / 250)), activeMembersNeeded: Math.max(4, Math.ceil(target / 110)), teamIncomeTarget: target * 1.7 };
  }
  if (scale === 'serious') {
    return { scale, recommendedDirects: Math.max(5, Math.ceil(target / 325)), activeMembersNeeded: Math.max(8, Math.ceil(target / 140)), teamIncomeTarget: target * 1.55 };
  }
  return { scale, recommendedDirects: Math.max(8, Math.ceil(target / 450)), activeMembersNeeded: Math.max(12, Math.ceil(target / 180)), teamIncomeTarget: target * 1.45 };
}

function buildStrategyRecommendations(strategy) {
  const recommendations = [];

  if (strategy.currentDirects < strategy.recommendedDirects) {
    recommendations.push({ code: 'increase_directs', count: strategy.recommendedDirects - strategy.currentDirects, target: strategy.recommendedDirects });
  }

  if (strategy.activeDirects < Math.min(strategy.recommendedDirects, 3)) {
    recommendations.push({ code: 'activate_directs', count: Math.max(1, Math.min(strategy.recommendedDirects, 3) - strategy.activeDirects) });
  }

  if (strategy.activeTeam < strategy.activeMembersNeeded) {
    recommendations.push({ code: 'grow_active_team', count: strategy.activeMembersNeeded - strategy.activeTeam, target: strategy.activeMembersNeeded });
  }

  if (strategy.pvGap > 0) {
    recommendations.push({ code: 'balance_leg', leg: strategy.weakerLeg, gapPv: strategy.pvGap });
  }

  if (!strategy.hasApprovedDeposit) {
    recommendations.push({ code: 'activate_deposit' });
  } else {
    recommendations.push({ code: 'maintain_consistency' });
  }

  return recommendations.slice(0, 5);
}

function buildTeamGrowthRecommendations(data) {
  const recommendations = [];
  if (data.currentDirects < 3) {
    recommendations.push({ code: 'increase_directs', count: Math.max(1, 3 - data.currentDirects), target: 3 });
  }
  if (data.activeDirects < Math.max(1, Math.min(data.currentDirects || 1, 3))) {
    recommendations.push({ code: 'activate_directs', count: Math.max(1, Math.min(data.currentDirects || 1, 3) - data.activeDirects) });
  }
  if (data.activeTeam < Math.max(3, Math.ceil(data.totalTeam * 0.5))) {
    recommendations.push({ code: 'grow_active_team', count: Math.max(1, Math.max(3, Math.ceil(data.totalTeam * 0.5)) - data.activeTeam), target: Math.max(3, Math.ceil(data.totalTeam * 0.5)) });
  }
  if (data.pvGap > 0) {
    recommendations.push({ code: 'balance_leg', leg: data.weakerLeg, gapPv: data.pvGap });
  }
  if (data.currentDirects < data.levelUnlockDirectsTarget) {
    recommendations.push({ code: 'unlock_levels', directsNeeded: Math.max(1, data.levelUnlockDirectsTarget - data.currentDirects) });
  }
  return recommendations.slice(0, 5);
}

function buildAuctionRecommendations(data) {
  const recommendations = [{ code: 'auction_rules' }, { code: 'auction_middle' }, { code: 'auction_timing' }, { code: 'auction_budget' }];
  if (data.auctionsJoined > 0 && data.wonAuctions > 0) {
    return recommendations.slice(1);
  }
  return recommendations.slice(0, 4);
}

function stripLeadingNumber(text) {
  return String(text || '').replace(/^\d+\.\s*/, '').trim();
}

function formatRoadmapResponse(language, type, data) {
  const copy = ROADMAP_COPY[safeLanguage(language)] || ROADMAP_COPY.en;
  if (type === 'earning_strategy') {
    const intro = data.explicitTarget ? copy.earningIntro(data) : copy.earningNoTarget(data);
    const recs = data.recommendations.map((item) => copy.recommendationLabels[item.code](item));
    const nextStep = recs[0] ? `${copy.nextStep} ${stripLeadingNumber(recs[0])}` : '';
    return [intro, STRATEGY_COPY[safeLanguage(language)]?.gap?.[data.stage] || STRATEGY_COPY.en.gap.beginner, ...recs, copy.motivation[data.scale] || copy.motivation.growth, nextStep, copy.close].filter(Boolean).join(' ');
  }
  if (type === 'team_growth_strategy') {
    const recs = data.recommendations.map((item) => copy.recommendationLabels[item.code](item));
    const nextStep = recs[0] ? `${copy.nextStep} ${stripLeadingNumber(recs[0])}` : '';
    return [copy.teamIntro(data), ...recs, copy.teamMotivation, nextStep, copy.close].filter(Boolean).join(' ');
  }
  if (type === 'auction_strategy') {
    const recs = data.recommendations.map((item) => copy.recommendationLabels[item.code](item));
    const nextStep = recs[0] ? `${copy.nextStep} ${stripLeadingNumber(recs[0])}` : '';
    return [copy.auctionIntro(data), ...recs, copy.auctionMotivation, nextStep, copy.close].filter(Boolean).join(' ');
  }
  return '';
}

function formatCharityResponse(language, data = {}) {
  const copy = CHARITY_COPY[safeLanguage(language)] || CHARITY_COPY.en;
  const lines = [copy.charity, copy.donation];
  if (data.showDonateHowTo) lines.push(copy.donateHowTo);
  lines.push(copy.warmth);
  return lines.join(' ');
}

function formatStrategyResponse(language, data) {
  const copy = STRATEGY_COPY[safeLanguage(language)] || STRATEGY_COPY.en;
  const lines = [
    copy.current(data),
    copy.gap[data.stage] || copy.gap.beginner,
    ...data.recommendations.map((item) => copy.recommendationLabels[item.code](item)),
    copy.close
  ];
  return lines.join(' ');
}

function buildSuggestions(language, intent) {
  const labels = getCopy(language).suggestions;
  const map = {
    platform_intro: [labels.wallet, labels.team, labels.plan500],
    user_identity: [labels.wallet, labels.team, labels.income],
    sponsor_info: [labels.team, labels.wallet, labels.plan100],
    rank_info: [labels.team, labels.binary, labels.plan500],
    direct_referral_summary: [labels.team, labels.plan100, labels.income],
    team_activity_summary: [labels.team, labels.binary, labels.plan500],
    pv_summary: [labels.binary, labels.team, labels.wallet],
    placement_summary: [labels.team, labels.binary, labels.wallet],
    income_wallet_summary: [labels.income, labels.withdraw, labels.plan100],
    deposit_wallet_summary: [labels.deposits, labels.wallet, labels.withdraw],
    withdrawal_wallet_summary: [labels.withdraw, labels.wallet, labels.income],
    btct_wallet_summary: [labels.wallet, labels.deposits, labels.binary],
    total_income_summary: [labels.level, labels.team, labels.plan500],
    wallet_info: [labels.income, labels.withdraw, labels.deposits],
    income_summary: [labels.level, labels.team, labels.plan500],
    team_summary: [labels.binary, labels.plan500, labels.wallet],
    level_income_summary: [labels.income, labels.team, labels.plan100],
    binary_status: [labels.team, labels.level, labels.plan500],
    binary_summary: [labels.team, labels.level, labels.plan500],
    deposit_status: [labels.wallet, labels.withdraw, labels.plan100],
    withdrawal_status: [labels.wallet, labels.income, labels.deposits],
    auction_summary: [labels.wallet, labels.team, labels.plan100],
    auction_strategy: [labels.team, labels.wallet, labels.plan500],
    charity_info: [labels.team, labels.wallet, labels.plan100],
    seller_status: [labels.wallet, labels.deposits, labels.team],
    smart_suggestions: [labels.wallet, labels.team, labels.plan500],
    team_growth_strategy: [labels.binary, labels.team, labels.plan500],
    earning_strategy: [labels.binary, labels.team, labels.wallet],
    unknown_fallback: [labels.wallet, labels.income, labels.deposits]
  };
  return map[intent] || map.unknown_fallback;
}

function buildSmartSuggestionItems(context) {
  const weekly = context.weeklySummary || {};
  const team = context.teamSummary || {};
  const income = context.incomeStats || {};
  const profile = context.profile || {};
  const directReferrals = Number(context.directReferrals || 0);
  const activeDirects = Number((context.directChildren || []).filter((item) => item.is_active).length || 0);
  const totalTeam = Number(team.total_descendants || 0);
  const activeTeam = Number(team.active_count || 0);
  const approvedDeposits = (context.deposits || []).filter((item) => item.status === 'approved');
  const leftPv = toMoney(weekly.left_carry_pv ?? weekly.left_pv ?? profile.carry_left_pv ?? 0);
  const rightPv = toMoney(weekly.right_carry_pv ?? weekly.right_pv ?? profile.carry_right_pv ?? 0);
  const gapPv = Math.abs(leftPv - rightPv);
  const items = [];

  if (directReferrals < 2) {
    items.push({ code: 'add_directs', count: Math.max(1, 2 - directReferrals) });
  }

  if (activeDirects < Math.max(1, Math.min(directReferrals || 1, 2))) {
    items.push({ code: 'activate_directs', count: Math.max(1, Math.min(directReferrals || 1, 2) - activeDirects) });
  }

  if (gapPv >= 200 && weakerLeg(weekly) !== 'balanced') {
    items.push({ code: 'balance_leg', leg: weakerLeg(weekly), gapPv: number(gapPv) });
  }

  if ((totalTeam > 0 && activeTeam === 0) || (totalTeam >= 3 && activeTeam < Math.ceil(totalTeam * 0.35))) {
    items.push({ code: 'grow_team_activity', activeTeam, totalTeam });
  }

  if (!approvedDeposits.length) {
    items.push({ code: 'activate_network' });
  }

  if (toMoney(income.total) < 100) {
    items.push({ code: 'improve_income' });
  } else {
    items.push({ code: 'maintain_consistency' });
  }

  return items.slice(0, 3);
}

function formatSmartSuggestions(language, items = []) {
  const copy = SMART_SUGGESTION_COPY[safeLanguage(language)] || SMART_SUGGESTION_COPY.en;
  return items.map((item) => copy[item.code]?.(item)).filter(Boolean);
}

async function safeContextPart(loader, fallbackValue, key, errors) {
  try {
    const value = await loader();
    return value ?? fallbackValue;
  } catch (_error) {
    errors.push(key);
    return fallbackValue;
  }
}

async function loadContext(userId) {
  const errors = [];
  const [profile, walletSummary, teamSummary, weeklySummary, incomeTransactions, withdrawals, deposits, directReferralCounts, directChildren, sellerInfo, auctionStats] = await Promise.all([
    safeContextPart(() => userRepository.findById(null, userId), {}, 'profile', errors),
    safeContextPart(() => walletService.getWalletSummary(null, userId), { wallet: {} }, 'wallet', errors),
    safeContextPart(() => adminRepository.getTeamSummary(null, userId), {}, 'team', errors),
    safeContextPart(() => adminRepository.getUserLatestWeeklySummary(null, userId), {}, 'weekly', errors),
    safeContextPart(() => walletRepository.listIncomeTransactions(null, userId, 250), [], 'income', errors),
    safeContextPart(() => walletRepository.listWithdrawalRequests(null, userId, 50), [], 'withdrawals', errors),
    safeContextPart(() => walletRepository.listDepositRequests(null, userId, 50), [], 'deposits', errors),
    safeContextPart(() => userRepository.getDirectReferralCounts(null, [userId]), new Map(), 'directReferrals', errors),
    safeContextPart(() => adminRepository.getUserChildren(null, userId), [], 'directChildren', errors),
    safeContextPart(() => sellerService.getMe(userId), null, 'seller', errors),
    safeContextPart(() => auctionRepository.getUserBidStats(null, userId), null, 'auction', errors)
  ]);
  return {
    profile,
    wallet: walletSummary?.wallet || {},
    teamSummary: teamSummary || {},
    weeklySummary: weeklySummary || {},
    incomeStats: buildIncomeStats(incomeTransactions || []),
    withdrawals: withdrawals || [],
    deposits: deposits || [],
    directReferrals: Number(directReferralCounts?.get(userId) || 0),
    directChildren: directChildren || [],
    sellerInfo: sellerInfo || null,
    auctionStats: auctionStats || null,
    contextErrors: errors
  };
}

function buildAssistantData(intentResult, context, language) {
  const { intent, targetAmount = null, recommendationType = null } = intentResult;
  const wallet = context.wallet || {};
  const team = context.teamSummary || {};
  const weekly = context.weeklySummary || {};
  const income = context.incomeStats || {};
  const profile = context.profile || {};
  const auctionStats = context.auctionStats || {};
  const sellerInfo = context.sellerInfo || {};
  const pendingWithdrawals = (context.withdrawals || []).filter((item) => item.status === 'pending');
  const pendingDeposits = (context.deposits || []).filter((item) => item.status === 'pending');
  const approvedDeposits = (context.deposits || []).filter((item) => item.status === 'approved');
  const latestWithdrawal = context.withdrawals?.[0] || null;
  const latestDeposit = context.deposits?.[0] || null;
  const name = displayName(profile);
  const sponsorName = [profile.sponsor_first_name, profile.sponsor_last_name].filter(Boolean).join(' ').trim() || profile.sponsor_username || '';
  const placementSide = profile.placement_side ? String(profile.placement_side) : '';
  const leftPv = number(weekly.left_carry_pv ?? weekly.left_pv ?? profile.carry_left_pv ?? 0);
  const rightPv = number(weekly.right_carry_pv ?? weekly.right_pv ?? profile.carry_right_pv ?? 0);
  const btctAvailable = wallet.btct_available_balance !== null && wallet.btct_available_balance !== undefined;

  if (intent === 'user_identity') return { intent, data: { name, username: profile.username || 'Unknown', userId: profile.id || 'Unknown' } };
  if (intent === 'sponsor_info') return { intent, data: { name, sponsorName } };
  if (intent === 'rank_info') return { intent, data: { name, rankName: profile.rank_name || '' } };
  if (intent === 'direct_referral_summary') return { intent, data: { name, directReferrals: number(context.directReferrals || 0) } };
  if (intent === 'team_activity_summary') return { intent, data: { name, activeTeam: number(team.active_count), totalTeam: number(team.total_descendants) } };
  if (intent === 'pv_summary') return { intent, data: { name, leftPv, rightPv } };
  if (intent === 'placement_summary') return { intent, data: { name, placementSide } };
  if (intent === 'income_wallet_summary') return { intent, data: { name, incomeBalance: money(wallet.income_balance) } };
  if (intent === 'deposit_wallet_summary') return { intent, data: { name, depositBalance: money(wallet.deposit_balance) } };
  if (intent === 'withdrawal_wallet_summary') return { intent, data: { name, withdrawalBalance: money(wallet.income_balance) } };
  if (intent === 'btct_wallet_summary') return { intent, data: { name, btctBalance: btctAvailable ? Number(wallet.btct_available_balance || 0).toFixed(4) : null } };
  if (intent === 'total_income_summary') return { intent, data: { name, totalIncome: money(income.total) } };

  if (intent === 'platform_intro') return { intent, data: { name } };
  if (intent === 'wallet_info') return { intent, data: { name, availableBalance: money(wallet.balance), incomeBalance: money(wallet.income_balance), depositBalance: money(wallet.deposit_balance), withdrawalBalance: money(wallet.income_balance), btctBalance: btctAvailable ? Number(wallet.btct_available_balance || 0).toFixed(4) : null, btctAvailable } };
  if (intent === 'income_summary') return { intent, data: { name, totalIncome: money(income.total), directIncome: money(income.direct), matchingIncome: money(income.matching), levelIncome: money(income.level), latestIncome: money(income.latestAmount) } };
  if (intent === 'team_summary') return { intent, data: { name, totalTeam: number(team.total_descendants), leftTeam: number(team.left_count), rightTeam: number(team.right_count), activeTeam: number(team.active_count), inactiveTeam: number(team.inactive_count) } };
  if (intent === 'level_income_summary') return { intent, data: { name, levelIncome: money(income.level), levelIncomeCount: number(income.levelCount) } };
  if (intent === 'binary_status' || intent === 'binary_summary') return { intent: 'binary_summary', data: { name, leftPv, rightPv, weakerLeg: weakerLeg(weekly), matchedPv: number(weekly.matched_pv ?? 0), binaryIncome: money(weekly.matching_income_net ?? weekly.matching_income_gross ?? 0) } };
  if (intent === 'deposit_status') return { intent, data: { name, totalDeposits: number(context.deposits?.length || 0), approvedDeposits: money(approvedDeposits.reduce((sum, item) => sum + toMoney(item.amount), 0)), pendingDeposits: money(pendingDeposits.reduce((sum, item) => sum + toMoney(item.amount), 0)), latestDepositAmount: money(latestDeposit?.amount || 0), latestDepositStatus: localizedStatus(language, latestDeposit?.status || 'none') } };
  if (intent === 'withdrawal_status') return { intent, data: { name, availableWithdrawal: money(wallet.income_balance || 0), pendingWithdrawals: number(pendingWithdrawals.length), latestWithdrawalStatus: localizedStatus(language, latestWithdrawal?.status || 'none') } };
  if (intent === 'auction_summary') return { intent, data: { name, auctionsJoined: number(auctionStats.auctions_joined || 0), wonAuctions: number(auctionStats.won_auctions || 0) } };
  if (intent === 'charity_info') return { intent, data: { name, showDonateHowTo: true, donationModuleAvailable: false } };
  if (intent === 'seller_status') return { intent, data: { name, sellerStatus: sellerInfo?.profile?.application_status || '', canAccessDashboard: Boolean(sellerInfo?.canAccessDashboard) } };
  if (intent === 'smart_suggestions') return { intent, data: { name } };
  if (intent === 'auction_strategy') {
    const auctionsJoined = number(auctionStats.auctions_joined || 0);
    const wonAuctions = number(auctionStats.won_auctions || 0);
    const data = { name, auctionsJoined: Number(auctionStats.auctions_joined || 0), wonAuctions: Number(auctionStats.won_auctions || 0) };
    data.recommendations = buildAuctionRecommendations(data);
    return { intent, data: { ...data, auctionsJoined, wonAuctions } };
  }
  if (intent === 'team_growth_strategy') {
    const currentDirects = Number(context.directReferrals || 0);
    const activeDirects = Number((context.directChildren || []).filter((item) => item.is_active).length || 0);
    const activeTeam = Number(team.active_count || 0);
    const totalTeam = Number(team.total_descendants || 0);
    const numericLeftPv = Number(String(leftPv).replace(/,/g, '')) || 0;
    const numericRightPv = Number(String(rightPv).replace(/,/g, '')) || 0;
    const data = {
      name,
      currentDirects,
      activeDirects,
      activeTeam,
      totalTeam,
      leftPv,
      rightPv,
      weakerLeg: weakerLeg(weekly),
      pvGap: number(Math.abs(numericLeftPv - numericRightPv)),
      levelUnlockDirectsTarget: Math.max(3, currentDirects + 1)
    };
    data.recommendations = buildTeamGrowthRecommendations(data);
    return { intent, data };
  }
  if (intent === 'earning_strategy') {
    const currentIncomeTotal = toMoney(income.total);
    const target = chooseStrategyTarget(targetAmount, currentIncomeTotal);
    const currentDirects = Number(context.directReferrals || 0);
    const activeDirects = Number((context.directChildren || []).filter((item) => item.is_active).length || 0);
    const activeTeam = Number(team.active_count || 0);
    const dynamicTargets = buildDynamicTargets(target);
    const recommendedDirects = dynamicTargets.recommendedDirects;
    const activeMembersNeeded = dynamicTargets.activeMembersNeeded;
    const numericLeftPv = Number(String(leftPv).replace(/,/g, '')) || 0;
    const numericRightPv = Number(String(rightPv).replace(/,/g, '')) || 0;
    const pvGap = Math.abs(numericLeftPv - numericRightPv);
    const stage = buildStrategyStage({ currentDirects, activeTeam, target, pvGap });
    const strategyData = {
      name,
      targetAmount: `$${target}`,
      targetAmountValue: target,
      currentDirects,
      activeDirects,
      totalTeam: Number(team.total_descendants || 0),
      activeTeam,
      leftPv,
      rightPv,
      weakerLeg: weakerLeg(weekly),
      pvGap: number(pvGap),
      currentIncome: money(currentIncomeTotal),
      explicitTarget: Boolean(targetAmount),
      scale: dynamicTargets.scale,
      recommendedDirects,
      targetTeamIncome: money(dynamicTargets.teamIncomeTarget),
      activeMembersNeeded,
      recommendationType: recommendationType || 'monthly_goal',
      hasApprovedDeposit: approvedDeposits.length > 0,
      sellerActive: Boolean(sellerInfo?.canAccessDashboard),
      stage
    };
    strategyData.recommendations = buildStrategyRecommendations(strategyData);
    return { intent, data: strategyData };
  }
  return { intent: 'unknown_fallback', data: { name } };
}

function formatAssistantResponse(result, language) {
  const copy = getCopy(language);
  const accountCopy = ACCOUNT_COPY[safeLanguage(language)] || ACCOUNT_COPY.en;
  const reliability = getReliabilityCopy(language);
  const templateKeyByIntent = {
    user_identity: 'user_identity',
    sponsor_info: 'sponsor_info',
    rank_info: 'rank_info',
    direct_referral_summary: 'direct_referral_summary',
    team_activity_summary: 'team_activity_summary',
    pv_summary: 'pv_summary',
    placement_summary: 'placement_summary',
    income_wallet_summary: 'income_wallet_summary',
    deposit_wallet_summary: 'deposit_wallet_summary',
    withdrawal_wallet_summary: 'withdrawal_wallet_summary',
    btct_wallet_summary: 'btct_wallet_summary',
    total_income_summary: 'total_income_summary',
    platform_intro: 'fallback',
    wallet_info: 'wallet_info',
    income_summary: 'income_summary',
    team_summary: 'team_summary',
    level_income_summary: 'level_income',
    binary_summary: 'binary_summary',
    deposit_status: 'deposit_status',
    withdrawal_status: 'withdrawal_info',
    auction_summary: 'auction_summary',
    charity_info: 'fallback',
    seller_status: 'seller_status',
    auction_strategy: 'fallback',
    team_growth_strategy: 'fallback',
    smart_suggestions: 'fallback',
    earning_strategy: 'growth_strategy',
    unknown_fallback: 'fallback'
  };
  const templateKey = templateKeyByIntent[result.intent] || 'fallback';
  if (result.intent === 'earning_strategy') return formatRoadmapResponse(language, 'earning_strategy', result.data);
  if (result.intent === 'team_growth_strategy') return formatRoadmapResponse(language, 'team_growth_strategy', result.data);
  if (result.intent === 'auction_strategy') return formatRoadmapResponse(language, 'auction_strategy', result.data);
  if (result.intent === 'platform_intro') return PLATFORM_COPY[safeLanguage(language)] || PLATFORM_COPY.en;
  if (result.intent === 'charity_info') return formatCharityResponse(language, result.data);
  if (result.intent === 'smart_suggestions') {
    const copy = SMART_SUGGESTION_COPY[safeLanguage(language)] || SMART_SUGGESTION_COPY.en;
    return copy.intro;
  }
  if (result.intent === 'deposit_status' && Number(result.data?.totalDeposits || 0) === 0) return reliability.noDeposit;
  if (result.intent === 'withdrawal_status' && Number(result.data?.pendingWithdrawals || 0) === 0 && String(result.data?.latestWithdrawalStatus || '').toLowerCase().includes('no')) return reliability.noWithdrawal;
  if (result.intent === 'income_summary' && String(result.data?.totalIncome || '') === '$0.00') return reliability.noIncome;
  if (result.intent === 'total_income_summary' && String(result.data?.totalIncome || '') === '$0.00') return reliability.noIncome;
  if (result.intent === 'level_income_summary' && Number(result.data?.levelIncomeCount || 0) === 0) return reliability.noLevelIncome;
  if (result.intent === 'btct_wallet_summary' && result.data?.btctBalance == null) return reliability.btctUnavailable;
  if (result.intent === 'wallet_info') {
    const walletText = copy.wallet_info({
      ...result.data,
      btctBalance: result.data?.btctBalance ?? '0.0000'
    });
    return result.data?.btctAvailable === false ? `${walletText} ${reliability.btctUnavailable}` : walletText;
  }
  if (templateKey === 'fallback') return reliability.unknown;
  if (accountCopy[templateKey]) return accountCopy[templateKey](result.data);
  return copy[templateKey](result.data);
}

async function chat(userId, message, language = 'en') {
  const lang = safeLanguage(language);
  const reliability = getReliabilityCopy(lang);
  try {
    const faqMatch = findFaqMatch(message);
    if (faqMatch) {
      return {
        intent: 'faq',
        type: 'faq',
        language: lang,
        direction: RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr',
        reply: faqMatch.answer?.[lang] || faqMatch.answer?.en || reliability.unknown,
        suggestions: buildSuggestions(lang, 'unknown_fallback'),
        smartSuggestions: [],
        summary: {
          faq_id: faqMatch.id,
          faq_category: faqMatch.category,
          faq_total: FAQS.length
        }
      };
    }
    const context = await loadContext(userId);
    const detectedIntent = detectAssistantIntent(message);
    const structured = buildAssistantData(detectedIntent, context, lang);
    const smartSuggestionItems = buildSmartSuggestionItems(context);
    const reply = formatAssistantResponse(structured, lang) || reliability.unknown;
    return {
      intent: structured.intent,
      type: structured.intent,
      language: lang,
      direction: RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr',
      reply,
      suggestions: buildSuggestions(lang, structured.intent),
      smartSuggestions: formatSmartSuggestions(lang, smartSuggestionItems),
      summary: {
        wallet_balance: toMoney(context.wallet?.balance),
        income_balance: toMoney(context.wallet?.income_balance),
        withdrawal_balance: toMoney(context.wallet?.income_balance),
        total_income: toMoney(context.incomeStats?.total),
        team_size: Number(context.teamSummary?.total_descendants || 0),
        partial_data: Array.isArray(context.contextErrors) && context.contextErrors.length > 0
      }
    };
  } catch (_error) {
    return {
      intent: 'unknown_fallback',
      type: 'unknown_fallback',
      language: lang,
      direction: RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr',
      reply: reliability.unavailable,
      suggestions: buildSuggestions(lang, 'unknown_fallback'),
      smartSuggestions: [],
      summary: {
        wallet_balance: 0,
        income_balance: 0,
        withdrawal_balance: 0,
        total_income: 0,
        team_size: 0,
        partial_data: true
      }
    };
  }
}

module.exports = { chat, detectAssistantIntent, buildAssistantData, formatAssistantResponse };
