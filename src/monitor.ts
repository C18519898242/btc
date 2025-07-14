import * as fs from 'fs';
import * as path from 'path';
import logger from './logger';
import config from '../config.json';
import { Provider } from './providers/provider';
import { MempoolProvider } from './providers/mempool';
import { BlockstreamProvider } from './providers/blockstream';

interface Wallet {
    address: string;
    privateKey: string;
    publicKey: string;
    network: string;
}

const walletPath = path.join(__dirname, '..', 'wallet.json');

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

export async function monitorWallets() {
    logger.info(`Starting to monitor wallets on ${config.network}...`);

    const monitor = async () => {
        if (!fs.existsSync(walletPath)) {
            logger.warn('wallet.json file not found. Please generate a wallet first.');
            return;
        }

        const allWallets: Wallet[] = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
        if (!Array.isArray(allWallets) || allWallets.length === 0) {
            logger.warn('No wallets found in wallet.json.');
            return;
        }

        const walletsToMonitor = allWallets.filter(w => w.network === config.network);

        if (walletsToMonitor.length === 0) {
            logger.warn(`No wallets found for the ${config.network} network in wallet.json.`);
            return;
        }

        logger.info(`Found ${walletsToMonitor.length} ${config.network} wallet(s) to monitor.`);

        const provider = getProvider();
        for (const wallet of walletsToMonitor) {
            try {
                const balance = await provider.getBalance(wallet.address);
                const btcBalance = balance.confirmed / 100_000_000;
                const pendingBtc = balance.unconfirmed / 100_000_000;
                logger.info(`Address: ${wallet.address} | Current Balance: ${btcBalance.toFixed(8)} BTC | Pending: ${pendingBtc.toFixed(8)} BTC`);
            } catch (error) {
                logger.error(`Error fetching balance for wallet ${wallet.address}:`, error);
            }
        }
    };

    // Run immediately and then every minute
    monitor();
    setInterval(monitor, 60 * 1000);
}
