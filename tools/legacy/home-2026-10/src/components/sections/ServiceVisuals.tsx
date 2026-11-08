import type { ServiceVisual as Kind } from '../../content/types'
import { AtlasApp } from '../demos/AtlasApp'
import { SiteBrowserDemo } from '../demos/SiteBrowserDemo'
import { TypeDrum } from '../demos/TypeDrum'

/**
 * One visual per service, each labelled honestly in its caption:
 *   website   — the Meridian Atelier concept, scrollable, with a working menu
 *   immersive — a kinetic type drum in real-time 3-D, on the same stage as the hero
 *   product   — Atlas Ledger, a working analytics interface with sample data
 */
export function ServiceVisual({ kind }: { kind: Kind }) {
  if (kind === 'website') return <SiteBrowserDemo />
  if (kind === 'immersive') return <TypeDrum />
  return <AtlasApp />
}
