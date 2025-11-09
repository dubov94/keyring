import { fromEvent, interval, merge, Observable } from 'rxjs'
import { map, pairwise, startWith, switchMap } from 'rxjs/operators'

export const DEFAULT_ELEMENT = document
// https://github.com/SupremeTechnopriest/react-idle-timer/blob/4ebf8894d7d6c2a9c3a601150523e15c74514898/src/utils/defaults.ts
export const DEFAULT_ACITIVTY_EVENTS = [
  'mousemove',
  'keydown',
  'wheel',
  'DOMMouseScroll',
  'mousewheel',
  'mousedown',
  'touchstart',
  'touchmove',
  'MSPointerDown',
  'MSPointerMove',
  'visibilitychange',
  'focus'
]

export const createIdleDetector = (
  emitEveryMillis: number,
  element: Document | HTMLElement = DEFAULT_ELEMENT,
  events = DEFAULT_ACITIVTY_EVENTS
): Observable<number> => {
  const start = Date.now()
  return merge(
    ...events.map((event) => fromEvent(element, event).pipe(
      map(() => Date.now())
    ))
  ).pipe(
    startWith(start, start),
    pairwise(),
    switchMap(([previous, current]) => {
      // Avoid `setTimeout` due to https://stackoverflow.com/q/6346849 and BFC.
      return interval(emitEveryMillis).pipe(
        map(() => Date.now() - current),
        // In case the page was suspended (and so was `interval`).
        startWith(current - previous)
      )
    })
  )
}
