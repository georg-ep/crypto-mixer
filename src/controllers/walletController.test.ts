import request from 'supertest';
import { app } from '../app'; // Assuming your app is exported from app.ts
import { PrismaClient } from '@prisma/client';
import { createWallet, getWallet, updateWallet, deleteWallet } from '../controllers/walletController'; // Import the functions you want to test
import { Wallet } from '@prisma/client';


jest.mock('../utils/prismaClient', () => ({
  prisma: {
    wallet: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const prisma = require('../utils/prismaClient').prisma;

describe('WalletController', () => {
  const mockWallet: Wallet = {
    id: 'some-uuid',
    solana_address: 'some-address',
    user_id: 'user123',
    created_at: new Date(),
    updated_at: new Date(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWallet', () => {
    it('should create a wallet and return 201', async () => {
      (prisma.wallet.create as jest.Mock).mockResolvedValue(mockWallet);

      const response = await request(app)
        .post('/wallets')
        .send({ solana_address: mockWallet.solana_address, user_id: mockWallet.user_id });

      expect(response.statusCode).toBe(201);
      expect(response.body).toEqual(mockWallet);
      expect(prisma.wallet.create).toHaveBeenCalledWith({
        data: {
          solana_address: mockWallet.solana_address,
          user_id: mockWallet.user_id,
        },
      });
    });

    it('should return 400 if validation fails', async () => {
      const response = await request(app).post('/wallets').send({ user_id: 'user123' });
      expect(response.statusCode).toBe(400);
    });

    it('should return 500 on create error', async () => {
      (prisma.wallet.create as jest.Mock).mockRejectedValue(new Error('Database error'));
      const response = await request(app)
        .post('/wallets')
        .send({ solana_address: mockWallet.solana_address, user_id: mockWallet.user_id });
      expect(response.statusCode).toBe(500);
    });
  });

  describe('getWallet', () => {
    it('should get a wallet and return 200', async () => {
      (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(mockWallet);

      const response = await request(app).get(`/wallets/${mockWallet.id}`);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(mockWallet);
      expect(prisma.wallet.findUnique).toHaveBeenCalledWith({
        where: { id: mockWallet.id },
      });
    });

    it('should return 404 if wallet not found', async () => {
      (prisma.wallet.findUnique as jest.Mock).mockResolvedValue(null);
      const response = await request(app).get(`/wallets/${mockWallet.id}`);
      expect(response.statusCode).toBe(404);
    });

    it('should return 500 on find error', async () => {
      (prisma.wallet.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));
      const response = await request(app).get(`/wallets/${mockWallet.id}`);
      expect(response.statusCode).toBe(500);
    });
  });

  describe('updateWallet', () => {
    it('should update a wallet and return 200', async () => {
      (prisma.wallet.update as jest.Mock).mockResolvedValue(mockWallet);

      const response = await request(app)
        .put(`/wallets/${mockWallet.id}`)
        .send({ solana_address: 'new-address' });

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(mockWallet);
      expect(prisma.wallet.update).toHaveBeenCalledWith({
        where: { id: mockWallet.id },
        data: { solana_address: 'new-address' },
      });
    });

    it('should return 400 if validation fails', async () => {
      const response = await request(app).put(`/wallets/${mockWallet.id}`).send({ solana_address: 123 });
      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if wallet not found', async () => {
        (prisma.wallet.update as jest.Mock).mockResolvedValue(null);
        const response = await request(app).put(`/wallets/${mockWallet.id}`).send({ solana_address: 'new-address' });
        expect(response.statusCode).toBe(404);
    });

    it('should return 500 on update error', async () => {
      (prisma.wallet.update as jest.Mock).mockRejectedValue(new Error('Database error'));
      const response = await request(app)
        .put(`/wallets/${mockWallet.id}`)
        .send({ solana_address: 'new-address' });
      expect(response.statusCode).toBe(500);
    });
  });

  describe('deleteWallet', () => {
    it('should delete a wallet and return 204', async () => {
      (prisma.wallet.delete as jest.Mock).mockResolvedValue(mockWallet);

      const response = await request(app).delete(`/wallets/${mockWallet.id}`);

      expect(response.statusCode).toBe(204);
      expect(prisma.wallet.delete).toHaveBeenCalledWith({
        where: { id: mockWallet.id },
      });
    });

    it('should return 404 if wallet not found', async () => {
        (prisma.wallet.delete as jest.Mock).mockResolvedValue(null);
        const response = await request(app).delete(`/wallets/${mockWallet.id}`);
        expect(response.statusCode).toBe(404);
    });

    it('should return 500 on delete error', async () => {
      (prisma.wallet.delete as jest.Mock).mockRejectedValue(new Error('Database error'));
      const response = await request(app).delete(`/wallets/${mockWallet.id}`);
      expect(response.statusCode).toBe(500);
    });
  });
});