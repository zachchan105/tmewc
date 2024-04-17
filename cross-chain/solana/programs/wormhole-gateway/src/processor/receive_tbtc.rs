use crate::{
    constants::{TMEWC_ETHEREUM_TOKEN_ADDRESS, TMEWC_ETHEREUM_TOKEN_CHAIN},
    error::WormholeGatewayError,
    state::Custodian,
};
use anchor_lang::prelude::*;
use anchor_spl::{associated_token, token};
use wormhole_anchor_sdk::{
    token_bridge::{self, program::TokenBridge},
    wormhole::{self as core_bridge, program::Wormhole as CoreBridge},
};

#[derive(Accounts)]
#[instruction(message_hash: [u8; 32])]
pub struct ReceiveTmewc<'info> {
    #[account(mut)]
    payer: Signer<'info>,

    #[account(
        mut,
        seeds = [Custodian::SEED_PREFIX],
        bump = custodian.bump,
        has_one = wrapped_tmewc_token,
        has_one = wrapped_tmewc_mint,
        has_one = tmewc_mint
    )]
    custodian: Account<'info, Custodian>,

    #[account(
        seeds = [core_bridge::SEED_PREFIX_POSTED_VAA, &message_hash],
        bump,
        seeds::program = core_bridge_program
    )]
    posted_vaa: Box<Account<'info, token_bridge::PostedTransferWith<[u8; 32]>>>,

    /// CHECK: This claim account is created by the Token Bridge program when it redeems its inbound
    /// transfer. By checking whether this account exists is a short-circuit way of bailing out
    /// early if this transfer has already been redeemed (as opposed to letting the Token Bridge
    /// instruction fail).
    #[account(mut)]
    token_bridge_claim: AccountInfo<'info>,

    /// Custody account.
    #[account(mut)]
    wrapped_tmewc_token: Box<Account<'info, token::TokenAccount>>,

    /// This mint is owned by the Wormhole Token Bridge program. This PDA address is stored in the
    /// custodian account.
    #[account(mut)]
    wrapped_tmewc_mint: Box<Account<'info, token::Mint>>,

    #[account(mut)]
    tmewc_mint: Box<Account<'info, token::Mint>>,

    /// Token account for minted tMEWC.
    ///
    /// NOTE: Because the recipient is encoded in the transfer message payload, we can check the
    /// authority from the deserialized VAA. But we should still check whether the authority is the
    /// zero address in access control.
    #[account(
        mut,
        token::mint = tmewc_mint,
        token::authority = recipient,
    )]
    recipient_token: Box<Account<'info, token::TokenAccount>>,

    /// CHECK: This account needs to be in the context in case an associated token account needs to
    /// be created for him.
    #[account(address = Pubkey::from(*posted_vaa.data().message()))]
    recipient: AccountInfo<'info>,

    /// CHECK: This account exists just in case the minting limit is breached after this transfer.
    /// The gateway will create an associated token account for the recipient if it doesn't exist.
    ///
    /// NOTE: When the minting limit increases, the recipient can use this token account to mint
    /// tMEWC using the deposit_wormhole_tmewc instruction.
    #[account(
        mut,
        address = associated_token::get_associated_token_address(
            &recipient.key(),
            &wrapped_tmewc_mint.key()
        ),
    )]
    recipient_wrapped_token: AccountInfo<'info>,

    /// CHECK: This account is needed for the TMEWC program.
    tmewc_config: UncheckedAccount<'info>,

    /// CHECK: This account is needed for the TMEWC program.
    tmewc_minter_info: UncheckedAccount<'info>,

    /// CHECK: This account is needed for the Token Bridge program.
    token_bridge_config: UncheckedAccount<'info>,

    /// CHECK: This account is needed for the Token Bridge program.
    token_bridge_registered_emitter: UncheckedAccount<'info>,

    /// CHECK: This account is needed for the Token Bridge program.
    token_bridge_wrapped_asset: UncheckedAccount<'info>,

    /// CHECK: This account is needed for the Token Bridge program.
    token_bridge_mint_authority: UncheckedAccount<'info>,

    /// CHECK: This account is needed for the Token Bridge program.
    rent: UncheckedAccount<'info>,

    tmewc_program: Program<'info, tmewc::Tmewc>,
    token_bridge_program: Program<'info, TokenBridge>,
    core_bridge_program: Program<'info, CoreBridge>,
    associated_token_program: Program<'info, associated_token::AssociatedToken>,
    token_program: Program<'info, token::Token>,
    system_program: Program<'info, System>,
}

