import { fromEvent, interval, merge, Observable, Subject } from 'rxjs'
import { map, pairwise, startWith, switchMap, takeUntil } from 'rxjs/operators'

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
): [Observable<number>, Subject<void>] => {
  const start = Date.now()
  const cancel = new Subject<void>()

  return [
    merge(
      ...events.map((event) => fromEvent(element, event).pipe(
        map(() => Date.now())
      ))
    ).pipe(
      startWith(start, start),
      pairwise(),
      switchMap(([previous, current]) => {
        // Avoid `setTimeout` due to https://stackoverflow.com/q/6346849.
        return interval(emitEveryMillis).pipe(
          map(() => Date.now() - current),
          // In case the browser went to sleep (and so did `interval`).
          startWith(current - previous)
        )
      }),
      takeUntil(cancel)
    ),
    cancel
  ]
}
