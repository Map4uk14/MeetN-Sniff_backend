const js2xmlparser = require('js2xmlparser');

function wantsXml(req) {
  const format = String(req.query.format || '').toLowerCase();
  const acceptsXml = req.accepts(['json', 'xml']) === 'xml';

  return format === 'xml' || acceptsXml;
}

function sendFormatted(req, res, rootName, payload) {
  if (!wantsXml(req)) {
    res.json(payload);
    return;
  }

  const plainPayload = JSON.parse(JSON.stringify(payload));
  res.type('application/xml').send(js2xmlparser.parse(rootName, plainPayload));
}

module.exports = {
  sendFormatted,
  wantsXml,
};
