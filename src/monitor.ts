import * as fs from 'fs';
import * as path from 'path';
import logger from './logger';
import config from '../config.json';
import { Wallet } from './wallet';
import { MempoolApi } from './api/mempool';
import { BlockstreamApi } from './api/blockstream';
import { Api } from './api/api';

interface WalletConfig {
    id: string;
    address: string;
    privateKey: string;
    publicKey: string;
    network: string;
}

const walletPath = path.join(__dirname, '..', 'wallet.json');

function getApi(): Api {
    const networkName = config.network as keyof typeof config.networks;
    const networkConfig = config.networks[networkName];
    const apiProvider = config.api_provider as keyof typeof networkConfig;
    const providerConfig = (networkConfig as any)[apiProvider];

    if (!providerConfig || !providerConfig.api_url) {
        throw new Error(`API provider '${apiProvider}' is not configured for network '${networkName}' in config.json`);
    }

    switch (config.api_provider) {
        case 'mempool':
            return new MempoolApi(providerConfig.api_url, providerConfig.ws_url);
        case 'blockstream':
            return new BlockstreamApi(providerConfig.api_url);
        default:
            throw new Error(`Unsupported API provider: ${config.api_provider}`);
    }
}

export async function monitorWallets() {
    logger.info(`Starting to monitor on ${config.network}...`);

    const api = getApi();

    if (api instanceof MempoolApi) {
        if (!fs.existsSync(walletPath)) {
            logger.warn('wallet.json file not found. Please generate a wallet first.');
            return;
        }

        const allWallets: WalletConfig[] = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
        if (!Array.isArray(allWallets) || allWallets.length === 0) {
            logger.warn('No wallets found in wallet.json.');
            return;
        }

        const walletsToMonitor = allWallets.filter(w => w.network === config.network);

        if (walletsToMonitor.length === 0) {
            logger.warn(`No wallets found for the ${config.network} network in wallet.json.`);
            return;
        }

        const addresses = walletsToMonitor.map(w => w.address);
        logger.info(`Using Mempool WebSocket to monitor addresses: ${addresses.join(', ')}`);

        api.monitorAddresses(addresses, (txs) => {
            for (const address in txs) {
                const { mempool, confirmed } = txs[address];
                if (mempool.length > 0) {
                    logger.info(`New mempool transactions for ${address}:`);
                    mempool.forEach((tx: any) => logger.info(JSON.stringify(tx, null, 2)));
                }
                if (confirmed.length > 0) {
                    logger.info(`New confirmed transactions for ${address}:`);
                    confirmed.forEach((tx: any) => logger.info(JSON.stringify(tx, null, 2)));
                }
            }
        });
    } else {
        logger.warn('WebSocket monitoring is only supported for Mempool API provider.');
        logger.info('Falling back to periodic wallet balance checks.');
        // The existing balance monitoring logic can remain here as a fallback.
        const monitor = async () => {
            if (!fs.existsSync(walletPath)) {
                logger.warn('wallet.json file not found. Please generate a wallet first.');
                return;
            }

            const allWallets: WalletConfig[] = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
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

            const wallet = new Wallet(api);
            for (const walletConfig of walletsToMonitor) {
                try {
                    const balance = await wallet.getBalance(walletConfig.address);
                    const btcBalance = balance.confirmed / 100_000_000;
                    const pendingBtc = balance.unconfirmed / 100_000_000;
                    logger.info(`Address: ${walletConfig.address} | Current Balance: ${btcBalance.toFixed(8)} BTC | Pending: ${pendingBtc.toFixed(8)} BTC`);
                } catch (error) {
                    logger.error(`Error fetching balance for wallet ${walletConfig.address}:`, error);
                }
            }
        };

        monitor();
        setInterval(monitor, 60 * 1000);
    }
}
