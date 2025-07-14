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

function getProvider(): Provider {
    const networkName = config.network as keyof typeof config.networks;
    const networkConfig = config.networks[networkName];
    const apiProvider = config.api_provider as keyof typeof networkConfig;
    const providerConfig = (networkConfig as any)[apiProvider];

    if (!providerConfig || !providerConfig.api_url) {
        throw new Error(`API provider '${apiProvider}' is not configured for network '${networkName}' in config.json`);
    }

    switch (config.api_provider) {
        case 'mempool':
            return new MempoolProvider(providerConfig.api_url);
        case 'blockstream':
            return new BlockstreamProvider(providerConfig.api_url);
        default:
            throw new Error(`Unsupported API provider: ${config.api_provider}`);
    }
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const provider = getProvider();

    switch (command) {
        case 'generate':
            generateWallet(new MockSigningService());
            break;
        case 'monitor':
            monitorWallets();
            break;
        case 'create-tx':
            try {
                const txInput: InputTransaction = JSON.parse(fs.readFileSync(0, 'utf-8'));
                const psbt = await provider.createTransaction(txInput);
                console.log(psbt.toBase64());
            } catch (error) {
                logger.error('Error creating transaction:', error);
            }
            break;
        case 'send-tx':
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

                const signingService = new MockSigningService();
                const txid = await provider.sendTx(psbt, signingService, sourceWallet.id);
                logger.info(`Transaction sent! TXID: ${txid}`);
            } catch (error) {
                logger.error('Error sending transaction:', error);
            }
            break;
        case 'test-e2e-tx':
            try {
                logger.info('Running end-to-end transaction test...');
                const txInput: InputTransaction = JSON.parse(fs.readFileSync('case/tx.json', 'utf-8'));
                
                // 1. Create Transaction
                const psbt = await provider.createTransaction(txInput);
                logger.info('PSBT created.');

                // 2. Sign and Send Transaction
                const sourceWalletId = txInput.sourceAccountKey;
                const signingService = new MockSigningService();
                const txid = await provider.sendTx(psbt, signingService, sourceWalletId);
                logger.info(`Transaction sent successfully! TXID: ${txid}`);
            } catch (error) {
                logger.error('End-to-end transaction test failed:', error);
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
