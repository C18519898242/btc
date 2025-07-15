import { Wallet } from './wallet';
import { Api, Balance, Utxo } from './api/api';

// Mock the Api class
jest.mock('./api/api');

describe('Wallet', () => {
    let wallet: Wallet;
    let mockApi: jest.Mocked<Api>;

    beforeEach(() => {
        // Create a new mock for each test
        mockApi = {
            getUtxos: jest.fn(),
            getTxHex: jest.fn(),
            sendTx: jest.fn(),
        } as jest.Mocked<Api>;
        wallet = new Wallet(mockApi);
    });

    describe('getBalance', () => {
        it('should return the sum of utxos for a given address', async () => {
            const address = 'test-address';
            const utxos: Utxo[] = [
                { txid: '1', vout: 0, value: 10000, status: { confirmed: true, block_height: 1, block_hash: 'hash1', block_time: 123 } },
                { txid: '2', vout: 1, value: 20000, status: { confirmed: true, block_height: 1, block_hash: 'hash1', block_time: 123 } },
                { txid: '3', vout: 0, value: 5000, status: { confirmed: false, block_height: 0, block_hash: '', block_time: 0 } },
            ];
            const expectedBalance: Balance = {
                confirmed: 30000,
                unconfirmed: 5000,
            };

            mockApi.getUtxos.mockResolvedValue(utxos);

            const balance = await wallet.getBalance(address);

            expect(balance).toEqual(expectedBalance);
            expect(mockApi.getUtxos).toHaveBeenCalledWith(address);
        });

        it('should return zero balance if there are no utxos', async () => {
            const address = 'empty-address';
            const expectedBalance: Balance = {
                confirmed: 0,
                unconfirmed: 0,
            };

            mockApi.getUtxos.mockResolvedValue([]);

            const balance = await wallet.getBalance(address);

            expect(balance).toEqual(expectedBalance);
            expect(mockApi.getUtxos).toHaveBeenCalledWith(address);
        });
    });

    // We can add more tests for other methods in Wallet class later
});
