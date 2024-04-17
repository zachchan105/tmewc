use crate::{
    constants::MSG_SEED_PREFIX,
    state::{Custodian, GatewayInfo},
};
use anchor_lang::prelude::*;
use anchor_spl::token;
use wormhole_anchor_sdk::{
    token_bridge::{self, program::TokenBridge},
    wormhole::{self as core_bridge, program::Wormhole as CoreBridge},
};

#[derive(Accounts)]
#[instruction(args: SendTmewcGatewayArgs)]
pub struct SendTmewcGateway<'info> {
    #[account(
        mut, 
        seeds = [Custodian::SEED_PREFIX],
        bump = custodian.bump,
        has_one = wrapped_tmewc_token,
        has_one = wrapped_tmewc_mint,
        has_one = tmewc_mint,
        has_one = token_bridge_sender,
    )]
    custodian: Account<'info, Custodian>,

    #[account(
        seeds = [GatewayInfo::SEED_PREFIX, &args.recipient_chain.to_le_bytes()],
        bump = gateway_info.bump,
    )]
    gateway_info: Account<'info, GatewayInfo>,

    /// Custody account.
    #[account(mut)]
    wrapped_tmewc_token: Box<Account<'info, token::TokenAccount>>,

    /// CHECK: This account is needed for the Token Bridge program.
    #[account(mut)]
    wrapped_tmewc_mint: UncheckedAccount<'info>,

    #[account(mut)]
    tmewc_mint: Box<Account<'info, token::Mint>>,

    #[account(
        mut,
        token::mint = tmewc_mint,
        token::authority = sender
    )]
    sender_token: Box<Account<'info, token::TokenAccount>>,

    #[account(mut)]
    sender: Signer<'info>,

    /// CHECK: This account is needed for the Token Bridge program.
    token_bridge_config: UncheckedAccount<'info>,

    /// CHECK: This account is needed for the Token Bridge program.
    token_bridge_wrapped_asset: UncheckedAccount<'info>,

    /// CHECK: This account is needed for the Token Bridge program.
    token_bridge_transfer_authority: UncheckedAccount<'info>,

    /// CHECK: This account is needed for the Token Bridge program.
    #[account(mut)]
    core_bridge_data: UncheckedAccount<'info>,

    /// CHECK: This account is needed for the Token Bridge program.
    #[account(
        mut,
        seeds = [
            MSG_SEED_PREFIX,
            &core_emitter_sequence.value().to_le_bytes()
        ],
        bump,
    )]
    core_message: AccountInfo<'info>,

    /// CHECK: This account is needed for the Token Bridge program.
    token_bridge_core_emitter: UncheckedAccount<'info>,

    /// CHECK: This account is needed for the Token Bridge program.
    #[account(mut)]
    core_emitter_sequence: Account<'info, core_bridge::SequenceTracker>,

    /// CHECK: This account is needed for the Token Bridge program.
    #[account(mut)]
    core_fee_collector: UncheckedAccount<'info>,

    /// CHECK: This account is needed for the Token Bridge program.
    clock: UncheckedAccount<'info>,

    /// CHECK: This account is needed for the Token Bridge program. This PDA is specifically used to
    /// sign for transferring via Token Bridge program with a message.
    token_bridge_sender: AccountInfo<'info>,

    /// CHECK: This account is needed for the Token Bridge program.
    rent: UncheckedAccount<'info>,

    token_bridge_program: Program<'info, TokenBridge>,
    core_bridge_program: Program<'info, CoreBridge>,
    token_program: Program<'info, token::Token>,
    system_program: Program<'info, System>,
}

impl<'info> SendTmewcGateway<'info> {
    fn constraints(ctx: &Context<Self>, args: &SendTmewcGatewayArgs) -> Result<()> {
        super::validate_send(
            &ctx.accounts.wrapped_tmewc_token,
            &args.recipient,
            args.amount,
        )
    }
}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct SendTmewcGatewayArgs {
    amount: u64,
    recipient_chain: u16,
    recipient: [u8; 32],
    nonce: u32,
}

#[access_control(SendTmewcGateway::constraints(&ctx, &args))]
pub fn send_tmewc_gateway(ctx: Context<SendTmewcGateway>, args: SendTmewcGatewayArgs) -> Result<()> {
    let SendTmewcGatewayArgs {
        amount,
        recipient_chain,
        recipient,
        nonce,
    } = args;

    let sender = &ctx.accounts.sender;
    let wrapped_tmewc_token = &ctx.accounts.wrapped_tmewc_token;
    let token_bridge_transfer_authority = &ctx.accounts.token_bridge_transfer_authority;
    let token_program = &ctx.accounts.token_program;

    let gateway = ctx.accounts.gateway_info.address;

    // Prepare for wrapped tMEWC transfer (this method also truncates the amount to prevent having to
    // handle dust since tMEWC has >8 decimals).
    super::burn_and_prepare_transfer(
        super::PrepareTransfer {
            custodian: &mut ctx.accounts.custodian,
            tmewc_mint: &ctx.accounts.tmewc_mint,
            sender_token: &ctx.accounts.sender_token,
            sender,
            wrapped_tmewc_token,
            token_bridge_transfer_authority,
            token_program,
        },
        amount,
        recipient_chain,
        Some(gateway),
        recipient,
        None, // arbiter_fee
        nonce,
    )?;

    let custodian = &ctx.accounts.custodian;

    // Finally transfer wrapped tMEWC with the recipient encoded as this transfer's message.
    token_bridge::transfer_wrapped_with_payload(
        CpiContext::new_with_signer(
            ctx.accounts.token_bridge_program.to_account_info(),
            token_bridge::TransferWrappedWithPayload {
                payer: sender.to_account_info(),
                config: ctx.accounts.token_bridge_config.to_account_info(),
                from: wrapped_tmewc_token.to_account_info(),
                from_owner: custodian.to_account_info(),
                wrapped_mint: ctx.accounts.wrapped_tmewc_mint.to_account_info(),
                wrapped_metadata: ctx.accounts.token_bridge_wrapped_asset.to_account_info(),
                authority_signer: token_bridge_transfer_authority.to_account_info(),
                wormhole_bridge: ctx.accounts.core_bridge_data.to_account_info(),
                wormhole_message: ctx.accounts.core_message.to_account_info(),
                wormhole_emitter: ctx.accounts.token_bridge_core_emitter.to_account_info(),
                wormhole_sequence: ctx.accounts.core_emitter_sequence.to_account_info(),
                wormhole_fee_collector: ctx.accounts.core_fee_collector.to_account_info(),
                clock: ctx.accounts.clock.to_account_info(),
                sender: ctx.accounts.token_bridge_sender.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                token_program: token_program.to_account_info(),
                wormhole_program: ctx.accounts.core_bridge_program.to_account_info(),
            },
            &[
                &[Custodian::SEED_PREFIX, &[custodian.bump]],
                &[
                    token_bridge::SEED_PREFIX_SENDER,
                    &[ctx.accounts.custodian.token_bridge_sender_bump],
                ],
                &[
                    MSG_SEED_PREFIX,
                    &ctx.accounts.core_emitter_sequence.value().to_le_bytes(),
                    &[ctx.bumps["core_message"]],
                ],
            ],
        ),
        nonce,
        amount,
        gateway,
        recipient_chain,
        recipient.to_vec(),
        &crate::ID,
    )
}
