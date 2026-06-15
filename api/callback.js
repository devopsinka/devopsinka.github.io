const crypto = require('crypto');

const githubTokenUrl = 'https://github.com/login/oauth/access_token';

function getBaseUrl(req) {
  return process.env.OAUTH_BASE_URL || `https://${req.headers.host}`;
}

function verifyState(state) {
  const secret = process.env.GITHUB_CLIENT_SECRET;
  const [data, signature] = String(state || '').split('.');

  if (!data || !signature) {
    return null;
  }

  const expectedSignature = crypto.createHmac('sha256', secret).update(data).digest('base64url');

  if (signature !== expectedSignature) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  const maxAge = 10 * 60 * 1000;

  if (payload.provider !== 'github' || Date.now() - payload.createdAt >= maxAge) {
    return null;
  }

  return payload;
}

function renderMessagePage(targetOrigin, provider, status, payload) {
  const message = `authorization:${provider}:${status}:${JSON.stringify(payload)}`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Authorization</title>
  </head>
  <body>
    <script>
      (function () {
        var receiveMessage = function (event) {
          window.removeEventListener('message', receiveMessage, false);
          window.opener.postMessage(${JSON.stringify(message)}, event.origin);
        };

        window.addEventListener('message', receiveMessage, false);
        window.opener.postMessage('authorizing:${provider}', ${JSON.stringify(targetOrigin)});
      })();
    </script>
  </body>
</html>`;
}

module.exports = async (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const baseUrl = getBaseUrl(req);
  const state = verifyState(req.query.state);
  const targetOrigin = state && state.siteOrigin ? state.siteOrigin : 'https://devopsme.ru';

  if (!clientId || !clientSecret) {
    res.statusCode = 500;
    res.end('Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET');
    return;
  }

  if (!state) {
    res.statusCode = 400;
    res.end(renderMessagePage(targetOrigin, 'github', 'error', { message: 'Invalid OAuth state' }));
    return;
  }

  const tokenResponse = await fetch(githubTokenUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: req.query.code,
      redirect_uri: `${baseUrl}/api/callback`,
    }),
  });
  const tokenData = await tokenResponse.json();

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!tokenData.access_token) {
    res.statusCode = 400;
    res.end(renderMessagePage(targetOrigin, 'github', 'error', tokenData));
    return;
  }

  res.end(
    renderMessagePage(targetOrigin, 'github', 'success', {
      token: tokenData.access_token,
      provider: 'github',
    }),
  );
};
