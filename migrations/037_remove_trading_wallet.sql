UPDATE wallets
SET deposit_balance = COALESCE(deposit_balance, 0) + COALESCE(trading_balance, 0),
    trading_balance = 0,
    balance = COALESCE(income_balance, 0) + COALESCE(deposit_balance, 0)
WHERE COALESCE(trading_balance, 0) <> 0;

UPDATE wallets
SET deposit_balance = COALESCE(deposit_balance, 0) + COALESCE(withdrawal_balance, 0),
    withdrawal_balance = 0,
    balance = COALESCE(income_balance, 0) + COALESCE(deposit_balance, 0)
WHERE COALESCE(withdrawal_balance, 0) <> 0;

UPDATE wallets
SET trading_wallet_frozen = FALSE
WHERE trading_wallet_frozen = TRUE;
