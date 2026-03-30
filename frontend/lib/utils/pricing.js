function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

export function getOfferPercent(product) {
  const base = String(product?.id || product?.name || 'hope')
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return 10 + (base % 26);
}

export function getProductPricing(product, quantity = 1) {
  const finalPrice = toMoney(Number(product?.price || 0));
  const safeQuantity = Math.max(1, Number(quantity || 1));
  const offerPercent = getOfferPercent(product);
  const compareAtPrice = finalPrice > 0 ? toMoney(finalPrice * (1 + offerPercent / 100)) : 0;
  const discountPerUnit = Math.max(0, toMoney(compareAtPrice - finalPrice));

  return {
    offerPercent,
    finalPrice,
    compareAtPrice,
    discountPerUnit,
    lineFinalTotal: toMoney(finalPrice * safeQuantity),
    lineCompareAtTotal: toMoney(compareAtPrice * safeQuantity),
    lineDiscountTotal: toMoney(discountPerUnit * safeQuantity)
  };
}
