/*
  Warnings:

  - A unique constraint covering the columns `[refreshTokens]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "refreshTokens" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_refreshTokens_key" ON "User"("refreshTokens");
