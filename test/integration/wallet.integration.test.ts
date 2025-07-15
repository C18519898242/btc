import { Wallet } from '../../src/wallet';
import { MempoolApi } from '../../src/api/mempool';
import { BlockstreamApi } from '../../src/api/blockstream';
import config from '../../config.json';

const TEST_ADDRESS = 'mwnzUFWcdyapR8B7tNrkt3tvGpAw68TUwX';

jest.setTimeout(30000);

describe('Wallet Integration Tests', () => {

    const networkConfig = config.networks.testnet4 as any;

    // Test with MempoolApi
    if (networkConfig.mempool && networkConfig.mempool.api_url) {
        describe('with MempoolApi', () => {
            let wallet: Wallet;

            beforeAll(() => {
                const api = new MempoolApi(networkConfig.mempool.api_url);
                wallet = new Wallet(api);
            });

            it('should fetch a real balance for a testnet address', async () => {
                const balance = await wallet.getBalance(TEST_ADDRESS);
                expect(typeof balance.confirmed).toBe('number');
                expect(typeof balance.unconfirmed).toBe('number');
                expect(balance.confirmed).toBeGreaterThan(0);
            });
        });
    } else {
        describe.skip('with MempoolApi', () => {
            it('skipping tests because Mempool API is not configured for testnet4', () => { });
        });
    }

    // Test with BlockstreamApi
    if (networkConfig.blockstream && networkConfig.blockstream.api_url) {
        describe('with BlockstreamApi', () => {
            let wallet: Wallet;

            beforeAll(() => {
                const api = new BlockstreamApi(networkConfig.blockstream.api_url);
                wallet = new Wallet(api);
            });

            it('should fetch a real balance for a testnet address', async () => {
                const balance = await wallet.getBalance(TEST_ADDRESS);
                expect(typeof balance.confirmed).toBe('number');
                expect(typeof balance.unconfirmed).toBe('number');
                expect(balance.confirmed).toBeGreaterThan(0);
            });
        });
    } else {
        describe.skip('with BlockstreamApi', () => {
            it('skipping tests because Blockstream API is not configured for testnet4', () => { });
        });
    }
});
