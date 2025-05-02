const { buildPrismaQuery } = require("../utils/apiFeatures");
const prisma = require("../prisma/prismaClient");

//function to create a generic paginated list handler
exports.createListHandler = (modelName, options = {}) => {
  return async (req, res) => {
    try {
      const query = buildPrismaQuery(req.query);

      // Add includes if specified
      if (options.include) {
        query.include = options.include;
      }

      // Add default sorting if not provided in the request
      if (!req.query.sort && options.defaultSort) {
        query.orderBy = options.defaultSort;
      }

      // Get data with pagination
      const items = await prisma[modelName].findMany(query);

      // Get total count for pagination metadata
      const totalCount = await prisma[modelName].count({
        where: query.where,
      });

      //calculate
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const totalPages = Math.ceil(totalCount / limit);
      res.status(200).json({
        status: "success",
        results: items.length,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages,
        },
        data: items,
      });
    } catch (error) {
      console.error(`Error in list handler for ${modelName}:`, error);
      res.status(500).json({
        status: "error",
        message: `Failed to retrieve ${modelName} data`,
        error: error.message,
      });
    }
  };
};

//function to create a generic get by id handler
exports.createGetOneHandler = (modelName, options = {}) => {
  return async (req, res) => {
    try {
      const { id } = req.params;

      const query = { where: { id } };

      if (options.include) {
        query.include = options.include;
      }

      const item = await prisma[modelName].findUnique(query);

      if (!item) {
        return res.status(404).json({
          status: "fail",
          message: `${modelName} with ID ${id} not found`,
        });
      }

      res.status(200).json({
        status: "success",
        data: item,
      });
    } catch (error) {
      console.error(`Error in get handler for ${modelName}:`, error);
      res.status(500).json({
        status: "error",
        message: `Failed to retrieve ${modelName}`,
        error: error.message,
      });
    }
  };
};
