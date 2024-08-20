
async function showTotalState() {
    const s = await CONTRACT.getTotalState();
    console.log("\n\tTotal:".yellow.bold);
    console.log("\ttotalBalance %s, lastNet %s", s.totalBalance, s._lastNet);
    console.log("\tVIRTUAL %s, blocks %s", s._VIRTUAL, s.blocks);
    console.log("\ttotalPending %s, burnDone %s", s._totalPendingReward, s._burnDone);
}

async function showUserState(user) {
    const s = await CONTRACT.getUserState(user.address);
    console.log("\n\tUser %s:".yellow, user.name);
    console.log("\tshare %s, activity %s,", s._share, s._VIRTUAL);
    console.log("\tuserPending %s, lastBlock %s", s._userPendingReward, s._latestBlock);
}

//=================== Paremeter Block that differentiate this testing script from others ======
const params = {
    contract_name: "CompoundBurnActivity",
    
    FixedSupply: true,
    mintX: 0,
    burnX: 0,
    
    minOneBlockSurvival: 0.98,
    maxOneBlockSurvival: 1.00,
    // showTotalState: showTotalState,
    // showUserState: showUserState,
    nCalls: 150000,
    contract: null,
    owner: null,
    alice: null,
    bob: null,
    carol: null
}

//==========================================================================================

const test_body = require("./test_body");

async function test() {

    let val = await test_body(params,hre);
    console.log(val);
}

test();