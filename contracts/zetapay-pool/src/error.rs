use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PoolError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InvalidAmount = 4,
    TokenNotRegistered = 5,
    CommitmentAlreadyExists = 6,
    CommitmentNotFound = 7,
    NullifierAlreadySpent = 8,
    InvalidProof = 9,
    VerifierError = 10,
    UnknownRoot = 11,
    InvalidPublicInputs = 12,
    NoteAlreadyWithdrawn = 13,
    InvalidWithdrawal = 14,
    RootAlreadyAccepted = 15,
}
