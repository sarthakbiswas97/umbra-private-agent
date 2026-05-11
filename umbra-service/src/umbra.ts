/**
 * Umbra SDK service wrapper.
 *
 * Handles Umbra client initialization, registration, confidential
 * transfers, encrypted balance queries, and viewing key management.
 */

import {
  getUmbraClient,
  getUserRegistrationFunction,
  getPublicBalanceToEncryptedBalanceDirectDepositorFunction,
  getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction,
  getEncryptedBalanceQuerierFunction,
  createInMemorySigner,
} from "@umbra-privacy/sdk";
import type { UmbraClient, IUmbraSigner } from "@umbra-privacy/sdk";
import fs from "fs";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

// Token mint addresses for balance queries
const KNOWN_MINTS = {
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  wSOL: "So11111111111111111111111111111111111111112",
};

interface TransferResult {
  queueSignature: string | null;
  callbackSignature: string | null;
}

interface BalanceResult {
  mint: string;
  state: string;
  balance: number | null;
  rawBalance: string | null;
}

function loadKeypairSigner(): IUmbraSigner | null {
  const keypairPath =
    process.env.AGENT_KEYPAIR_PATH ||
    `${process.env.HOME}/.config/solana/id.json`;

  try {
    const raw = fs.readFileSync(keypairPath, "utf-8");
    const secretKey = new Uint8Array(JSON.parse(raw));
    const keypair = Keypair.fromSecretKey(secretKey);
    const address = keypair.publicKey.toBase58();

    // Create an Umbra-compatible signer from the keypair
    return {
      address: address as any,
      signTransaction: async (tx: any) => {
        // Sign the transaction bytes with the keypair
        if (tx && typeof tx.sign === "function") {
          tx.sign([keypair]);
        }
        return tx;
      },
      signTransactions: async (txs: any[]) => {
        for (const tx of txs) {
          if (tx && typeof tx.sign === "function") {
            tx.sign([keypair]);
          }
        }
        return txs;
      },
      signMessage: async (message: Uint8Array) => {
        // Sign the message using nacl (ed25519)
        const { sign } = await import("tweetnacl");
        return sign.detached(message, keypair.secretKey);
      },
    } as IUmbraSigner;
  } catch {
    console.warn("Could not load keypair, using in-memory signer");
    return null;
  }
}

export async function createUmbraService() {
  const network = (process.env.UMBRA_NETWORK || "devnet") as
    | "devnet"
    | "mainnet"
    | "localnet";
  const rpcUrl =
    process.env.UMBRA_RPC_URL || "https://api.devnet.solana.com";
  const rpcSubscriptionsUrl =
    process.env.UMBRA_RPC_SUBSCRIPTIONS_URL ||
    "wss://api.devnet.solana.com";
  const indexerUrl =
    process.env.UMBRA_INDEXER_URL ||
    "https://utxo-indexer.api-devnet.umbraprivacy.com";

  // Try to load keypair signer, fall back to in-memory
  const signer = loadKeypairSigner() || createInMemorySigner();

  let client: UmbraClient;
  try {
    client = getUmbraClient({
      signer,
      network,
      rpcUrl,
      rpcSubscriptionsUrl,
      indexerApiEndpoint: indexerUrl,
      deferMasterSeedSignature: true,
    });
  } catch (err) {
    console.error("Failed to initialize Umbra client:", err);
    throw err;
  }

  let registered = false;

  async function register(): Promise<void> {
    const registerFn = getUserRegistrationFunction({ client });
    await registerFn({ confidential: true, anonymous: true });
    registered = true;
    console.log("Registered with Umbra (confidential + anonymous)");
  }

  async function deposit(
    mint: string,
    amount: number
  ): Promise<TransferResult> {
    const depositFn =
      getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client });
    const signerAddress = (signer as any).address;

    // Convert amount to atomic units (6 decimals for USDC)
    const atomicAmount = BigInt(Math.floor(amount * 1_000_000));

    const result = await depositFn(
      signerAddress,
      mint as any,
      atomicAmount as any
    );

    return {
      queueSignature: result?.queueSignature || null,
      callbackSignature: result?.callbackSignature || null,
    };
  }

  async function withdraw(
    mint: string,
    amount: number
  ): Promise<TransferResult> {
    const withdrawFn =
      getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction({ client });

    const atomicAmount = BigInt(Math.floor(amount * 1_000_000));
    const result = await withdrawFn(mint as any, atomicAmount as any);

    return {
      queueSignature: result?.queueSignature || null,
      callbackSignature: result?.callbackSignature || null,
    };
  }

  async function getBalance(mint: string): Promise<BalanceResult> {
    const queryFn = getEncryptedBalanceQuerierFunction({ client });
    const balances = await queryFn([mint as any]);
    const result = balances.get(mint as any);

    if (!result) {
      return { mint, state: "non_existent", balance: null, rawBalance: null };
    }

    switch (result.state) {
      case "shared":
        return {
          mint,
          state: "shared",
          balance: Number(result.balance) / 1_000_000,
          rawBalance: String(result.balance),
        };
      case "mxe":
        return { mint, state: "mxe", balance: null, rawBalance: null };
      case "uninitialized":
        return {
          mint,
          state: "uninitialized",
          balance: null,
          rawBalance: null,
        };
      default:
        return {
          mint,
          state: "non_existent",
          balance: null,
          rawBalance: null,
        };
    }
  }

  async function getAllBalances(): Promise<BalanceResult[]> {
    const results: BalanceResult[] = [];
    for (const [name, mint] of Object.entries(KNOWN_MINTS)) {
      try {
        const balance = await getBalance(mint);
        results.push(balance);
      } catch {
        results.push({
          mint,
          state: "error",
          balance: null,
          rawBalance: null,
        });
      }
    }
    return results;
  }

  async function generateViewingKey(
    scope: string,
    year: number,
    month?: number,
    day?: number
  ): Promise<string> {
    // Viewing keys are derived from the master seed via hierarchical Poseidon hashing
    // The SDK provides methods on the client for this
    let vk: Uint8Array;

    switch (scope) {
      case "yearly":
        vk = await (client as any).yearlyViewingKey.generate(year);
        break;
      case "monthly":
        vk = await (client as any).monthlyViewingKey.generate(
          year,
          month || 1
        );
        break;
      case "daily":
        vk = await (client as any).dailyViewingKey.generate(
          year,
          month || 1,
          day || 1
        );
        break;
      default:
        vk = await (client as any).monthlyViewingKey.generate(
          year,
          month || 1
        );
    }

    return Buffer.from(vk).toString("hex");
  }

  function getAddress(): string {
    return (signer as any).address || "unknown";
  }

  function isRegistered(): boolean {
    return registered;
  }

  return {
    register,
    deposit,
    withdraw,
    getBalance,
    getAllBalances,
    generateViewingKey,
    getAddress,
    isRegistered,
  };
}
