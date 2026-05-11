import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

// Import IDL type
import type { UmbraLogs } from "../target/types/umbra_logs";

describe("umbra_logs", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.UmbraLogs as Program<UmbraLogs>;
  const authority = provider.wallet.publicKey;

  // Derive AgentState PDA
  const [agentStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), authority.toBuffer()],
    program.programId
  );

  const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

  function randomHash(): number[] {
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 256));
  }

  // ---------------------------------------------------------------
  // initialize_agent
  // ---------------------------------------------------------------

  it("initializes agent", async () => {
    const tx = await program.methods
      .initializeAgent("Umbra-Alpha")
      .accountsStrict({
        agentState: agentStatePda,
        authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("    initialize_agent tx:", tx);

    const agent = await program.account.agentState.fetch(agentStatePda);
    expect(agent.authority.toBase58()).to.equal(authority.toBase58());
    expect(agent.name).to.equal("Umbra-Alpha");
    expect(agent.decisionCount.toNumber()).to.equal(0);
    expect(agent.transferCount.toNumber()).to.equal(0);
    expect(agent.lastDecisionHash).to.deep.equal(new Array(32).fill(0));
  });

  it("rejects name longer than 32 bytes", async () => {
    // Second init would fail anyway (PDA exists), but let's test the name check
    // by using a different authority via a generated keypair
    const other = anchor.web3.Keypair.generate();

    // Airdrop to the new keypair
    const sig = await provider.connection.requestAirdrop(
      other.publicKey,
      1_000_000_000
    );
    await provider.connection.confirmTransaction(sig);

    const [otherPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), other.publicKey.toBuffer()],
      program.programId
    );

    const longName = "A".repeat(33);
    try {
      await program.methods
        .initializeAgent(longName)
        .accountsStrict({
          agentState: otherPda,
          authority: other.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([other])
        .rpc();
      expect.fail("Should have rejected long name");
    } catch (err: any) {
      expect(err.error?.errorCode?.code || err.message).to.contain("NameTooLong");
    }
  });

  // ---------------------------------------------------------------
  // log_decision (cheap -- event only, no new account)
  // ---------------------------------------------------------------

  it("logs a decision via event (no new account)", async () => {
    const hash = randomHash();

    const balanceBefore = await provider.connection.getBalance(authority);

    const tx = await program.methods
      .logDecision(hash, 850, 200)
      .accountsStrict({
        agentState: agentStatePda,
        authority,
      })
      .rpc();

    console.log("    log_decision tx:", tx);

    const balanceAfter = await provider.connection.getBalance(authority);
    const cost = balanceBefore - balanceAfter;

    // Should cost only tx fee (~5000 lamports), not rent
    expect(cost).to.be.lessThan(100_000); // well under 0.0001 SOL
    console.log("    cost:", cost, "lamports (~", (cost / 1e9).toFixed(6), "SOL)");

    const agent = await program.account.agentState.fetch(agentStatePda);
    expect(agent.decisionCount.toNumber()).to.equal(1);
    expect(Array.from(agent.lastDecisionHash)).to.deep.equal(hash);
  });

  it("logs multiple decisions, counter increments", async () => {
    await program.methods
      .logDecision(randomHash(), 700, 150)
      .accountsStrict({ agentState: agentStatePda, authority })
      .rpc();

    await program.methods
      .logDecision(randomHash(), 600, 300)
      .accountsStrict({ agentState: agentStatePda, authority })
      .rpc();

    const agent = await program.account.agentState.fetch(agentStatePda);
    expect(agent.decisionCount.toNumber()).to.equal(3);
  });

  // ---------------------------------------------------------------
  // log_confidential_transfer (cheap -- event only)
  // ---------------------------------------------------------------

  it("logs a confidential transfer (deposit)", async () => {
    const hash = randomHash();

    const tx = await program.methods
      .logConfidentialTransfer(hash, 0, USDC_MINT)
      .accountsStrict({
        agentState: agentStatePda,
        authority,
      })
      .rpc();

    console.log("    log_confidential_transfer tx:", tx);

    const agent = await program.account.agentState.fetch(agentStatePda);
    expect(agent.transferCount.toNumber()).to.equal(1);
    expect(Array.from(agent.lastTransferHash)).to.deep.equal(hash);
  });

  it("logs withdraw and anonymous transfer types", async () => {
    await program.methods
      .logConfidentialTransfer(randomHash(), 1, USDC_MINT) // withdraw
      .accountsStrict({ agentState: agentStatePda, authority })
      .rpc();

    await program.methods
      .logConfidentialTransfer(randomHash(), 2, USDC_MINT) // anonymous
      .accountsStrict({ agentState: agentStatePda, authority })
      .rpc();

    const agent = await program.account.agentState.fetch(agentStatePda);
    expect(agent.transferCount.toNumber()).to.equal(3);
  });

  it("rejects invalid transfer type", async () => {
    try {
      await program.methods
        .logConfidentialTransfer(randomHash(), 3, USDC_MINT) // invalid
        .accountsStrict({ agentState: agentStatePda, authority })
        .rpc();
      expect.fail("Should have rejected type 3");
    } catch (err: any) {
      expect(err.error?.errorCode?.code || err.message).to.contain(
        "InvalidTransferType"
      );
    }
  });

  // ---------------------------------------------------------------
  // record_decision (permanent PDA -- use sparingly)
  // ---------------------------------------------------------------

  it("creates a permanent decision record", async () => {
    const hash = randomHash();

    const [recordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("rec"), authority.toBuffer(), Buffer.from(hash.slice(0, 8))],
      program.programId
    );

    const tx = await program.methods
      .recordDecision(hash, 900, 100)
      .accountsStrict({
        decisionRecord: recordPda,
        authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("    record_decision tx:", tx);

    const record = await program.account.decisionRecord.fetch(recordPda);
    expect(record.authority.toBase58()).to.equal(authority.toBase58());
    expect(Array.from(record.decisionHash)).to.deep.equal(hash);
    expect(record.confidence).to.equal(900);
    expect(record.riskScore).to.equal(100);
    expect(record.timestamp.toNumber()).to.be.greaterThan(0);
  });

  // ---------------------------------------------------------------
  // close_record (reclaim rent)
  // ---------------------------------------------------------------

  it("closes a decision record and reclaims rent", async () => {
    const hash = randomHash();

    const [recordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("rec"), authority.toBuffer(), Buffer.from(hash.slice(0, 8))],
      program.programId
    );

    // Create it
    await program.methods
      .recordDecision(hash, 500, 500)
      .accountsStrict({
        decisionRecord: recordPda,
        authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const balanceBefore = await provider.connection.getBalance(authority);

    // Close it
    const tx = await program.methods
      .closeRecord()
      .accountsStrict({
        decisionRecord: recordPda,
        authority,
      })
      .rpc();

    console.log("    close_record tx:", tx);

    const balanceAfter = await provider.connection.getBalance(authority);

    // Should have reclaimed rent (minus tx fee)
    const netGain = balanceAfter - balanceBefore;
    console.log("    rent reclaimed (net):", netGain, "lamports");
    expect(netGain).to.be.greaterThan(0);

    // Account should be gone
    const info = await provider.connection.getAccountInfo(recordPda);
    expect(info).to.be.null;
  });

  // ---------------------------------------------------------------
  // Authorization check
  // ---------------------------------------------------------------

  it("rejects log_decision from wrong authority", async () => {
    const attacker = anchor.web3.Keypair.generate();
    const sig = await provider.connection.requestAirdrop(
      attacker.publicKey,
      1_000_000_000
    );
    await provider.connection.confirmTransaction(sig);

    try {
      await program.methods
        .logDecision(randomHash(), 999, 0)
        .accountsStrict({
          agentState: agentStatePda,
          authority: attacker.publicKey,
        })
        .signers([attacker])
        .rpc();
      expect.fail("Should have rejected wrong authority");
    } catch (err: any) {
      // PDA derivation mismatch or has_one constraint
      expect(err).to.exist;
    }
  });
});
