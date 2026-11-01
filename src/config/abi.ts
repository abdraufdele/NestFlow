import { parseAbi } from 'viem';
// Minimal interfaces: https://github.com/aave-dao/aave-v3-origin/tree/main/src/contracts/interfaces
export const providerAbi = parseAbi(['function getPool() view returns (address)', 'function getPoolDataProvider() view returns (address)']);
export const tokenAbi = parseAbi([
  'function decimals() view returns (uint8)', 'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)', 'function totalSupply() view returns (uint256)',
  'function allowance(address,address) view returns (uint256)', 'function approve(address,uint256) returns (bool)',
  'function UNDERLYING_ASSET_ADDRESS() view returns (address)', 'function POOL() view returns (address)',
]);
export const poolAbi = parseAbi([
  'function ADDRESSES_PROVIDER() view returns (address)', 'function getReservesList() view returns (address[])',
  'function getReserveNormalizedIncome(address) view returns (uint256)',
  'function getUserAccountData(address) view returns (uint256 totalCollateralBase,uint256 totalDebtBase,uint256 availableBorrowsBase,uint256 currentLiquidationThreshold,uint256 ltv,uint256 healthFactor)',
  'function supply(address,uint256,address,uint16)', 'function withdraw(address,uint256,address) returns (uint256)',
]);
export const dataAbi = parseAbi([
  'function ADDRESSES_PROVIDER() view returns (address)',
  'function getReserveTokensAddresses(address) view returns (address aTokenAddress,address stableDebtTokenAddress,address variableDebtTokenAddress)',
  'function getReserveConfigurationData(address) view returns (uint256 decimals,uint256 ltv,uint256 liquidationThreshold,uint256 liquidationBonus,uint256 reserveFactor,bool usageAsCollateralEnabled,bool borrowingEnabled,bool stableBorrowRateEnabled,bool isActive,bool isFrozen)',
  'function getReserveCaps(address) view returns (uint256 borrowCap,uint256 supplyCap)', 'function getPaused(address) view returns (bool)',
  'function getReserveData(address) view returns (uint256 unbacked,uint256 accruedToTreasuryScaled,uint256 totalAToken,uint256 totalStableDebt,uint256 totalVariableDebt,uint256 liquidityRate,uint256 variableBorrowRate,uint256 stableBorrowRate,uint256 averageStableBorrowRate,uint256 liquidityIndex,uint256 variableBorrowIndex,uint40 lastUpdateTimestamp)',
  'function getUserReserveData(address,address) view returns (uint256 currentATokenBalance,uint256 currentStableDebt,uint256 currentVariableDebt,uint256 principalStableDebt,uint256 scaledVariableDebt,uint256 stableBorrowRate,uint256 liquidityRate,uint40 stableRateLastUpdated,bool usageAsCollateralEnabled)',
]);
