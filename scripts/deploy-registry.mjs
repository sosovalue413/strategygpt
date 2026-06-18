import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const rpcUrl = process.env.RPC_URL;
const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

if (!rpcUrl || !privateKey) {
  console.error("RPC_URL and DEPLOYER_PRIVATE_KEY are required.");
  process.exit(1);
}

const sourcePath = path.join(process.cwd(), "contracts", "StrategyRegistry.sol");
const source = fs.readFileSync(sourcePath, "utf8");

const input = {
  language: "Solidity",
  sources: {
    "StrategyRegistry.sol": {
      content: source
    }
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object"]
      }
    }
  }
};

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const compile = spawnSync(npx, ["--yes", "solc@0.8.35", "--standard-json"], {
  input: JSON.stringify(input),
  encoding: "utf8",
  maxBuffer: 10 * 1024 * 1024
});

if (compile.status !== 0) {
  console.error(compile.stderr || compile.stdout || "Solidity compilation failed.");
  process.exit(1);
}

const output = JSON.parse(compile.stdout);
const errors = output.errors?.filter((entry) => entry.severity === "error") ?? [];
if (errors.length > 0) {
  console.error(errors.map((entry) => entry.formattedMessage).join("\n"));
  process.exit(1);
}

const contract = output.contracts["StrategyRegistry.sol"].StrategyRegistry;
const abi = contract.abi;
const bytecode = `0x${contract.evm.bytecode.object}`;
const account = privateKeyToAccount(privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`);
const transport = http(rpcUrl);
const wallet = createWalletClient({ account, transport });
const publicClient = createPublicClient({ transport });
const chainId = await publicClient.getChainId();

console.log(`Deploying StrategyRegistry from ${account.address} on chain ${chainId}...`);
const hash = await wallet.deployContract({ abi, bytecode });
console.log(`Deployment tx: ${hash}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log(`StrategyRegistry address: ${receipt.contractAddress}`);
const artifactDir = path.join(process.cwd(), "deployments");
await fs.promises.mkdir(artifactDir, { recursive: true });
const artifactPath = path.join(artifactDir, `strategy-registry-${chainId}.json`);
await fs.promises.writeFile(
  artifactPath,
  JSON.stringify(
    {
      contract: "StrategyRegistry",
      version: "1.0.0",
      chainId,
      address: receipt.contractAddress,
      deployer: account.address,
      transactionHash: hash,
      deployedAt: new Date().toISOString(),
      abi
    },
    null,
    2
  )
);
console.log(`Deployment artifact: ${artifactPath}`);
console.log("Set NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS to this address and restart the app.");
