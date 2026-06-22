{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    # C/C++ compiler and tools
    gcc
    gnumake
    cmake
    pkg-config
    libclang
    clang

    # OpenSSL dependencies
    openssl
    openssl.dev

    # Rust toolchain
    cargo
    rustc

    # Additional build tools
    git
    perl
  ];

  # Set environment variables for OpenSSL.
  OPENSSL_DIR = "${pkgs.openssl.dev}";
  OPENSSL_LIB_DIR = "${pkgs.openssl.out}/lib";
  OPENSSL_INCLUDE_DIR = "${pkgs.openssl.dev}/include";
  PKG_CONFIG_PATH = "${pkgs.openssl.dev}/lib/pkgconfig";

  # wreq/boring-sys2 uses bindgen, which needs libclang and libc headers.
  LIBCLANG_PATH = "${pkgs.libclang.lib}/lib";
  BINDGEN_EXTRA_CLANG_ARGS = "-I${pkgs.glibc.dev}/include";
}
