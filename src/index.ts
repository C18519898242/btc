import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import ECPairFactory from 'ecpair';
import * as fs from 'fs';
import * as path from 'path';
import logger from './logger';
import { monitorWallets } from './monitor';
import config from '../config.json';

const ECPair = ECPairFactory(ecc);
const walletPath = path.join(__dirname, '..', 'wallet.json');

function generateWallet() {
    const networkName = config.network;
    const network = networkName === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;

    logger.info(`开始为 ${networkName} 生成新钱包...`);
    const keyPair = ECPair.makeRandom({ network });
    const publicKeyBuffer = Buffer.from(keyPair.publicKey);
    const { address } = bitcoin.payments.p2pkh({ pubkey: publicKeyBuffer, network });

    const wallet = {
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
                logger.error('解析 wallet.json 时出错，将创建一个新文件。', e);
                wallets = [];
            }
        }
        wallets.push(wallet);
        fs.writeFileSync(walletPath, JSON.stringify(wallets, null, 2));
        logger.info(`新钱包已成功添加到 ${walletPath}`);
        logger.info(`地址: ${address}`);
    } catch (error) {
        logger.error('保存钱包文件时出错:', error);
    }
}

function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'generate':
            generateWallet();
            break;
        case 'monitor':
            monitorWallets();
            break;
        default:
            logger.info('无效的命令。可用命令: generate, monitor');
            console.log('用法: npm start <command>');
            console.log('例如:');
            console.log('  npm start generate   # 生成一个新钱包');
            console.log('  npm start monitor    # 监控所有钱包的余额');
    }
}

main();
