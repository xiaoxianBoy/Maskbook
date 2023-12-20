import { isSameAddress } from '@masknet/web3-shared-base'
import {
    type ChainId,
    isValidAddress,
    isValidChainId,
    getInvalidChainId,
    NetworkType,
    type ProviderType,
    type Web3,
    type Web3Provider,
    getDefaultChainId,
    getDefaultProviderType,
    getDefaultNetworkType,
} from '@masknet/web3-shared-flow'
import { FlowWalletProviders } from '../providers/index.js'
import { FlowChainResolver } from '../apis/ResolverAPI.js'
import { ProviderState, type ProviderStorage } from '../../Base/state/Provider.js'
import type { WalletAPI } from '../../../entry-types.js'
import type { Account, StorageObject } from '@masknet/shared-base'

export class FlowProvider extends ProviderState<ChainId, ProviderType, NetworkType, Web3Provider, Web3> {
    constructor(context: WalletAPI.IOContext, storage: StorageObject<ProviderStorage<Account<ChainId>, ProviderType>>) {
        super(context, storage)
        this.init()
    }
    protected override providers = FlowWalletProviders
    protected override isValidAddress = isValidAddress
    protected override isValidChainId = isValidChainId
    protected override isSameAddress = isSameAddress
    protected override getInvalidChainId = getInvalidChainId
    protected override getDefaultNetworkType = getDefaultNetworkType
    protected override getDefaultProviderType = getDefaultProviderType
    protected override getDefaultChainId = getDefaultChainId
    protected override getNetworkTypeFromChainId(chainId: ChainId): NetworkType {
        return FlowChainResolver.networkType(chainId) ?? NetworkType.Flow
    }
}
