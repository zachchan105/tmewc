use crate::{
    constants::{TMEWC_ETHEREUM_TOKEN_ADDRESS, TMEWC_ETHEREUM_TOKEN_CHAIN},
    state::Custodian,
};
use anchor_lang::prelude::*;
use anchor_spl::token;
use wormhole_anchor_sdk::token_bridge;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + Custodian::INIT_SPACE,
        seeds = [Custodian::SEED_PREFIX],
        bump,
    )]
    custodian: Account<'info, Custodian>,

    /// TMEWC Program's mint PDA address bump is saved in this program's config. Ordinarily, we would
    /// not have to deserialize this account. But we do in this case to make sure the TMEWC program
    /// has been initialized before this program.
    #[account(
        seeds = [tmewc::SEED_PREFIX_TMEWC_MINT],
        bump,
        seeds::program = tmewc::ID
    )]
    tmewc_mint: Account<'info, token::Mint>,

    #[account(
        seeds = [
            token_bridge::WrappedMint::SEED_PREFIX,
            &TMEWC_ETHEREUM_TOKEN_CHAIN.to_be_bytes(),
            TMEWC_ETHEREUM_TOKEN_ADDRESS.as_ref()
        ],
        bump,
        seeds::program = token_bridge::program::ID
    )]
    wrapped_tmewc_mint: Account<'info, token::Mint>,

    #[account(
        init,
        payer = authority,
        token::mint = wrapped_tmewc_mint,
        token::authority = custodian,
        seeds = [b"wrapped-token"],
        bump
    )]
    wrapped_tmewc_token: Account<'info, token::TokenAccount>,

    /// CHECK: This account is needed for the Token Bridge program. This PDA is specifically used to
    /// sign for transferring via Token Bridge program with a message.
    #[account(
        seeds = [token_bridge::SEED_PREFIX_SENDER],
        bump,
    )]
    token_bridge_sender: AccountInfo<'info>,

    system_program: Program<'info, System>,
    token_program: Program<'info, token::Token>,
}

pub fn initialize(ctx: Context<Initialize>, minting_limit: u64) -> Result<()> {
    ctx.accounts.custodian.set_inner(Custodian {
        bump: ctx.bumps["custodian"],
        authority: ctx.accounts.authority.key(),
        pending_authority: None,
        tmewc_mint: ctx.accounts.tmewc_mint.key(),
        wrapped_tmewc_mint: ctx.accounts.wrapped_tmewc_mint.key(),
        wrapped_tmewc_token: ctx.accounts.wrapped_tmewc_token.key(),
        token_bridge_sender: ctx.accounts.token_bridge_sender.key(),
        token_bridge_sender_bump: ctx.bumps["token_bridge_sender"],
        minting_limit,
        minted_amount: 0,
    });

    Ok(())
}
