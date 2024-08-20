// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "../libraries/SafeMath.sol";
import "../libraries/AnalyticMath.sol";
import "../libraries/IntegralMath.sol";

import "hardhat/console.sol";

//=====================================================================================
// Simple Exponential Reward.
// rewards[user] += principals[user] * ( ( 1 + rewardRate ) ** blocks_passed - 1 )
//=====================================================================================

contract CompoundInterestActivityRandom {
    // using SafeMath for uint;

    //==================== Constants ====================
    string private constant sForbidden = "Forbidden";
    string private constant sZeroAddress = "Zero address";
    string private constant sExceedsBalance = "Exceeds balance";

    uint8 public constant DECIMALS = 18;
    // = power(10, DECIMALS+8), <> 1**(DECIMALS+8) == 1*power(10, DECIMALS+8) as in excel.
    uint public constant INITIAL_SUPPLY = 10 ** (DECIMALS+9) / 3;
    uint public constant MAX_SUPPLY = 100 * INITIAL_SUPPLY;

    //==================== ERC20 core data ====================
    mapping(address => uint) private principals;
    uint private totalPrincipal;

    function internals() external view returns (uint _initBlock, uint _rate, uint _scale, uint _cycle, uint _init_supply) {
        _initBlock = initBlock;
        _rate = rate;
        _scale = scale;
        _cycle = cycle;
        _init_supply = INITIAL_SUPPLY;
    }

    function _safeSubtract(uint a, uint b) internal pure returns (uint delta) {
        if (a > b) {
            delta = a - b;
        } else {
            delta = 0;
        }
    }

    //========================= distrubution algoritym ======================

    // Test Stage: 
    // Share: principals[user] is used as user's share to rewards.
    // Reward: We just handle with the reward quantity numericals here, not reward itself.

    struct User {
        uint    reward;
        uint    lastBlock;
    }

    uint initBlock;
    mapping(address => User) users;

    // test users
    address owner; address alice; address bob; address carol;

    function getTotalState() external view returns (
        uint totalBalance, uint _lastNet, uint _VIRTUAL, uint blocks, uint _totalPendingReward, uint _burnDone
    ) {
        totalBalance = totalPrincipal;
        _VIRTUAL = activity;
        blocks = block.number - initBlock;
        _totalPendingReward = totalPending();
        _burnDone = burnDone;
    }

    function getUserState(address user) external view returns (
        uint _share, uint _VIRTUAL, uint blocks, uint _userPendingReward, uint _latestBlock
    ) {
       _share = principals[user];
        _VIRTUAL = 0;
        blocks = block.number - initBlock;
        _userPendingReward = pending(user);
        _latestBlock = users[user].lastBlock;
    }

    uint constant scale = 10 ** 6;  // This is not 1e7 as in Excel
    uint constant rate = 474;
    uint constant cycle = 10;

    uint activity; uint burnDone; uint lastBlock;


    function changePrincipal(address user, uint amount, bool CreditNotDebit) internal {
        {
            uint blocks = block.number - initBlock - lastBlock;
            (uint p1, uint q1) = analyticMath.pow(scale + rate, scale, blocks, cycle);           
            blocks = block.number - initBlock - users[user].lastBlock;
            (uint p2, uint q2) = analyticMath.pow(scale + rate, scale, blocks, cycle);
            if (block.number % 2 == 0) {
                activity = IntegralMath.mulDivC(activity, p1, q1) - IntegralMath.mulDivF(principals[user], p2, q2);
            } else {
                activity = _safeSubtract(IntegralMath.mulDivF(activity, p1, q1), IntegralMath.mulDivC(principals[user], p2, q2));
            }
            lastBlock = block.number - initBlock;
        }

        uint pending = pending(user);
        if (pending > 0) {
            principals[user] += pending;
            totalPrincipal += pending;
            burnDone += pending;
        }
        users[user].lastBlock = block.number - initBlock;

        if(CreditNotDebit) {
            principals[user] += amount;
            totalPrincipal += amount;
        } else {
            principals[user] -= amount;
            totalPrincipal -= amount;
        }

        {
            uint newBalance = principals[user];
            activity += newBalance;
        }
    }

    function pending(address user) public view returns (uint pending) {
        uint blocks = block.number - initBlock - users[user].lastBlock;
        if (blocks > 0) {
            (uint p, uint q) = analyticMath.pow(scale + rate, scale, blocks, cycle);
            if (block.number % 2 == 0) {
                pending = _safeSubtract(IntegralMath.mulDivC(principals[user], p, q), principals[user]);
            } else {
                pending = _safeSubtract(IntegralMath.mulDivF(principals[user], p, q), principals[user]);
            }
        }
    }

    function totalPending() public view returns (uint pending) {
        uint blocks = block.number - initBlock - lastBlock;
        (uint p, uint q) = analyticMath.pow(scale + rate, scale, blocks, cycle);
        if (block.number % 2 == 0) {
            pending = _safeSubtract(IntegralMath.mulDivC(activity, p, q), totalPrincipal);
        } else {
            pending = _safeSubtract(IntegralMath.mulDivF(activity, p, q), totalPrincipal);
        }
    }    

    function checkForConsistency() public view 
    returns(uint collective, uint marginal, uint abs_error, uint rel_error, uint solidityTruth, uint blockNo) {

        // collective = totalPending();

        // marginal += pending(owner);
        // marginal += pending(alice);
        // marginal += pending(bob);
        // marginal += pending(carol);

        collective = totalBalance();

        marginal += balance(owner);
        marginal += balance(alice);
        marginal += balance(bob);
        marginal += balance(carol);

        uint max;
        if (collective < marginal) {
            abs_error = marginal - collective;
            max = marginal;

        } else {
            abs_error = collective - marginal;
            max = collective;
            if (collective > marginal) {
            } else {
            }
        }

        if (max > 0) {
            rel_error = 1e27 * abs_error/marginal;
        }

        uint blocks = block.number - initBlock;
        (uint p, uint q) = analyticMath.pow(scale + rate, scale, blocks, cycle);
        solidityTruth = IntegralMath.mulDivC(INITIAL_SUPPLY, p, q); // in Free mode. INITIAL_SUPPLY in Fixed mode.
        blockNo = block.number;      
    }

    //====================== Pulse internal functions ============================


    AnalyticMath analyticMath;

    constructor(address _analyticMath) {
        analyticMath = AnalyticMath(_analyticMath);

        //------------ distribution algorithm -----------
        initBlock = block.number;

        // These addresses are generated by hardhat, with ethereum charged.
        alice = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        bob = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
        carol = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;
        
        //-----------------------------------------------
        owner = msg.sender;
        _mint(owner, INITIAL_SUPPLY);
        console.log("Initail mint to Owner: ", INITIAL_SUPPLY);  // This line is REQUIRED :)
   }

//     //==================== ERC20 internal functions ====================

    function _totalNetBalance() internal view returns (uint) {
        return totalPrincipal + totalPending();
    }

    function _netBalance(address account) internal view returns (uint balance) {
        return principals[account] + pending(account);
    }

    function _beforeTokenTransfer(address from, address to, uint amount) internal virtual {}

    function _afterTokenTransfer(address from, address to, uint amount) internal virtual {}

    function _mint(address to, uint amount) internal virtual {
        require(to != address(0), sZeroAddress);
        _beforeTokenTransfer(address(0), to, amount);
        changePrincipal(to, amount, true);
        _afterTokenTransfer(address(0), to, amount);

        // emit Transfer(address(0), to, amount);
    }

    function _burn(address from, uint amount) internal virtual {
        require(from != address(0), sZeroAddress);
        uint accountBalance = _netBalance(from);
        require(accountBalance >= amount, sExceedsBalance);
        _beforeTokenTransfer(from, address(0), amount);
        changePrincipal(from, amount, false);    // false for debit
        _afterTokenTransfer(from, address(0), amount);
        
        // emit Transfer(from, address(0), amount);
    }

    function _transfer(
        address sender,
        address recipient,
        uint amount
    ) internal virtual {
        require(sender != address(0), sZeroAddress);
        require(recipient != address(0), sZeroAddress);
        uint senderBalance = _netBalance(sender);
        require(senderBalance >= amount, sExceedsBalance);
        _beforeTokenTransfer(sender, recipient, amount);
        changePrincipal(sender, amount, false);  // false: debit
        changePrincipal(recipient, amount, true);    // true: credit
        _afterTokenTransfer(sender, recipient, amount);

        // emit Transfer(sender, recipient, amount);
    }

    //==================== ERC20 public funcitons ====================

    function totalBalance() public view virtual returns (uint) {
        return _totalNetBalance();
    }

    function balance(address account) public view virtual returns (uint) {
        return _netBalance(account); // not less than its true value
    }

    function mint(address to, uint amount) public {
        // Commented out, as we cannot control _totalNetBalance() growing over MAX_SUPPLY.
        // require(_totalNetBalance() + amount <= MAX_SUPPLY, "Exceed Max Supply");
        _mint(to, amount);
    }

    function burn(address from, uint amount) public {
        _burn(from, amount);
    }

    function transfer(address recipient, uint amount) public virtual returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

}
