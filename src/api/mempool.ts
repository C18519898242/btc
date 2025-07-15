import axios from 'axios';
import WebSocket from 'ws';
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

    monitorTxs(onTx: (txids: string[]) => void) {
        const url = this.wsUrl || `wss://${this.apiUrl.split('//')[1].replace('/api', '/ws')}`;
        const ws = new WebSocket(url);

        ws.on('open', () => {
            logger.info('Mempool WebSocket connection opened.');
            ws.send(JSON.stringify({ "track-mempool-txids": true }));
        });

        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            logger.info(`message in: ${JSON.stringify(message)}`);

            if (message['mempool-txids'] && message['mempool-txids'].added) {
                const addedTxids = message['mempool-txids'].added;
                if (addedTxids.length > 0) {
                    onTx(addedTxids);
                }
            }
        });

        ws.on('close', () => {
            logger.info('Mempool WebSocket connection closed.');
        });

        ws.on('error', (error) => {
            logger.error('Mempool WebSocket error:', error);
        });
    }

    monitorAddresses(addresses: string[], onTx: (tx: any) => void) {
        const url = this.wsUrl || `wss://${this.apiUrl.split('//')[1].replace('/api', '/ws')}`;
        const ws = new WebSocket(url);

        ws.on('open', () => {
            logger.info(`Mempool WebSocket connection opened for addresses: ${addresses.join(', ')}`);
            ws.send(JSON.stringify({ "track-addresses": addresses }));
        });

        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            logger.info(`message in: ${JSON.stringify(message)}`);

            if (message['multi-address-transactions']) {
                onTx(message['multi-address-transactions']);
            }
        });

        ws.on('close', () => {
            logger.info('Mempool WebSocket connection closed.');
        });

        ws.on('error', (error) => {
            logger.error('Mempool WebSocket error:', error);
        });
    }
}
