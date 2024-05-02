-- CreateTable
CREATE TABLE "Wallet" (
    "id" SERIAL NOT NULL,
    "publicKey" TEXT NOT NULL,
    "privateKey" INTEGER[],
    "solBalance" DECIMAL(65,30),
    "activated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_publicKey_key" ON "Wallet"("publicKey");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_privateKey_key" ON "Wallet"("privateKey");
