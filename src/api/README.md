# API Abstraction Layer (API 抽象层)

This directory contains the abstraction layer for interacting with various Bitcoin blockchain data providers.

此目录包含与各种比特币区块链数据提供商进行交互的抽象层。

---

## Core Components (核心组件)

-   **`api.ts`**: Defines the common `Api` interface that all provider-specific clients must implement. This ensures a consistent contract for fetching blockchain data, regardless of the underlying service.
    
    定义了所有特定提供商客户端都必须实现的通用 `Api` 接口。这确保了无论底层服务是什么，获取区块链数据都有一个一致的契约。

-   **`index.ts`**: The entry point for accessing API clients. It includes:
    
    访问 API 客户端的入口点。它包括：
    
    -   `getApi()`: A factory function that returns a single, configured API client based on the `api_provider` setting in `config.json`.
        
        一个工厂函数，根据 `config.json` 中的 `api_provider` 设置，返回一个单一的、已配置的 API 客户端。
        
    -   `getAllApis()`: A factory function that returns an array of all available API clients configured for the current network in `config.json`.
        
        一个工厂函数，返回一个数组，其中包含为 `config.json` 中当前网络配置的所有可用 API 客户端。

---

## API Implementations (API 实现)

This project supports multiple data providers, each with its own client implementation:

该项目支持多个数据提供商，每个提供商都有自己的客户端实现：

-   **`blockstream.ts` (`BlockstreamApi`)**: Client for the [Blockstream Esplora API](https://github.com/Blockstream/esplora/blob/master/API.md).
    
    用于 [Blockstream Esplora API](https://github.com/Blockstream/esplora/blob/master/API.md) 的客户端。
    
-   **`mempool.ts` (`MempoolApi`)**: Client for the [mempool.space API](https://mempool.space/docs/api).
    
    用于 [mempool.space API](https://mempool.space/docs/api) 的客户端。
    
-   **`btcNode.ts` (`BtcNodeApi`)**: Client for a self-hosted Bitcoin Core node via its [RPC interface](https://developer.bitcoin.org/reference/rpc/).
    
    通过其 [RPC 接口](https://developer.bitcoin.org/reference/rpc/)连接自托管的 Bitcoin Core 节点的客户端。
    
    > **Note:** The current implementation is compatible with Bitcoin Core v22. Do not use RPC commands from versions higher than 22, as they may not be supported.
    > 
    > **注意：** 当前实现与 Bitcoin Core v22 兼容。请勿使用高于 v22 版本的 RPC 命令，因为它们可能不受支持。

---

## Usage (使用方法)

To interact with the blockchain, other parts of the application should use the `getApi()` or `getAllApis()` function to obtain an API client instance, rather than instantiating the clients directly. This decouples the application logic from the specific API provider being used.

要与区块链交互，应用程序的其他部分应使用 `getApi()` 或 `getAllApis()` 函数来获取 API 客户端实例，而不是直接实例化客户端。这将应用程序逻辑与所使用的特定 API 提供商解耦。
