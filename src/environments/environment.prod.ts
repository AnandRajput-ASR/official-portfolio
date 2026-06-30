export const environment = {
  production: true,

  api: {
    baseUrl: 'https://official-portfolio-backend-6f1v.onrender.com/api',
  },

  assets: {
    baseUrl: '/assets',
  },

  /**
   * When true, the backend is expected to set HttpOnly session + refresh
   * cookies and to expose `GET /api/auth/me` for session lookup.
   */
  cookieAuth: true,
};
