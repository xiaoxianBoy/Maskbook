import urlcat from 'urlcat'
import { first } from 'lodash-unified'
import getUnixTime from 'date-fns/getUnixTime'
import { EMPTY_LIST } from '@masknet/shared-base'
import {
    HubOptions,
    NonFungibleAsset,
    NonFungibleTokenEvent,
    NonFungibleTokenOrder,
    OrderSide,
    TokenType,
    createPageable,
    createIndicator,
    createNextIndicator,
    createLookupTableResolver,
    CurrencyType,
    isSameAddress,
    scale10,
} from '@masknet/web3-shared-base'
import {
    ChainId,
    SchemaType,
    createERC20Token,
    USDC,
    USDT,
    HUSD,
    BUSD,
    DAI,
    WBTC,
    WNATIVE,
} from '@masknet/web3-shared-evm'
import { Token, RaribleEventType, RaribleOrder, RaribleHistory, RaribleNFTItemMapResponse } from './types'
import { RaribleURL } from './constants'
import type { NonFungibleTokenAPI } from '../types'

const resolveRaribleBlockchain = createLookupTableResolver<number, string>(
    {
        [ChainId.Mainnet]: 'ETHEREUM',
        [ChainId.Matic]: 'POLYGON',
    },
    () => 'ETHEREUM',
)

async function fetchFromRarible<T>(url: string, path: string, init?: RequestInit) {
    const response = await fetch(`${url}${path.slice(1)}`, {
        method: 'GET',
        mode: 'cors',
        headers: { 'content-type': 'application/json' },
    })
    return response.json() as Promise<T>
}

function createAccount(address?: string) {
    if (!address) return
    return {
        address: address.split(':')[1],
    }
}

function createPaymentToken(chainId: ChainId, token?: Token) {
    if (token?.['@type'] !== 'ERC20' || !token?.contract) return
    const address = token.contract.split(':')[1]
    return (
        [USDC, USDT, HUSD, BUSD, DAI, WBTC, WNATIVE].find((x) => isSameAddress(address, x[chainId].address))?.[
            chainId
        ] ?? createERC20Token(chainId, address)
    )
}

function createRaribleLink(address: string, tokenId: string) {
    return urlcat('https://rarible.com/token/:address::tokenId', {
        address,
        tokenId,
    })
}

function createAsset(chainId: ChainId, asset: RaribleNFTItemMapResponse): NonFungibleAsset<ChainId, SchemaType.ERC721> {
    return {
        id: asset.id || asset.contract,
        chainId,
        tokenId: asset.tokenId.toString(),
        type: TokenType.NonFungible,
        address: asset.contract.split(':')[1],
        schema: SchemaType.ERC721,
        creator: createAccount(first(asset.creators)?.account),
        traits: asset?.meta?.attributes.map(({ key, value }) => ({ type: key, value })) ?? [],
        metadata: {
            chainId,
            name: asset.meta?.name ?? '',
            description: asset.meta?.description,
            imageURL: asset.meta?.content?.find((x) => x['@type'] === 'IMAGE' && x.representation === 'PREVIEW')?.url,
            mediaURL: asset.meta?.content?.find((x) => x['@type'] === 'IMAGE' && x.representation === 'ORIGINAL')?.url,
        },
        contract: {
            chainId,
            schema: SchemaType.ERC721,
            address: asset.contract.split(':')[1],
            name: asset.meta?.name ?? '',
        },
        collection: {
            chainId,
            name: asset.meta?.name ?? '',
            slug: asset.meta?.name ?? '',
            description: asset.meta?.description,
            iconURL: asset.meta?.content?.find((x) => x['@type'] === 'IMAGE' && x.representation === 'PREVIEW')?.url,
            verified: !asset.deleted,
            createdAt: getUnixTime(new Date(asset.mintedAt)),
        },
    }
}

function createOrder(chainId: ChainId, order: RaribleOrder): NonFungibleTokenOrder<ChainId, SchemaType> {
    const paymentToken = createPaymentToken(chainId, order.make.type)
    return {
        id: order.id,
        chainId,
        assetPermalink: '',
        createdAt: getUnixTime(new Date(order.createdAt)),
        price: {
            [CurrencyType.USD]: order.takePriceUsd ?? order.makePriceUsd,
        },
        priceInToken:
            (order.takePrice || order.makePrice) && paymentToken
                ? {
                      amount: scale10(order.takePrice ?? order.makePrice ?? '0', paymentToken?.decimals).toFixed(),
                      token: paymentToken,
                  }
                : undefined,
        side: OrderSide.Buy,
        quantity: order.fill,
    }
}

function createEvent(chainId: ChainId, history: RaribleHistory): NonFungibleTokenEvent<ChainId, SchemaType> {
    return {
        id: history.id,
        chainId: ChainId.Mainnet,
        from: createAccount(history.from ?? history.seller ?? history.owner ?? history.maker),
        to: createAccount(history.buyer),
        type: history['@type'],
        assetPermalink:
            history.nft?.type.contract && history.nft?.type.tokenId
                ? createRaribleLink(history.nft.type.contract, history.nft.type.tokenId)
                : undefined,
        quantity: history.nft?.value ?? history.value ?? '0',
        timestamp: getUnixTime(new Date(history.date)),
        hash: history.transactionHash ?? history.hash,
        price: history.priceUsd
            ? {
                  [CurrencyType.USD]: history.priceUsd,
              }
            : undefined,
        paymentToken: createPaymentToken(chainId, history.payment?.type),
    }
}

