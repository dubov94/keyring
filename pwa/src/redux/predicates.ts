import { monoid, function as fn } from 'fp-ts'

export const disjunction: monoid.Monoid<fn.Predicate<any>> = {
  empty: () => false,
  concat: (left, right) => (value) => left(value) || right(value)
}
