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
        return await prisma.user.create({ data });
      },

      async updateUser(args) {
        if (args.data.password) {
          args.data.password = await bcrypt.hash(args.data.password, 12);
          args.data.passwordChangedAt = new Date(Date.now() - 1000);
        }
        return await prisma.user.update(args);
      },

      async correctPassword(candidatePassword, userPassword) {
        return await bcrypt.compare(candidatePassword, userPassword);
      },
    },
  },
});

module.exports = prisma;
