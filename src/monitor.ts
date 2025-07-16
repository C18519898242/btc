import { WalletManager } from './wallet/walletManager';
import { Wallet } from './wallet/wallet';
import logger from './logger';

async function checkWallet(walletInfo: any, wallet: Wallet) {
    try {
        const balance = await wallet.getBalance(walletInfo.address);
        logger.info(`Balance for ${walletInfo.address}: ${balance.confirmed} (confirmed), ${balance.unconfirmed} (unconfirmed)`);
    } catch (error) {
        logger.error(`Failed to get balance for ${walletInfo.address}:`, error);
    }
}

export async function monitorWallets() {
    const walletManager = new WalletManager();
    const wallet = new Wallet();
    const allWallets = walletManager.loadWallets();

    if (allWallets.length === 0) {
        logger.info('No wallets to monitor.');
        return;
    }

    logger.info(`Monitoring ${allWallets.length} wallets...`);

    for (const walletInfo of allWallets) {
        await checkWallet(walletInfo, wallet);
    }
}
