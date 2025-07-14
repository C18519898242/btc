import logger from './logger';
import { monitorWallets } from './monitor';
import { generateWallet } from './wallet';
import { Provider, InputTransaction } from './providers/provider';
import { MempoolProvider } from './providers/mempool';
import { BlockstreamProvider } from './providers/blockstream';
import { SigningService } from './signingService';
import { MockSigningService } from './mockSigningService';
import config from '../config.json';
import * as fs from 'fs';
import * as bitcoin from 'bitcoinjs-lib';

// Custom interface to handle witness UTXO property
interface PsbtInputWithWitness extends bitcoin.PsbtTxInput {
    witnessUtxo?: {
        script: Buffer;
        value: number;
    };
}

function getProviderForNetwork(networkName: string): Provider {
    const networkConfig = config.networks[networkName as keyof typeof config.networks];
    if (!networkConfig) {
        throw new Error(`Network '${networkName}' is not configured in config.json`);
    }

    // Use the first configured provider for the network (e.g., mempool or blockstream)
    const apiProvider = Object.keys(networkConfig)[0];
    const providerConfig = (networkConfig as any)[apiProvider];

    if (!providerConfig || !providerConfig.api_url) {
        throw new Error(`API provider is not configured for network '${networkName}' in config.json`);
    }

    switch (apiProvider) {
        case 'mempool':
            return new MempoolProvider(providerConfig.api_url);
        case 'blockstream':
            return new BlockstreamProvider(providerConfig.api_url);
        default:
            throw new Error(`Unsupported API provider: ${apiProvider}`);
    }
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'generate':
            generateWallet(new MockSigningService());
            break;
        case 'monitor':
            monitorWallets();
            break;
        case 'create-tx':
            // This command would need refactoring to determine network from input
            logger.warn('The `create-tx` command currently uses the global config and may not work for all wallets.');
            try {
                const txInput: InputTransaction = JSON.parse(fs.readFileSync(0, 'utf-8'));
                const provider = getProviderForNetwork(config.network);
                const psbt = await provider.createTransaction(txInput);
                console.log(psbt.toBase64());
            } catch (error) {
                logger.error('Error creating transaction:', error);
            }
            break;
        case 'send-tx':
            // This command would need refactoring to determine network from PSBT
            logger.warn('The `send-tx` command currently uses the global config and may not work for all wallets.');
            try {
                const psbtBase64 = fs.readFileSync(0, 'utf-8').trim();
                const psbt = bitcoin.Psbt.fromBase64(psbtBase64);

                // Correctly derive the address from the PSBT's input
                const networkName = config.network as keyof typeof config.networks;
                const network = networkName === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
                const firstInput = psbt.txInputs[0] as PsbtInputWithWitness;
                if (!firstInput || !firstInput.witnessUtxo) {
                    throw new Error('PSBT is missing witness UTXO for the first input.');
                }
                const address = bitcoin.address.fromOutputScript(firstInput.witnessUtxo.script, network);

                const wallets = JSON.parse(fs.readFileSync('wallet.json', 'utf-8'));
                const sourceWallet = wallets.find((w: any) => w.address === address);

                if (!sourceWallet) {
                    throw new Error(`Wallet not found for address: ${address}`);
                }
                
                const provider = getProviderForNetwork(sourceWallet.network);
                const signingService = new MockSigningService();
                const txid = await provider.sendTx(psbt, signingService, sourceWallet.id);
                logger.info(`Transaction sent! TXID: ${txid}`);
            } catch (error) {
                logger.error('Error sending transaction:', error);
            }
            break;
        case 'test-e2e-tx':
            {
                const caseDir = 'case';
                const files = fs.readdirSync(caseDir).filter(f => f.endsWith('.json'));
                logger.info(`Found ${files.length} test cases in '${caseDir}' directory.`);

                for (const file of files) {
                    const filePath = `${caseDir}/${file}`;
                    logger.info(`--- Running test case: ${file} ---`);
                    try {
                        const txInput: InputTransaction = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                        
                        // Dynamically get provider based on wallet network
                        const wallets = JSON.parse(fs.readFileSync('wallet.json', 'utf-8'));
                        const sourceWallet = wallets.find((w: any) => w.id === txInput.sourceAccountKey);
                        if (!sourceWallet) {
                            throw new Error(`Source wallet ${txInput.sourceAccountKey} not found in wallet.json`);
                        }
                        const provider = getProviderForNetwork(sourceWallet.network);
                        logger.info(`Using network ${sourceWallet.network} for this transaction.`);

                        // 1. Create Transaction
                        const psbt = await provider.createTransaction(txInput);
                        logger.info('PSBT created.');

                        // 2. Sign and Send Transaction
                        const sourceWalletId = txInput.sourceAccountKey;
                        const signingService = new MockSigningService();
                        const txid = await provider.sendTx(psbt, signingService, sourceWalletId);
                        logger.info(`Transaction sent successfully! TXID: ${txid}`);
                        logger.info(`--- Test case ${file} PASSED ---`);
                    } catch (error) {
                        logger.error(`--- Test case ${file} FAILED:`, error);
                    }
                }
            }
            break;
        case 'test-signer':
            {
                logger.info('Testing SigningService...');
                const signingService: SigningService = new MockSigningService();
                const keyId = signingService.createPrivateKey();
                logger.info(`Created key with ID: ${keyId}`);
                const publicKey = signingService.getPublicKey(keyId);
                logger.info(`Retrieved public key: ${publicKey}`);
                logger.info('Signer test complete.');
            }
            break;
        default:
            logger.info('Invalid command. Available commands: generate, monitor, create-tx, send-tx, test-signer, test-e2e-tx');
            logger.info('Usage: npm start <command>');
            logger.info('Examples:');
            logger.info('  npm start generate   # Generate a new wallet');
            logger.info('  npm start monitor    # Monitor balances of all wallets');
            logger.info('  cat tx.json | npm start create-tx # Create a new transaction from a json file');
            logger.info('  cat psbt.txt | npm start send-tx # Sign and send a transaction');
            logger.info('  npm start test-signer # Test the signing service');
            logger.info('  npm start test-e2e-tx # Run an end-to-end transaction test using case/tx.json');
    }
}

main();
