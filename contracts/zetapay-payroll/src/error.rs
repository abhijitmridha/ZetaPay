use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PayrollError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    InvalidVerifier = 3,
    InvalidProof = 4,
    VerifierError = 5,
    InvalidPayeeCount = 6,
    InvalidCommitment = 7,
    InvalidToken = 8,
    InvalidTotals = 9,
    TokenNotRegistered = 10,
    PaymentFailed = 11,
    AlreadyExecuted = 12,
    MissingEncryptedPayload = 13,
}
