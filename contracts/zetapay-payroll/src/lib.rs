#![no_std]
// Soroban contract entrypoints take one parameter per ABI field; splitting
// them into a struct would change the on-chain function signature.
#![allow(clippy::too_many_arguments)]

pub mod contract;
pub mod error;
pub mod storage;
pub mod types;

mod fixtures;

#[cfg(test)]
mod test;
