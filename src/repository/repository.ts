import { WalletInfo } from '../wallet';

export interface IWalletRepository {
    loadWallets(): WalletInfo[];
    saveWallet(wallet: WalletInfo): void;
}
