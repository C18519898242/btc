import { Wallet } from '../../src/wallet/wallet';
import { WalletManager } from '../../src/wallet/walletManager';
import * as fs from 'fs';
import * as path from 'path';

describe('Wallet Integration', () => {
    let wallet: Wallet;
    let walletManager: WalletManager;
    const walletPath = path.join(__dirname, '..', '..', 'wallet.json');

    beforeEach(() => {
        // Clean up wallet.json before each test to ensure isolation
        if (fs.existsSync(walletPath)) {
            fs.unlinkSync(walletPath);
        }
        wallet = new Wallet();
        walletManager = new WalletManager();
    });

    it('should create a new wallet and save it to wallet.json', async () => {
        // Act
        const newWallet = await wallet.createWallet();
        walletManager.saveWallet(newWallet);

        // Assert
        expect(fs.existsSync(walletPath)).toBe(true);
        const fileContent = fs.readFileSync(walletPath, 'utf-8');
        const wallets = JSON.parse(fileContent);
        expect(wallets).toHaveLength(1);
        expect(wallets[0]).toEqual(newWallet);
    });

    it('should load wallets from wallet.json', async () => {
        // Arrange
        const newWallet = await wallet.createWallet();
        walletManager.saveWallet(newWallet);

        // Act
        const loadedWallets = walletManager.loadWallets();

        // Assert
        expect(loadedWallets).toHaveLength(1);
        expect(loadedWallets[0]).toEqual(newWallet);
    });
});
