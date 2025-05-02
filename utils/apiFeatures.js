const buildPrismaQuery = (queryParams) => {
  const {
    page = 1,
    limit = 10,
    sort,
    fields,
    search,
    searchFields,
    ...filters
  } = queryParams;

  const query = {
    where: {},
    take: parseInt(limit),
    skip: (parseInt(page) - 1) * parseInt(limit),
  };

  if (sort) {
    const sortFields = sort.split(",");
    query.orderBy = sortFields.map((field) => {
      const order = field.startsWith("-") ? "desc" : "asc";
      const fieldName = field.startsWith("-") ? field.substring(1) : field;
      return { [fieldName]: order };
    });
  }

  if (fields) {
    const fieldsList = fields.split(",");
    query.select = fieldsList.reduce((acc, field) => {
      acc[field] = true;
      return acc;
    }, {});
  }

  if (search && searchFields) {
    const searchTerms = search.split(" ").filter(Boolean);
    const fieldsToSearch = searchFields.split(",");

    if (searchTerms.length > 0 && fieldsToSearch.length > 0) {
      query.where.OR = searchTerms.flatMap((term) =>
        fieldsToSearch.map((field) => ({
          [field]: { contains: term, mode: "insensitive" },
        }))
      );
    }
  }

  Object.keys(filters).forEach((key) => {
    // Handle special cases for filters
    if (key.includes(".")) {
      // Handle nested filters like student.specialityId=123
      const [relation, field] = key.split(".");
      query.where[relation] = query.where[relation] || {};
      query.where[relation][field] = filters[key];
    } else if (key.endsWith("_gt")) {
      // Greater than filter
      const field = key.replace("_gt", "");
      query.where[field] = { gt: filters[key] };
    } else if (key.endsWith("_gte")) {
      // Greater than or equal filter
      const field = key.replace("_gte", "");
      query.where[field] = { gte: filters[key] };
    } else if (key.endsWith("_lt")) {
      // Less than filter
      const field = key.replace("_lt", "");
      query.where[field] = { lt: filters[key] };
    } else if (key.endsWith("_lte")) {
      // Less than or equal filter
      const field = key.replace("_lte", "");
      query.where[field] = { lte: filters[key] };
    } else if (key.endsWith("_in")) {
      // In array filter
      const field = key.replace("_in", "");
      const values = filters[key].split(",");
      query.where[field] = { in: values };
    } else if (key.endsWith("_contains")) {
      // Contains text filter
      const field = key.replace("_contains", "");
      query.where[field] = { contains: filters[key], mode: "insensitive" };
    } else {
      // Default exact match filter
      query.where[key] = filters[key];
    }
  });

  return query;
};

module.exports = { buildPrismaQuery };
