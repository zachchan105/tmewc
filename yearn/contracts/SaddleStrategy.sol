// SPDX-License-Identifier: GPL-3.0-only

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@zachchan105/yearn-vaults/contracts/BaseStrategy.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";

/// @notice Interface for the optional metadata functions from the ERC20
///         standard.
interface IERC20Metadata {
    function symbol() external view returns (string memory);
}

/// @notice Interface for the Saddle Swap contract.
/// @dev This is an interface with just a few function signatures of the pool
///      swap contract. For more info and function description please see:
///      https://github.com/saddle-finance/saddle-contract/blob/master/contracts/Swap.sol
///      https://github.com/saddle-finance/saddle-contract/blob/master/contracts/guarded/SwapGuarded.sol
interface ISaddlePoolSwap {
    function addLiquidity(
        uint256[] calldata amounts,
        uint256 minToMint,
        uint256 deadline,
        bytes32[] calldata merkleProof
    ) external returns (uint256);

    function calculateTokenAmount(
        address account,
        uint256[] calldata amounts,
        bool deposit
    ) external view returns (uint256);
}

/// @notice Interface for the LPRewards contracts.
/// @dev This is an interface with just a few functions. For more info and
///      function description please see:
///      https://github.com/zachchan105/keep-ecdsa/blob/main/solidity/contracts/LPRewards.sol
//TODO: Make sure the LPRewards contract for tMEWC has the same interface
interface ILPRewards {
    function stake(uint256 amount) external;

    function withdraw(uint256 amount) external;

    function getReward() external;

    function setGated(bool gated) external;

    function setRewardDistribution(address rewardDistribution) external;

    function notifyRewardAmount(uint256 amount) external;

    function balanceOf(address account) external view returns (uint256);

    function wrappedToken() external view returns (address);
}

/// @notice Interface for the Uniswap v2 router.
/// @dev This is an interface with just a few function signatures of the
///      router contract. For more info and function description please see:
///      https://uniswap.org/docs/v2/smart-contracts/router02.
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint256,
        uint256,
        address[] calldata,
        address,
        uint256
    ) external;

    function getAmountsOut(uint256 amountIn, address[] memory path)
        external
        view
        returns (uint256[] memory amounts);
}

