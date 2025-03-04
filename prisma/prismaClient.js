const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const z = require("zod");

// zod does not have built in validation for his schema, so we need to create our own validation using zod
const userValidationSchema = z.object({
  firstName: z.string().min(3, "First name must be at least 3 characters"),
  lastName: z
    .string()
    .min(3, "Last name must be at least 3 characters")
    .optional(),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["student", "teacher", "admin", "entreprise"]).optional(),
});

const studentValidationSchema = z.object({
  firstName: z.string().min(3, "First name must be at least 3 characters"),
  lastName: z
    .string()
    .min(3, "Last name must be at least 3 characters")
    .optional(),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["student", "teacher", "admin", "entreprise"]).optional(),
  enrollmentNumber: z
    .string()
    .min(5, "Enrollment number must be at least 5 characters")
    .optional(),
  year: z.number().int().min(1).optional(),
  speciality: z
    .string()
    .min(3, "Speciality must be at least 3 characters")
    .optional(),
});

const prisma = new PrismaClient().$extends({
  model: {
    user: {
      async signup({ data }) {
        if (data.role === "student") {
          const validatedStudent = studentValidationSchema.safeParse(data);
          if (!validatedStudent.success) {
            throw new Error(validatedStudent?.error?.errors[0]?.message);
          }
        } else {
          const validatedUser = userValidationSchema.safeParse(data);
          if (!validatedUser.success) {
            throw new Error(validatedStudent?.error?.errors[0]?.message);
          }
        }

        data.password = await bcrypt.hash(data.password, 12);
        return await prisma.user.create({ data });
      },

      async updateUser(args) {
        if (args.data) {
          const validation = userValidationSchema
            .partial()
            .safeParse(args.data);
          if (!validation.success) {
            throw new Error(validation.error.errors[0].message);
          }
        }

        if (args.data.password) {
          args.data.password = await bcrypt.hash(args.data.password, 12);
          args.data.passwordChangedAt = new Date(Date.now() - 1000);
        }

        return await prisma.user.update(args);
      },
    },
  },
  result: {
    student: {
      isCompletedProfile: {
        needs: { skills: true },
        compute(student) {
          return student.skills.length > 0;
        },
      },
    },
  },
});

module.exports = prisma;
