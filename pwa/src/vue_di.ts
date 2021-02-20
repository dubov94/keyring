import { container } from 'tsyringe'
import { VueConstructor } from 'vue'

export const VUE_CONSTRUCTOR_TOKEN = 'VueConstructorToken'

export const getVueConstructor = () => container.resolve<VueConstructor>(VUE_CONSTRUCTOR_TOKEN)
