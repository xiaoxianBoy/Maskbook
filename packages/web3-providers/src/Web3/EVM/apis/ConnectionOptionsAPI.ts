import type {
    ChainId,
    SchemaType,
    ProviderType,
    NetworkType,
    MessageRequest,
    MessageResponse,
    Transaction,
    TransactionParameter,
} from '@masknet/web3-shared-evm'
import { ConnectionOptionsAPI_Base } from '../../Base/apis/ConnectionOptionsAPI.js'
import { Web3StateRef } from './Web3StateAPI.js'
import { OthersAPI } from './OthersAPI.js'

export class ConnectionOptionsAPI extends ConnectionOptionsAPI_Base<
    ChainId,
    SchemaType,
    ProviderType,
    NetworkType,
    MessageRequest,
    MessageResponse,
    Transaction,
    TransactionParameter
> {
    readonly Web3StateRef = Web3StateRef
    readonly Web3Others = OthersAPI
}
