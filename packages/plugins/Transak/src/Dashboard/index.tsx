import type { Plugin } from '@masknet/plugin-infra'
import { base } from '../base.js'
import { BuyTokenGlobalInjection } from '../SNSAdaptor/BuyTokenGlobalInjection.js'

const dashboard: Plugin.Dashboard.Definition = {
    ...base,
    init(signal) {},
    GlobalInjection: BuyTokenGlobalInjection,
}

export default dashboard
