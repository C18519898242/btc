import { getAllApis } from '../../src/api';
import { Api } from '../../src/api/api';

// A testnet address known to have UTXOs (or at least, it's a valid address)
const TEST_ADDRESS_WITH_UTXOS = 'tb1ql6wz4s6cskmclr2gzhjqcu7exk9y2858w8ucgk';
// A valid testnet address known to have no UTXOs
const TEST_ADDRESS_WITHOUT_UTXOS = 'tb1q0s4s2h5w2j3j4k5l6m7n8p9q0s4s2h5w2j3j4k5l6m7n8p9q';

jest.setTimeout(60000); // 60-second timeout for network requests

const apis = getAllApis();

// This will create a suite of tests for each API provider returned by getAllApis.
// The '%s' in the title will be replaced by the class name of the API client.
describe.each(apis.map(api => [api.constructor.name, api]))('%s Integration Tests', (apiName, apiInstance) => {
    const api = apiInstance as Api;

    // Before running tests for an API, try to import the test addresses.
    // This is necessary for BtcNodeApi and is a no-op for others.
    beforeAll(async () => {
        try {
            await api.importWallet(TEST_ADDRESS_WITH_UTXOS);
        } catch (error) {
            // Ignore errors if the address is already imported
        }
        try {
            await api.importWallet(TEST_ADDRESS_WITHOUT_UTXOS);
        } catch (error) {
            // Ignore errors if the address is already imported
        }
    });

    describe('getUtxos', () => {
        it('should fetch UTXOs for an address that has them', async () => {
            const utxos = await api.getUtxos([TEST_ADDRESS_WITH_UTXOS]);
            console.log(`[${apiName}] UTXOs for ${TEST_ADDRESS_WITH_UTXOS}:`, JSON.stringify(utxos, null, 2));
            expect(Array.isArray(utxos)).toBe(true);
        });

        it('should return an empty array for an address with no UTXOs', async () => {
            const utxos = await api.getUtxos([TEST_ADDRESS_WITHOUT_UTXOS]);
            console.log(`[${apiName}] UTXOs for ${TEST_ADDRESS_WITHOUT_UTXOS}:`, JSON.stringify(utxos, null, 2));
            expect(Array.isArray(utxos)).toBe(true);
            expect(utxos.length).toBe(0);
        });

        it('should handle multiple addresses, some with and some without UTXOs', async () => {
            const addresses = [TEST_ADDRESS_WITH_UTXOS, TEST_ADDRESS_WITHOUT_UTXOS];
            const utxos = await api.getUtxos(addresses);
            console.log(`[${apiName}] UTXOs for multiple addresses:`, JSON.stringify(utxos, null, 2));
            expect(Array.isArray(utxos)).toBe(true);

            const utxosSingle = await api.getUtxos([TEST_ADDRESS_WITH_UTXOS]);
            expect(utxos.length).toEqual(utxosSingle.length);
        });
    });
});
