import { WalletInfo } from '../wallet';

export interface IWalletStorage {
    loadWallets(): WalletInfo[];
    saveWallet(wallet: WalletInfo): void;
}
