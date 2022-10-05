import { useAsyncRetry } from 'react-use'
import { getPastTimestamps } from '../../helpers/blocks.js'
import { PluginTraderRPC } from '../../messages.js'
import { useChainId } from '@masknet/web3-hooks-base'
import { NetworkPluginID } from '@masknet/shared-base'

/**
 * The latest block numbers (ethereum)
 * @param duration
 * @param size the max size of each subgraph request can be returned
 */
export function useLatestBlockNumbers(duration: number, size = 50) {
    const chainId = useChainId(NetworkPluginID.PLUGIN_EVM)
    return useAsyncRetry(async () => {
        const timestamps = getPastTimestamps(duration, size)
        return PluginTraderRPC.fetchBlockNumbersByTimestamps(chainId, timestamps)
    }, [])
}
