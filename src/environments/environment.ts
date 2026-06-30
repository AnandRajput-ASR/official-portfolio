export const environment = {
  production: false,

  api: {
    baseUrl: 'http://localhost:3000/api',
  },

  assets: {
    baseUrl: 'http://localhost:3000/assets',
  },

  /**
   * When true, the backend is expected to set HttpOnly session + refresh
   * cookies and to expose `GET /api/auth/me` for session lookup. The
   * frontend never reads or stores the token; cookies are sent by the
   * browser automatically. When false, the legacy JWT-in-localStorage
   * path stays in place so the frontend is buildable against the current
   * backend until the cookie path is deployed.
   */
  cookieAuth: false,
};
