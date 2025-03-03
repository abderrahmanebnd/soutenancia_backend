const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient().$extends({
  model: {
    user: {
      async signup({ data }) {
        if (data.password) {
          console.log("password", data.password);
          data.password = await bcrypt.hash(data.password, 12);
        }
        return await prisma.user.create({ data }); // Use the original Prisma create method
      },

      async update(args) {
        if (args.data.password) {
          args.data.password = await bcrypt.hash(args.data.password, 12);
          args.data.passwordChangedAt = new Date(Date.now() - 1000);
        }
        return this.$apply.client.user.update(args); // Use the original Prisma update method
      },
    },
  },
});

module.exports = prisma;
