/**
 * CareConnect Ethiopia - In-Memory Express Test Helper
 * Executes requests directly against Express application without TCP sockets.
 */

import { EventEmitter } from 'events';

export function request(app) {
  return {
    get: (url, options = {}) => executeRequest(app, 'GET', url, null, options),
    post: (url, body, options = {}) => executeRequest(app, 'POST', url, body, options),
    put: (url, body, options = {}) => executeRequest(app, 'PUT', url, body, options),
    patch: (url, body, options = {}) => executeRequest(app, 'PATCH', url, body, options),
    delete: (url, options = {}) => executeRequest(app, 'DELETE', url, null, options)
  };
}

function executeRequest(app, method, url, body = null, options = {}) {
  return new Promise((resolve) => {
    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.unpipe = () => {};
    req.socket = { remoteAddress: '127.0.0.1' };
    req.connection = req.socket;
    req.headers = {
      host: 'localhost',
      'user-agent': 'careconnect-test-agent',
      ...(body ? { 'content-type': 'application/json' } : {})
    };
    if (options.headers) {
      for (const [k, v] of Object.entries(options.headers)) {
        req.headers[k.toLowerCase()] = v;
      }
    }
    if (body && typeof body === 'object') {
      req.body = JSON.parse(JSON.stringify(body));
    }

    const res = new EventEmitter();
    res.statusCode = 200;
    res.headers = {};
    res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = String(v); };
    res.getHeader = (k) => res.headers[k.toLowerCase()];
    res.removeHeader = (k) => { delete res.headers[k.toLowerCase()]; };

    let responseBody = '';

    res.write = (chunk) => {
      if (chunk) responseBody += chunk.toString();
    };

    res.end = (chunk) => {
      if (chunk) responseBody += chunk.toString();

      let json = null;
      try {
        json = JSON.parse(responseBody);
      } catch {
        json = null;
      }

      resolve({
        status: res.statusCode,
        headers: res.headers,
        body: json || responseBody,
        text: responseBody
      });
    };

    // Pass into Express handler
    app.handle(req, res);

    if (body) {
      const payload = typeof body === 'string' ? body : JSON.stringify(body);
      req.emit('data', Buffer.from(payload));
    }
    req.emit('end');
  });
}

export default request;
