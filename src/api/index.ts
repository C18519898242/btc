import config from '../../config.json';
import { Api } from './api';
import { MempoolApi } from './mempool';
import { BlockstreamApi } from './blockstream';
import { BtcNodeApi } from './btcNode';

export function getApi(): Api {
    const networkName = config.network as keyof typeof config.networks;
    const networkConfig = config.networks[networkName];
    const apiProvider = config.api_provider as keyof typeof networkConfig;
    const providerConfig = (networkConfig as any)[apiProvider];

    if (!providerConfig || !providerConfig.api_url) {
        throw new Error(`API provider '${apiProvider}' is not configured for network '${networkName}' in config.json`);
    }

    switch (config.api_provider) {
        case 'mempool':
            return new MempoolApi(providerConfig.api_url, providerConfig.ws_url);
        case 'blockstream':
            return new BlockstreamApi(providerConfig.api_url);
        case 'btc-node':
            return new BtcNodeApi(providerConfig.api_url, providerConfig.username, providerConfig.password);
        default:
            throw new Error(`Unsupported API provider: ${config.api_provider}`);
    }
}

export function getAllApis(): Api[] {
    const networkName = config.network as keyof typeof config.networks;
    const networkConfig = config.networks[networkName];
    const apis: Api[] = [];

    for (const providerName in networkConfig) {
        const providerConfig = (networkConfig as any)[providerName];
        if (providerConfig && providerConfig.api_url) {
            switch (providerName) {
                case 'mempool':
                    apis.push(new MempoolApi(providerConfig.api_url, providerConfig.ws_url));
                    break;
                case 'blockstream':
                    apis.push(new BlockstreamApi(providerConfig.api_url));
                    break;
                case 'btc-node':
                    apis.push(new BtcNodeApi(providerConfig.api_url, providerConfig.username, providerConfig.password));
                    break;
            }
        }
    }

    return apis;
}
