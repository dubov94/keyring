<p align="center">
  <a href="https://parolica.com">
    <img src="/pwa/src/logomark.svg" width="64">
  </a>
</p>
<p align="center">
  <b><a href="https://parolica.com">parolica.com</a></b>
</p>
<p align="center">
  <i>It's all about flexibility</i>
</p>
<p align="center">
  <a href="https://github.com/dubov94/keyring/actions/workflows/release.yml">
    <img src="https://github.com/dubov94/keyring/actions/workflows/release.yml/badge.svg">
  </a>
  <a href="https://github.com/boyter/scc#badges-beta">
    <img src="https://sloc.xyz/github/dubov94/keyring">
  </a>
</p>

# [Parolica](https://parolica.com)

Parolica *(pronounced [[pɐˈrolʲɪtsə]](https://en.wikipedia.org/wiki/International_Phonetic_Alphabet))* is a minimalistic cloud-based [password manager](https://en.wikipedia.org/wiki/Password_manager). My friends like it! 🤭

- [🔐 **Zero-knowledge**](https://en.wikipedia.org/wiki/Zero-knowledge_service)
  - The vault is stored encrypted in the cloud, and can only be decrypted with the master password.
  - No one can access the data without it. Even the service maintainers.
- 🗂️ **Free-form metadata**
  - Each 'secret' &mdash; a password, an [SSH](https://en.wikipedia.org/wiki/Secure_Shell) key or any other private text &mdash; can be associated with one or more labels.
  - You decide on how to organise them, making search tailored specifically for your needs and habits.
- 📶 **Offline mode**
  - Store an encrypted local copy of the vault on the device, available without internet connection.
- 🔍 **Security scanning**
  - Analyse the vault for weak, reused and leaked passwords.

Other handy features include [two-factor authentication](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html), [autosave](https://en.wikipedia.org/wiki/Autosave) (so that you never lose a password even if you forget to explicitly save one while actively switching between windows) and [.csv](https://en.wikipedia.org/wiki/Comma-separated_values) imports / exports.

## Screencast

<div align="center">
  <kbd>
    <p align="center">getting_started.gif</p>
    <img src="/docs/getting_started.gif">
  </kbd>
</div>

## Techlinks

- Details of [the architecture](/docs/architecture.md)
- [Development](/docs/development.md) instructions
- [Deployment](/docs/deployment.md) of the service
