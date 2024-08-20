const { ethers } = require("hardhat");
require("colors");

const {
    initUtilities,
    deployResearchToken,
    deployAnalyticMath,
    deployLibrary,
    mintBlocks,
    mint,
    transfer,
    burn,
    checkConsistency,
    mintAmountToKeepInitialSupply,
    burnAmountToKeepInitialSupply
} = require("./utilities");

// let P;
// module.exports.setParams = function (_params) {
//     P = _params;
//     setParams(_params);
// }

BigInt.prototype.toJSON = function() { return this.toString() }

module.exports = async function test_body(P) {

    function weiToEth(wei) {
        return Number(ethers.formatUnits( BigInt(wei).toString(), P.decimals));
    }
    
    function ethToWei(eth) {
        return ethers.parseUnits(eth.toString(), P.decimals);
    }

    await initUtilities(P);

    describe("====================== Stage 1: Deploy ======================\n".yellow, async function () {
        it("1.1 Main contracts are deployed.\n".green, async function () {
            [P.owner, P.alice, P.bob, P.carol] = await ethers.getSigners();
            
            P.owner.name = "Owner"; P.alice.name = "Alice"; P.bob.name = "Bob"; P.carol.name = "Carol";

            console.log("\tOwner address: ".cyan, P.owner.address);
            console.log("\tAlice address: ".cyan, P.alice.address);
            console.log("\tBob address: ".cyan, P.bob.address);
            console.log("\tCarol address: ".cyan, P.carol.address);

            analyticMath = await deployLibrary("AnalyticMath", P.owner);
            console.log("\tAlyticMath deployed at %s", await analyticMath.getAddress());
            await analyticMath.init();

            integralMathLib = await deployLibrary("IntegralMath", P.owner);
            console.log("\tIntegralMath deployed at %s", await integralMathLib.getAddress());

            P.contract = await deployResearchToken(P.contract_name, P.owner, await analyticMath.getAddress());
            console.log("\tCONTRACT contract deployed at: %s", await P.contract.getAddress());
            console.log("\tOwner's balance: %s", await P.contract.balance(P.owner.address));

            await initUtilities(P);
        });
    });

    describe("====================== Stage 3: Random calls ======================\n".yellow, async function () {

        const users = [];
        const errors = [];
        const burn_order = [];

        let burnAmountWei = BigInt(0);
        let mintAmountWei = BigInt(0);

        it("3.0 Prepare.\n".green, async function () {
            users.push(P.owner); users.push(P.owner); users.push(P.owner); users.push(P.owner); users.push(P.owner);
            users.push(P.alice); users.push(P.alice); users.push(P.alice); users.push(P.alice);
            users.push(P.bob); users.push(P.bob); users.push(P.bob);
            users.push(P.carol); users.push(P.carol);

            burn_order.push(P.owner); burn_order.push(P.alice); burn_order.push(P.bob); burn_order.push(P.carol);
        });

        function generateRandomInteger(min, max) {
            return Math.floor(min + Math.random() * (max - min + 1));
        }

        async function showUserStateAll() {
            await showUserState(P.owner);
            await showUserState(P.alice);
            await showUserState(P.bob);
            await showUserState(P.carol);
        }

        const endurance = 50;

        let transferCnt = 0;
        async function transferRandom(init) {
            let report = false; let cnt = 0;
            while (report == false && cnt < endurance) {
                cnt += 1;
                sender = users[generateRandomInteger(0, users.length - 1)];
                recipient = users[generateRandomInteger(0, users.length - 1)];
                amount = generateRandomInteger(10, 50);
                report = await transfer(sender, recipient, amount);
            }
            if (report == true) { transferCnt ++; }
            return report;
        }

        let mintCnt = 0;
        async function mintRandom(init) {
            let report = false; let cnt = 0;
            while (report == false && cnt < 1) {
                cnt += 1;
                recipient = users[generateRandomInteger(0, users.length - 1)];
                if (P.FixedSupply) {
                    amount = await mintAmountToKeepInitialSupply(init);
                } else {
                    amount = generateRandomInteger(10 * P.mintX, 50 * P.mintX);
                }
                report = false;
                if (amount > 0) {
                    // [bool, BigInt]
                    [report, _mintAmountWei] = await mint(P.owner, recipient, amount);
                }
            }
            if (report == true) { 
                mintCnt ++; 
                mintAmountWei += _mintAmountWei;   // used to track Compound Burn in Fixed mode
            }
            return report;
        }

        let burnCnt = 0;
        async function burnRandom(init) {  
            let report = false; let cnt = 0;
            while (report == false && cnt < 1) {
                cnt += 1;          
                recipient = users[generateRandomInteger(0, users.length - 1)];
                if (P.FixedSupply) {  
                    amount = await burnAmountToKeepInitialSupply(init);
                } else {
                    amount = generateRandomInteger(10 * P.burnX, 50 * P.burnX);
                }

                report = false;
                if (amount >= 1) {
                    let totalBurn = 0;
                    let count = 0;
                    while (totalBurn < (amount - burn_order.length) && count < burn_order.length) {
                        // console.log("burning %s from %s", amount - totalBurn, burn_order[count].name);
                        [success, _burnAmountWei] = await burn(P.owner, burn_order[count], amount - totalBurn);
                        // console.log("bured %s from %s", burned, burn_order[count].name);
                        totalBurn += weiToEth(_burnAmountWei);  // BigInt(0) if not success
                        burnAmountWei += _burnAmountWei;    // used to track Compound Interest in Fixed mode
                        count += 1;
                    }
                    report = (totalBurn >= (amount - burn_order.length));
                    // console.log("amount: %s, totalBurn", amount, totalBurn);             
                }
            }
            if (report == true) { burnCnt ++;}
            return report;
        }

        let totalBlocksMinted = 0;
        let cntMintBlocks = 0;
        async function mintBlocksRandom(init) {
            amount = generateRandomInteger(0, 50);
            blocks = await mintBlocks(amount);
            totalBlocksMinted += blocks;        // No
            cntMintBlocks += 1;
            return true;
        }

        const functions = [transferRandom, transferRandom, transferRandom, transferRandom, transferRandom,
            transferRandom, transferRandom, transferRandom, transferRandom, transferRandom, transferRandom,
            transferRandom, transferRandom, transferRandom, transferRandom, transferRandom, transferRandom,
            mintRandom, burnRandom, mintRandom, burnRandom, mintBlocksRandom];

        async function writeStringToFile(path, data) {
            const fs = require('fs')
            fs.writeFile(path, data, (err) => {
                if (err) throw err;
            })
        }

        it("3.1 Random calls.\n".green, async function () {

            blocks = 60 // twice the cycle
            mintAmount = 1000
            burnAmount = 700

            let values = [];
            let totals = [];
            let movingAvg = 0;
            let count = 0; let window = 5;
            const thresholdX = 5;
            let consistency;

            // Skip some calls, as checkForConsistency's relative_error 
            // is not fair for initial, small errors.
            // for(i=0; i<100; i++) {  
            //     rand = generateRandomInteger(0, functions.length - 1);
            //     await functions[rand]();
            // }


            let i = await P.contract.internals();
            let blocksOld = 0;
            let javascriptTruth = i._init_supply;

            let cnt = 0;
            while (cnt < P.nCalls) {
                rand = generateRandomInteger(0, functions.length - 1);
                const fun = functions[rand];
                report = await fun(i);
                if (report == true) {
                    consistency = await P.contract.checkForConsistency();

                    values.push(BigInt(consistency.collective));
                    values.push(BigInt(consistency.marginal));
                    values.push(BigInt(consistency.solidityTruth));

                    if (P.FixedSupply == false) { // totalBalance is freely changed
                        if (P.contract_name.includes("Compound")) { // totalBalance is freely exponentially changed
                            if (P.contract_name.includes("Interest")) { 
                                // totalBalance is freely exponentially increased from its initial value.
                                // we track totalBalance, because it includes interest.
                                base = Number(i._scale + i._rate)/Number(i._scale);
                                exponent = Number(consistency.blockNo-i._initBlock)/Number(i._cycle);
                                javascriptTruth = Math.pow(base, exponent);
                                // console.log(Number(consistency.blockNo-i._initBlock), Number(i._cycle)*Math.log(javascriptTruth)/Math.log(base))
                            } else {
                                // totalBalance is freely exponentially decreased.
                                // We track totalBalance, because it reflects burns.
                                base = Number(i._scale - i._rate)/Number(i._scale);
                                exponent = Number(consistency.blockNo-i._initBlock)/Number(i._cycle);
                                javascriptTruth = Math.pow(base, exponent);
                                // console.log(Number(consistency.blockNo-i._initBlock), Number(i._cycle)*Math.log(javascriptTruth)/Math.log(base))
                            }
                            javascriptTruth =  BigInt(javascriptTruth * 10 ** 24) * BigInt(i._init_supply) / BigInt(10 ** 24);
                        } else {
                            // totalBalance, or totalPrincipal, keeps constant inherently.
                            // SIMPLE tasks only handle linear interest/burn.
                            // interest/burn are stored on a separete account from principal. Track them.
                            javascriptTruth = BigInt(i._init_supply) * BigInt(i._rate) * BigInt(consistency.blockNo-i._initBlock) / BigInt(i._scale * i._cycle);
                        }
                    } else {    // totalBalance is fixed to its initial value
                        if (P.contract_name.includes("Compound")) { 
                            // totalBalance would be freely exponentially changed 
                            // if the testing program hadn't restored it to the initial supply intermittenlty.
                            // Tracking totalBalance may be interesting because it should osciliaate near the initial supply value.
                            
                            if (P.contract_name.includes("Interest")) { // fixed_com_interest
                                base = Number(i._scale + i._rate)/Number(i._scale);
                                blocksNew = Number(consistency.blockNo-i._initBlock);
                                exponent = Number(blocksNew - blocksOld)/Number(i._cycle);
                                rate = Math.pow(base, exponent);
                                javascriptTruth =  BigInt(rate * 10 ** 24) * javascriptTruth / BigInt(10 ** 24);
                                // console.log("================", javascriptTruth, burnAmountWei);
                                javascriptTruth -= burnAmountWei;
                                blocksOld = blocksNew;
                                burnAmountWei = BigInt(0);
                            } else {    // Burn
                                base = Number(i._scale - i._rate)/Number(i._scale);
                                blocksNew = Number(consistency.blockNo-i._initBlock);
                                exponent = Number(blocksNew - blocksOld)/Number(i._cycle);
                                rate = Math.pow(base, exponent);
                                javascriptTruth =  BigInt(rate * 10 ** 24) * BigInt(javascriptTruth) / BigInt(10 ** 24);
                                // console.log("================", javascriptTruth, mintAmountWei);
                                javascriptTruth += mintAmountWei;
                                blocksOld = blocksNew;
                                mintAmountWei = BigInt(0);
                            }                           
                        } else {
                            // totalBalance, or totalPrincipal, keeps constant inherently.
                            // SIMPLE tasks only handle linear interest/burn.
                            // interest/burn are stored on a separete account from principal. Track them.
                            javascriptTruth = BigInt(i._init_supply) * BigInt(i._rate) * BigInt(consistency.blockNo-i._initBlock) / BigInt(i._scale * i._cycle);
                        }
                    }

                    // init_supply = Number(i._init_supply) + Number(BigInt(i._init_supply) - BigInt(Number(i._init_supply)))
                    // failed because, for example:
                    // Number(i._init_supply) == 3.333333333333333e+26
                    // BigInt(Number(i._init_supply)) == 333333333333333314856026112n

                    values.push(javascriptTruth); 
                    values.push(BigInt(consistency.abs_error));
                    values.push(BigInt(consistency.rel_error));
                    values.push(BigInt(consistency.blockNo-i._initBlock));

                    totalBalance = await P.contract.totalBalance();
                    totals.push(BigInt(totalBalance));
                    totals.push(BigInt(consistency.blockNo-i._initBlock));

                    cnt += 1;
                } else {
                    console.log("\tRandom call %s failed.".red, fun.name);
                    // cnt += 1;
                }
                if (cnt % 50 == 0) {
                    consistency = await P.contract.checkForConsistency();
                    console.log(P.contract_name);
                    await checkConsistency();
                    console.log("\tConuntdown: %s, Blocks: %s", P.nCalls - cnt, Number(consistency.blockNo-i._initBlock));
                }
            }

            values.push(transferCnt);
            values.push(mintCnt);
            values.push(burnCnt);
            values.push(cntMintBlocks);
            consistency = await P.contract.checkForConsistency();
            values.push(Number(consistency.blockNo-i._initBlock));  // total blocks minted

            json = JSON.stringify(values);
            await writeStringToFile(".\\test\\z_" + P.contract_name + ".txt", json);

            json = JSON.stringify(totals);
            await writeStringToFile(".\\test\\z_" + P.contract_name + "_total" + ".txt", json);
        });
    });

}