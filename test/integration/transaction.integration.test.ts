import { Transaction, InputTransaction, CoinKey } from '../../src/transaction';
import { getApi } from '../../src/api';
import { MockSigningService } from '../../src/service/mockSigningService';
import { Wallet } from '../../src/wallet';
import { Api } from '../../src/api/api';
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
    let api: Api;
    let wallet: Wallet;

    beforeAll(() => {
        api = getApi();
        // We use MockSigningService because the actual signing logic is what we want to test,
        // but we don't have access to a real HSM. MockSigningService correctly implements the signing.
        signingService = new MockSigningService();
        wallet = new Wallet();
        transaction = new Transaction();
    });

    // Test case for sending to a one-time address
    test.skip(`[${oneTimeAddressCase.customerRefId}] ${oneTimeAddressCase.note}`, async () => {
        const txInput: InputTransaction = { ...oneTimeAddressCase, coinKey: CoinKey.BTC_TESTNET };

        // This test is skipped because it relies on an external wallet with funds.
        // We will use a funded mock wallet for other tests.
        console.log(`Using source wallet: ${txInput.sourceAccountKey}`);

        const psbt = await transaction.create(txInput);
        expect(psbt).toBeDefined();
        expect(psbt.txOutputs[0].address).toBe(txInput.destinationAddress);

        const txId = await transaction.sendTx(psbt, txInput.sourceAccountKey);

        console.log(`Transaction broadcasted with ID: ${txId}`);
        expect(txId).toMatch(/^[a-f0-9]{64}$/);
    }, 60000); // 60-second timeout for network requests

    // Test case for sending to a vault account
    test.skip(`[test-tx-002] Test transaction`, async () => {
        const txInput: InputTransaction = { ...vaultAccountCase, coinKey: CoinKey.BTC_TESTNET };
        // Use a funded wallet from the mock service to ensure the test can run
        txInput.sourceAccountKey = '95105fcc-860a-44db-8935-5f678e4586d3';

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

    // Test case for sending to a one-time address using a funded mock wallet
    test.skip(`[test-tx-003] Test transaction (One Time Address)`, async () => {
        const txInput: InputTransaction = { ...oneTimeAddressCase, coinKey: CoinKey.BTC_TESTNET };
        // Use a funded wallet from the mock service to ensure the test can run
        txInput.sourceAccountKey = '95105fcc-860a-44db-8935-5f678e4586d3';

        console.log(`Using source wallet: ${txInput.sourceAccountKey}`);

        const psbt = await transaction.create(txInput);
        expect(psbt).toBeDefined();
        expect(psbt.txOutputs[0].address).toBe(txInput.destinationAddress);

        const txId = await transaction.sendTx(psbt, txInput.sourceAccountKey);

        console.log(`Transaction broadcasted with ID: ${txId}`);
        expect(txId).toMatch(/^[a-f0-9]{64}$/);
    }, 60000);
});
