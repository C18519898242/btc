import { IWalletStorage } from './storage';
import { JsonWalletStorage } from './jsonWalletStorage';
import * as path from 'path';

const walletPath = path.join(__dirname, '..', '..', 'wallet.json');

export function createWalletStorage(): IWalletStorage {
    // In the future, we can use a config or environment variable
    // to decide which storage implementation to return.
    return new JsonWalletStorage(walletPath);
}
