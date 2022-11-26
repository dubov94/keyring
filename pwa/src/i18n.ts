import { container } from 'tsyringe'
import Vue from 'vue'
import VueI18n from 'vue-i18n'
import { LocaleMessages } from 'vue-i18n/types'

Vue.use(VueI18n)

const MESSAGES: LocaleMessages = {
  en: {
    DONE: 'Done.',
    EMAIL_ADDRESS_IS_INVALID: 'E-mail address is invalid',
    EMAIL_ADDRESS_IS_REQUIRED: 'E-mail address is required',
    MAIL_CODE_INCORRECT: 'The code is incorrect',
    MAIL_TOKEN_EXPIRED: 'The code has expired',
    MAIL_TOKEN_THROTTLED: 'Please wait until failure timer resets',
    INVALID_CURRENT_PASSWORD: 'Invalid current password',
    INVALID_PASSWORD: 'Invalid password',
    INVALID_USERNAME_OR_PASSWORD: 'Invalid username or password',
    PASSWORD_CANNOT_BE_EMPTY: 'Password cannot be empty',
    PASSWORDS_DO_NOT_MATCH: 'Passwords do not match',
    USERNAME_CANNOT_BE_EMPTY: 'Username cannot be empty',
    USERNAME_IS_ALREADY_TAKEN: 'Username is already taken',
    USERNAME_IS_REQUIRED: 'Username is required',
    // if_change(username_pattern_mismatch)
    USERNAME_PATTERN_MISMATCH: 'Username can only contain latin letters, numbers and underscores, and must be between 3 and 64 characters long',
    // then_change
    OTP_ATTEMPTS_EXHAUSTED: 'Please enter one of the recovery codes'
  }
}

container.register(VueI18n, {
  useValue: new VueI18n({
    locale: 'en',
    messages: MESSAGES
  })
})

export const getVueI18n = (): VueI18n => {
  return container.resolve(VueI18n)
}
