import { IWalletRepository } from './repository';
import { JsonWalletRepository } from './jsonWalletRepository';
import * as path from 'path';

const walletPath = path.join(__dirname, '..', '..', 'wallet.json');

export function createWalletRepository(): IWalletRepository {
    // In the future, we can use a config or environment variable
    // to decide which repository implementation to return.
    return new JsonWalletRepository(walletPath);
}
