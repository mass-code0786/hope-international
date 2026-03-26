'use client';

const CART_KEY = 'hope_cart_items';
const CART_EVENT = 'hope-cart-updated';

function canUseStorage() {
  return typeof window !== 'undefined';
}

function readCart() {
  if (!canUseStorage()) return [];
  const raw = window.localStorage.getItem(CART_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    window.localStorage.removeItem(CART_KEY);
    return [];
  }
}

function writeCart(items) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: { count: getCartCount() } }));
}

export function getCartCount() {
  return readCart().reduce((sum, item) => sum + Number(item?.quantity || 0), 0);
}

export function getCartItems() {
  return readCart();
}

export function addToCart(product, quantity = 1) {
  if (!product?.id || !canUseStorage()) return 0;

  const items = readCart();
  const idx = items.findIndex((item) => item.productId === product.id);

  if (idx >= 0) {
    items[idx] = {
      ...items[idx],
      quantity: Number(items[idx].quantity || 0) + Number(quantity || 1)
    };
  } else {
    items.push({
      productId: product.id,
      name: product.name || 'Product',
      price: Number(product.price || 0),
      quantity: Number(quantity || 1)
    });
  }

  writeCart(items);
  return getCartCount();
}

export function subscribeCart(callback) {
  if (!canUseStorage()) return () => {};

  const notify = () => callback(getCartCount());
  notify();

  const onStorage = (event) => {
    if (event.key === CART_KEY) notify();
  };

  const onCartUpdate = () => notify();

  window.addEventListener('storage', onStorage);
  window.addEventListener(CART_EVENT, onCartUpdate);

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CART_EVENT, onCartUpdate);
  };
}