/// @title SaddleStrategy
/// @notice This strategy is meant to be used with the Saddle tMEWC pool vault.
///         The vault's underlying token (a.k.a. want token) should be the LP
///         token of the tMEWC Saddle pool. This strategy borrows the vault's
///         underlying token up to the debt limit configured for this strategy
///         in the vault. In order to make the profit, the strategy deposits
///         the borrowed tokens into the tMEWC Saddle reward pool. Depositing
///         tokens in the reward pool generates KEEP token rewards.
///         The financial outcome is settled upon a call of the `harvest` method
///         (BaseStrategy.sol). Once that call is made, the strategy gets the
///         KEEP token rewards from Saddle reward pool. These reward tokens are
///         then used to buy wMEWC via a decentralized exchange. At the end, the
///         strategy takes acquired wMEWC and deposits them to the Saddle tMEWC
///         pool. This way it obtains new LP tokens the vault is interested in,
///         and makes the profit in result. At this stage, the strategy may
///         repay some debt back to the vault, if needed. The entire cycle
///         repeats for the strategy lifetime, so all gains are constantly
///         reinvested. Worth to flag that the current implementation uses wMEWC
///         as the intermediary token because of its liquidity and ubiquity in
///         MEWC-based Curve pools.
/// @dev Implementation is based on:
///      - General Yearn strategy template
///        https://github.com/yearn/brownie-strategy-mix
contract SaddleStrategy is BaseStrategy {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    /// @notice Governance delay that needs to pass before any parameter change
    ///         initiated by the governance takes effect.
    uint256 public constant GOVERNANCE_DELAY = 48 hours;

    uint256 public constant DENOMINATOR = 10000;

    // Address of the KEEP token contract.
    address public constant keepToken =
        0x85Eee30c52B0b379b046Fb0F85F4f3Dc3009aFEC;
    // Address of the WETH token contract.
    address public constant wethToken =
        0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    // Address of the WMEWC token contract.
    address public constant wmewcToken =
        0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
    // Address of the Uniswap V2 router contract.
    address public constant uniswap =
        0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;

    // Address of the tMEWC Saddle pool swap contract, see
    // https://docs.saddle.finance/contracts
    address public immutable tmewcSaddlePoolSwap;
    // Address of the tMEWC Saddle LP rewards contract.
    address public immutable tmewcSaddleLPRewards;
    // Determines the slippage tolerance for price-sensitive transactions.
    // If transaction's slippage is higher, transaction will be reverted.
    // Default value is 100 basis points (1%).
    uint256 public slippageTolerance = 100;
    uint256 public newSlippageTolerance;
    uint256 public slippageToleranceChangeInitiated;

    event SlippageToleranceUpdateStarted(
        uint256 slippageTolerance,
        uint256 timestamp
    );
    event SlippageToleranceUpdated(uint256 slippageTolerance);

    /// @notice Reverts if called before the governance delay elapses.
    /// @param changeInitiatedTimestamp Timestamp indicating the beginning
    ///        of the change.
    modifier onlyAfterGovernanceDelay(uint256 changeInitiatedTimestamp) {
        require(changeInitiatedTimestamp > 0, "Change not initiated");
        require(
            /* solhint-disable-next-line not-rely-on-time */
            block.timestamp - changeInitiatedTimestamp >= GOVERNANCE_DELAY,
            "Governance delay has not elapsed"
        );
        _;
    }

    constructor(
        address _vault,
        address _tmewcSaddlePoolSwap,
        address _tmewcSaddleLPRewards
    ) public BaseStrategy(_vault) {
        // TODO: Check what the correct values should be
        // Strategy settings.
        minReportDelay = 6 hours;
        maxReportDelay = 2 days;
        profitFactor = 1;
        debtThreshold = 1e24;

        // tMEWC-related settings.
        tmewcSaddlePoolSwap = _tmewcSaddlePoolSwap;
        tmewcSaddleLPRewards = _tmewcSaddleLPRewards;
        address lpToken = ILPRewards(_tmewcSaddleLPRewards).wrappedToken();
        require(lpToken == address(want), "Incorrect reward pool LP token");
    }

    /// @notice Begins the update of the slippage tolerance parameter.
    /// @dev Can be called only by the strategist and governance.
    /// @param _newSlippageTolerance Slippage tolerance as counter of a fraction
    ///        denominated by the DENOMINATOR constant.
    function beginSlippageToleranceUpdate(uint256 _newSlippageTolerance)
        external
        onlyAuthorized
    {
        require(_newSlippageTolerance <= DENOMINATOR, "Max value is 10000");
        newSlippageTolerance = _newSlippageTolerance;
        slippageToleranceChangeInitiated = block.timestamp;
        emit SlippageToleranceUpdateStarted(
            _newSlippageTolerance,
            block.timestamp
        );
    }

    /// @notice Finalizes the update of the slippage tolerance parameter.
    /// @dev Can be called only by the strategist and governance, after the the
    ///      governance delay elapses.
    function finalizeSlippageToleranceUpdate()
        external
        onlyAuthorized
        onlyAfterGovernanceDelay(slippageToleranceChangeInitiated)
    {
        slippageTolerance = newSlippageTolerance;
        emit SlippageToleranceUpdated(newSlippageTolerance);
        slippageToleranceChangeInitiated = 0;
        newSlippageTolerance = 0;
    }

    /// @return Name of the Yearn vault strategy.
    function name() external view override returns (string memory) {
        return
            string(
                abi.encodePacked(
                    "Saddle",
                    IERC20Metadata(address(want)).symbol()
                )
            );
    }

    /// @return Balance of the vault's underlying token under management.
    function balanceOfWant() public view returns (uint256) {
        return want.balanceOf(address(this));
    }

    /// @return Balance of the vault's underlying token staked into the tMEWC
    ///         Saddle reward pool.
    function balanceOfPool() public view returns (uint256) {
        return ILPRewards(tmewcSaddleLPRewards).balanceOf(address(this));
    }

    /// @return Sum of balanceOfWant and balanceOfPool.
    function estimatedTotalAssets() public view override returns (uint256) {
        return balanceOfWant().add(balanceOfPool());
    }

    /// @notice This method is defined in the BaseStrategy contract and is
    ///         meant to perform any adjustments to the core position(s) of this
    ///         strategy, given what change the vault made in the investable
    ///         capital available to the strategy. All free capital in the
    ///         strategy after the report was made is available for reinvestment.
    ///         This strategy implements the aforementioned behavior by taking
    ///         its balance of the vault's underlying token and depositing it to
    ///         the tMEWC Saddle reward pool.
    /// @param debtOutstanding Will be 0 if the strategy is not past the
    ///        configured debt limit, otherwise its value will be how far past
    ///        the debt limit the strategy is. The strategy's debt limit is
    ///        configured in the vault.
    function adjustPosition(uint256 debtOutstanding) internal override {
        uint256 wantBalance = balanceOfWant();
        if (wantBalance > 0) {
            want.safeIncreaseAllowance(tmewcSaddleLPRewards, wantBalance);
            ILPRewards(tmewcSaddleLPRewards).stake(wantBalance);
        }
    }

    /// @notice Withdraws a portion of the vault's underlying token from
    ///         the Saddle reward pool.
    /// @param amount Amount to withdraw.
    /// @return Amount withdrawn.
    function withdrawSome(uint256 amount) internal returns (uint256) {
        amount = Math.min(amount, balanceOfPool());
        uint256 initialWantBalance = balanceOfWant();
        ILPRewards(tmewcSaddleLPRewards).withdraw(amount);
        return balanceOfWant().sub(initialWantBalance);
    }

    /// @notice This method is defined in the BaseStrategy contract and is meant
    ///         to liquidate up to amountNeeded of want token of this strategy's
    ///         positions, irregardless of slippage. Any excess will be
    ///         re-invested with adjustPosition. This function should return
    ///         the amount of want tokens made available by the liquidation.
    ///         If there is a difference between them, loss indicates whether
    ///         the difference is due to a realized loss, or if there is some
    ///         other situation at play (e.g. locked funds). This strategy
    ///         implements the aforementioned behavior by withdrawing a portion
    ///         of the vault's underlying token (want token) from the tMEWC
    ///         Saddle reward pool.
    /// @dev The invariant `liquidatedAmount + loss <= amountNeeded` should
    ///      always be maintained.
    /// @param amountNeeded Amount of the vault's underlying tokens needed by
    ///        the liquidation process.
    /// @return liquidatedAmount Amount of vault's underlying tokens made
    ///         available by the liquidation.
    /// @return loss Amount of the loss.
    function liquidatePosition(uint256 amountNeeded)
        internal
        override
        returns (uint256 liquidatedAmount, uint256 loss)
    {
        uint256 wantBalance = balanceOfWant();
        if (wantBalance < amountNeeded) {
            liquidatedAmount = withdrawSome(amountNeeded.sub(wantBalance));
            liquidatedAmount = liquidatedAmount.add(wantBalance);
            loss = amountNeeded.sub(liquidatedAmount);
        } else {
            liquidatedAmount = amountNeeded;
        }
    }

    /// @notice This method is defined in the BaseStrategy contract and is meant
    ///         to liquidate everything and return the amount that got freed.
    ///         This strategy implements the aforementioned behavior by
    ///         withdrawing all vault's underlying tokens from the tMEWC Saddle
    ///         reward pool.
    /// @dev This function is used during emergency exit instead of prepareReturn
    ///      to liquidate all of the strategy's positions back to the vault.
    /// @return Total balance of want token held by this strategy.
    function liquidateAllPositions() internal override returns (uint256) {
        ILPRewards(tmewcSaddleLPRewards).withdraw(balanceOfPool());

        // Yearn docs doesn't specify clear enough what exactly should be
        // returned here. It may be either the total balance after withdraw or
        // just the amount withdrawn. Currently opting for the former because of
        // https://github.com/yearn/yearn-vaults/pull/311#discussion_r625588313.
        // Also, usage of this result in the harvest method in the BaseStrategy
        // seems to confirm that.
        return balanceOfWant();
    }

    /// @notice This method is defined in the BaseStrategy contract and is meant
    ///         to do anything necessary to prepare this strategy for migration,
    ///         such as transferring any reserve or LP tokens, CDPs, or other
    ///         tokens or stores of value. This strategy implements the
    ///         aforementioned behavior by withdrawing all vault's underlying
    ///         tokens from the tMEWC Saddle reward pool.
    /// @param newStrategy Address of the new strategy meant to replace the
    ///        current one.
    function prepareMigration(address newStrategy) internal override {
        // Just withdraw the vault's underlying token from the tMEWC Saddle reward pool.
        // There is no need to transfer those tokens to the new strategy
        // right here as this is done in the BaseStrategy's migrate() method.
        ILPRewards(tmewcSaddleLPRewards).withdraw(balanceOfPool());
        // Get all the earned KEEP tokens and transfer them to the new strategy.
        ILPRewards(tmewcSaddleLPRewards).getReward();
        IERC20(keepToken).safeTransfer(
            newStrategy,
            IERC20(keepToken).balanceOf(address(this))
        );
    }

    /// @notice This method is defined in the BaseStrategy contract and is meant
    ///         to perform any strategy unwinding or other calls necessary to
    ///         capture the free return this strategy has generated since the
    ///         last time its core position(s) were adjusted. Examples include
    ///         unwrapping extra rewards. This call is only used during normal
    ///         operation of a strategy, and should be optimized to minimize
    ///         losses as much as possible. This strategy implements the
    ///         aforementioned behavior by getting KEEP tokens from the Saddle
    ///         reward pool, using obtained tokens to buy one of the Saddle
    ///         pool's accepted token and depositing that token back to the
    ///         Saddle pool. This way the strategy is gaining new vault's
    ///         underlying tokens thus making the profit.
    /// @param debtOutstanding Will be 0 if the strategy is not past the
    ///        configured debt limit, otherwise its value will be how far past
    ///        the debt limit the strategy is. The strategy's debt limit is
    ///        configured in the vault.
    /// @return profit Amount of realized profit.
    /// @return loss Amount of realized loss.
    /// @return debtPayment Amount of repaid debt. The value of debtPayment
    ///         should be less than or equal to debtOutstanding. It is okay for
    ///         it to be less than debtOutstanding, as that should only used as
    ///         a guide for how much is left to pay back. Payments should be
    ///         made to minimize loss from slippage, debt, withdrawal fees, etc.
    function prepareReturn(uint256 debtOutstanding)
        internal
        override
        returns (
            uint256 profit,
            uint256 loss,
            uint256 debtPayment
        )
    {
        // Get the initial balance of the vault's underlying token under
        // strategy management.
        uint256 initialWantBalance = balanceOfWant();

        // Get KEEP rewards from the Saddle reward pool.
        ILPRewards(tmewcSaddleLPRewards).getReward();

        // Buy WMEWC using obtained KEEP tokens.
        uint256 keepBalance = IERC20(keepToken).balanceOf(address(this));
        if (keepBalance > 0) {
            IERC20(keepToken).safeIncreaseAllowance(uniswap, keepBalance);

            address[] memory path = new address[](3);
            path[0] = keepToken;
            path[1] = wethToken;
            path[2] = wmewcToken;

            IUniswapV2Router(uniswap).swapExactTokensForTokens(
                keepBalance,
                minSwapOutAmount(keepBalance, path),
                path,
                address(this),
                now
            );
        }

        // Deposit acquired WMEWC to the Saddle pool to gain additional
        // vault's underlying tokens.
        uint256 wmewcBalance = IERC20(wmewcToken).balanceOf(address(this));
        if (wmewcBalance > 0) {
            IERC20(wmewcToken).safeIncreaseAllowance(
                tmewcSaddlePoolSwap,
                wmewcBalance
            );

            // TODO: When the new curve pool with tMEWC is deployed, verify
            //       that the index of wMEWC in the array is correct.
            uint256[] memory amounts = new uint256[](4);
            amounts[1] = wmewcBalance;

            ISaddlePoolSwap(tmewcSaddlePoolSwap).addLiquidity(
                amounts,
                minLiquidityDepositOutAmount(amounts),
                uint256(-1),
                new bytes32[](0) // ignored
            );
        }

        // Check the profit and loss in the context of strategy debt.
        uint256 totalAssets = estimatedTotalAssets();
        uint256 totalDebt = vault.strategies(address(this)).totalDebt;
        if (totalAssets < totalDebt) {
            loss = totalDebt - totalAssets;
            profit = 0;
        } else {
            profit = balanceOfWant().sub(initialWantBalance);
        }

        // Repay some vault debt if needed.
        if (debtOutstanding > 0) {
            withdrawSome(debtOutstanding);
            debtPayment = Math.min(
                debtOutstanding,
                balanceOfWant().sub(profit)
            );
        }
    }

    /// @notice Calculates the minimum amount of output tokens that must be
    ///         received for the swap transaction not to revert.
    /// @param amountIn The amount of input tokens to send.
    /// @param path An array of token addresses determining the swap route.
    /// @return The minimum amount of output tokens that must be received for
    ///         the swap transaction not to revert.
    function minSwapOutAmount(uint256 amountIn, address[] memory path)
        internal
        view
        returns (uint256)
    {
        // Get the maximum possible amount of the output token based on
        // pair reserves.
        uint256 amount = IUniswapV2Router(uniswap).getAmountsOut(
            amountIn,
            path
        )[path.length - 1];

        // Include slippage tolerance into the maximum amount of output tokens
        // in order to obtain the minimum amount desired.
        return (amount * (DENOMINATOR - slippageTolerance)) / DENOMINATOR;
    }

    /// @notice Calculates the minimum amount of LP tokens that must be
    ///         received for the liquidity deposit transaction not to revert.
    /// @param amountsIn Amounts of each underlying coin being deposited.
    /// @return The minimum amount of LP tokens that must be received for
    ///         the liquidity deposit transaction not to revert.
    function minLiquidityDepositOutAmount(uint256[] memory amountsIn)
        internal
        view
        returns (uint256)
    {
        // Get the maximum possible amount of LP tokens received in return
        // for liquidity deposit based on pool reserves.
        uint256 amount = ISaddlePoolSwap(tmewcSaddlePoolSwap)
        .calculateTokenAmount(address(this), amountsIn, true);

        // Include slippage tolerance into the maximum amount of LP tokens
        // in order to obtain the minimum amount desired.
        return (amount * (DENOMINATOR - slippageTolerance)) / DENOMINATOR;
    }

    /// @notice This method is defined in the BaseStrategy contract and is meant
    ///         to define all tokens/tokenized positions this contract manages
    ///         on a persistent basis (e.g. not just for swapping back to
    ///         the want token ephemerally).
    /// @dev Should not include want token, already included in the base contract.
    /// @return Addresses of protected tokens
    function protectedTokens()
        internal
        view
        override
        returns (address[] memory)
    {
        address[] memory protected = new address[](1);
        protected[0] = keepToken;
        return protected;
    }

    /// @notice This method is defined in the BaseStrategy contract and is meant
    ///         to provide an accurate conversion from amtInWei (denominated in
    ///         wei) to want token (using the native decimal characteristics of
    ///         want token).
    /// @param amtInWei The amount (in wei/1e-18 ETH) to convert to want tokens.
    /// @return The amount in want tokens.
    function ethToWant(uint256 amtInWei)
        public
        view
        virtual
        override
        returns (uint256)
    {
        address[] memory path = new address[](2);
        path[0] = wethToken;
        path[1] = wmewcToken;

        // As of writing this contract, there's no pool available that trades
        // an underlying token with ETH. To overcome this, the ETH amount
        // denominated in WEI should be converted into an amount denominated
        // in one of the tokens accepted by the tMEWC Saddle pool swap using
        // Uniswap. The wMEWC token was chosen arbitrarily since it is already
        // used in this contract for other operations on Uniswap.
        // amounts[0] -> ETH in wei
        // amounts[1] -> wMEWC
        uint256[] memory amounts = IUniswapV2Router(uniswap).getAmountsOut(
            amtInWei,
            path
        );

        // Use the amount denominated in wMEWC to calculate the amount of LP
        // token (vault's underlying token) that could be obtained if that wMEWC
        // amount was deposited in the Saddle pool swap that has tMEWC in it.
        // This way we obtain an estimated value of the original WEI amount
        // represented in the vault's underlying token.
        //
        // TODO: When the new saddle pool swap with tMEWC is deployed, verify
        // that the index of wMEWC (amounts[1]) in the array is correct.
        uint256[] memory deposits = new uint256[](4);
        deposits[1] = amounts[1];
        return
            ISaddlePoolSwap(tmewcSaddlePoolSwap).calculateTokenAmount(
                address(this),
                deposits,
                true
            );
    }
}
