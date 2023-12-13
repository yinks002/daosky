import { Proposal,DAO,ProposalPayload,DaoCreator, DaoPayload, DaoList, Delegates } from './types';

// this is a dao to fund startups
import {Ok,Variant,nat64, Canister, query, text, update, Void,Vec ,Principal, Result, ic, Err, Opt, None, Some} from 'azle';

// This is a global variable that is stored on the heap
let message = '';
const DaoError = Variant({
    DaoDoesNotExist: Principal,
    UserDoesNotExist: Principal,
    Error: Principal
});
export default Canister({

    getAllDaos: query([],Vec(DAO),()=>{
        return DaoCreator.values()
    }),

    createDaos: update([DaoPayload], DAO, (payload)=>{

        const id = generateId();
        const dao :typeof DAO ={
            id: id,
            ...payload,
            CurrentFunds: 1000n,
            Proposals: [],
            DaoAvailable: true,
            lockedFunds: 500n,
            Delegates: [],
            creator: ic.caller(),
            CreatedAt: ic.time(),
            updatedAt: None
        } 
        DaoCreator.insert(ic.caller(),dao)
        DaoList.insert(dao.id, dao)
        return dao;
    }),
    addMoreShares:update([nat64], Result(DAO,DaoError),(shares)=>{
        const daoOpt = DaoCreator.get(ic.caller())
        if( 'None' in daoOpt){
            return Err({
                DaoDoesNotExist: ic.caller()
            })
        }
        const dao = daoOpt.Some
    
        //shares can only be addded or updated if total shares is less than 1000
        if(dao.creator !== ic.caller() && dao.TotalShares < 1000n){
            return Err({
                Error: ic.caller()
            })
        }
        const ddao: typeof DAO= {
            ...dao,
            TotalShares: shares,
            updatedAt: Some(ic.time())
        }
        DaoCreator.insert(ic.caller(), ddao)
        DaoList.insert(dao.id, ddao)
        return dao;
        


    }),
    TurnOffDao: update([Principal],Result(DAO,DaoError), (id)=>{
        const DaoOpt = DaoList.get(id);
        if('None' in DaoOpt){
            return Err({
                DaoDoesNotExist: ic.caller()
            })
        }
        const dao = DaoOpt.Some;
        if(dao.creator != ic.caller && dao.DaoAvailable== true){
            return Err({
                Error: ic.caller()
            })
        }
        const ddao : typeof DAO = {
            ...dao,
            DaoAvailable: false,
            updatedAt: Some(ic.time())

        }
        return Ok(ddao);

    }),

    createProposal: update([ProposalPayload], Proposal, (payload)=>{
        const id  = generateId()
        const proposal : typeof Proposal = {
            ...payload,
            id: id,
            votesAgainst: 0n,
            votesWith: 0n,
            CreatedAt: ic.time(),
            executed: false,
            ProposerAddress: ic.caller(),
            updatedAt: None
        }
        return proposal;
    }),
    //input the id of the dao you want to join
    JoinDao: update([Principal,nat64], Result(DAO, DaoError),(id)=>{
        const DaoOpt = DaoList.get(id);
        if('None' in DaoOpt){
            return Err({
                DaoDoesNotExist: ic.caller()
            })
        }
        const dao = DaoOpt.Some;
         // Check if the caller is already a delegate in the DAO
    
    // Check if the caller is already a delegate in the DAO
    const isCallerDelegate = dao.Delegates.some((delegate:typeof Delegates) => {
        return delegate.id == ic.caller();
    });

    if (isCallerDelegate) {
        return Err({
            Error: ic.caller()
        });
    }
        if(dao.creator == ic.caller && dao.DaoAvailable== false){
            return Err({
                Error: ic.caller()
            })
        }
        const delegate : typeof Delegates={
            id: ic.caller(),
            shares: 2000n
        }
        const ddao : typeof DAO = {
            ...dao,
            Delegates:[...dao.Delegates, delegate]

        }
        DaoCreator.insert(dao.creator, dao)
        DaoList.insert(id,dao)

        return Ok(ddao);


    }),

    // Query calls complete quickly because they do not go through consensus
    getMessage: query([], text, () => {
        return message;
    }),
    // Update calls take a few seconds to complete
    // This is because they persist state changes and go through consensus
    setMessage: update([text], Void, (newMessage) => {
        message = newMessage; // This change will be persisted
    })
});

function generateId(): Principal {
    const randomBytes = new Array(29)
        .fill(0)
        .map((_) => Math.floor(Math.random() * 256));

    return Principal.fromUint8Array(Uint8Array.from(randomBytes));
}

