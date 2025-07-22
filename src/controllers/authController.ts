import { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import {
  PrismaClient,
  User,
  Organization,
  OrganizationUser,
} from "@prisma/client";

import { emailExisted, usernameExisted } from "./repository/userRepository";

const prisma = new PrismaClient();

export const authController = {
  /**POST: http://localhost:8080/api/auth/register */

  async registerUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, email, password, firstName, lastName, mobile } =
        req.body;
      const existUsername = await usernameExisted(username);
      if (existUsername) {
        return res
          .status(409)
          .send({ message: "Sorry, Username is already taken" });
      }
      const existEmail = await emailExisted(email);
      if (existEmail) {
        return res
          .status(409)
          .send({ message: "Sorry, Email is already registered" });
      }
      if (!password) {
        return res.status(400).send("Sorry, missing password");
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      try {
        await prisma.$transaction(async (tx) => {
          const user: User = await tx.user.create({
            data: {
              username,
              password: hashedPassword,
              email,
              firstName,
              lastName,
              mobile,
            },
          });
          const organization: Organization = await tx.organization.create({
            data: {},
          });
          await tx.organizationUser.create({
            data: {
              typeUser: "Admin",
              organizationId: organization.id,
              userId: user.id,
            },
          });
        });
      } catch (error) {
        return res
          .status(500)
          .send({ message: "Something went wrong with Register User" });
      }
      return res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
      return res.status(500).send(error);
    }
  },
};
