"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const wallets_1 = __importDefault(require("./routes/wallets"));
const prismaClient_1 = __importDefault(require("./utils/prismaClient"));
const port = process.env.PORT || 3000;
const start = async () => {
    const app = (0, express_1.default)();
    app.use(body_parser_1.default.urlencoded({ extended: true }));
    app.use(body_parser_1.default.json());
    app.use('/wallets', wallets_1.default);
    app.listen(port, () => {
        console.log(`Serving at http://localhost:${port}`);
    });
};
start()
    .then(async () => {
    await prismaClient_1.default.$disconnect();
})
    .catch(async (e) => {
    console.error(e);
    await prismaClient_1.default.$disconnect();
    process.exit(1);
});
