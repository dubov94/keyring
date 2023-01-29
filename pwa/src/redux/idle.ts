import { fromEvent, merge, Observable, Subject, timer } from 'rxjs'
import { map, takeUntil } from 'rxjs/operators'

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
  let lastActivity = Date.now()
  const cancel = new Subject<void>()

  merge(...events.map((event) => fromEvent(element, event))).pipe(
    takeUntil(cancel)
  ).subscribe(() => {
    lastActivity = Date.now()
  })

  // Avoid `setTimeout` due to https://stackoverflow.com/q/6346849.
  return [
    timer(0, emitEveryMillis).pipe(
      takeUntil(cancel),
      map(() => Date.now() - lastActivity)
    ),
    cancel
  ]
}
