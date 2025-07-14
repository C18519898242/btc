import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import ECPairFactory from 'ecpair';
import axios from 'axios';
import logger from './logger';
import config from '../config.json';
import * as fs from 'fs';
import * as path from 'path';

const ECPair = ECPairFactory(ecc);
const walletPath = path.join(__dirname, '..', 'wallet.json');

export interface InputTransaction {
    customerRefId: string;
    customerExt1: string;
    customerExt2: string;
    note: string;
    coinKey: string;
    txAmount: string;
    txFeeLevel: string; // We might need a way to map this to a fee rate
    sourceAccountKey: string; // This seems to be an internal ID, we'll need to map it to an address
    destinationAccountKey: string;
    destinationAccountType: string;
    destinationAddress: string;
}

// We'll need a function to get the wallet details (including private key) by some key.
// For now, let's assume sourceAccountKey is the address.
function getWalletByAddress(address: string) {
    if (!fs.existsSync(walletPath)) {
        throw new Error('wallet.json not found');
    }
    const wallets = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    return wallets.find((w: any) => w.address === address);
}

export async function createBtcTransaction(tx: InputTransaction): Promise<bitcoin.Psbt> {
    // 1. Get network info
    const networkName = config.network as keyof typeof config.networks;
    const network = networkName === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;

    // 2. Find the source wallet and its private key
    const sourceWallet = getWalletByAddress(tx.sourceAccountKey);
    if (!sourceWallet) {
        throw new Error(`Source wallet not found for address: ${tx.sourceAccountKey}`);
    }
    const keyPair = ECPair.fromWIF(sourceWallet.privateKey, network);

    // 3. Fetch UTXOs for the source address
    const networkConfig = config.networks[networkName];
    const apiProvider = config.api_provider as keyof typeof networkConfig;
    const providerConfig = (networkConfig as any)[apiProvider];
    const { data: utxos } = await axios.get(`${providerConfig.api_url}/address/${tx.sourceAccountKey}/utxo`);

    // 4. Build the transaction
    const psbt = new bitcoin.Psbt({ network });
    const amountToSend = Math.floor(parseFloat(tx.txAmount) * 100_000_000);

    // For simplicity, using a hardcoded fee. In a real app, this should be calculated based on txFeeLevel.
    const fee = 10000;
    let totalInput = 0;

    for (const utxo of utxos) {
        if (utxo.status.confirmed) {
            psbt.addInput({
                hash: utxo.txid,
                index: utxo.vout,
                nonWitnessUtxo: Buffer.from(
                    (await axios.get(`${providerConfig.api_url}/tx/${utxo.txid}/hex`)).data,
                    'hex'
                ),
            });
            totalInput += utxo.value;
        }
    }

    psbt.addOutput({
        address: tx.destinationAddress,
        value: amountToSend,
    });

    const change = totalInput - amountToSend - fee;
    if (change < 0) {
        throw new Error('Insufficient funds for transaction');
    }
    if (change > 0) {
        psbt.addOutput({
            address: tx.sourceAccountKey, // Change back to source address
            value: change,
        });
    }

    // The transaction is now ready to be signed. 
    // The user can inspect the PSBT and then sign it.
    logger.info('PSBT created successfully. Ready for signing.');
    return psbt;
}
