export const environment = {
  production: true,

  api: {
    baseUrl: '/api',
  },

  assets: {
    baseUrl: '/assets',
  },

  /**
   * When true, the backend is expected to set HttpOnly session + refresh
   * cookies and to expose `GET /api/auth/me` for session lookup.
   */
  cookieAuth: false,
};
