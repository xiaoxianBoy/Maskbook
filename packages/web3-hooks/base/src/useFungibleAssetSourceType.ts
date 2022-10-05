import { useSubscription } from 'use-subscription'
import { UNDEFINED, NetworkPluginID } from '@masknet/shared-base'
import { useWeb3State } from './useWeb3State.js'

export function useFungibleAssetSourceType<T extends NetworkPluginID>(pluginID?: T) {
    const { Settings } = useWeb3State(pluginID)
    return useSubscription(Settings?.fungibleAssetSourceType ?? UNDEFINED)
}
