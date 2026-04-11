export const THEME = {
  appName: 'Hope International',
  tagline: 'Earn While You Shop',
  colors: {
    bg: 'bg-bg',
    card: 'bg-card',
    cardSoft: 'bg-cardSoft',
    accent: 'text-accent'
  }
};

export const RANKS = [
  { name: 'No Rank', minBv: 0, capMultiplier: 3 },
  { name: 'Bronze', minBv: 1000, capMultiplier: 4 },
  { name: 'Silver', minBv: 5000, capMultiplier: 5 },
  { name: 'Gold', minBv: 15000, capMultiplier: 6 },
  { name: 'Diamond', minBv: 50000, capMultiplier: 7 },
  { name: 'Crown', minBv: 100000, capMultiplier: 8 }
];

export const REWARD_SLABS = [
  { thresholdBv: 2000, rewardAmount: 100, label: '100 Cash Reward' },
  { thresholdBv: 5000, rewardAmount: 250, label: '250 Cash Reward' },
  { thresholdBv: 10000, rewardAmount: 500, label: '500 Cash Reward' },
  { thresholdBv: 50000, rewardAmount: 1000, label: '1000 Cash + iPhone' },
  { thresholdBv: 100000, rewardAmount: 2000, label: '2000 Cash + Four Wheeler' },
  { thresholdBv: 500000, rewardAmount: 5000, label: '5000 Cash + Bungalow' }
];

export const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/shop', label: 'Shop', icon: 'shopping-bag' },
  { href: '/team', label: 'Team', icon: 'network' },
  { href: '/income', label: 'Income', icon: 'wallet' },
  { href: '/profile', label: 'Profile', icon: 'user' }
];
