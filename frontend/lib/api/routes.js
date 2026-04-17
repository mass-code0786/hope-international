export const API_ROUTES = {
  users: {
    me: '/users/me'
  },
  landing: {
    public: '/landing/public',
    visit: '/landing/visit'
  },
  products: {
    list: '/products',
    detail: (id) => `/products/${id}`
  },
  wallet: {
    nowpayments: {
      create: '/wallet/deposits/nowpayments',
      detail: (id) => `/wallet/deposits/nowpayments/${id}`,
      sync: (id) => `/wallet/deposits/nowpayments/${id}/sync`
    }
  }
};
