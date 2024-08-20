// const { ethers } = require("ethers");
const { ethers } = require("hardhat");
const { assert, expect } = require("chai");
// const { utils } = require("ethers");
// const { utils, BigNumber } = require("ethers");
const { utils } = require("@nomicfoundation/hardhat-ethers");
require("colors");

let P;
exports.initUtilities = async function (params) {
    P = params;
}

function weiToEthEn(wei) {
    return Number(ethers.formatUnits( BigInt(wei).toString(), P.decimals)).toLocaleString("en");
}

function weiToEth(wei) {
    return Number(ethers.formatUnits( BigInt(wei).toString(), P.decimals));
}

function ethToWei(eth) {
    return ethers.parseUnits(eth.toString(), P.decimals);
}

function expectEqual(a, b) {
    expect(a).to.be.eq(b);
}

function expectNotEqual(a, b) {
    expect(a).to.be.not.eq(b);
}


function expectGreater(a, b) {
    expect(a).to.be.gt(b);
}

function expectLess(a, b) {
    expect(a).to.be.lt(b);
}

exports.deployResearchToken = async function (contract_name, deployer, analyticMath) {
    const Token = await ethers.getContractFactory(contract_name, {
        signer: deployer,
    });
    const token = await Token.connect(deployer).deploy(analyticMath);
    await token.waitForDeployment();
    return token;
}

exports.deployAnalyticMath = async function (deployer) {
    const Lib = await ethers.getContractFactory("AnalyticMath", {
        signer: deployer,
    });
    const lib = await Lib.connect(deployer).deploy();
    await lib.waitForDeployment();
    await lib.init(); // special for AnalyticMath library.
    return lib;
}

module.exports.deployLibrary = async function (libaray_name, deployer) {
    const Lib = await ethers.getContractFactory(libaray_name, {
        signer: deployer,
    });
    const lib = await Lib.connect(deployer).deploy();
    await lib.waitForDeployment();
    return lib;  
}

//--------------------------------------------------------



exports.showMilestone = async function (text) {
  console.log("\n\t%s".blue, text);
}

exports.checkConsistency = async function () {
  report = await P.contract.checkForConsistency();
  // console.log("\n\tConsistency report:".bold.yellow);
  // console.log("\tp_collective %s, p_marginal %s",
  // report.collective, report.marginal)
  let text
  if (report.marginal > report.collective) {
      text = "\tMarginal greater"
  } else if (report.marginal == report.collective)
  {
      text = "\tMarginal == Collective"
  } else {
      text = "\tCollective greager"
  }
//   console.log(text)
  console.log("\tabs_error %s, rel_error === %s",
  Number(report.abs_error), Number(report.rel_error))
//   console.log("\tcollective %s, marginal === %s",
//   Number(report.collective), Number(report.marginal))
}

exports.mintBlocks = async function (blocks) {
  console.log("\tchain is minting %s blocks...".yellow, blocks);

  let bn0 = (await ethers.provider.getBlock("latest")).number;
  for (let n = 0; n < blocks; n++) {
    await network.provider.send("evm_mine");
  }
  let bn1 = (await ethers.provider.getBlock("latest")).number;
  console.log("\t%s/%s blocks minted".green, bn1 - bn0, blocks);
  return blocks;
}

exports.transfer = async function (sender, recipient, amount) {
  let amountWei = ethToWei(amount);
  let balance = await P.contract.balance(sender.address);
  if (amountWei > Number(balance) * P.minOneBlockSurvival) {
      amount = Math.floor((weiToEth(balance) * P.minOneBlockSurvival)*100)/100;
  }
  if (amount >= 1) {
        amountWei = ethToWei(amount);
        console.log("\t%s is transferring %s %s to %s...".yellow, 
        sender.name == undefined ? "undefined" : sender.name,
        amount,  "tokens",
        recipient.hasOwnProperty("name") ? (recipient.name == undefined ? "undefined" : recipient.name) : "NoName");
        
        // balance = await P.contract.balance(sender.address);
        // let balanceR = await P.contract.balance(recipient.address);
        const response = await P.contract.connect(sender).transfer(recipient.address, amountWei);
        const receipt = await response.wait();        
        // let _balance = await P.contract.balance(sender.address);
        // let _balanceR = await P.contract.balance(recipient.address);
        // console.log(balance - _balance, amountWei);
        // console.log(_balanceR - balanceR, amountWei);
        console.log("\tTransfer done".green);
        return true;
  } else {
        // console.log("\tToo little amount to transfer!");
        return false;
  }
}

exports.mintAmountToKeepInitialSupply = async function(init) {
    let totalBalance = await P.contract.totalBalance();
    // console.log("\t-----totalSupply: %s", Number(weiToEth(totalBalance)));
    // init_supply should ba an argument, in later versions.  
    let amountWei = init._init_supply - totalBalance;    // no matter negative
    // console.log("\t-----mintAmountToKeepIS: %s", P.init_supply, Math.floor(weiToEth(amountWei)));
    return  Math.floor(weiToEth(amountWei));
}

exports.mint = async function (minter, to, amount) {
    let amountWei = ethToWei(amount);
    let totalBalance = await P.contract.totalBalance();
    if ( amountWei > P.max_supply - Number(totalBalance) * P.maxOneBlockSurvival ) {
        amount = Math.floor(weiToEth(P.max_supply - Number(totalBalance) * P.maxOneBlockSurvival)*100)/100;
    }

    if (amount >= 1) {
        amountWei = ethToWei(amount);
        await console.log("\t%s is minting %s %s to %s ...".yellow, 
        minter.name == undefined ? "undefined" : minter.name,
        amount, "Tokens",
        to.hasOwnProperty("name") ? (to.name == undefined ? "undefined" : to.name) : "NoName" );
        const response = await P.contract.connect(minter).mint(to.address, amountWei );
        const receipt = await response.wait();
        await console.log("\tMint done".green);
        return [true, BigInt(amountWei)];
    } else {
        return [false, BigInt(0)];
    }
}

exports.burnAmountToKeepInitialSupply = async function(init) {
    // init_supply should ba an argument, in later versions.
    let totalBalance = await P.contract.totalBalance();
    let amountWei = totalBalance - init._init_supply;    // BigInt, no precision loss yet.
    return  Math.floor(weiToEth(amountWei));
}

exports.burn = async function (burner, from, amount) {

  let amountWei = ethToWei(amount);
  let balance = await P.contract.balance(from.address);
  if (amountWei > Number(balance) * P.minOneBlockSurvival) {
      amount = Math.floor((weiToEth(balance) * P.minOneBlockSurvival)*100)/100;
  }
  if (amount >= 1) {
      amountWei = ethToWei(amount);
      await console.log("\t%s is burning %s %s from %s ...".yellow, 
      burner.name == undefined ? "undefined" : burner.name,
      amount, "Tokens",
      from.hasOwnProperty("name") ? (from.name == undefined ? "undefined" : from.name) : "NoName" );
      const response = await P.contract.connect(burner).burn(from.address, amountWei );
      const receipt = await response.wait();
      console.log("\tBurn done".green);
      return [true, BigInt(amountWei)];
  } else {
      console.log("\tToo little amount to burn!");
      return [false, BigInt(0)];
  }
}

