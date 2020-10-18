import json
import sys


with open(sys.argv[1], 'r') as stable_status:
    var_to_value = json.loads(stable_status.read())
    print(json.dumps({
        'version': var_to_value['STABLE_GIT_REVISION']
    }))
