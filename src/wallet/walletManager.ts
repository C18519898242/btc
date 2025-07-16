import { WalletInfo } from './wallet';
import { IWalletRepository } from './repository/wallet.repository';
import { createWalletRepository } from './repository/repository.factory';

export class WalletManager {
    private repository: IWalletRepository;

    constructor() {
        this.repository = createWalletRepository();
    }

    public loadWallets(): WalletInfo[] {
        return this.repository.loadWallets();
    }

    public saveWallet(wallet: WalletInfo): void {
        this.repository.saveWallet(wallet);
    }
}