impl<'info> ReceiveTmewc<'info> {
    fn constraints(ctx: &Context<Self>) -> Result<()> {
        // Check if transfer has already been claimed.
        require!(
            ctx.accounts.token_bridge_claim.data_is_empty(),
            WormholeGatewayError::TransferAlreadyRedeemed
        );

        // Token info must match Ethereum's canonical tMEWC token info.
        let transfer = ctx.accounts.posted_vaa.data();
        require!(
            transfer.token_chain() == TMEWC_ETHEREUM_TOKEN_CHAIN
                && *transfer.token_address() == TMEWC_ETHEREUM_TOKEN_ADDRESS,
            WormholeGatewayError::InvalidEthereumTmewc
        );

        // There must be an encoded amount.
        require_gt!(
            transfer.amount(),
            0,
            WormholeGatewayError::NoTmewcTransferred
        );

        // Recipient must not be zero address.
        require_keys_neq!(
            ctx.accounts.recipient.key(),
            Pubkey::default(),
            WormholeGatewayError::RecipientZeroAddress
        );

        Ok(())
    }
}

#[access_control(ReceiveTmewc::constraints(&ctx))]
pub fn receive_tmewc(ctx: Context<ReceiveTmewc>, _message_hash: [u8; 32]) -> Result<()> {
    let wrapped_tmewc_token = &ctx.accounts.wrapped_tmewc_token;
    let wrapped_tmewc_mint = &ctx.accounts.wrapped_tmewc_mint;

    // Redeem the token transfer.
    token_bridge::complete_transfer_wrapped_with_payload(CpiContext::new_with_signer(
        ctx.accounts.token_bridge_program.to_account_info(),
        token_bridge::CompleteTransferWrappedWithPayload {
            payer: ctx.accounts.payer.to_account_info(),
            config: ctx.accounts.token_bridge_config.to_account_info(),
            vaa: ctx.accounts.posted_vaa.to_account_info(),
            claim: ctx.accounts.token_bridge_claim.to_account_info(),
            foreign_endpoint: ctx
                .accounts
                .token_bridge_registered_emitter
                .to_account_info(),
            to: wrapped_tmewc_token.to_account_info(),
            redeemer: ctx.accounts.custodian.to_account_info(),
            wrapped_mint: wrapped_tmewc_mint.to_account_info(),
            wrapped_metadata: ctx.accounts.token_bridge_wrapped_asset.to_account_info(),
            mint_authority: ctx.accounts.token_bridge_mint_authority.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
            wormhole_program: ctx.accounts.core_bridge_program.to_account_info(),
        },
        &[&[
            token_bridge::SEED_PREFIX_REDEEMER,
            &[ctx.accounts.custodian.bump],
        ]],
    ))?;

    // Because we are working with wrapped token amounts, we can take the amount as-is and determine
    // whether to mint or transfer based on the minting limit.
    let amount = ctx.accounts.posted_vaa.data().amount();
    let recipient = &ctx.accounts.recipient;

    emit!(crate::event::WormholeTmewcReceived {
        receiver: recipient.key(),
        amount
    });

    let updated_minted_amount = ctx.accounts.custodian.minted_amount.saturating_add(amount);
    let custodian_seeds = &[Custodian::SEED_PREFIX, &[ctx.accounts.custodian.bump]];

    // We send Wormhole tMEWC OR mint canonical tMEWC. We do not want to send dust. Sending Wormhole
    // tMEWC is an exceptional situation and we want to keep it simple.
    if updated_minted_amount > ctx.accounts.custodian.minting_limit {
        msg!("Insufficient minted amount. Sending Wormhole tMEWC instead");

        let ata = &ctx.accounts.recipient_wrapped_token;

        // Create associated token account for recipient if it doesn't exist already.
        if ata.data_is_empty() {
            associated_token::create(CpiContext::new(
                ctx.accounts.associated_token_program.to_account_info(),
                associated_token::Create {
                    payer: ctx.accounts.payer.to_account_info(),
                    associated_token: ata.to_account_info(),
                    authority: recipient.to_account_info(),
                    mint: wrapped_tmewc_mint.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                },
            ))?;
        }

        // Finally transfer.
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: wrapped_tmewc_token.to_account_info(),
                    to: ata.to_account_info(),
                    authority: ctx.accounts.custodian.to_account_info(),
                },
                &[custodian_seeds],
            ),
            amount,
        )
    } else {
        // The function is non-reentrant given bridge.completeTransferWithPayload
        // call that does not allow to use the same VAA again.
        ctx.accounts.custodian.minted_amount = updated_minted_amount;

        tmewc::cpi::mint(
            CpiContext::new_with_signer(
                ctx.accounts.tmewc_program.to_account_info(),
                tmewc::cpi::accounts::Mint {
                    mint: ctx.accounts.tmewc_mint.to_account_info(),
                    config: ctx.accounts.tmewc_config.to_account_info(),
                    minter_info: ctx.accounts.tmewc_minter_info.to_account_info(),
                    minter: ctx.accounts.custodian.to_account_info(),
                    recipient_token: ctx.accounts.recipient_token.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                },
                &[custodian_seeds],
            ),
            amount,
        )
    }
}
