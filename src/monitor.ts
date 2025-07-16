import logger from './logger';
import * as cron from 'node-cron';
import { getApi } from './api';

export async function monitorWallets() {
    logger.info('Starting block monitor...');

    const api = getApi();
    let lastKnownHeight = 0;

    // Schedule the task to run every 10 seconds
    cron.schedule('*/10 * * * * *', async () => {
        try {
            const currentHeight = await api.getBlockHeight();

            if (lastKnownHeight === 0) {
                logger.info(`Initial block height: ${currentHeight}`);
            } else if (currentHeight > lastKnownHeight) {
                logger.info(`New block detected! New height: ${currentHeight}`);
            } else {
                logger.info(`Current block height: ${currentHeight}`);
            }

            lastKnownHeight = currentHeight;

        } catch (error) {
            logger.error('Failed to get latest block height:', error);
        }
    });

    logger.info('Block monitor is scheduled to run every 10 seconds. Press Ctrl+C to exit.');
}
