import json
import sys

from string import Template


_, template_path, stable_status_path = sys.argv
with open(template_path, 'r') as template, open(stable_status_path, 'r') as stable_status:
    print(Template(template.read()).safe_substitute(APP_VERSION=json.loads(stable_status.read())['STABLE_GIT_REVISION']))