export class RaribleAPI implements NonFungibleTokenAPI.Provider<ChainId, SchemaType> {
    async getAsset(address: string, tokenId: string, { chainId = ChainId.Mainnet }: { chainId?: ChainId } = {}) {
        const requestPath = `/v0.1/items/${resolveRaribleBlockchain(chainId)}:${address}:${tokenId}`
        const asset = await fetchFromRarible<RaribleNFTItemMapResponse>(RaribleURL, requestPath)
        if (!asset) return
        return createAsset(chainId, asset)
    }

    async getAssets(from: string, { chainId = ChainId.Mainnet, indicator, size = 20 }: HubOptions<ChainId> = {}) {
        if (chainId !== ChainId.Mainnet) return createPageable(EMPTY_LIST, createIndicator(indicator, ''))

        const requestPath = urlcat('/v0.1/items/byOwner', {
            owner: `${resolveRaribleBlockchain(chainId)}:${from}`,
            size,
            blockchains: [resolveRaribleBlockchain(chainId)],
            continuation: indicator?.id,
        })

        const response = await fetchFromRarible<{
            total: number
            continuation: string
            items: RaribleNFTItemMapResponse[]
        }>(RaribleURL, requestPath)
        if (!response) return createPageable(EMPTY_LIST, createIndicator(indicator, ''))

        const items = response.items.map((asset) => ({
            ...createAsset(chainId, asset),
            owner: {
                address: from,
            },
        }))
        return createPageable(items, createIndicator(indicator), createNextIndicator(indicator, response.continuation))
    }

    async getOffers(
        tokenAddress: string,
        tokenId: string,
        { chainId = ChainId.Mainnet, indicator, size = 20 }: HubOptions<ChainId> = {},
    ) {
        const requestPath = urlcat('/v0.1/orders/bids/byItem', {
            itemId: `${resolveRaribleBlockchain(chainId)}:${tokenAddress}:${tokenId}`,
            size,
            continuation: indicator?.id,
        })
        const response = await fetchFromRarible<{
            continuation: string
            orders: RaribleOrder[]
        }>(RaribleURL, requestPath)
        const orders = response.orders.map(
            (order): NonFungibleTokenOrder<ChainId, SchemaType> => ({
                ...createOrder(chainId, order),
                assetPermalink: createRaribleLink(tokenAddress, tokenId),
            }),
        )
        return createPageable(
            orders,
            createIndicator(indicator),
            orders.length === size ? createNextIndicator(indicator, response.continuation) : undefined,
        )
    }

    async getListings(
        tokenAddress: string,
        tokenId: string,
        { chainId = ChainId.Mainnet, indicator, size = 20 }: HubOptions<ChainId> = {},
    ) {
        const requestPath = urlcat('/v0.1/orders/sell/byItem', {
            itemId: `${resolveRaribleBlockchain(chainId)}:${tokenAddress}:${tokenId}`,
            size,
            continuation: indicator?.id,
        })
        const response = await fetchFromRarible<{
            continuation: string
            orders: RaribleOrder[]
        }>(RaribleURL, requestPath)
        const orders = response.orders.map(
            (order): NonFungibleTokenOrder<ChainId, SchemaType> => ({
                ...createOrder(chainId, order),
                assetPermalink: createRaribleLink(tokenAddress, tokenId),
            }),
        )
        return createPageable(
            orders,
            createIndicator(indicator),
            orders.length === size ? createNextIndicator(indicator, response.continuation) : undefined,
        )
    }

    async getOrders(tokenAddress: string, tokenId: string, side: OrderSide, options: HubOptions<ChainId> = {}) {
        switch (side) {
            case OrderSide.Buy:
                return this.getOffers(tokenAddress, tokenId, options)
            case OrderSide.Sell:
                return this.getListings(tokenAddress, tokenId, options)
            default:
                return createPageable(EMPTY_LIST, createIndicator(options.indicator))
        }
    }

    async getEvents(
        tokenAddress: string,
        tokenId: string,
        { chainId = ChainId.Mainnet, indicator, size = 20 }: HubOptions<ChainId> = {},
    ) {
        const requestPath = urlcat('/v0.1/activities/byItem', {
            type: [RaribleEventType.TRANSFER, RaribleEventType.MINT, RaribleEventType.BID, RaribleEventType.LIST],
            itemId: `${resolveRaribleBlockchain(chainId)}:${tokenAddress}:${tokenId}`,
            cursor: indicator?.id,
            blockchains: [resolveRaribleBlockchain(chainId)],
            size,
            sort: 'LATEST_FIRST',
        })
        const response = await fetchFromRarible<{
            total: number
            cursor: string
            activities: RaribleHistory[]
        }>(RaribleURL, requestPath)

        const events = response.activities.map((history) => createEvent(chainId, history))

        return createPageable(
            events,
            createIndicator(indicator),
            events.length === size ? createNextIndicator(indicator, response.cursor) : undefined,
        )
    }
}
