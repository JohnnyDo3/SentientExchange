use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("SXqp6LiVF2GTCf6o7xiXJasav7DNyuGAeyp7kLm6Prk");

#[program]
pub mod session_wallet {
    use super::*;

    /// Initialize a new session wallet
    pub fn initialize_session(
        ctx: Context<InitializeSession>,
        session_id: String,
        initial_funding: u64,
    ) -> Result<()> {
        let session_wallet = &mut ctx.accounts.session_wallet;

        session_wallet.authority = ctx.accounts.authority.key();
        session_wallet.session_id = session_id;
        session_wallet.created_at = Clock::get()?.unix_timestamp;
        session_wallet.last_activity = Clock::get()?.unix_timestamp;
        session_wallet.initial_balance = initial_funding;
        session_wallet.current_balance = initial_funding;
        session_wallet.is_active = true;
        session_wallet.bump = ctx.bumps.session_wallet;

        // Transfer initial funding from treasury to session wallet
        let cpi_accounts = Transfer {
            from: ctx.accounts.treasury_token_account.to_account_info(),
            to: ctx.accounts.session_token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::transfer(cpi_ctx, initial_funding)?;

        emit!(SessionCreated {
            session_id: session_wallet.session_id.clone(),
            pda: session_wallet.key(),
            initial_funding,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Execute a service purchase from session wallet
    pub fn execute_purchase(
        ctx: Context<ExecutePurchase>,
        amount: u64,
        service_id: String,
    ) -> Result<()> {
        let session_wallet = &mut ctx.accounts.session_wallet;

        require!(session_wallet.is_active, ErrorCode::SessionClosed);
        require!(
            session_wallet.current_balance >= amount,
            ErrorCode::InsufficientBalance
        );

        // Update balance
        session_wallet.current_balance = session_wallet
            .current_balance
            .checked_sub(amount)
            .ok_or(ErrorCode::Overflow)?;

        session_wallet.last_activity = Clock::get()?.unix_timestamp;

        // Transfer USDC from session wallet to service provider
        let session_id = session_wallet.session_id.clone();
        let seeds = &[
            b"session",
            session_id.as_bytes(),
            &[session_wallet.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.session_token_account.to_account_info(),
            to: ctx.accounts.service_provider_token_account.to_account_info(),
            authority: session_wallet.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

        token::transfer(cpi_ctx, amount)?;

        emit!(PurchaseExecuted {
            session_id,
            service_id,
            amount,
            remaining_balance: session_wallet.current_balance,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Add funds to session wallet
    pub fn fund_session(
        ctx: Context<FundSession>,
        amount: u64,
    ) -> Result<()> {
        let session_wallet = &mut ctx.accounts.session_wallet;

        require!(session_wallet.is_active, ErrorCode::SessionClosed);

        // Update balance
        session_wallet.current_balance = session_wallet
            .current_balance
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;

        session_wallet.last_activity = Clock::get()?.unix_timestamp;

        // Transfer USDC from funder to session wallet
        let cpi_accounts = Transfer {
            from: ctx.accounts.funder_token_account.to_account_info(),
            to: ctx.accounts.session_token_account.to_account_info(),
            authority: ctx.accounts.funder.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::transfer(cpi_ctx, amount)?;

        emit!(FundsAdded {
            session_id: session_wallet.session_id.clone(),
            amount,
            new_balance: session_wallet.current_balance,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Close session and refund remaining balance
    pub fn close_session(ctx: Context<CloseSession>) -> Result<()> {
        let session_wallet = &mut ctx.accounts.session_wallet;

        require!(session_wallet.is_active, ErrorCode::SessionClosed);

        let remaining_balance = session_wallet.current_balance;

        // Refund remaining balance to treasury
        if remaining_balance > 0 {
            let session_id = session_wallet.session_id.clone();
            let seeds = &[
                b"session",
                session_id.as_bytes(),
                &[session_wallet.bump],
            ];
            let signer = &[&seeds[..]];

            let cpi_accounts = Transfer {
                from: ctx.accounts.session_token_account.to_account_info(),
                to: ctx.accounts.treasury_token_account.to_account_info(),
                authority: session_wallet.to_account_info(),
            };

            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

            token::transfer(cpi_ctx, remaining_balance)?;
        }

        session_wallet.is_active = false;
        session_wallet.current_balance = 0;

        emit!(SessionClosed {
            session_id: session_wallet.session_id.clone(),
            refunded_amount: remaining_balance,
            total_spent: session_wallet.initial_balance - remaining_balance,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

// ============================================================================
// Accounts
// ============================================================================

#[derive(Accounts)]
#[instruction(session_id: String)]
pub struct InitializeSession<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + SessionWallet::SIZE,
        seeds = [b"session", session_id.as_bytes()],
        bump
    )]
    pub session_wallet: Account<'info, SessionWallet>,

    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,

    /// CHECK: Session token account will be created externally
    #[account(mut)]
    pub session_token_account: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ExecutePurchase<'info> {
    #[account(
        mut,
        seeds = [b"session", session_wallet.session_id.as_bytes()],
        bump = session_wallet.bump
    )]
    pub session_wallet: Account<'info, SessionWallet>,

    #[account(mut)]
    pub session_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub service_provider_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct FundSession<'info> {
    #[account(
        mut,
        seeds = [b"session", session_wallet.session_id.as_bytes()],
        bump = session_wallet.bump
    )]
    pub session_wallet: Account<'info, SessionWallet>,

    #[account(mut)]
    pub funder_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub session_token_account: Account<'info, TokenAccount>,

    pub funder: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CloseSession<'info> {
    #[account(
        mut,
        seeds = [b"session", session_wallet.session_id.as_bytes()],
        bump = session_wallet.bump,
        has_one = authority
    )]
    pub session_wallet: Account<'info, SessionWallet>,

    #[account(mut)]
    pub session_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

// ============================================================================
// State
// ============================================================================

#[account]
pub struct SessionWallet {
    pub authority: Pubkey,        // Program authority (your backend)
    pub session_id: String,       // Unique session ID
    pub created_at: i64,          // Unix timestamp
    pub last_activity: i64,       // Unix timestamp
    pub initial_balance: u64,     // USDC (6 decimals)
    pub current_balance: u64,     // USDC (6 decimals)
    pub is_active: bool,          // Session active status
    pub bump: u8,                 // PDA bump seed
}

impl SessionWallet {
    pub const SIZE: usize = 32 + // authority
                            64 + // session_id (max length)
                            8 +  // created_at
                            8 +  // last_activity
                            8 +  // initial_balance
                            8 +  // current_balance
                            1 +  // is_active
                            1;   // bump
}

// ============================================================================
// Events
// ============================================================================

#[event]
pub struct SessionCreated {
    pub session_id: String,
    pub pda: Pubkey,
    pub initial_funding: u64,
    pub timestamp: i64,
}

#[event]
pub struct PurchaseExecuted {
    pub session_id: String,
    pub service_id: String,
    pub amount: u64,
    pub remaining_balance: u64,
    pub timestamp: i64,
}

#[event]
pub struct FundsAdded {
    pub session_id: String,
    pub amount: u64,
    pub new_balance: u64,
    pub timestamp: i64,
}

#[event]
pub struct SessionClosed {
    pub session_id: String,
    pub refunded_amount: u64,
    pub total_spent: u64,
    pub timestamp: i64,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Session is closed")]
    SessionClosed,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Math overflow")]
    Overflow,
}
