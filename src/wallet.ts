import * as bitcoin from 'bitcoinjs-lib';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger';
import config from '../config.json';
import { SigningService } from './signingService';

const walletPath = path.join(__dirname, '..', 'wallet.json');

export function generateWallet(signingService: SigningService) {
    const networkName = config.network;
    const network = networkName === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;

    logger.info(`Generating new wallet for ${networkName}...`);

    const keyId = signingService.createPrivateKey();
    const publicKeyHex = signingService.getPublicKey(keyId);
    const publicKeyBuffer = Buffer.from(publicKeyHex, 'hex');

    const { address } = bitcoin.payments.p2pkh({ pubkey: publicKeyBuffer, network });

    const wallet = {
        id: keyId,
        network: networkName,
        publicKey: publicKeyHex,
        address: address,
    };

    try {
        fs.mkdirSync(path.dirname(walletPath), { recursive: true });
        let wallets = [];
        if (fs.existsSync(walletPath)) {
            try {
                const fileContent = fs.readFileSync(walletPath, 'utf-8');
                if (fileContent) {
                    wallets = JSON.parse(fileContent);
                    if (!Array.isArray(wallets)) {
                        wallets = [wallets];
                    }
                }
            } catch (e) {
                logger.error('Error parsing wallet.json, creating a new file.', e);
                wallets = [];
            }
        }
        wallets.push(wallet);
        fs.writeFileSync(walletPath, JSON.stringify(wallets, null, 2));
        logger.info(`New wallet successfully added to ${walletPath}`);
        logger.info(`Address: ${address}`);
    } catch (error) {
        logger.error('Error saving wallet file:', error);
    }
}
