import { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import {
  PrismaClient,
  User,
  Organization,
  OrganizationUser,
} from "@prisma/client";
import jwt from "jsonwebtoken";
import { SignOptions } from "jsonwebtoken";

import { emailExisted, usernameExisted } from "./repository/userRepository";

const prisma = new PrismaClient();

export const authController = {
  createAccessToken: (user: User) => {
    return jwt.sign(
      {
        data: {
          id: user.id,
          username: user.username,
        },
      },
      process.env.JWT_ACCESS_KEY!,
      { expiresIn: process.env.TIME_TOKEN_EXPIRE } as SignOptions
    );
  },
  createRefreshToken: (user: User) => {
    return jwt.sign(
      {
        data: {
          id: user.id,
          username: user.username,
        },
      },
      process.env.JWT_REFRESH_KEY!,
      { expiresIn: process.env.TIME_REFRESH_TOKEN_EXPIRE } as SignOptions
    );
  },

  refreshToken: (req: Request | any, res: Response) => {
    const refreshToken = req.headers.authorization.split(" ")[1];
    if (!refreshToken) return res.status(401).json("You're not authenticated");
    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_KEY!,
      (err: any, user: any) => {
        if (err) return res.status(500).send(err);
        const newAccessToken = authController.createAccessToken(user);
        const newRefreshToken = authController.createRefreshToken(user);
        res
          .status(200)
          .json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
      }
    );
  },
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
  /**POST: http://localhost:8080/api/auth/login */
  async loginUser(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      const user = await prisma.user.findUnique({
        where: {
          username,
        },
      });
      if (!user) {
        return res.status(404).send({ username: "Username not found" });
      }
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).send({ password: "Password does not match" });
      }

      //create jwt
      const accessToken = authController.createAccessToken(user);
      const refreshToken = authController.createRefreshToken(user);

      return res.status(200).send({
        message: "Login successfully !!!",
        accessToken,
        refreshToken,
      });
    } catch (error) {
      return res.status(500).send(error);
    }
  },

  async verifyUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { username } = req.method === "GET" ? req.query : req.body;
      const existUser = await prisma.user.findUnique({
        where: {
          username,
        },
      });
      if (!existUser) {
        return res.status(404).send({
          username: "Username not found",
        });
      }
      next();
    } catch (error) {
      return res.status(404).send({ message: "Authentication Error" });
    }
  },
};
