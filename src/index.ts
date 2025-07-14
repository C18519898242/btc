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

try {
    // 确保目录存在
    fs.mkdirSync(path.dirname(walletPath), { recursive: true });

    // 读取现有钱包文件（如果存在）
    let wallets = [];
    if (fs.existsSync(walletPath)) {
        try {
            const fileContent = fs.readFileSync(walletPath, 'utf-8');
            // 确保文件内容不为空
            if (fileContent) {
                wallets = JSON.parse(fileContent);
                // 如果不是数组，则将其放入数组中以进行兼容
                if (!Array.isArray(wallets)) {
                    wallets = [wallets];
                }
            }
        } catch (e) {
            logger.error('解析 wallet.json 时出错，将创建一个新文件。', e);
            wallets = []; // 如果文件损坏，则重置
        }
    }

    // 将新钱包添加到数组中
    wallets.push(wallet);

    // 将更新后的数组写回文件
    fs.writeFileSync(walletPath, JSON.stringify(wallets, null, 2));

    logger.info(`新钱包已成功添加到 ${walletPath}`);
    logger.info(`地址: ${address}`);
    logger.debug('新钱包详情: %o', wallet);
} catch (error) {
    logger.error('保存钱包文件时出错:', error);
}
