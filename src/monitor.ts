import * as fs from 'fs';
import * as path from 'path';
import logger from './logger';
import config from '../config.json';
import { Wallet } from './wallet';
import { MempoolApi } from './api/mempool';
import { BlockstreamApi } from './api/blockstream';
import { BtcNodeApi } from './api/btcNode';
import { Api } from './api/api';
import { MockSigningService } from './service/mockSigningService';

interface WalletConfig {
    id: string;
    address: string;
    keyId: string;
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
        case 'btc-node':
            return new BtcNodeApi(providerConfig.api_url);
        default:
            throw new Error(`Unsupported API provider: ${config.api_provider}`);
    }
}

export async function monitorWallets() {
    logger.info(`Starting to monitor on ${config.network}...`);

    const api = getApi();
    let lastBlockHeight = 0;

    const monitor = async () => {
        try {
            const currentBlockHeight = await api.getBlockHeight();
            logger.info(`Current block height: ${currentBlockHeight}, last recorded height: ${lastBlockHeight}`);

            if (currentBlockHeight > lastBlockHeight) {
                logger.info(`New block detected! Height: ${currentBlockHeight}. Checking wallet balances.`);
                lastBlockHeight = currentBlockHeight;

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

                const signingService = new MockSigningService();
                const wallet = new Wallet(api, signingService);
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
            }
        } catch (error) {
            logger.error('Error during monitoring cycle:', error);
        }
    };

    // Run once immediately and then set interval
    monitor();
    setInterval(monitor, 60 * 1000);
}
