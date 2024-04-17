use anchor_lang::prelude::error_code;

#[error_code]
pub enum TmewcError {
    #[msg("Not valid authority to perform this action")]
    IsNotAuthority = 0x20,

    #[msg("Not valid pending authority to take authority")]
    IsNotPendingAuthority = 0x22,

    #[msg("No pending authority")]
    NoPendingAuthorityChange = 0x24,

    #[msg("This address is already a guardian")]
    GuardianAlreadyExists = 0x30,

    #[msg("This address is not a guardian")]
    GuardianNonexistent = 0x32,

    #[msg("Caller is not a guardian")]
    SignerNotGuardian = 0x34,

    #[msg("This address is already a minter")]
    MinterAlreadyExists = 0x40,

    #[msg("This address is not a minter")]
    MinterNonexistent = 0x42,

    #[msg("Caller is not a minter")]
    SignerNotMinter = 0x44,

    #[msg("Program is paused")]
    IsPaused = 0x50,

    #[msg("Program is not paused")]
    IsNotPaused = 0x52,
}
