import { Api, Utxo } from './api';
import axios, { AxiosRequestConfig } from 'axios';

export class BtcNodeApi implements Api {
    private apiUrl: string;
    private walletPath: string = '/wallet/HotWallet';
    private auth: { username?: string; password?: string };

    constructor(apiUrl: string, username?: string, password?: string) {
        this.apiUrl = apiUrl;
        this.auth = { username, password };
    }

    private getWalletUrl(): string {
        return `${this.apiUrl.replace(/\/$/, '')}${this.walletPath}`;
    }

    async getUtxos(address: string): Promise<Utxo[]> {
        const config: AxiosRequestConfig = {};
        if (this.auth.username && this.auth.password) {
            config.auth = {
                username: this.auth.username,
                password: this.auth.password,
            };
        }
        const response = await axios.post(this.getWalletUrl(), {
            jsonrpc: '1.0',
            id: 'cline-btc-api',
            method: 'listunspent',
            params: [0, 9999999, [address]],
        }, config);

        const utxos = response.data.result.map((utxo: any) => ({
            txid: utxo.txid,
            vout: utxo.vout,
            status: {
                confirmed: utxo.confirmations > 0,
                block_height: 0, // Not provided by listunspent
                block_hash: '', // Not provided by listunspent
                block_time: 0, // Not provided by listunspent
            },
            value: Math.round(utxo.amount * 100000000), // Convert BTC to satoshis
        }));

        return utxos;
    }

    async getBlockHeight(): Promise<number> {
        const config: AxiosRequestConfig = {};
        if (this.auth.username && this.auth.password) {
            config.auth = {
                username: this.auth.username,
                password: this.auth.password,
            };
        }
        const response = await axios.post(this.apiUrl, {
            jsonrpc: '1.0',
            id: 'cline-btc-api',
            method: 'getblockcount',
            params: [],
        }, config);
        return response.data.result;
    }

    async broadcastTx(txHex: string): Promise<string> {
        const config: AxiosRequestConfig = {};
        if (this.auth.username && this.auth.password) {
            config.auth = {
                username: this.auth.username,
                password: this.auth.password,
            };
        }
        const response = await axios.post(this.apiUrl, {
            jsonrpc: '1.0',
            id: 'cline-btc-api',
            method: 'sendrawtransaction',
            params: [txHex],
        }, config);
        return response.data.result;
    }

    async getTxHex(txid: string): Promise<string> {
        const config: AxiosRequestConfig = {};
        if (this.auth.username && this.auth.password) {
            config.auth = {
                username: this.auth.username,
                password: this.auth.password,
            };
        }
        const response = await axios.post(this.apiUrl, {
            jsonrpc: '1.0',
            id: 'cline-btc-api',
            method: 'getrawtransaction',
            params: [txid],
        }, config);
        return response.data.result;
    }

    async sendTx(txHex: string): Promise<string> {
        return this.broadcastTx(txHex);
    }

    async importAddress(address: string, label: string = '', rescan: boolean = false): Promise<void> {
        const config: AxiosRequestConfig = {};
        if (this.auth.username && this.auth.password) {
            config.auth = {
                username: this.auth.username,
                password: this.auth.password,
            };
        }
        await axios.post(this.getWalletUrl(), {
            jsonrpc: '1.0',
            id: 'cline-btc-api',
            method: 'importaddress',
            params: [address, label, rescan],
        }, config);
    }

    async rescanBlockchain(startHeight: number): Promise<void> {
        const config: AxiosRequestConfig = {};
        if (this.auth.username && this.auth.password) {
            config.auth = {
                username: this.auth.username,
                password: this.auth.password,
            };
        }
        await axios.post(this.getWalletUrl(), {
            jsonrpc: '1.e',
            id: 'cline-btc-api',
            method: 'rescanblockchain',
            params: [startHeight],
        }, config);
    }

    async importWallet(address: string): Promise<void> {
        await this.importAddress(address, address, false);
        const currentBlockHeight = await this.getBlockHeight();
        await this.rescanBlockchain(currentBlockHeight - 1);
    }
}
