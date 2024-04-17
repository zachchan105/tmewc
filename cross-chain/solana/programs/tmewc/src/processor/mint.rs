use crate::{
    constants::SEED_PREFIX_TMEWC_MINT,
    error::TmewcError,
    state::{Config, MinterInfo},
};
use anchor_lang::prelude::*;
use anchor_spl::token;

#[derive(Accounts)]
pub struct Mint<'info> {
    // Use the correct token mint for the program.
    #[account(
        mut,
        seeds = [SEED_PREFIX_TMEWC_MINT],
        bump = config.mint_bump,
        mint::authority = config,
    )]
    mint: Account<'info, token::Mint>,

    #[account(
        seeds = [Config::SEED_PREFIX],
        bump = config.bump,
    )]
    config: Account<'info, Config>,

    // Require the signing minter to match a valid minter info.
    #[account(
        has_one = minter,
        seeds = [MinterInfo::SEED_PREFIX, minter.key().as_ref()],
        bump = minter_info.bump,
    )]
    minter_info: Account<'info, MinterInfo>,

    minter: Signer<'info>,

    // Use the associated token account for the recipient.
    #[account(
        mut,
        token::mint = mint,
    )]
    recipient_token: Account<'info, token::TokenAccount>,

    token_program: Program<'info, token::Token>,
}

impl<'info> Mint<'info> {
    fn constraints(ctx: &Context<Self>) -> Result<()> {
        // Can not mint when paused.
        require!(!ctx.accounts.config.paused, TmewcError::IsPaused);

        Ok(())
    }
}

#[access_control(Mint::constraints(&ctx))]
pub fn mint(ctx: Context<Mint>, amount: u64) -> Result<()> {
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.recipient_token.to_account_info(),
                authority: ctx.accounts.config.to_account_info(),
            },
            &[&[Config::SEED_PREFIX, &[ctx.accounts.config.bump]]],
        ),
        amount,
    )
}
