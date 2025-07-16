import { BtcNodeApi } from '../../src/api/btcNode';
import config from '../../config.json';

const TEST_ADDRESS = 'tb1ql6wz4s6cskmclr2gzhjqcu7exk9y2858w8ucgk';

jest.setTimeout(60000); // 60-second timeout for network requests

describe('BtcNodeApi Integration Tests', () => {
    let api: BtcNodeApi;

    const networkConfig = (config.networks as any)[config.network];
    const btcNodeConfig = networkConfig['btc-node'];

    if (btcNodeConfig && btcNodeConfig.api_url) {
        beforeAll(() => {
            api = new BtcNodeApi(btcNodeConfig.api_url, btcNodeConfig.username, btcNodeConfig.password);
        });

        it('should fetch the current block height', async () => {
            const blockHeight = await api.getBlockHeight();
            expect(typeof blockHeight).toBe('number');
            expect(blockHeight).toBeGreaterThan(0);
        });

        it('should fetch UTXOs for a given address', async () => {
            // Note: This test requires the node to have imported the address
            // and for the address to have unspent outputs.
            try {
                await api.importAddress(TEST_ADDRESS, 'test-label', false);
                const utxos = await api.getUtxos([TEST_ADDRESS]);
                expect(Array.isArray(utxos)).toBe(true);
                // We can't guarantee UTXOs, so we just check the call succeeds.
            } catch (error: any) {
                // It's okay if the wallet already has the address
                if (error.response && error.response.data && error.response.data.error.code === -4) {
                    console.warn('Address already imported, which is fine for this test.');
                    const utxos = await api.getUtxos([TEST_ADDRESS]);
                    expect(Array.isArray(utxos)).toBe(true);
                } else {
                    throw error;
                }
            }
        });

        it('should list all addresses in the wallet', async () => {
            // Ensure at least one address is imported before testing
            await api.importAddress(TEST_ADDRESS, 'test-label', false);

            const addresses = await api.listAddresses();
            expect(Array.isArray(addresses)).toBe(true);
            expect(addresses.length).toBeGreaterThan(0);
            expect(addresses).toContain(TEST_ADDRESS);
        });

    } else {
        describe.skip('BtcNodeApi tests', () => {
            it('skipping because btc-node is not configured for the current network', () => { });
        });
    }
});
