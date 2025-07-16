import { WalletInfo } from './wallet';
import { IWalletStorage } from './storage/storage';
import { createWalletStorage } from './storage/storageFactory';

export class WalletManager {
    private storage: IWalletStorage;

    constructor() {
        this.storage = createWalletStorage();
    }

    public loadWallets(): WalletInfo[] {
        return this.storage.loadWallets();
    }

    public saveWallet(wallet: WalletInfo): void {
        this.storage.saveWallet(wallet);
    }
}
