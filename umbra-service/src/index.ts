import express from "express";
import dotenv from "dotenv";
import { createUmbraService } from "./umbra.js";

dotenv.config({ path: "../.env" });

const PORT = parseInt(process.env.UMBRA_SERVICE_PORT || "8002", 10);

async function main() {
  const app = express();
  app.use(express.json());

  const umbra = await createUmbraService();

  // -- Health --
  app.get("/health", (_req, res) => {
    res.json({
      status: "healthy",
      registered: umbra.isRegistered(),
      network: process.env.UMBRA_NETWORK || "devnet",
      signerAddress: umbra.getAddress(),
    });
  });

  // -- Registration --
  app.post("/register", async (_req, res) => {
    try {
      await umbra.register();
      res.json({ success: true });
    } catch (error: any) {
      res.json({ success: false, error: error.message });
    }
  });

  // -- Deposit (public -> encrypted) --
  app.post("/deposit", async (req, res) => {
    try {
      const { mint, amount } = req.body;
      if (!mint || !amount) {
        res.status(400).json({ error: "mint and amount required" });
        return;
      }
      const result = await umbra.deposit(mint, amount);
      res.json({
        success: true,
        queueSignature: result.queueSignature,
        callbackSignature: result.callbackSignature,
      });
    } catch (error: any) {
      res.json({ success: false, error: error.message });
    }
  });

  // -- Withdraw (encrypted -> public) --
  app.post("/withdraw", async (req, res) => {
    try {
      const { mint, amount } = req.body;
      if (!mint || !amount) {
        res.status(400).json({ error: "mint and amount required" });
        return;
      }
      const result = await umbra.withdraw(mint, amount);
      res.json({
        success: true,
        queueSignature: result.queueSignature,
        callbackSignature: result.callbackSignature,
      });
    } catch (error: any) {
      res.json({ success: false, error: error.message });
    }
  });

  // -- Balance query (single mint) --
  app.get("/balance", async (req, res) => {
    try {
      const mint = req.query.mint as string;
      if (!mint) {
        res.status(400).json({ error: "mint query param required" });
        return;
      }
      const result = await umbra.getBalance(mint);
      res.json(result);
    } catch (error: any) {
      res.json({ error: error.message });
    }
  });

  // -- All balances --
  app.get("/balances", async (_req, res) => {
    try {
      const balances = await umbra.getAllBalances();
      res.json({ balances });
    } catch (error: any) {
      res.json({ error: error.message, balances: [] });
    }
  });

  // -- Viewing key generation --
  app.post("/viewing-keys/generate", async (req, res) => {
    try {
      const { scope, year, month, day } = req.body;
      const key = await umbra.generateViewingKey(scope, year, month, day);
      res.json({ success: true, keyHex: key });
    } catch (error: any) {
      res.json({ success: false, error: error.message });
    }
  });

  app.listen(PORT, () => {
    console.log(`Umbra service listening on port ${PORT}`);
    console.log(`  Network: ${process.env.UMBRA_NETWORK || "devnet"}`);
    console.log(`  Signer: ${umbra.getAddress()}`);
  });
}

main().catch((err) => {
  console.error("Failed to start Umbra service:", err);
  process.exit(1);
});
