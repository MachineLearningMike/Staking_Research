
async function showTotalState() {
    const s = await CONTRACT.getTotalState();
    console.log("\n\tTotal:".yellow.bold);
    console.log("\ttotalBalance %s, lastBlock %s", s.totalBalance, s._latestBlock);
    console.log("\trewardPool %s, totalPending %s", s._rewordPool, s._totalPendingReward);
    console.log("\taccRewardPerShare12 %s", s._accRewardPerShare12);
}

async function showUserState(user) {
    const s = await CONTRACT.getUserState(user.address);
    console.log("\n\tUser %s:".yellow, user.name);
    console.log("\tshare %s, reward %s", s._share, s._reward);
    console.log("\trewardDebt %s, userPending %s", s._rewardDebt, s._userPendingReward);
}

//=================== Paremeter Block that differentiate this testing script from others ======
const params = {
    contract_name: "CompoundInterestPendency",
    
    FixedSupply: true,
    mintX: 0,
    burnX: 0,

    minOneBlockSurvival: 1.00,
    maxOneBlockSurvival: 1.02,
    // showTotalState: showTotalState,
    // showUserState: showUserState,
    nCalls: 200000,
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