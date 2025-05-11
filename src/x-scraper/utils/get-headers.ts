export function getHeaders() {
  return {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    Accept: '*/*',
    'Accept-Language': 'en-US,en;q=0.9,he;q=0.8',
    'Content-Type': 'application/json',
    authorization: process.env.X_AUTHORIZATION,
    'x-csrf-token': process.env.X_CSRF_TOKEN,
    'x-twitter-active-user': 'yes',
    'x-twitter-auth-type': 'OAuth2Session',
    'x-twitter-client-language': 'en',
    cookie: process.env.X_COOKIE,
    referer: 'https://x.com/home',
  };
}
