import axios from 'axios';
import { Balance, Provider } from './provider';
import logger from '../logger';

export class BlockstreamProvider implements Provider {
    private apiUrl: string;

    constructor(apiUrl: string) {
        this.apiUrl = apiUrl;
    }

    async getBalance(address: string): Promise<Balance> {
        const url = `${this.apiUrl}/address/${address}/utxo`;
        try {
            const { data: utxos } = await axios.get<any[]>(url);
            const confirmed = utxos
                .filter(utxo => utxo.status.confirmed)
                .reduce((acc, utxo) => acc + utxo.value, 0);
            // Blockstream API does not provide unconfirmed balance in the same way
            const unconfirmed = utxos
                .filter(utxo => !utxo.status.confirmed)
                .reduce((acc, utxo) => acc + utxo.value, 0);
            return { confirmed, unconfirmed };
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                logger.warn(`No transactions found for address ${address}.`);
                return { confirmed: 0, unconfirmed: 0 };
            }
            logger.error(`Error fetching balance for address ${address}:`, error);
            throw error;
        }
    }
}
