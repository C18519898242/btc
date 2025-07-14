import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import ECPairFactory from 'ecpair';
import * as fs from 'fs';
import * as path from 'path';
import logger from './logger';

// 初始化 ECPair
const ECPair = ECPairFactory(ecc);

// 创建一个新的随机密钥对
const keyPair = ECPair.makeRandom();

// 将公钥转换为 Buffer
const publicKeyBuffer = Buffer.from(keyPair.publicKey);

// 获取 P2PKH 地址
const { address } = bitcoin.payments.p2pkh({ pubkey: publicKeyBuffer });

// 准备要保存的钱包数据
const wallet = {
    privateKey: keyPair.toWIF(),
    publicKey: publicKeyBuffer.toString('hex'),
    address: address,
};

// 定义钱包文件的路径
const walletPath = path.join(__dirname, '..', 'wallet.json');

// 将钱包数据写入 JSON 文件
try {
    fs.mkdirSync(path.dirname(walletPath), { recursive: true });
    fs.writeFileSync(walletPath, JSON.stringify(wallet, null, 2));
    logger.info(`钱包已成功创建并保存到 ${walletPath}`);
    logger.info(`地址: ${address}`);
    logger.debug('钱包详情: %o', wallet);
} catch (error) {
    logger.error('保存钱包文件时出错:', error);
}
