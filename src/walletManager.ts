import * as fs from 'fs';
import * as path from 'path';
import logger from './logger';

export class WalletManager {
    private walletPath: string;

    constructor(walletPath: string) {
        this.walletPath = walletPath;
    }

    public loadWallets(): any[] {
        if (fs.existsSync(this.walletPath)) {
            const fileContent = fs.readFileSync(this.walletPath, 'utf-8');
            try {
                return JSON.parse(fileContent);
            } catch (error) {
                logger.error(`Error parsing wallet file at ${this.walletPath}:`, error);
                return [];
            }
        }
        return [];
    }

    public saveWallet(wallet: any): void {
        const wallets = this.loadWallets();
        wallets.push(wallet);
        try {
            fs.writeFileSync(this.walletPath, JSON.stringify(wallets, null, 2));
            logger.info(`Successfully saved new wallet to ${this.walletPath}. Total wallets: ${wallets.length}`);
        } catch (error) {
            logger.error(`Error saving wallet to ${this.walletPath}:`, error);
        }
    }
}
