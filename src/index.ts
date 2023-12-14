import { Proposal,DAO,ProposalPayload,DaoCreator, DaoPayload, DaoList, Delegates, ProposalSave } from './types';

// this is a dao to fund startups
import {Ok,Variant,nat64, Canister, query, text, update, Void,Vec ,Principal, Result, ic, Err, Opt, None, Some} from 'azle';

// This is a global variable that is stored on the heap
let message = '';
const DaoError = Variant({
    DaoDoesNotExist: Principal,
    UserDoesNotExist: Principal,
    Error: Principal,
    AlreadyJoinedDao: Principal
});
export default Canister({

    getAllDaos: query([],Vec(DAO),()=>{
        return DaoCreator.values()
    }),

    createDaos: update([DaoPayload], DAO, (payload)=>{

        const id = generateId();
        const delegate : typeof Delegates={
            id: ic.caller(),
            shares: 2000n
        }
        const dao :typeof DAO ={
            id: id,
            ...payload,
            CurrentFunds: 1000n,
            Proposals: [],
            DaoAvailable: true,
            lockedFunds: 500n,
            Delegates: [delegate],
            creator: ic.caller(),
            CreatedAt: ic.time(),
            updatedAt: None
        } 

        DaoCreator.insert(ic.caller(),dao)
        DaoList.insert(dao.id, dao)
        return dao;
    }),
    addMoreShares:update([Principal,nat64], Result(DAO,DaoError),(DaoId,shares)=>{
        const daoOpt = DaoList.get(DaoId)
        if( 'None' in daoOpt){
            return Err({
                DaoDoesNotExist: ic.caller()
            })
        }
        const dao = daoOpt.Some
    
        //shares can only be addded or updated if total shares is less than 1000
        if(dao.creator != ic.caller() && dao.TotalShares < 1000n){
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
        if(dao.creator != ic.caller && dao.DaoAvailable != true){
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

    createProposal: update([Principal,ProposalPayload], Result(Proposal,DaoError), (DaoId,payload)=>{
        
        const id  = generateId()
        const DaoOpt = DaoList.get(DaoId)
        const dao = DaoOpt.Some
        const isCallerDelegate = dao.Delegates.some((delegate: typeof Delegates) => {
            return delegate.id.toText() === ic.caller().toText();
        });
        ic.print(`Caller: ${ic.caller().toText()}`);
        dao.Delegates.forEach((delegate: typeof Delegates) => {
            ic.print(`Delegate: ${delegate.id.toText()}`);
        });
    
    
        console.log(isCallerDelegate)
    
        if (!isCallerDelegate) {
            return Err({
                UserDoesNotExist: ic.caller()
            });
        }
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
        ProposalSave.insert(proposal.id, proposal)
        return Ok(proposal);
        
       
        // if('None' in DaoOpt){
        //     return Err({
        //         DaoDoesNotExist: ic.caller()
        //     })
        // }

    }),
    voteWithProposal: update([],Void,()=>{

    }),
    voteAgainstProposal: update([],Void,()=>{

    }),

    //input the id of the dao you want to join
    JoinDao: update([Principal], Result(DAO, DaoError),(id)=>{
        const DaoOpt = DaoList.get(id);
        if('None' in DaoOpt){
            return Err({
                DaoDoesNotExist: ic.caller()
            })
        }
        const dao = DaoOpt.Some;
         // Check if the caller is already a delegate in the DAO
    
         const isCallerDelegate = dao.Delegates.find((delegate: typeof Delegates) => {
            return delegate.id.toString() === ic.caller().toString();
        });
        console.log(isCallerDelegate)
        if (isCallerDelegate) {
            return Err({
                AlreadyJoinedDao: ic.caller()
            });
        }
        // if(dao.creator.toString() == ic.caller().toString() && dao.DaoAvailable == false){
        //     return Err({
        //         Error: ic.caller()
        //     })
        // }
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

        return Result.Ok(ddao);



    }),
    DaoList: query([],Vec(DAO),()=>{
        return DaoList.values()
    }),
    
    getPrincipal: query([], Principal,()=>{
        return ic.caller()
    }),
    StringPrincipal: query([],text,()=>{
        return ic.caller.toString()
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




// dfx canister call dao createDaos '(record{"name"="yyy"; "TotalShares"=100000})'

