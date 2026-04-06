const adminRepository = require('../repositories/adminRepository');
const walletRepository = require('../repositories/walletRepository');
const userRepository = require('../repositories/userRepository');
const auctionRepository = require('../repositories/auctionRepository');
const walletService = require('./walletService');
const sellerService = require('./sellerService');

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
  earning_strategy: ['plan', 'strategy', 'target', 'month', '/month', 'प्लान', 'پلان', 'خطة', 'পরিকল্পনা', 'ستراتیژي']
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
    withdrawal_wallet_summary: ({ withdrawalBalance }) => `Your withdrawal wallet balance is ${withdrawalBalance}.`,
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
    withdrawal_wallet_summary: ({ withdrawalBalance }) => `आपका withdrawal wallet balance ${withdrawalBalance} है।`,
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
    withdrawal_wallet_summary: ({ withdrawalBalance }) => `آپ کا withdrawal wallet balance ${withdrawalBalance} ہے۔`,
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
    withdrawal_wallet_summary: ({ withdrawalBalance }) => `رصيد محفظة السحب لديك هو ${withdrawalBalance}.`,
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
    withdrawal_wallet_summary: ({ withdrawalBalance }) => `আপনার withdrawal wallet balance ${withdrawalBalance}।`,
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
    withdrawal_wallet_summary: ({ withdrawalBalance }) => `ستاسو withdrawal wallet balance ${withdrawalBalance} دی.`,
    btct_wallet_summary: ({ btctBalance }) => `ستاسو BTCT balance ${btctBalance} دی.`,
    total_income_summary: ({ totalIncome }) => `ستاسو total credited income ${totalIncome} دی.`,
    binary_summary: ({ leftPv, rightPv, matchedPv, binaryIncome }) => `ستاسو binary summary left PV ${leftPv}, right PV ${rightPv}, matched PV ${matchedPv} او latest binary income ${binaryIncome} ښيي.`,
    auction_summary: ({ auctionsJoined, wonAuctions }) => auctionsJoined ? `تاسو ${auctionsJoined} auctions کې ګډون کړی او ${wonAuctions} مو ګټلي دي.` : 'تر اوسه د auction کوم record نشته.',
    seller_status: ({ sellerStatus, canAccessDashboard }) => sellerStatus ? `ستاسو seller status ${sellerStatus} دی${canAccessDashboard ? ' او seller dashboard فعال دی.' : '.'}` : 'تاسو لا seller profile نه لرئ.'
  }
};

function safeLanguage(language) { return SUPPORTED_LANGUAGES.has(language) ? language : 'en'; }
function getCopy(language) { return COPY[safeLanguage(language)] || COPY.en; }
function displayName(user) { return user?.username || user?.email || 'Member'; }
function toMoney(value) { return Number(Number(value || 0).toFixed(2)); }
function money(value) { return `$${toMoney(value).toFixed(2)}`; }
function number(value) { return Number(value || 0).toLocaleString('en-US'); }
function normalizeMessage(message) { return String(message || '').trim().toLowerCase(); }
function localizedStatus(language, status) { const dict = STATUS_TEXT[safeLanguage(language)] || STATUS_TEXT.en; return dict[status] || String(status || dict.none); }

