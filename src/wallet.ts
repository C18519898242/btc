import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import ECPairFactory from 'ecpair';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger';
import config from '../config.json';

const ECPair = ECPairFactory(ecc);
const walletPath = path.join(__dirname, '..', 'wallet.json');

export function generateWallet() {
    const networkName = config.network;
    const network = networkName === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;

    logger.info(`Generating new wallet for ${networkName}...`);
    const keyPair = ECPair.makeRandom({ network });
    const publicKeyBuffer = Buffer.from(keyPair.publicKey);
    const { address } = bitcoin.payments.p2pkh({ pubkey: publicKeyBuffer, network });

    const wallet = {
        id: uuidv4(),
        network: networkName,
        privateKey: keyPair.toWIF(),
        publicKey: publicKeyBuffer.toString('hex'),
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
