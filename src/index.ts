import logger from './logger';
import { monitorWallets } from './monitor';
import { generateWallet } from './wallet';
import { Provider, InputTransaction } from './providers/provider';
import { MempoolProvider } from './providers/mempool';
import { BlockstreamProvider } from './providers/blockstream';
import config from '../config.json';
import * as fs from 'fs';

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
        default:
            logger.info('Invalid command. Available commands: generate, monitor, create-tx');
            logger.info('Usage: npm start <command>');
            logger.info('Examples:');
            logger.info('  npm start generate   # Generate a new wallet');
            logger.info('  npm start monitor    # Monitor balances of all wallets');
            logger.info('  cat tx.json | npm start create-tx # Create a new transaction from a json file');
    }
}

main();
