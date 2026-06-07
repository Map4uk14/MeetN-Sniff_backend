function normalizeStringList(values) {
  const seen = new Set();

  return (Array.isArray(values) ? values : [])
    .map((value) => String(value).trim().toLowerCase())
    .filter(Boolean)
    .filter((value) => {
      if (seen.has(value)) {
        return false;
      }

      seen.add(value);
      return true;
    });
}

function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

module.exports = {
  normalizeStringList,
  slugify,
};
