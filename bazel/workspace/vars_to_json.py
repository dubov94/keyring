import json
import sys

lines = list(filter(None, sys.stdin.read().splitlines()))
var_to_value = {}
for line in lines:
    var, value = line.split(' ', maxsplit=2)
    var_to_value[var] = value
print(json.dumps(var_to_value))
