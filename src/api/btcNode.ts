import { Api, Utxo } from './api';
import axios from 'axios';

export class BtcNodeApi implements Api {
    private apiUrl: string;

    constructor(apiUrl: string) {
        this.apiUrl = apiUrl;
    }

    async getUtxos(address: string): Promise<Utxo[]> {
        const response = await axios.post(this.apiUrl, {
            jsonrpc: '1.0',
            id: 'cline-btc-api',
            method: 'scantxoutset',
            params: ['start', [`addr(${address})`]],
        });

        const utxos = response.data.result.unspents.map((utxo: any) => ({
            txid: utxo.txid,
            vout: utxo.vout,
            status: {
                confirmed: true, // scantxoutset only returns confirmed UTXOs
                block_height: utxo.height,
                block_hash: '', // Not provided by scantxoutset
                block_time: 0, // Not provided by scantxoutset
            },
            value: Math.round(utxo.amount * 100000000), // Convert BTC to satoshis
        }));

        return utxos;
    }

    async getBlockHeight(): Promise<number> {
        const response = await axios.post(this.apiUrl, {
            jsonrpc: '1.0',
            id: 'cline-btc-api',
            method: 'getblockcount',
            params: [],
        });
        return response.data.result;
    }

    async broadcastTx(txHex: string): Promise<string> {
        const response = await axios.post(this.apiUrl, {
            jsonrpc: '1.0',
            id: 'cline-btc-api',
            method: 'sendrawtransaction',
            params: [txHex],
        });
        return response.data.result;
    }

    async getTxHex(txid: string): Promise<string> {
        const response = await axios.post(this.apiUrl, {
            jsonrpc: '1.0',
            id: 'cline-btc-api',
            method: 'getrawtransaction',
            params: [txid],
        });
        return response.data.result;
    }

    async sendTx(txHex: string): Promise<string> {
        return this.broadcastTx(txHex);
    }

    async importAddress(address: string, label: string = '', rescan: boolean = false): Promise<void> {
        await axios.post(this.apiUrl, {
            jsonrpc: '1.0',
            id: 'cline-btc-api',
            method: 'importaddress',
            params: [address, label, rescan],
        });
    }

    async rescanBlockchain(startHeight: number): Promise<void> {
        await axios.post(this.apiUrl, {
            jsonrpc: '1.0',
            id: 'cline-btc-api',
            method: 'rescanblockchain',
            params: [startHeight],
        });
    }
}
