// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface Vm {
    function envAddress(string calldata name) external returns (address);
    function prank(address sender) external;
}
interface IERC20Fork {
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}
interface IPoolFork {
    function getReserveNormalizedIncome(address asset) external view returns (uint256);
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

/// Local test harness only. No deployable application contracts or private keys.
/// Configuration is resolved by the TS verifier and passed via the test runner.
contract PolygonForkTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    IERC20Fork private token;
    IERC20Fork private aToken;
    IPoolFork private pool;
    uint256 private constant AMOUNT = 10_000_000; // 10 USDT, 6 verified decimals

    function setUp() public {
        require(block.chainid == 137, "Polygon fork required");
        token = IERC20Fork(vm.envAddress("FORK_USDT"));
        aToken = IERC20Fork(vm.envAddress("FORK_ATOKEN"));
        pool = IPoolFork(vm.envAddress("FORK_POOL"));
        // Borrow cash from the reserve ONLY by impersonation on the isolated fork.
        // No production signer can do this. Supply puts the cash back into the reserve.
        vm.prank(address(aToken));
        require(token.transfer(address(this), AMOUNT), "fork fixture funding failed");
    }

    function testApproveSupplyPartialAndFullWithdraw() public {
        uint256 ray = 1e27;
        uint256 index = pool.getReserveNormalizedIncome(address(token));
        // Current V3 token math floors mint/balance and ceils partial-withdraw scaled burn.
        uint256 expectedScaledMint = AMOUNT * ray / index;
        uint256 expectedScaledBurn = ((AMOUNT / 2) * ray + index - 1) / index;
        uint256 expectedRemaining = (expectedScaledMint - expectedScaledBurn) * index / ray;
        uint256 initialCash = token.balanceOf(address(this));
        require(initialCash == AMOUNT, "fixture cash");
        require(token.approve(address(pool), AMOUNT), "approve false");
        require(token.allowance(address(this), address(pool)) == AMOUNT, "exact approval");
        require(aToken.balanceOf(address(this)) == 0, "approval is not supply");
        pool.supply(address(token), AMOUNT, address(this), 0);
        require(token.balanceOf(address(this)) == 0, "supply did not debit underlying");
        uint256 supplied = aToken.balanceOf(address(this));
        require(supplied == expectedScaledMint * index / ray, "supply aToken rounding");
        require(token.allowance(address(this), address(pool)) == 0, "allowance not consumed");
        uint256 partialAmount = pool.withdraw(address(token), AMOUNT / 2, address(this));
        require(partialAmount == AMOUNT / 2, "partial withdrawn amount");
        require(token.balanceOf(address(this)) == AMOUNT / 2, "partial underlying balance");
        require(pool.getReserveNormalizedIncome(address(token)) == index, "single-test index changed");
        require(aToken.balanceOf(address(this)) == expectedRemaining, "partial scaled burn rounding");
        uint256 fullAmount = pool.withdraw(address(token), type(uint256).max, address(this));
        require(fullAmount == expectedRemaining, "full withdrawn amount");
        require(aToken.balanceOf(address(this)) == 0, "full withdraw left dust");
        uint256 finalCash = token.balanceOf(address(this));
        require(finalCash == AMOUNT / 2 + expectedRemaining, "round trip underlying");
    }
}
