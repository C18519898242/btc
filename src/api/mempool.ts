import axios from 'axios';
import { Api, Utxo } from './api';
import logger from '../logger';

export class MempoolApi implements Api {
    private apiUrl: string;
    private wsUrl?: string;

    constructor(apiUrl: string, wsUrl?: string) {
        this.apiUrl = apiUrl;
        this.wsUrl = wsUrl;
    }

    async getTxHex(txid: string): Promise<string> {
        const { data } = await axios.get(`${this.apiUrl}/tx/${txid}/hex`);
        return data;
    }

    async getBlockHeight(): Promise<number> {
        const { data } = await axios.get(`${this.apiUrl}/blocks/tip/height`);
        return data;
    }

    async sendTx(txHex: string): Promise<string> {
        const { data: txid } = await axios.post(`${this.apiUrl}/tx`, txHex);
        return txid;
    }

    async getUtxos(addresses: string[]): Promise<Utxo[]> {
        const allUtxos: Utxo[] = [];
        for (const address of addresses) {
            const url = `${this.apiUrl}/address/${address}/utxo`;
            try {
                const { data } = await axios.get<Utxo[]>(url);
                allUtxos.push(...data);
            } catch (error) {
                if (axios.isAxiosError(error) && error.response?.status === 404) {
                    // Ignore 404 errors for addresses with no UTXOs
                    continue;
                }
                throw error;
            }
        }
        return allUtxos;
    }

    async importWallet(address: string): Promise<void> {
        logger.info(`MempoolApi: importWallet called for address ${address}. This API does not support wallet import.`);
        return Promise.resolve();
    }
}