function detectAssistantIntent(message) {
  const normalized = normalizeMessage(message);
  if (!normalized) {
    return { intent: 'unknown_fallback', normalizedMessage: normalized, targetAmount: null };
  }
  if (normalized.includes('1000')) {
    return { intent: 'earning_strategy', normalizedMessage: normalized, targetAmount: 1000, recommendationType: 'monthly_goal' };
  }
  if (normalized.includes('500')) {
    return { intent: 'earning_strategy', normalizedMessage: normalized, targetAmount: 500, recommendationType: 'monthly_goal' };
  }
  if (normalized.includes('100')) {
    return { intent: 'earning_strategy', normalizedMessage: normalized, targetAmount: 100, recommendationType: 'monthly_goal' };
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
        targetAmount: matchedIntent === 'earning_strategy' ? 500 : null,
        recommendationType: matchedIntent === 'earning_strategy' ? 'monthly_goal' : null
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

function buildSuggestions(language, intent) {
  const labels = getCopy(language).suggestions;
  const map = {
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
    seller_status: [labels.wallet, labels.deposits, labels.team],
    earning_strategy: [labels.binary, labels.team, labels.wallet],
    unknown_fallback: [labels.wallet, labels.income, labels.deposits]
  };
  return map[intent] || map.unknown_fallback;
}

async function loadContext(userId) {
  const [profile, walletSummary, teamSummary, weeklySummary, incomeTransactions, withdrawals, deposits, directReferralCounts, sellerInfo, auctionStats] = await Promise.all([
    userRepository.findById(null, userId),
    walletService.getWalletSummary(null, userId),
    adminRepository.getTeamSummary(null, userId),
    adminRepository.getUserLatestWeeklySummary(null, userId),
    walletRepository.listIncomeTransactions(null, userId, 250),
    walletRepository.listWithdrawalRequests(null, userId, 50),
    walletRepository.listDepositRequests(null, userId, 50),
    userRepository.getDirectReferralCounts(null, [userId]),
    sellerService.getMe(userId),
    auctionRepository.getUserBidStats(null, userId)
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
    sellerInfo: sellerInfo || null,
    auctionStats: auctionStats || null
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

  if (intent === 'user_identity') return { intent, data: { name, username: profile.username || 'Unknown', userId: profile.id || 'Unknown' } };
  if (intent === 'sponsor_info') return { intent, data: { name, sponsorName } };
  if (intent === 'rank_info') return { intent, data: { name, rankName: profile.rank_name || '' } };
  if (intent === 'direct_referral_summary') return { intent, data: { name, directReferrals: number(context.directReferrals || 0) } };
  if (intent === 'team_activity_summary') return { intent, data: { name, activeTeam: number(team.active_count), totalTeam: number(team.total_descendants) } };
  if (intent === 'pv_summary') return { intent, data: { name, leftPv, rightPv } };
  if (intent === 'placement_summary') return { intent, data: { name, placementSide } };
  if (intent === 'income_wallet_summary') return { intent, data: { name, incomeBalance: money(wallet.income_balance) } };
  if (intent === 'deposit_wallet_summary') return { intent, data: { name, depositBalance: money(wallet.deposit_balance) } };
  if (intent === 'withdrawal_wallet_summary') return { intent, data: { name, withdrawalBalance: money(wallet.withdrawal_balance) } };
  if (intent === 'btct_wallet_summary') return { intent, data: { name, btctBalance: Number(wallet.btct_available_balance || 0).toFixed(4) } };
  if (intent === 'total_income_summary') return { intent, data: { name, totalIncome: money(income.total) } };

  if (intent === 'wallet_info') return { intent, data: { name, availableBalance: money(wallet.balance), incomeBalance: money(wallet.income_balance), depositBalance: money(wallet.deposit_balance), withdrawalBalance: money(wallet.withdrawal_balance), btctBalance: Number(wallet.btct_available_balance || 0).toFixed(4) } };
  if (intent === 'income_summary') return { intent, data: { name, totalIncome: money(income.total), directIncome: money(income.direct), matchingIncome: money(income.matching), levelIncome: money(income.level), latestIncome: money(income.latestAmount) } };
  if (intent === 'team_summary') return { intent, data: { name, totalTeam: number(team.total_descendants), leftTeam: number(team.left_count), rightTeam: number(team.right_count), activeTeam: number(team.active_count), inactiveTeam: number(team.inactive_count) } };
  if (intent === 'level_income_summary') return { intent, data: { name, levelIncome: money(income.level), levelIncomeCount: number(income.levelCount) } };
  if (intent === 'binary_status' || intent === 'binary_summary') return { intent: 'binary_summary', data: { name, leftPv, rightPv, weakerLeg: weakerLeg(weekly), matchedPv: number(weekly.matched_pv ?? 0), binaryIncome: money(weekly.matching_income_net ?? weekly.matching_income_gross ?? 0) } };
  if (intent === 'deposit_status') return { intent, data: { name, totalDeposits: number(context.deposits?.length || 0), approvedDeposits: money(approvedDeposits.reduce((sum, item) => sum + toMoney(item.amount), 0)), pendingDeposits: money(pendingDeposits.reduce((sum, item) => sum + toMoney(item.amount), 0)), latestDepositAmount: money(latestDeposit?.amount || 0), latestDepositStatus: localizedStatus(language, latestDeposit?.status || 'none') } };
  if (intent === 'withdrawal_status') return { intent, data: { name, availableWithdrawal: money(wallet.withdrawal_balance || wallet.balance || 0), pendingWithdrawals: number(pendingWithdrawals.length), latestWithdrawalStatus: localizedStatus(language, latestWithdrawal?.status || 'none') } };
  if (intent === 'auction_summary') return { intent, data: { name, auctionsJoined: number(auctionStats.auctions_joined || 0), wonAuctions: number(auctionStats.won_auctions || 0) } };
  if (intent === 'seller_status') return { intent, data: { name, sellerStatus: sellerInfo?.profile?.application_status || '', canAccessDashboard: Boolean(sellerInfo?.canAccessDashboard) } };
  if (intent === 'earning_strategy') {
    const target = targetAmount || 500;
    return { intent, data: { name, targetAmount: `$${target}`, targetAmountValue: target, recommendedDirects: number(Math.max(2, Math.ceil(target / 200))), recommendedTeamActivity: money(target * 1.8), activeMembersNeeded: number(Math.max(2, Math.ceil(target / 75))), recommendationType: recommendationType || 'monthly_goal', note: getCopy(language).strategyNotes[target] || getCopy(language).strategyNotes[500] } };
  }
  return { intent: 'unknown_fallback', data: { name } };
}

function formatAssistantResponse(result, language) {
  const copy = getCopy(language);
  const accountCopy = ACCOUNT_COPY[safeLanguage(language)] || ACCOUNT_COPY.en;
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
    wallet_info: 'wallet_info',
    income_summary: 'income_summary',
    team_summary: 'team_summary',
    level_income_summary: 'level_income',
    binary_summary: 'binary_summary',
    deposit_status: 'deposit_status',
    withdrawal_status: 'withdrawal_info',
    auction_summary: 'auction_summary',
    seller_status: 'seller_status',
    earning_strategy: 'growth_strategy',
    unknown_fallback: 'fallback'
  };
  const templateKey = templateKeyByIntent[result.intent] || 'fallback';
  if (templateKey === 'fallback') return copy.fallback;
  if (accountCopy[templateKey]) return accountCopy[templateKey](result.data);
  return copy[templateKey](result.data);
}

async function chat(userId, message, language = 'en') {
  const lang = safeLanguage(language);
  const context = await loadContext(userId);
  const detectedIntent = detectAssistantIntent(message);
  const structured = buildAssistantData(detectedIntent, context, lang);
  return {
    intent: structured.intent,
    type: structured.intent,
    language: lang,
    direction: RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr',
    reply: formatAssistantResponse(structured, lang),
    suggestions: buildSuggestions(lang, structured.intent),
    summary: {
      wallet_balance: toMoney(context.wallet?.balance),
      income_balance: toMoney(context.wallet?.income_balance),
      withdrawal_balance: toMoney(context.wallet?.withdrawal_balance),
      total_income: toMoney(context.incomeStats?.total),
      team_size: Number(context.teamSummary?.total_descendants || 0)
    }
  };
}

module.exports = { chat, detectAssistantIntent, buildAssistantData, formatAssistantResponse };
