import {nat64,Record,int8,int32,text, Principal, bool, Vec, Opt, StableBTreeMap} from 'azle';


export const Proposal =  Record({
    id: Principal,
    title: text,
    Description: text,
    Amount: nat64,
    votesWith: nat64,
    votesAgainst: nat64,
    benefitiary: Principal,
    CreatedAt: nat64,
    executed: bool,
    ProposerAddress: Principal,
    updatedAt: Opt(nat64)
})
export const Delegates = Record({
    id: Principal,
    shares: nat64
})

export const DAO = Record({
    id: Principal,
    name: text,
    TotalShares: nat64,
    CurrentFunds: nat64,
    Proposals: Vec(Proposal),
    DaoAvailable: bool,
    lockedFunds: nat64,
    Delegates: Vec(Delegates),
    creator: Principal,
    CreatedAt: nat64,
    updatedAt: Opt(nat64)
})


export const ProposalPayload = Record({
    title: text,
    Description: text,
    Amount: nat64,
    benefitiary: Principal
})
export const joinDaoPayload = Record({

})
export const DaoPayload= Record({
    name: text,
    TotalShares: nat64,

})
 export let DaoCreator = StableBTreeMap(Principal, DAO, 0)
 export let DaoList = StableBTreeMap(Principal, DAO,1)
 export let ProposalSave = StableBTreeMap(Principal, Proposal,2)

