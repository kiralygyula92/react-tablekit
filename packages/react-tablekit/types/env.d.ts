// `process.env.NODE_ENV` is replaced by consumers' bundlers (dev-only code is dropped in production
// builds). Declared minimally so the library does not depend on @types/node.
declare const process: { env: { NODE_ENV?: string } };
