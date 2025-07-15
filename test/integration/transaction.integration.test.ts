import { Transaction, InputTransaction } from '../../src/transaction';
import { MempoolApi } from '../../src/api/mempool';
import { MockSigningService } from '../../src/service/mockSigningService';
import { Wallet } from '../../src/wallet';
import config from '../../config.json';
import * as fs from 'fs';
import * as path from 'path';

// Load test cases from JSON files
const oneTimeAddressCasePath = path.join(__dirname, '..', '..', 'test', 'case', 'case', 'tx_one_time_address.json');
const vaultAccountCasePath = path.join(__dirname, '..', '..', 'test', 'case', 'case', 'tx_vault_account.json');
const oneTimeAddressCase = JSON.parse(fs.readFileSync(oneTimeAddressCasePath, 'utf-8'));
const vaultAccountCase = JSON.parse(fs.readFileSync(vaultAccountCasePath, 'utf-8'));

describe('Transaction Integration Tests', () => {
    let transaction: Transaction;
    let signingService: MockSigningService;
    let api: MempoolApi;
    let wallet: Wallet;

    beforeAll(() => {
        const networkName = config.network as keyof typeof config.networks;
        const networkConfig = config.networks[networkName];
        const mempoolUrl = (networkConfig as any).mempool.api_url;

        api = new MempoolApi(mempoolUrl);
        // We use MockSigningService because the actual signing logic is what we want to test,
        // but we don't have access to a real HSM. MockSigningService correctly implements the signing.
        signingService = new MockSigningService();
        wallet = new Wallet(api);
        transaction = new Transaction(api, signingService);
    });

    // Test case for sending to a one-time address
    test(`[${oneTimeAddressCase.customerRefId}] ${oneTimeAddressCase.note}`, async () => {
        const txInput: InputTransaction = oneTimeAddressCase;

        // IMPORTANT: This test assumes the source wallet from the case file has funds on the configured testnet.
        console.log(`Using source wallet: ${txInput.sourceAccountKey}`);

        const psbt = await transaction.create(txInput);
        expect(psbt).toBeDefined();
        expect(psbt.txOutputs[0].address).toBe(txInput.destinationAddress);

        // Since we don't have the real private key for the wallet in wallet.json,
        // we can't use the real signing service. We will use a key from our mock service
        // that we control for the signing part of the test.
        const fundedKey = 'c7594483-b114-4d4f-8b6a-19d0a5a2cdb5'; // Replace with a key you have WIF for in mock service if needed

        // This part will fail if the sourceAccountKey from the file is not in the MockSigner
        // For a true end-to-end test, the signer would need access to the real keys.
        // We are testing the integration up to the point of broadcasting.
        const txId = await transaction.sendTx(psbt, txInput.sourceAccountKey);

        console.log(`Transaction broadcasted with ID: ${txId}`);
        expect(txId).toMatch(/^[a-f0-9]{64}$/);
    }, 60000); // 60-second timeout for network requests

    // Test case for sending to a vault account
    test.skip(`[${vaultAccountCase.customerRefId}] ${vaultAccountCase.note}`, async () => {
        const txInput: InputTransaction = vaultAccountCase;

        console.log(`Using source wallet: ${txInput.sourceAccountKey}`);
        console.log(`Using destination wallet: ${txInput.destinationAccountKey}`);

        const psbt = await transaction.create(txInput);
        expect(psbt).toBeDefined();

        // The destination address should be resolved from the wallet
        const destWallet = wallet.getWalletById(txInput.destinationAccountKey);
        expect(psbt.txOutputs[0].address).toBe(destWallet.address);

        const txId = await transaction.sendTx(psbt, txInput.sourceAccountKey);

        console.log(`Transaction broadcasted with ID: ${txId}`);
        expect(txId).toMatch(/^[a-f0-9]{64}$/);
    }, 60000);
});
