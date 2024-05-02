import express from "express";
import bodyParser from "body-parser";
import walletRouter from './routes/wallets';
import prisma from "./utils/prismaClient";
const port = process.env.PORT || 3000;

const start = async () => {
  const app = express();
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(bodyParser.json());
  app.use('/wallets', walletRouter);

  app.listen(port, () => {
    console.log(`Serving at http://localhost:${port}`);
  });
};

start()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
