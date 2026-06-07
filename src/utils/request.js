const { normalizeStringList } = require('./strings');

function pick(source, allowedFields) {
  return allowedFields.reduce((result, field) => {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      result[field] = source[field];
    }

    return result;
  }, {});
}

function parseList(value) {
  if (Array.isArray(value)) {
    return normalizeStringList(value.flatMap((item) => String(item).split(',')));
  }

  return normalizeStringList(String(value || '').split(','));
}

function getPagination(query) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

module.exports = {
  getPagination,
  parseList,
  pick,
};
