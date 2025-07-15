import { Wallet } from '../../src/wallet';
import { getApi } from '../../src/api';
import { Api } from '../../src/api/api';

const TEST_ADDRESS = 'mwnzUFWcdyapR8B7tNrkt3tvGpAw68TUwX';

jest.setTimeout(30000);

describe('Wallet Integration Tests', () => {
    let wallet: Wallet;
    let api: Api;

    beforeAll(() => {
        api = getApi();
        wallet = new Wallet(api);
    });

    it.skip('should fetch a real balance for a testnet address', async () => {
        const balance = await wallet.getBalance(TEST_ADDRESS);
        expect(typeof balance.confirmed).toBe('number');
        expect(typeof balance.unconfirmed).toBe('number');
        expect(balance.confirmed).toBeGreaterThan(0);
    });
});
