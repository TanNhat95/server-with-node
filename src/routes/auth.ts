import express from "express";

import { authController } from "../controllers/authController";

export const authRoute = express.Router();

//POST
authRoute.post("/register", authController.registerUser);
