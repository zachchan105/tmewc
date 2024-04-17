use anchor_lang::prelude::error_code;

#[error_code]
pub enum WormholeGatewayError {
    #[msg("Cannot mint more than the minting limit")]
    MintingLimitExceeded = 0x10,

    #[msg("Only custodian authority is permitted for this action")]
    IsNotAuthority = 0x20,

    #[msg("Not valid pending authority to take authority")]
    IsNotPendingAuthority = 0x22,

    #[msg("No pending authority")]
    NoPendingAuthorityChange = 0x24,

    #[msg("0x0 recipient not allowed")]
    ZeroRecipient = 0x30,

    #[msg("Not enough wormhole tMEWC in the gateway to bridge")]
    NotEnoughWrappedTmewc = 0x40,

    #[msg("Amount must not be 0")]
    ZeroAmount = 0x50,

    #[msg("Token Bridge transfer already redeemed")]
    TransferAlreadyRedeemed = 0x70,

    #[msg("Token chain and address do not match Ethereum's tMEWC")]
    InvalidEthereumTmewc = 0x80,

    #[msg("No tMEWC transferred")]
    NoTmewcTransferred = 0x90,

    #[msg("0x0 receiver not allowed")]
    RecipientZeroAddress = 0xa0,

    #[msg("Not enough minted by the gateway to satisfy sending tMEWC")]
    MintedAmountUnderflow = 0xb0,

    #[msg("Minted amount after deposit exceeds u64")]
    MintedAmountOverflow = 0xb2,
}
