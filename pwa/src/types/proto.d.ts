import type { Argon2Config } from '@proto/cryptography_js_proto/proto/cryptography_pb'

declare module '@proto/cryptography_js_proto/proto/cryptography_pb' {
  export namespace proto.constants {
    export { Argon2Config }
  }
}
