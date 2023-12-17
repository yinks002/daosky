import { Proposal,DAO,ProposalPayload,DaoCreator, DaoPayload, DaoList, Delegates, ProposalSave } from './types';

// this is a dao to fund startups
import {Ok,Variant,nat64, Canister, query, text, update, Void,Vec ,Principal, Result, ic, Err, Opt, None, Some} from 'azle';

// This is a global variable that is stored on the heap
let message = '';
const DaoError = Variant({
    DaoDoesNotExist: Principal,
    UserDoesNotExist: Principal,
    Error: Principal,
    AlreadyJoinedDao: Principal,
    UserNotInDao: Principal,
    ProposalDoesNotExist: Principal,
    AlreadyVoted: Principal
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
            Delegates: [],
            creator: ic.caller(),
            CreatedAt: ic.time(),
            updatedAt: None
        } 
        dao.Delegates.push(delegate)

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
    getDaoInfoById: query([Principal],Opt(DAO),(id)=>{
        return DaoList.get(id);
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
        if('None' in DaoOpt){
            return Err({
                DaoDoesNotExist: ic.caller()
            })
        }

        const dao = DaoOpt.Some
        let isCallerDelegate = false;

        for (let i = 0; i < dao.Delegates.length; i++) {
            const delegateId = dao.Delegates[i].id.toString();
            if (delegateId === ic.caller().toString()) {
                isCallerDelegate = true;
                break;
            }
        }
   
    
        ic.print(`Caller: ${ic.caller().toText()}`);
        dao.Delegates.forEach((delegate: typeof Delegates) => {
            ic.print(`Delegate: ${delegate.id.toText()}`);
        });
    
    
        console.log(isCallerDelegate)
    
        if (!isCallerDelegate) {
            return Err({
                UserNotInDao: ic.caller()
            });
        }
        const proposal : typeof Proposal = {
            ...payload,
            id: id,
            votesAgainst: [],
            votesWith: [],
            CreatedAt: ic.time(),
            executed: false,
            ProposerAddress: ic.caller(),
            updatedAt: None
        }
        const updatedProposal= dao.Proposals.push(proposal)
        const updatedDao :typeof DAO = {
            ...dao,
            ...updatedProposal,
            updatedProposal
        }
        DaoCreator.insert(dao.creator, updatedDao)
        DaoList.insert(dao.id, updatedDao)
        ProposalSave.insert(proposal.id, proposal)
        return Ok(proposal);
        
       
      
    }),
    voteWithProposal: update([Principal,Principal],Result(Proposal,DaoError),(DaoId, ProposalId)=>{
        const DaoOpt = DaoList.get(DaoId)
        const ProposalOpt = ProposalSave.get(ProposalId);

        if('None' in DaoOpt){
            return Err({
                DaoDoesNotExist: ic.caller()
            })
        }
        if('None' in ProposalOpt){
            return Err({
                ProposalDoesNotExist: ProposalId
            })
        }
        const propo = ProposalOpt.Some
        const dao = DaoOpt.Some
         // Check if the caller is already a delegate in the DAO
    
         const isCallerDelegate = dao.Delegates.some((delegate: typeof Delegates) => {
            return delegate.id.toText() === ic.caller().toText();
        });
        if (!isCallerDelegate) {
            return Err({
               UserNotInDao : DaoId
            });
        }
        let hasVoted = false
        //to check if user has already voted
        for (let i = 0; i < propo.votesWith.length; i++) {
            const voter = propo.votesWith[i].toString();
            if (voter === ic.caller().toString()) {
                hasVoted = true;
                break;
            }
        }
        for (let i = 0; i < propo.votesAgainst.length; i++) {
            const voter = propo.votesWith[i].toString();
            if (voter === ic.caller().toString()) {
                hasVoted = true;
                break;
            }
        }
        if(hasVoted){
            return Err({
                AlreadyVoted: ProposalId
            })
        }
        const vote = propo.votesWith.push(ic.caller())
        const props : typeof Proposal = {
            ...propo,
            ...vote,
            vote
        }
        const daos:typeof DAO = {
            ...dao,
            ...props
        }
        DaoList.insert(daos.id, daos)
        DaoCreator.insert(daos.creator, daos)
        ProposalSave.insert(props.id, props)
        
        return Ok(props)
        

    }),
    voteAgainstProposal: update([Principal,Principal],Result(Proposal,DaoError),(DaoId, ProposalId)=>{
        const DaoOpt = DaoList.get(DaoId)
        const ProposalOpt = ProposalSave.get(ProposalId);

        if('None' in DaoOpt){
            return Err({
                DaoDoesNotExist: ic.caller()
            })
        }
        if('None' in ProposalOpt){
            return Err({
                ProposalDoesNotExist: ProposalId
            })
        }
        const propo = ProposalOpt.Some
        const dao = DaoOpt.Some
         // Check if the caller is already a delegate in the DAO
    
         const isCallerDelegate = dao.Delegates.some((delegate: typeof Delegates) => {
            return delegate.id.toText() === ic.caller().toText();
        });
        if (!isCallerDelegate) {
            return Err({
               UserNotInDao : DaoId
            });
        }
        let hasVoted = false
        //to check if user has already voted
        for (let i = 0; i < propo.votesAgainst.length; i++) {
            const voter = propo.votesWith[i].toString();
            if (voter === ic.caller().toString()) {
                hasVoted = true;
                break;
            }
        }
        for (let i = 0; i < propo.votesWith.length; i++) {
            const voter = propo.votesWith[i].toString();
            if (voter === ic.caller().toString()) {
                hasVoted = true;
                break;
            }
        }
        if(hasVoted){
            return Err({
                AlreadyVoted: ProposalId
            })
        }
        const vote = propo.votesAgainst.push(ic.caller())
        const props : typeof Proposal = {
            ...propo,
            ...vote,
            vote
        }
        const daos:typeof DAO = {
            ...dao,
            ...props
        }
        DaoList.insert(daos.id, daos)
        DaoCreator.insert(daos.creator, daos)
        ProposalSave.insert(props.id, props)
        
        return Ok(props)
        
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
    
         const isCallerDelegate = dao.Delegates.some((delegate: typeof Delegates) => {
            return delegate.id.toString() === ic.caller().toString();
        });
        console.log(isCallerDelegate)
        if (isCallerDelegate) {
            return Err({
                AlreadyJoinedDao: ic.caller()
            });
        }
        if(dao.creator.toString() == ic.caller().toString() && dao.DaoAvailable == false){
            return Err({
                Error: ic.caller()
            })
        }
        const delegate : typeof Delegates={
            id: ic.caller(),
            shares: 2000n
        }
        if(dao.TotalShares- 2000n < 1000n){
            return Err({
                Error: id
            })
        }
        const dele = dao.Delegates.push(delegate)
        const shares = dao.TotalShares - 2000n
        const ddao : typeof DAO = {
            ...dao,
            TotalShares: shares,
           ...dele,
           dele

        }
        DaoCreator.insert(dao.creator, dao)
        DaoList.insert(id,dao)

        return Result.Ok(ddao);



    }),
    // address of the dao
    viewProposalsInDao: query([Principal], Result(Vec(Proposal),DaoError),(id)=>{
        const daoOpt = DaoList.get(id)
        const dao= daoOpt.Some
        const isCallerDelegate = dao.Delegates.some((delegate: typeof Delegates) => {
            return delegate.id.toString() === ic.caller().toString();
        });
        if(!isCallerDelegate){
            return Err({
                UserNotInDao: id
            })
        }
        return dao.Proposals;

    }),
    DaoList: query([],Vec(DAO),()=>{
        return DaoList.values()
    }),

    deleteDao:update([Principal],Result(DAO, DaoError),(id)=>{
        const daoOpt = DaoList.get(id);
        const dao= daoOpt.Some
        if('None' in daoOpt){
            return Err({
                DaoDoesNotExist: id
            })
        }
        
        if(dao.creator.toString() != ic.caller().toString()){
            return Err({
                Error: id
            })
        }
        dao.remove(id);
        return dao;

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
// dfx canister call dao createProposal '(principal "kdcwa-glmgp-pa26j-kxc5u-qhgbv-k3vnu-kn
// afe-ihs7v-xinxz-my3nw-xrc", record{"title"="fund startups";"Description"="a dao to fund startups";"Amount"=1000;"benefit
// iary"=principal "kdcwa-glmgp-pa26j-kxc5u-qhgbv-k3vnu-knafe-ihs7v-xinxz-my3nw-xrc"})'

