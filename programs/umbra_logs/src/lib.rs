use anchor_lang::prelude::*;

declare_id!("3XzQNmWuWBXTSisTv6xGomsxr38qM1De7nUdvzrxMqzS");

/// Umbra program ID on Solana Devnet.
const UMBRA_DEVNET: Pubkey = pubkey!("DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ");

const MAX_NAME_LEN: usize = 32;

#[program]
pub mod umbra_logs {
    use super::*;

    /// One-time agent initialization. Creates the only permanent PDA.
    pub fn initialize_agent(ctx: Context<InitializeAgent>, name: String) -> Result<()> {
        require!(name.len() <= MAX_NAME_LEN, UmbraError::NameTooLong);

        let agent = &mut ctx.accounts.agent_state;
        agent.authority = ctx.accounts.authority.key();
        agent.name = name;
        agent.decision_count = 0;
        agent.transfer_count = 0;
        agent.last_decision_hash = [0u8; 32];
        agent.last_transfer_hash = [0u8; 32];
        agent.bump = ctx.bumps.agent_state;
        Ok(())
    }

    /// Log a decision cheaply via event. Updates counters on AgentState.
    /// Cost: ~0.000005 SOL (tx fee only, no new account).
    pub fn log_decision(
        ctx: Context<UpdateAgent>,
        decision_hash: [u8; 32],
        confidence: u16,
        risk_score: u16,
    ) -> Result<()> {
        let agent = &mut ctx.accounts.agent_state;
        let index = agent.decision_count;

        agent.decision_count += 1;
        agent.last_decision_hash = decision_hash;

        emit!(DecisionLogged {
            agent: agent.key(),
            authority: agent.authority,
            index,
            decision_hash,
            confidence,
            risk_score,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Log a confidential transfer cheaply via event.
    /// Cost: ~0.000005 SOL (tx fee only, no new account).
    pub fn log_confidential_transfer(
        ctx: Context<UpdateAgent>,
        transfer_hash: [u8; 32],
        transfer_type: u8,
        token_mint: Pubkey,
    ) -> Result<()> {
        require!(transfer_type <= 2, UmbraError::InvalidTransferType);

        let agent = &mut ctx.accounts.agent_state;
        let index = agent.transfer_count;

        agent.transfer_count += 1;
        agent.last_transfer_hash = transfer_hash;

        emit!(TransferLogged {
            agent: agent.key(),
            authority: agent.authority,
            index,
            transfer_hash,
            transfer_type,
            token_mint,
            umbra_program: UMBRA_DEVNET,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Permanently record a decision on-chain as its own PDA.
    /// Use sparingly -- costs ~0.001 SOL rent per record.
    /// Good for milestone decisions that need permanent proof.
    pub fn record_decision(
        ctx: Context<RecordDecision>,
        decision_hash: [u8; 32],
        confidence: u16,
        risk_score: u16,
    ) -> Result<()> {
        let record = &mut ctx.accounts.decision_record;
        record.authority = ctx.accounts.authority.key();
        record.decision_hash = decision_hash;
        record.confidence = confidence;
        record.risk_score = risk_score;
        record.timestamp = Clock::get()?.unix_timestamp;
        record.bump = ctx.bumps.decision_record;
        Ok(())
    }

    /// Close a decision record PDA and reclaim rent back to authority.
    pub fn close_record(ctx: Context<CloseRecord>) -> Result<()> {
        emit!(RecordClosed {
            authority: ctx.accounts.authority.key(),
            decision_hash: ctx.accounts.decision_record.decision_hash,
        });
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

#[account]
pub struct AgentState {
    pub authority: Pubkey,              // 32
    pub name: String,                   // 4 + MAX_NAME_LEN
    pub decision_count: u64,            // 8
    pub transfer_count: u64,            // 8
    pub last_decision_hash: [u8; 32],   // 32
    pub last_transfer_hash: [u8; 32],   // 32
    pub bump: u8,                       // 1
}

impl AgentState {
    pub const SIZE: usize = 8 // discriminator
        + 32                  // authority
        + (4 + MAX_NAME_LEN)  // name
        + 8                   // decision_count
        + 8                   // transfer_count
        + 32                  // last_decision_hash
        + 32                  // last_transfer_hash
        + 1;                  // bump
}

#[account]
pub struct DecisionRecord {
    pub authority: Pubkey,       // 32
    pub decision_hash: [u8; 32], // 32
    pub confidence: u16,         // 2
    pub risk_score: u16,         // 2
    pub timestamp: i64,          // 8
    pub bump: u8,                // 1
}

impl DecisionRecord {
    pub const SIZE: usize = 8 + 32 + 32 + 2 + 2 + 8 + 1;
}

// ---------------------------------------------------------------------------
// Contexts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct InitializeAgent<'info> {
    #[account(
        init,
        payer = authority,
        space = AgentState::SIZE,
        seeds = [b"agent", authority.key().as_ref()],
        bump,
    )]
    pub agent_state: Account<'info, AgentState>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Shared context for cheap log_decision / log_confidential_transfer.
/// No new accounts -- just mutates the existing AgentState.
#[derive(Accounts)]
pub struct UpdateAgent<'info> {
    #[account(
        mut,
        seeds = [b"agent", authority.key().as_ref()],
        bump = agent_state.bump,
        has_one = authority,
    )]
    pub agent_state: Account<'info, AgentState>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(decision_hash: [u8; 32])]
pub struct RecordDecision<'info> {
    #[account(
        init,
        payer = authority,
        space = DecisionRecord::SIZE,
        seeds = [b"rec", authority.key().as_ref(), &decision_hash[..8]],
        bump,
    )]
    pub decision_record: Account<'info, DecisionRecord>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseRecord<'info> {
    #[account(
        mut,
        close = authority,
        has_one = authority,
    )]
    pub decision_record: Account<'info, DecisionRecord>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

// ---------------------------------------------------------------------------
// Events (logged in tx, queryable, no rent cost)
// ---------------------------------------------------------------------------

#[event]
pub struct DecisionLogged {
    pub agent: Pubkey,
    pub authority: Pubkey,
    pub index: u64,
    pub decision_hash: [u8; 32],
    pub confidence: u16,
    pub risk_score: u16,
    pub timestamp: i64,
}

#[event]
pub struct TransferLogged {
    pub agent: Pubkey,
    pub authority: Pubkey,
    pub index: u64,
    pub transfer_hash: [u8; 32],
    pub transfer_type: u8,
    pub token_mint: Pubkey,
    pub umbra_program: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct RecordClosed {
    pub authority: Pubkey,
    pub decision_hash: [u8; 32],
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[error_code]
pub enum UmbraError {
    #[msg("Agent name exceeds 32 bytes")]
    NameTooLong,
    #[msg("Transfer type must be 0 (deposit), 1 (withdraw), or 2 (anonymous)")]
    InvalidTransferType,
}
