import logger from './logger';
import { monitorWallets } from './monitor';
import { generateWallet } from './wallet';
import { Provider, InputTransaction } from './providers/provider';
import { MempoolProvider } from './providers/mempool';
import { BlockstreamProvider } from './providers/blockstream';
import { SigningService } from './signingService';
import config from '../config.json';
import * as fs from 'fs';
import * as bitcoin from 'bitcoinjs-lib';

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
            generateWallet();
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
                const address = (psbt.txInputs[0] as any).witnessUtxo.script.toString('hex'); // A bit of a hack to get the address
                const wallets = JSON.parse(fs.readFileSync('wallet.json', 'utf-8'));
                const sourceWallet = wallets.find((w: any) => w.address === address);
                if (!sourceWallet) {
                    throw new Error(`Wallet not found for address: ${address}`);
                }
                const txid = await provider.sendTx(psbt, sourceWallet.privateKey);
                logger.info(`Transaction sent! TXID: ${txid}`);
            } catch (error) {
                logger.error('Error sending transaction:', error);
            }
            break;
        case 'test-signer':
            {
                logger.info('Testing SigningService...');
                const signingService = new SigningService();
                const keyId = signingService.createPrivateKey();
                logger.info(`Created key with ID: ${keyId}`);
                const publicKey = signingService.getPublicKey(keyId);
                logger.info(`Retrieved public key: ${publicKey}`);
                logger.info('Signer test complete.');
            }
            break;
        default:
            logger.info('Invalid command. Available commands: generate, monitor, create-tx, send-tx, test-signer');
            logger.info('Usage: npm start <command>');
            logger.info('Examples:');
            logger.info('  npm start generate   # Generate a new wallet');
            logger.info('  npm start monitor    # Monitor balances of all wallets');
            logger.info('  cat tx.json | npm start create-tx # Create a new transaction from a json file');
            logger.info('  cat psbt.txt | npm start send-tx # Sign and send a transaction');
            logger.info('  npm start test-signer # Test the signing service');
    }
}

main();
