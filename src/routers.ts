import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { string, z } from "zod";
import { User } from "./entities/User";
import bcrypt from "bcrypt";
import jsonwebtoken from "jsonwebtoken";
import * as dotenv from "dotenv";

dotenv.config();

const routers = Router();

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ay6z7oj.mongodb.net/?retryWrites=true&w=majority`
  )
  .then(() => console.log("Connected!"))
  .catch((error) => console.log(error));

routers.get("/", async (response: Response) => {
  response.status(200).json({
    msg: "API funcionando",
  });
});

routers.get("/user/:id", checkToken, async (req, res) => {
  try {
    const loginUserParams = z.object({
      id: z.string({ required_error: "Id é obrigatório" }),
    });

    const { id } = loginUserParams.parse(req.params);

    const userExists = await User.findById(id, "-password");

    if (!userExists) {
      return res.status(404).json({
        msg: "Usuário não encontrado",
      });
    }

    return res.status(200).json({
      user: userExists
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(error.issues.map((e) => e.message));
    }
  }
});

function checkToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ msg: "Acesso negado" });
  }

  try {
    jsonwebtoken.verify(token, String(process.env.SECRET));

    next();
  } catch (error) {
    res.status(400).json({ msg: "Token inválido" });
  }
}

//Register User
routers.post("/auth/register", async (req, res) => {
  try {
    const createUserBody = z.object({
      name: z.string({ required_error: "Preencha todos os campos" }),
      email: z
        .string({ required_error: "Preencha todos os campos" })
        .email("Informe um endereço de email valido"),
      password: z
        .string({ required_error: "Preencha todos os campos" })
        .min(8, "A senha deve conter no minimo 8 caracteres"),
      confirmPassword: z.string({ required_error: "Preencha todos os campos" }),
    });

    const { name, email, password, confirmPassword } = createUserBody.parse(
      req.body
    );

    if (confirmPassword !== password) {
      return res.status(422).json({ msg: "As senhas devem ser iguais" });
    }

    const userExists = await User.findOne({ email: email });

    if (userExists) {
      return res.status(200).json({ msg: "Email já cadastrado" });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordEncrypted = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email,
      password: passwordEncrypted,
    });

    await user.save();

    return res.status(200).json({
      msg: "Usuário criado com sucesso!",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(error.issues.map((e) => e.message));
    }
  }
});

routers.post("/auth/login", async (req, res) => {
  try {
    const userLoginBody = z.object({
      email: z
        .string({ required_error: "Preencha todos os campos" })
        .email("Informe um endereço de email válido"),
      password: z.string({ required_error: "Preencha todos os campos" }),
    });

    const { email, password } = userLoginBody.parse(req.body);

    const userExists = await User.findOne({ email: email });

    if (!userExists) {
      return res.status(400).json({ msg: "Usuário não encontrado" });
    }

    const checkPassword = await bcrypt.compare(password, userExists.password);

    if (!checkPassword) {
      return res.status(400).json({ msg: "Senha inválida!" });
    }

    const token = jsonwebtoken.sign(
      {
        id: userExists._id,
      },
      String(process.env.SECRET),
      {
        expiresIn: "4h",
      }
    );

    return res
      .status(200)
      .json({ msg: "Autenticação realizada com sucesso!", token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(error.issues.map((e) => e.message));
    }
  }
});

export default routers;
