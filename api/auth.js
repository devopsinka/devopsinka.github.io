const crypto = require('crypto');

const githubAuthorizeUrl = 'https://github.com/login/oauth/authorize';

function getBaseUrl(req) {
  return process.env.OAUTH_BASE_URL || `https://${req.headers.host}`;
}

function signState(payload) {
  const secret = process.env.GITHUB_CLIENT_SECRET;
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

module.exports = (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.statusCode = 500;
    res.end('Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET');
    return;
  }

  const provider = req.query.provider || 'github';
  const scope = req.query.scope || 'repo';

  if (provider !== 'github') {
    res.statusCode = 400;
    res.end('Only GitHub provider is supported');
    return;
  }

  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/callback`;
  const state = signState({ provider, scope, createdAt: Date.now() });
  const url = new URL(githubAuthorizeUrl);

  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scope);
  url.searchParams.set('state', state);

  res.writeHead(302, { Location: url.toString() });
  res.end();
};
