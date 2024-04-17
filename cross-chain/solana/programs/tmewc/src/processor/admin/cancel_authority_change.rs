use crate::{error::TmewcError, state::Config};
use anchor_lang::prelude::*;

#[derive(Accounts)]

pub struct CancelAuthorityChange<'info> {
    #[account(
        mut,
        seeds = [Config::SEED_PREFIX],
        bump,
        has_one = authority @ TmewcError::IsNotAuthority,
        constraint = config.pending_authority.is_some() @ TmewcError::NoPendingAuthorityChange
    )]
    config: Account<'info, Config>,

    authority: Signer<'info>,
}

pub fn cancel_authority_change(ctx: Context<CancelAuthorityChange>) -> Result<()> {
    ctx.accounts.config.pending_authority = None;
    Ok(())
}
