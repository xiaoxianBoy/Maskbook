import { useSubscription } from 'use-subscription'
import { EMPTY_ARRAY } from '@masknet/shared-base'
import { Providers } from '@masknet/web3-providers'
import { ProviderType } from '@masknet/web3-shared-evm'

export function useWallets() {
    // We got stored Mask wallets only.
    const wallets = useSubscription(Providers[ProviderType.MaskWallet].subscription.wallets ?? EMPTY_ARRAY)
    return wallets.sort((a, b) => {
        if (a.owner && !b.owner) return 1
        if (a.createdAt.getTime() - b.createdAt.getTime() > 10000) {
            return -1
        } else if (b.createdAt.getTime() - a.createdAt.getTime() > 10000) {
            return 1
        }
        const numA = a.name.split('Wallet ')[1]
        const numB = b.name.split('Wallet ')[1]
        try {
            if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
                return Number(numA) > Number(numB) ? 1 : -1
            } else {
                return numB.length - numA.length
            }
        } catch {
            return 0
        }
    })
}
