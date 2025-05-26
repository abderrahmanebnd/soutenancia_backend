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
        fieldsToSearch.map((field) => {
          if (field.includes(".")) {
            const [relation, nestedField] = field.split(".");
            return {
              [relation]: {
                [nestedField]: { contains: term, mode: "insensitive" },
              },
            };
          } else {
            return {
              [field]: { contains: term, mode: "insensitive" },
            };
          }
        })
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
    } else {
      // Handle boolean values and regular filters
      let value = filters[key];

      // Convert string booleans to actual booleans
      if (value === "true") {
        value = true;
      } else if (value === "false") {
        value = false;
      }

      query.where[key] = value;
    }
  });

  return query;
};

module.exports = { buildPrismaQuery };
