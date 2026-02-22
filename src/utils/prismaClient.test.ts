import prisma from "../src/utils/prismaClient";
import { PrismaClient } from "@prisma/client";

jest.mock('@prisma/client');

describe("prismaClient", () => {
  it("should initialize PrismaClient", () => {
    expect(prisma).toBeInstanceOf(PrismaClient);
  });

  it("should have the correct PrismaClient instance", () => {
    // Check if the mock was initialized correctly.  This is a basic check; further checks
    // would depend on the specific interactions expected with the Prisma client in your application.
    expect(PrismaClient).toHaveBeenCalledTimes(1);
  });
});