# `storage`

* We connect to the `-rw` service of CloudNativePG, [meaning](https://cloudnative-pg.io/documentation/current/architecture/#postgresql-architecture)
  all replicas are standbys and under normal circumstances 'lagging' reads cannot happen.
* Excessive `LockEntity` guarding can be simplified by [setting](https://docs.oracle.com/javase/8/docs/api/java/sql/Connection.html#setTransactionIsolation-int-)
  a higher isolation level.
