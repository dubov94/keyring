import * as WorkboxCore from 'workbox-core'
import * as WorkboxPrecaching from 'workbox-precaching'
import * as WorkboxRouting from 'workbox-routing'

declare global {
  namespace workbox {
    const core: typeof WorkboxCore;
    const precaching: typeof WorkboxPrecaching;
    const routing: typeof WorkboxRouting;
  }
}
