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

    async getUtxos(address: string): Promise<Utxo[]> {
        const url = `${this.apiUrl}/address/${address}/utxo`;
        try {
            const { data } = await axios.get<Utxo[]>(url);
            return data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                logger.warn(`No UTXOs found for address ${address}.`);
                return [];
            }
            logger.error(`Error fetching UTXOs for address ${address}:`, error);
            throw error;
        }
    }

    async getTxHex(txid: string): Promise<string> {
        const { data } = await axios.get(`${this.apiUrl}/tx/${txid}/hex`);
        return data;
    }

    async sendTx(txHex: string): Promise<string> {
        const { data: txid } = await axios.post(`${this.apiUrl}/tx`, txHex);
        return txid;
    }

    async getBlockHeight(): Promise<number> {
        const { data } = await axios.get(`${this.apiUrl}/blocks/tip/height`);
        return data;
    }

    monitorTxs(onTx: (txids: string[]) => void) {

    }

    monitorAddresses(addresses: string[], onTx: (tx: any) => void) {

    }

    async importWallet(address: string): Promise<void> {
        logger.info(`MempoolApi: importWallet called for address ${address}. This API does not support wallet import.`);
        return Promise.resolve();
    }
}
