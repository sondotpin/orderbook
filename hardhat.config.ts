require("dotenv").config({ path: './.env.dev' });
import { HardhatUserConfig } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-typechain';
import 'hardhat-deploy';
import '@nomiclabs/hardhat-etherscan';

// You have to export an object to set up your config
// This object can have the following optional entries:
// defaultNetwork, networks, solc, and paths.
// Go to https://buidler.dev/config/ to learn more
const config: HardhatUserConfig = {
  networks: {
    hardhat: {},
  },
  solidity: {
    compilers: [
      {
        version: '0.6.8',
        settings: {
          optimizer: {
            enabled: true,
          },
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./tests",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 20000
  },
};

export default config;
