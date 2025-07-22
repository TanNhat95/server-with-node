import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const usernameExisted = async (username: string) => {
  const usernameExisted = await prisma.user.findUnique({
    where: {
      username,
    },
  });
  return usernameExisted;
};

export const emailExisted = async (email: string) => {
  const emailExisted = await prisma.user.findUnique({
    where: {
      email,
    },
  });
  return emailExisted;
};
