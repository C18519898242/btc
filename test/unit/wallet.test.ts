import { Wallet } from '../../src/wallet';
import { Api, Balance, Utxo } from '../../src/api/api';

// Mock the getApi and getAllApis functions
import { getApi, getAllApis } from '../../src/api';
jest.mock('../../src/api');

describe('Wallet', () => {
    let wallet: Wallet;
    let mockApi: jest.Mocked<Api>;
    let mockApi2: jest.Mocked<Api>;

    beforeEach(() => {
        // Create new mocks for each test
        mockApi = {
            getUtxos: jest.fn(),
            getTxHex: jest.fn(),
            sendTx: jest.fn(),
            getBlockHeight: jest.fn(),
            importWallet: jest.fn(),
        } as jest.Mocked<Api>;
        mockApi2 = {
            getUtxos: jest.fn(),
            getTxHex: jest.fn(),
            sendTx: jest.fn(),
            getBlockHeight: jest.fn(),
            importWallet: jest.fn(),
        } as jest.Mocked<Api>;

        (getApi as jest.Mock).mockReturnValue(mockApi);
        (getAllApis as jest.Mock).mockReturnValue([mockApi, mockApi2]);
        wallet = new Wallet();
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

    describe('createWallet', () => {
        it('should create a wallet and import the address to all apis', async () => {
            const networkName = 'testnet';
            const newWallet = await wallet.createWallet(networkName);

            expect(newWallet).toBeDefined();
            expect(newWallet.network).toBe(networkName);
            expect(mockApi.importWallet).toHaveBeenCalledWith(newWallet.address);
            expect(mockApi2.importWallet).toHaveBeenCalledWith(newWallet.address);
        });
    });
});
